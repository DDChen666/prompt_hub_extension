import type { SpecializeRequest, SpecializeResponse } from '../../contracts/schemas';
import { RuleTemplateClient, GeminiClient } from './gemini';

export interface ILlmClient {
  specialize(req: SpecializeRequest): Promise<SpecializeResponse>;
}

export function getLlmClient(opts: { key?: string; model?: string; preferLlm?: boolean }) {
  const apiKey = opts.key?.trim() || '';
  const model = (opts.model?.trim() || 'gemini-2.5-flash');
  if (apiKey && opts.preferLlm !== false) {
    return new GeminiClient({ apiKey, model });
  }
  return new RuleTemplateClient();
}
