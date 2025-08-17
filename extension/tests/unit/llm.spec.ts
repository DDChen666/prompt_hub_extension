import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GeminiClient, callGemini } from '../../src/lib/llm/gemini';
import { RuleTemplateClient } from '../../src/lib/llm/gemini';

describe('LLM specialize - degrade paths', () => {
  const apiKey = 'test';
  const model = 'gemini-2.5-flash';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('200 OK -> used: llm, degraded: false', async () => {
    vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: 'hello' }] } }] }),
    } as any);
    const client = new GeminiClient({ apiKey, model, timeoutMs: 1500 });
    const res = await client.specialize({ sentence: 'hi', templateId: 'tmpl_post', variables: { audience: 'A' } });
    expect(res.used).toBe('llm');
    expect(res.degraded).toBe(false);
    expect(res.output).toBe('hello');
  });

  it('429 -> used: rule, degraded: true', async () => {
    vi.spyOn(globalThis, 'fetch' as any).mockResolvedValue({ ok: false, status: 429 } as any);
    const client = new GeminiClient({ apiKey, model, timeoutMs: 1500 });
    const res = await client.specialize({ sentence: 'hi-429', templateId: 'tmpl_post', variables: { audience: 'A' } });
    expect(res.used).toBe('rule');
    expect(res.degraded).toBe(true);
    expect(res.output.length).toBeGreaterThan(0);
  });

  it('timeout -> used: rule, degraded: true', async () => {
    vi.spyOn(globalThis, 'fetch' as any).mockImplementation(() => new Promise((_res, _rej) => {}));
    const client = new GeminiClient({ apiKey, model, timeoutMs: 50 });
    const res = await client.specialize({ sentence: 'hi-timeout', templateId: 'tmpl_post', variables: { audience: 'A' } });
    expect(res.used).toBe('rule');
    expect(res.degraded).toBe(true);
    expect(res.output.length).toBeGreaterThan(0);
  });
});


