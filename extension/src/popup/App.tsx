import React, { useEffect, useMemo, useRef, useState } from 'react';
import { listItems, onChanged, storage, upsertItem, getFlags } from '../lib/storage/indexed';
import { filterAndSort } from '../lib/search/query';
import type { PromptItem } from '../contracts/schemas';
import { builtins } from '../lib/templates';
import { getLlmClient } from '../lib/llm';

export default function App() {
  const [items, setItems] = useState<PromptItem[]>([]);
  const [query, setQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [manualCopyId, setManualCopyId] = useState<string | null>(null);
  const listboxId = 'prompt-listbox';

  // 專業化區塊狀態
  const [specSentence, setSpecSentence] = useState('');
  const [specTpl, setSpecTpl] = useState<string>(builtins[0].id as string);
  const [specVars, setSpecVars] = useState<Record<string, string>>({});
  const [specOutput, setSpecOutput] = useState('');
  const [specUsed, setSpecUsed] = useState<'rule' | 'llm' | ''>('');
  const [specLoading, setSpecLoading] = useState(false);
  const [preferLlm, setPreferLlm] = useState(true);
  const [model, setModel] = useState('gemini-2.5-flash');
  const [apiKey, setApiKey] = useState('');
  const [readonly, setReadonly] = useState(false);
  const [disableLlm, setDisableLlm] = useState(false);

  useEffect(() => {
    (async () => {
      const current = await listItems();
      setItems(current);
      // 自動聚焦
      inputRef.current?.focus();
      // 載入 LLM 設定
      const [k, m, pref] = await Promise.all([
        storage.getGeminiKey(),
        storage.getGeminiModel(),
        storage.getPreferLlm(),
      ]);
      setApiKey(k || '');
      setModel(m || 'gemini-2.5-flash');
      setPreferLlm(pref);
      // 旗標
      try {
        const f = await getFlags();
        setReadonly(Boolean(f.readonly));
        setDisableLlm(Boolean(f.disableLlm));
        if (f.disableLlm) setPreferLlm(false);
      } catch { /* noop */ }
    })();
    const off = onChanged((next) => setItems(next));
    return () => off();
  }, []);

  const filtered = useMemo(() => filterAndSort(items, query), [items, query]);

  useEffect(() => {
    // 查詢變更時重置 activeIndex
    setActiveIndex(0);
  }, [query]);

  async function copyText(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return ok;
      } catch {
        return false;
      }
    }
  }

  async function onCopy(content: string, id: string) {
    const ok = await copyText(content);
    if (ok) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } else {
      setManualCopyId(id);
      setTimeout(() => {
        const ta = document.getElementById(`manual-copy-${id}`) as HTMLTextAreaElement | null;
        ta?.focus();
        ta?.select();
      }, 0);
    }
  }

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const max = Math.max(0, filtered.length - 1);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(max, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const sel = filtered[activeIndex];
      if (sel) onCopy(sel.content, sel.id);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setQuery('');
      setActiveIndex(0);
    }
  }

  return (
    <div style={{ width: 360, padding: 12, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Prompt Organizer (MVP)</h1>
      {readonly && (
        <div style={{ background: '#fff7ed', color: '#9a3412', border: '1px solid #fed7aa', padding: 8, borderRadius: 6, marginBottom: 8, fontSize: 12 }}>
          目前為唯讀模式：僅可複製
        </div>
      )}
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={onInputKeyDown}
        placeholder="搜尋...（支援 #tag 與 grp:group）"
        style={{
          width: '100%',
          padding: '6px 8px',
          border: '1px solid #ddd',
          borderRadius: 6,
          marginBottom: 10,
        }}
        role="combobox"
        aria-controls={listboxId}
        aria-expanded={true}
        aria-activedescendant={filtered[activeIndex] ? `option-${filtered[activeIndex].id}` : undefined}
      />
      <div id={listboxId} role="listbox" style={{ display: 'grid', gap: 8 }}>
        {filtered.map((it, i) => (
          <div
            key={it.id}
            id={`option-${it.id}`}
            role="option"
            aria-selected={i === activeIndex}
            style={{
              border: '1px solid #eee',
              borderRadius: 6,
              padding: 8,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              outline: i === activeIndex ? '2px solid #3b82f6' : 'none',
              background: i === activeIndex ? '#f7fbff' : 'transparent',
            }}
          >
            <div style={{ fontWeight: 600 }}>{it.title}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: 11 }}>
              {it.group && <span style={{ color: '#555' }}>grp:{it.group}</span>}
              {it.tags.map((t) => (
                <span key={t} style={{ color: '#666' }}>#{t}</span>
              ))}
            </div>
            <div style={{ color: '#555', fontSize: 12, whiteSpace: 'pre-wrap' }}>{it.content}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 11, color: '#999' }}>{new Date(it.updatedAt).toLocaleString()}</div>
              <button
                onClick={() => onCopy(it.content, it.id)}
                style={{
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid #ddd',
                  background: '#f8f8f8',
                  cursor: 'pointer',
                }}
              >
                {copiedId === it.id ? '已複製' : '複製'}
              </button>
            </div>
            {manualCopyId === it.id && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>無法自動複製，請手動選取複製：</div>
                <textarea id={`manual-copy-${it.id}`} readOnly value={it.content} rows={4} style={{ width: '100%', boxSizing: 'border-box' }} />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                  <button onClick={() => setManualCopyId(null)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd', background: '#f8f8f8', cursor: 'pointer' }}>關閉</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ color: '#666' }}>
            尚無資料，請至 Options 新增
          </div>
        )}
      </div>

      <hr style={{ margin: '16px 0' }} />
      <div>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>專業化（模板/LLM）</div>
        <div style={{ display: 'grid', gap: 8 }}>
          <textarea value={specSentence} onChange={(e) => setSpecSentence(e.target.value)} rows={3} placeholder="輸入要專業化的句子" style={{ width: '100%', boxSizing: 'border-box', padding: '6px 8px', border: '1px solid #ddd', borderRadius: 6 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <select value={specTpl} onChange={(e) => { setSpecTpl(e.target.value); setSpecVars({}); }} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: 6 }}>
              {builtins.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <div style={{ fontSize: 12, color: '#666', alignSelf: 'center' }}>使用：{apiKey && preferLlm ? 'LLM（可降級）' : '模板法' }（model: {model}）</div>
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            {builtins.find((b) => b.id === specTpl)?.variables.map((v) => (
              <input key={v} placeholder={`${v}`} value={specVars[v] || ''} onChange={(e) => setSpecVars({ ...specVars, [v]: e.target.value })} style={{ padding: '6px 8px', border: '1px solid #ddd', borderRadius: 6 }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              disabled={specLoading || !specSentence.trim() || readonly}
              onClick={async () => {
                setSpecLoading(true);
                try {
                  const client = getLlmClient({ key: apiKey, model, preferLlm: disableLlm ? false : preferLlm });
                  const res = await client.specialize({ sentence: specSentence, templateId: specTpl, variables: specVars });
                  setSpecOutput(res.output);
                  setSpecUsed(res.used);
                } finally {
                  setSpecLoading(false);
                }
              }}
              style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#f5f5f5', cursor: 'pointer' }}
            >
              {specLoading ? '生成中...' : '生成'}
            </button>
            <button
              disabled={!specOutput}
              onClick={() => specOutput && onCopy(specOutput, 'spec-output')}
              style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#f8f8f8', cursor: 'pointer' }}
            >
              複製
            </button>
            {!readonly && (
              <button
                disabled={!specOutput}
                onClick={async () => {
                  if (!specOutput) return;
                  const id = `spec-${Date.now()}`;
                  const item: PromptItem = { id, title: `專業化：${new Date().toLocaleString()}`, content: specOutput, tags: [], favorite: false, updatedAt: Date.now() };
                  await upsertItem(item);
                  const next = await listItems();
                  setItems(next);
                  setQuery('');
                  setActiveIndex(0);
                }}
                style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#f8f8f8', cursor: 'pointer' }}
              >
                儲存為新 Prompt
              </button>
            )}
          </div>
          {!!specOutput && (
            <div style={{ border: '1px solid #eee', borderRadius: 6, padding: 8, background: '#fafafa' }}>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>來源：{specUsed || '—'}{specUsed === 'rule' ? '（若有 Key 將優先嘗試 LLM，失敗自動切換）' : ''}</div>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{specOutput}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
