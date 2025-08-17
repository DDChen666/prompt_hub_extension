import { describe, it, expect } from 'vitest';
import { parseQuery, filterAndSort } from '../../src/lib/search/query';
import type { PromptItem } from '../../src/contracts/schemas';

describe('query.parse and filter', () => {
  it('parseQuery should parse #tag and grp:', () => {
    const q = parseQuery('#eng grp:engineering hello world');
    expect(q.tags).toEqual(['eng']);
    expect(q.group).toBe('engineering');
    expect(q.text).toEqual(['hello', 'world']);
  });

  it('filterAndSort basic scoring and ordering', () => {
    const now = Date.now();
    const items: PromptItem[] = [
      { id: '1', title: 'Hello', content: 'aaa', tags: ['eng'], group: 'engineering', favorite: false, updatedAt: now - 1000 },
      { id: '2', title: 'X', content: 'hello world', tags: ['eng'], group: 'engineering', favorite: false, updatedAt: now - 500 },
      { id: '3', title: 'Other', content: 'zzz', tags: ['eng'], group: 'engineering', favorite: false, updatedAt: now - 200 },
    ];
    const out = filterAndSort(items, 'hello');
    expect(out.map((x) => x.id)).toEqual(['1', '2']); // title hit ranks above content hit

    const out2 = filterAndSort(items, '#eng grp:engineering');
    expect(out2.map((x) => x.id)).toEqual(['3', '2', '1']); // no text: all matches; sort by updatedAt desc
  });
});


