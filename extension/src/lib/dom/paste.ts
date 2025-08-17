export function insertIntoInputLike(el: HTMLInputElement | HTMLTextAreaElement, text: string): boolean {
  if (!(el && 'value' in el)) return false;
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  const before = el.value.slice(0, start);
  const after = el.value.slice(end);
  el.value = before + text + after;
  const pos = (before + text).length;
  el.setSelectionRange?.(pos, pos);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}

export function insertIntoContentEditable(root: HTMLElement, text: string, range?: Range | null): boolean {
  const sel = window.getSelection?.();
  const r = range ?? (sel && sel.rangeCount ? sel.getRangeAt(0) : null);
  if (!r || !root.contains(r.startContainer)) return false;
  r.deleteContents();
  const node = document.createTextNode(text);
  r.insertNode(node);
  r.setStartAfter(node);
  r.collapse(true);
  sel?.removeAllRanges();
  sel?.addRange(r);
  return true;
}

export function smartPaste(
  targetOrDoc: Element | Document,
  text: string,
  remembered?: { el?: Element | null; range?: Range | null }
): 'input' | 'editable' | 'clipboard' | 'manual' {
  const doc = (targetOrDoc as Document).body ? (targetOrDoc as Document) : (targetOrDoc as Element).ownerDocument!;
  const active = (remembered?.el as Element) || (doc.activeElement as Element | null);
  // 1) input/textarea
  if (
    active &&
    (active.tagName === 'TEXTAREA' ||
      (active.tagName === 'INPUT' && /text|search|url|email|tel|password/.test((active as HTMLInputElement).type || 'text')))
  ) {
    if (insertIntoInputLike(active as HTMLInputElement | HTMLTextAreaElement, text)) return 'input';
  }
  // 2) contenteditable（含記憶 range）
  const rootEditable = (active && (active as HTMLElement).closest?.('[contenteditable=""],[contenteditable="true"]')) as HTMLElement | null;
  if (rootEditable) {
    if (insertIntoContentEditable(rootEditable, text, remembered?.range ?? null)) return 'editable';
  }
  // 3) clipboard
  try {
    void navigator.clipboard.writeText(text);
    return 'clipboard';
  } catch { /* noop */ }
  // 4) manual
  return 'manual';
}


