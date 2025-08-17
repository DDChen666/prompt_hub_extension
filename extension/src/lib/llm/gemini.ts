import type { ILlmClient } from './index';
import { SpecializeRequest, SpecializeResponse } from '../../contracts/schemas';
import { builtins, renderRuleTemplate } from '../templates';

export interface FakeGeminiFlags {
  timeout?: boolean;
  rateLimit?: boolean; // 429
  upstreamError?: boolean; // 5xx
}

export class FakeGeminiClient implements ILlmClient {
  private flags: FakeGeminiFlags;

  constructor(flags: FakeGeminiFlags = {}) {
    this.flags = flags;
  }

  async specialize(req: unknown): Promise<import('../../contracts/schemas').SpecializeResponse> {
    const parsed = SpecializeRequest.parse(req);

    // 模擬 1200±100ms 延遲
    const latency = 1200 + Math.floor(Math.random() * 200 - 100);

    await new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, Math.max(200, latency));
      if (this.flags.timeout) {
        setTimeout(() => {
          clearTimeout(timer);
          reject(new Error('E_TIMEOUT'));
        }, Math.max(50, latency - 100));
      }
    });

    if (this.flags.rateLimit) {
      throw Object.assign(new Error('E_RATE'), { status: 429 });
    }
    if (this.flags.upstreamError) {
      throw Object.assign(new Error('E_UPSTREAM'), { status: 502 });
    }

    const variables = parsed.variables || {};
    const body = parsed.sentence || '';
    const output = `【規則模板產物】${body} ${Object.keys(variables)
      .map((k) => `{{${k}}}=${variables[k]}`)
      .join(' ')}`.trim();

    return SpecializeResponse.parse({
      output,
      used: 'rule',
      latencyMs: Math.max(200, latency),
      degraded: false,
    });
  }
}

// 真實 REST 呼叫（供 BYOK 使用）
export async function callGemini({
  apiKey,
  model,
  prompt,
  signal,
}: {
  apiKey: string;
  model: string;
  prompt: string;
  signal?: AbortSignal;
}): Promise<string> {
  const fetchPromise = fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }),
      signal,
    }
  );
  const res = await (signal
    ? Promise.race([
        fetchPromise,
        new Promise<never>((_, reject) => {
          signal.addEventListener(
            'abort',
            () => {
              const err = new Error('AbortError') as Error & { name: string };
              err.name = 'AbortError';
              reject(err);
            },
            { once: true }
          );
        }),
      ])
    : fetchPromise);
  if (!res.ok) {
    const err = new Error(`UPSTREAM_${res.status}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return String(text || '');
}

// 極簡規則模板客戶端
export class RuleTemplateClient implements ILlmClient {
  async specialize(req: unknown) {
    const parsed = SpecializeRequest.parse(req);
    const tpl = builtins.find((t) => t.id === (parsed.templateId || '')) || builtins[0];
    const output = renderRuleTemplate(tpl.body, parsed.sentence, parsed.variables || {});
    return SpecializeResponse.parse({ output, used: 'rule', latencyMs: 0, degraded: false });
  }
}

// 簡易快取與節流
const cache = new Map<string, { value: string; expiresAt: number }>();
let lastCallTs = 0;
const THROTTLE_MS = 500;
const CACHE_TTL_MS = 5 * 60 * 1000;

export class GeminiClient implements ILlmClient {
  private apiKey: string;
  private model: string;
  private timeoutMs: number;

  constructor({ apiKey, model = 'gemini-2.5-flash', timeoutMs = 1500 }: { apiKey: string; model?: string; timeoutMs?: number }) {
    this.apiKey = apiKey;
    this.model = model;
    this.timeoutMs = timeoutMs;
  }

  private async maybeThrottle() {
    const now = Date.now();
    const elapsed = now - lastCallTs;
    if (elapsed < THROTTLE_MS) {
      await new Promise((r) => setTimeout(r, THROTTLE_MS - elapsed));
    }
    lastCallTs = Date.now();
  }

  async specialize(req: unknown) {
    const parsed = SpecializeRequest.parse(req);
    const key = `${parsed.templateId || ''}|${parsed.sentence}|${JSON.stringify(parsed.variables || {})}`;

    // 快取命中
    const hit = cache.get(key);
    const now = Date.now();
    if (hit && hit.expiresAt > now) {
      return SpecializeResponse.parse({ output: hit.value, used: 'llm', latencyMs: 0, degraded: false });
    }

    // 節流
    await this.maybeThrottle();

    // 設定逾時
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), Math.max(200, this.timeoutMs));

    const prompt = this.composePrompt(parsed);
    const started = Date.now();
    try {
      const text = await callGemini({ apiKey: this.apiKey, model: this.model, prompt, signal: ac.signal });
      clearTimeout(t);
      const latencyMs = Date.now() - started;
      cache.set(key, { value: text, expiresAt: Date.now() + CACHE_TTL_MS });
      return SpecializeResponse.parse({ output: text, used: 'llm', latencyMs, degraded: false });
    } catch (e) {
      clearTimeout(t);
      const anyErr = e as unknown as { name?: string; message?: string; status?: number };
      const isTimeout = anyErr?.name === 'AbortError' || String(anyErr?.message || '').includes('timeout');
      const status = anyErr?.status as number | undefined;
      const shouldDegrade = isTimeout || (status === 429) || (typeof status === 'number' && status >= 500);
      const tpl = builtins.find((t) => t.id === (parsed.templateId || '')) || builtins[0];
      const out = renderRuleTemplate(tpl.body, parsed.sentence, parsed.variables || {});
      const latencyMs = Date.now() - started;
      return SpecializeResponse.parse({ output: out, used: shouldDegrade ? 'rule' : 'rule', latencyMs, degraded: true });
    }
  }

  private composePrompt(req: import('../../contracts/schemas').SpecializeRequest): string {
    const tpl = builtins.find((t) => t.id === (req.templateId || '')) || builtins[0];
    const rule = renderRuleTemplate(tpl.body, req.sentence, req.variables || {});
    return `請針對以下模板輸出更專業、清晰且精煉的結果（保持語言一致）：\n--- 模板輸入 ---\n${rule}\n--- 要求 ---\n- 簡潔有條理\n- 保持原意與語氣\n- 產出可直接貼用的文字`;
  }
}
