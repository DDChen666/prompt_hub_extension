/* eslint-disable no-useless-escape, @typescript-eslint/no-explicit-any, @typescript-eslint/ban-ts-comment, no-empty, no-inner-declarations, @typescript-eslint/no-unused-vars */
import { upsertItem, listItems, getSitePolicy, getFlags, exportAll } from '../lib/storage/indexed';

chrome.runtime.onInstalled.addListener(async () => {
  try {
    // 自檢：schema 解析與備援
    try {
      await getSitePolicy();
      await getFlags();
    } catch (e) {
      const key = 'backup_' + new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const all = await exportAll().catch(() => null);
      if (all) await chrome.storage.local.set({ [key]: all });
      console.warn('[PO] schema parse failed, backup saved at', key);
    }

    // 既有種子資料
    const existing = await listItems();
    if (!existing || existing.length === 0) {
      const now = Date.now();
      await upsertItem({
        id: 'seed-support-1',
        title: '回覆客訴基礎框架',
        content: '您好，我們已收到您的反饋，以下是處理步驟...\n（請補齊訂單資訊、期望解法、後續聯繫）',
        tags: ['cs', 'tone'],
        group: 'support',
        favorite: false,
        updatedAt: now,
      });
      await upsertItem({
        id: 'seed-eng-1',
        title: '技術 Bug 回報模板',
        content: '環境：\n版本：\n重現步驟：\n期望行為：\n實際行為：\n附加資訊：',
        tags: ['eng', 'bug'],
        group: 'engineering',
        favorite: false,
        updatedAt: now,
      });
    }
  } catch (err) {
    console.warn('onInstalled failed', err);
  }
});

// 啟動時自檢
chrome.runtime.onStartup.addListener(async () => {
  try {
    await getSitePolicy();
    await getFlags();
  } catch (e) {
    const key = 'backup_' + new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const all = await exportAll().catch(() => null);
    if (all) await chrome.storage.local.set({ [key]: all });
    console.warn('[PO] schema parse failed onStartup, backup saved at', key);
  }
});

console.info('Prompt Organizer SW ready');

// 監聽 commands：open-panel → 注入 Overlay
function hostMatch(host: string, patterns: string[]): boolean {
  return patterns.some((p) => {
    if (p.startsWith('*.')) {
      const base = p.slice(2).replace(/\./g, '\\\.');
      const re = new RegExp(`(^|\\\.)${base}$`, 'i');
      return re.test(host);
    }
    return host.toLowerCase() === p.toLowerCase();
  });
}

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'open-panel') return;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url) return;

    // 保險絲：停用 Overlay
    const flags = await getFlags();
    if (flags.disableOverlay) {
      await chrome.action.setBadgeText({ text: 'OFF', tabId: tab.id });
      setTimeout(() => chrome.action.setBadgeText({ text: '', tabId: tab.id }), 2000);
      return;
    }

    const url = new URL(tab.url);
    const host = url.hostname;
    const policy = await getSitePolicy();

    if (policy.allowlist.length > 0 && !hostMatch(host, policy.allowlist)) {
      await chrome.action.setBadgeText({ text: 'BLOCK', tabId: tab.id });
      setTimeout(() => chrome.action.setBadgeText({ text: '', tabId: tab.id }), 2000);
      return;
    }
    if (hostMatch(host, policy.blocklist)) {
      await chrome.action.setBadgeText({ text: 'BLOCK', tabId: tab.id });
      setTimeout(() => chrome.action.setBadgeText({ text: '', tabId: tab.id }), 2000);
      return;
    }
    const copyOnly = hostMatch(host, policy.copyOnly);

    // 先寫入 copy-only 旗標，再注入 overlay
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: function setCopyOnlyFlag(opts: { copyOnly?: boolean }) {
        try { (window as any).__po_copyOnly = Boolean(opts && opts.copyOnly); } catch {}
      },
      args: [{ copyOnly }],
    });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: injectedOverlay,
    });
  } catch (err) {
    console.warn('inject overlay failed', err);
  }
});

// 注意：此函式必須可序列化，嚴禁引用外部變數
function injectedOverlay() {
  try {
    // DOM 短路：若已存在 root，直接移除並清理旗標 → return
    const existing = document.getElementById('__po_root');
    if (existing) {
      try { existing.remove(); } catch {}
      try {
        // @ts-ignore
        if ((window as any).__po_closeOverlay) delete (window as any).__po_closeOverlay;
        // @ts-ignore
        (window as any).__po_open = false;
        // @ts-ignore
        delete (document as any).__poPrevActive;
        // @ts-ignore
        delete (document as any).__poPrevRange;
      } catch {}
      return;
    }
    // Toggle：若已開啟 → 關閉
    // @ts-ignore
    if ((window as any).__po_open && (window as any).__po_closeOverlay) {
      // @ts-ignore
      (window as any).__po_closeOverlay();
      return;
    }

    (window as any).__po_open = true;
    (document as any).__poPrevActive = document.activeElement || null;
    // 記憶 selection range（用於 contenteditable caret 保留）
    try {
      const sel = window.getSelection?.();
      if (sel && sel.rangeCount) {
        // @ts-ignore
        (document as any).__poPrevRange = sel.getRangeAt(0).cloneRange();
      }
    } catch {}

    const root = document.createElement('div');
    root.id = '__po_root';
    const shadow = root.attachShadow({ mode: 'open' });
    ;(window as any).__po_root = root;

    const style = document.createElement('style');
    style.textContent = `
      :host, #po-wrap { all: initial; }
      #po-mask { position: fixed; inset: 0; z-index: 2147483646; background: rgba(0,0,0,0.08); pointer-events: none; }
      #po-card { position: fixed; top: 10%; left: 50%; transform: translateX(-50%); width: 600px; max-width: calc(100vw - 24px); background: #fff; color: #111; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,.2); overflow: hidden; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; z-index: 2147483647; }
      #po-header { padding: 10px 12px; border-bottom: 1px solid #eee; display: flex; gap: 8px; align-items: center; }
      #po-search { flex: 1; padding: 8px 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; }
      #po-list { max-height: 50vh; overflow: auto; padding: 8px; display: grid; gap: 8px; }
      .po-item { border: 1px solid #eee; border-radius: 8px; padding: 8px; background: #fafafa; cursor: pointer; }
      .po-item[aria-selected="true"] { outline: 2px solid #3b82f6; background: #f7fbff; }
      .po-title { font-weight: 600; margin-bottom: 4px; }
      .po-meta { font-size: 11px; color: #666; display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 6px; }
      .po-content { font-size: 12px; color: #333; white-space: pre-wrap; }
      #po-footer { padding: 8px 12px; border-top: 1px solid #eee; font-size: 12px; color: #666; display: flex; justify-content: space-between; }
      #po-copyarea { width: 100%; box-sizing: border-box; padding: 8px; border: 1px solid #ddd; border-radius: 6px; }
    `;

    const wrap = document.createElement('div');
    wrap.id = 'po-wrap';

    const mask = document.createElement('div');
    mask.id = 'po-mask';

    const card = document.createElement('div');
    card.id = 'po-card';

    const header = document.createElement('div');
    header.id = 'po-header';

    const input = document.createElement('input');
    input.id = 'po-search';
    input.type = 'text';
    input.placeholder = '搜尋...（支援 #tag 與 grp:group）';

    const list = document.createElement('div');
    list.id = 'po-list';
    list.setAttribute('role', 'listbox');

    const footer = document.createElement('div');
    footer.id = 'po-footer';
    footer.textContent = '↑/↓ 選取，Enter 貼入，Esc 關閉';
    const msg = document.createElement('div');
    msg.id = 'po-msg';
    msg.setAttribute('aria-live', 'polite');
    msg.style.cssText = 'padding: 6px 12px; color: #666; font-size: 12px;';

    header.appendChild(input);
    card.appendChild(header);
    card.appendChild(list);
    card.appendChild(msg);
    card.appendChild(footer);
    wrap.appendChild(mask);
    wrap.appendChild(card);
    shadow.appendChild(style);
    shadow.appendChild(wrap);
    document.documentElement.appendChild(root);

    console.info('[PO] overlay opened');

    function closeOverlay() {
      try { root.remove(); } catch {}
      (window as any).__po_open = false;
      (window as any).__po_root = null;
      try {
        // @ts-ignore
        delete (window as any).__po_closeOverlay;
        // @ts-ignore
        delete (document as any).__poPrevActive;
        // @ts-ignore
        delete (document as any).__poPrevRange;
      } catch {}
      document.removeEventListener('keydown', onGlobalKeyDown, true);
    }
    // @ts-ignore
    (window as any).__po_closeOverlay = closeOverlay;

    // 透明遮罩（不攔截點擊），僅 Esc 關閉

    // 讀取資料（來自 chrome.storage.local）
    function readItemsFromStorage(): Promise<any[]> {
      return new Promise((resolve) => {
        try {
          chrome.storage.local.get('prompt_items_v1', (out) => {
            const val = (out && (out as any)['prompt_items_v1']) || [];
            if (Array.isArray(val)) resolve(val);
            else resolve([]);
          });
        } catch {
          resolve([]);
        }
      });
    }

    function parseQuery(q: string) {
      const tokens = String(q || '').trim().split(/\s+/).filter(Boolean);
      const text: string[] = [];
      const tags: string[] = [];
      let group: string | undefined;
      for (const t of tokens) {
        if (t.startsWith('#') && t.length > 1) tags.push(t.slice(1).toLowerCase());
        else if (t.toLowerCase().startsWith('grp:') && t.length > 4) group = t.slice(4).toLowerCase();
        else text.push(t.toLowerCase());
      }
      return { text, tags, group } as { text: string[]; tags: string[]; group?: string };
    }

    function itemMatches(item: any, q: { text: string[]; tags: string[]; group?: string }): number | null {
      const titleLc = String(item.title || '').toLowerCase();
      const contentLc = String(item.content || '').toLowerCase();
      if (q.group && String(item.group || '').toLowerCase() !== q.group) return null;
      for (const tag of q.tags) {
        const has = Array.isArray(item.tags) && item.tags.some((t: any) => String(t).toLowerCase() === tag);
        if (!has) return null;
      }
      let score = 0;
      for (const term of q.text) {
        const inTitle = titleLc.includes(term);
        const inContent = contentLc.includes(term);
        if (!inTitle && !inContent) return null;
        if (inTitle) score += 2;
        if (inContent) score += 1;
      }
      if (q.text.length === 0) score += 1;
      return score;
    }

    function filterAndSort(items: any[], q: string): any[] {
      const parsed = parseQuery(q);
      const scored: Array<{ item: any; score: number }> = [];
      for (const it of items) {
        const s = itemMatches(it, parsed);
        if (s !== null) scored.push({ item: it, score: s });
      }
      scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const au = Number(a.item?.updatedAt || 0);
        const bu = Number(b.item?.updatedAt || 0);
        return bu - au;
      });
      return scored.map((x) => x.item);
    }

    function renderList(items: any[], activeIndex: number) {
      list.innerHTML = '';
      items.forEach((it, idx) => {
        const row = document.createElement('div');
        row.className = 'po-item';
        row.setAttribute('role', 'option');
        row.setAttribute('id', `po-opt-${it.id}`);
        row.setAttribute('aria-selected', String(idx === activeIndex));
        const title = document.createElement('div');
        title.className = 'po-title';
        title.textContent = String(it.title || '');
        const meta = document.createElement('div');
        meta.className = 'po-meta';
        const tags = Array.isArray(it.tags) ? it.tags : [];
        const tagParts = tags.map((t: any) => `#${String(t)}`);
        const grp = it.group ? [`grp:${String(it.group)}`] : [];
        meta.textContent = [...grp, ...tagParts].join(' ');
        const content = document.createElement('div');
        content.className = 'po-content';
        content.textContent = String(it.content || '');
        row.appendChild(title);
        row.appendChild(meta);
        row.appendChild(content);
        row.addEventListener('click', async () => {
          await onChoose(it);
        });
        list.appendChild(row);
      });
    }

    function tryInsertIntoActive(text: string): boolean {
      const el = (document as any).__poPrevActive || document.activeElement;
      if (
        el &&
        (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && /text|search|url|email|tel/.test((el as HTMLInputElement).type)))
      ) {
        const inputEl = el as HTMLInputElement | HTMLTextAreaElement;
        const start = (inputEl.selectionStart ?? (inputEl as any).value.length) as number;
        const end = (inputEl.selectionEnd ?? (inputEl as any).value.length) as number;
        const before = (inputEl as any).value.slice(0, start);
        const after = (inputEl as any).value.slice(end);
        (inputEl as any).value = before + text + after;
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        inputEl.focus();
        (inputEl as any).selectionStart = (inputEl as any).selectionEnd = (before + text).length;
        return true;
      }
      return false;
    }

    function tryInsertIntoContentEditable(text: string): boolean {
      const docAny = document as any;
      const active = (docAny.__poPrevActive as Element) || (document.activeElement as Element | null);
      const rootEditable = (active && (active as HTMLElement).closest?.('[contenteditable=""],[contenteditable="true"]')) as HTMLElement | null;
      if (!rootEditable) return false;
      try {
        const sel = window.getSelection?.();
        const remembered = docAny.__poPrevRange as Range | null | undefined;
        let r = remembered ?? (sel && sel.rangeCount ? sel.getRangeAt(0) : null);
        if (!r || !rootEditable.contains(r.startContainer)) {
          // 建立末端插入的 range
          r = document.createRange();
          const last = rootEditable.lastChild;
          if (last && last.nodeType === Node.TEXT_NODE) {
            r.setStart(last, (last as Text).data.length);
          } else {
            r.selectNodeContents(rootEditable);
            r.collapse(false);
          }
        }
        r.deleteContents();
        const node = document.createTextNode(text);
        r.insertNode(node);
        r.setStartAfter(node);
        r.collapse(true);
        sel?.removeAllRanges();
        sel?.addRange(r);
        return true;
      } catch {
        return false;
      }
    }

    async function onChoose(it: any) {
      const text = String(it.content || '');
      // copy-only 強制降級：不嘗試寫入 input/CE
      // @ts-ignore
      const copyOnly = Boolean((window as any).__po_copyOnly);
      let kind: string = 'manual';
      if (!copyOnly) {
        if (tryInsertIntoActive(text)) kind = 'input';
        else if (tryInsertIntoContentEditable(text)) kind = 'editable';
      }
      if (kind === 'manual' || kind === 'clipboard' || copyOnly) {
        try { await navigator.clipboard.writeText(text); kind = 'clipboard'; } catch { kind = 'manual'; }
      }
      const msgEl = msg;
      if (kind === 'clipboard' || kind === 'manual' || copyOnly) {
        msgEl.textContent = '本頁不可直接寫入，已複製到剪貼簿；若仍無法，請手動複製。';
        // 保持 Overlay 開啟讓使用者看到文案
      } else {
        msgEl.textContent = '';
        closeOverlay();
      }
    }

    function reopenForManualCopy(text: string) {
      (window as any).__po_open = true;
      const root2 = document.createElement('div');
      root2.id = '__po_root';
      const shadow2 = root2.attachShadow({ mode: 'open' });
      ;(window as any).__po_root = root2;
      const style2 = style.cloneNode(true) as HTMLStyleElement;
      const wrap2 = document.createElement('div');
      wrap2.id = 'po-wrap';
      const mask2 = document.createElement('div');
      mask2.id = 'po-mask';
      const card2 = document.createElement('div');
      card2.id = 'po-card';
      const header2 = document.createElement('div');
      header2.id = 'po-header';
      const msg = document.createElement('div');
      msg.textContent = '無法自動貼入，已降級，請手動複製';
      const ta = document.createElement('textarea');
      ta.id = 'po-copyarea';
      ta.readOnly = true;
      ta.value = text;
      const footer2 = document.createElement('div');
      footer2.id = 'po-footer';
      footer2.textContent = 'Esc 關閉';
      header2.appendChild(msg);
      card2.appendChild(header2);
      card2.appendChild(ta);
      card2.appendChild(footer2);
      wrap2.appendChild(mask2);
      wrap2.appendChild(card2);
      shadow2.appendChild(style2);
      shadow2.appendChild(wrap2);
      document.documentElement.appendChild(root2);
      setTimeout(() => { ta.focus(); ta.select(); }, 0);
      function onClose2() { try { root2.remove(); } catch {}; (window as any).__po_open = false; (window as any).__po_root = null; }
      document.addEventListener('keydown', function onEsc2(ev) {
        if (ev.key === 'Escape') { ev.preventDefault(); onClose2(); document.removeEventListener('keydown', onEsc2, true); }
      }, true);
    }

    // 狀態
    let items: any[] = [];
    try {
      // 測試或頁面可先行放入 __po_items 作為資料來源
      // @ts-ignore
      if (Array.isArray((window as any).__po_items) && (window as any).__po_items.length > 0) {
        // @ts-ignore
        items = (window as any).__po_items.slice();
      }
    } catch {}
    let filtered: any[] = [];
    let activeIndex = 0;

    function rerender() {
      filtered = filterAndSort(items, input.value || '');
      if (activeIndex >= filtered.length) activeIndex = Math.max(0, filtered.length - 1);
      renderList(filtered, activeIndex);
    }

    function onGlobalKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); closeOverlay(); return; }
    }
    document.addEventListener('keydown', onGlobalKeyDown, true);

    input.addEventListener('keydown', (e) => {
      const max = Math.max(0, filtered.length - 1);
      if (e.key === 'ArrowDown') { e.preventDefault(); activeIndex = Math.min(max, activeIndex + 1); rerender(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); activeIndex = Math.max(0, activeIndex - 1); rerender(); }
      else if (e.key === 'Enter') { e.preventDefault(); const sel = filtered[activeIndex]; if (sel) onChoose(sel); }
    });
    input.addEventListener('input', () => rerender());

    // 初次讀取：若未提供 __po_items，則從 storage 讀取
    if (!Array.isArray(items) || items.length === 0) {
      readItemsFromStorage().then((its) => { items = Array.isArray(its) ? its : []; rerender(); });
    } else {
      rerender();
    }

    // 聚焦
    setTimeout(() => input.focus(), 0);
  } catch (err) {
    try { console.warn('overlay error', err); } catch {}
  }
}

// 開發/測試鉤子：僅允許本擴充自己發來的訊息以觸發注入
chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  try {
    if (msg !== '__PO_TEST_INJECT__') return;
    if (sender?.id !== chrome.runtime.id) return;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) { sendResponse?.({ ok: false, error: 'no-active-tab' }); return true; }
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: injectedOverlay });
    sendResponse?.({ ok: true });
  } catch (e) {
    try { sendResponse?.({ ok: false, error: String(e) }); } catch {}
  }
  return true;
});

// no-op
