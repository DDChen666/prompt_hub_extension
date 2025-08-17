import { describe, it, expect } from 'vitest';
import { PromptItem, ExportBundle, SpecializeResponse } from '../../src/contracts/schemas';

describe('schemas smoke', () => {
  it('PromptItem ok', () => {
    const ok = PromptItem.parse({
      id: '1',
      title: 't',
      content: 'c',
      tags: [],
      favorite: false,
      updatedAt: Date.now(),
    });
    expect(ok.id).toBe('1');
  });

  it('ExportBundle ok', () => {
    const ok = ExportBundle.parse({ version: '0', exportedAt: Date.now(), items: [] });
    expect(ok.version).toBe('0');
  });

  it('SpecializeResponse ok', () => {
    const ok = SpecializeResponse.parse({ output: 'x', used: 'rule', latencyMs: 10, degraded: false });
    expect(ok.used).toBe('rule');
  });

  it('PromptItem fail', () => {
    expect(() => PromptItem.parse({} as any)).toThrowError();
  });
});
