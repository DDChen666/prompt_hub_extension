import type { PromptItem } from '../../contracts/schemas';

export function parseQuery(q: string): { text: string[]; tags: string[]; group?: string } {
  const tokens = String(q || '').trim().split(/\s+/).filter(Boolean);
  const text: string[] = [];
  const tags: string[] = [];
  let group: string | undefined;
  for (const t of tokens) {
    if (t.startsWith('#') && t.length > 1) {
      tags.push(t.slice(1).toLowerCase());
    } else if (t.toLowerCase().startsWith('grp:') && t.length > 4) {
      group = t.slice(4).toLowerCase();
    } else {
      text.push(t.toLowerCase());
    }
  }
  return { text, tags, group };
}

function itemMatches(item: PromptItem, q: { text: string[]; tags: string[]; group?: string }): number | null {
  // AND 條件：每個 text 都需至少命中 title 或 content；所有 tag 都需存在；group 需相等
  const titleLc = item.title.toLowerCase();
  const contentLc = item.content.toLowerCase();
  if (q.group && (item.group || '').toLowerCase() !== q.group) return null;
  for (const tag of q.tags) {
    const found = item.tags.some((t) => t.toLowerCase() === tag);
    if (!found) return null;
  }
  // 打分：title 命中加 2，content 命中加 1；多詞累加
  let score = 0;
  for (const term of q.text) {
    const inTitle = titleLc.includes(term);
    const inContent = contentLc.includes(term);
    if (!inTitle && !inContent) return null; // AND
    if (inTitle) score += 2;
    if (inContent) score += 1;
  }
  // 若沒有 text 條件，但其他條件命中，給基礎分 1
  if (q.text.length === 0) score += 1;
  return score;
}

export function filterAndSort(items: PromptItem[], q: string): PromptItem[] {
  const parsed = parseQuery(q);
  const scored: Array<{ item: PromptItem; score: number }> = [];
  for (const it of items) {
    const s = itemMatches(it, parsed);
    if (s !== null) scored.push({ item: it, score: s });
  }
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.item.updatedAt - a.item.updatedAt;
  });
  return scored.map((x) => x.item);
}
