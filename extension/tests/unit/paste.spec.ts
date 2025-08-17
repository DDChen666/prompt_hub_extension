// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { insertIntoInputLike, insertIntoContentEditable } from '../../src/lib/dom/paste';

describe('lib/dom/paste', () => {
  it('insertIntoInputLike: 插入於 selectionStart..End 並將 caret 移到尾端', () => {
    const ta = document.createElement('textarea');
    ta.value = 'abcXYZdef';
    document.body.appendChild(ta);
    ta.focus();
    ta.selectionStart = 3;
    ta.selectionEnd = 6;
    const ok = insertIntoInputLike(ta, '123');
    expect(ok).toBe(true);
    expect(ta.value).toBe('abc123def');
    expect(ta.selectionStart).toBe(6);
    expect(ta.selectionEnd).toBe(6);
  });

  it('insertIntoContentEditable: 使用 Range 在 caret 插入並保留 caret（collapse 到尾端）', () => {
    const div = document.createElement('div');
    div.setAttribute('contenteditable', 'true');
    const textNode = document.createTextNode('Hello');
    div.appendChild(textNode);
    document.body.appendChild(div);
    const range = document.createRange();
    range.setStart(textNode, 2); // He|llo
    range.collapse(true);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);

    const ok = insertIntoContentEditable(div, ' WORLD');
    expect(ok).toBe(true);
    expect(div.textContent).toContain('He WORLDllo');
    const sel2 = window.getSelection();
    expect(sel2?.rangeCount).toBeGreaterThan(0);
    const r2 = sel2?.getRangeAt(0);
    expect(r2?.collapsed).toBe(true);
  });
});


