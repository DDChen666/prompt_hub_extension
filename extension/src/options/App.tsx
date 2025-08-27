import React, { useEffect, useState } from 'react';
import { storage, listItems, upsertItem, deleteItem, exportJSON, importJSON, getSitePolicy, setSitePolicy, getFlags, setFlags, exportAll } from '../lib/storage/indexed';
import type { PromptItem, Flags } from '../contracts/schemas';
import { PromptForm } from '../shared/components/PromptForm';

export default function OptionsApp() {
  const [key, setKey] = useState('');
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [model, setModel] = useState('gemini-2.5-flash');
  const [preferLlm, setPreferLlm] = useState(true);
  const [items, setItems] = useState<PromptItem[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [group, setGroup] = useState('');
  const [content, setContent] = useState('');
  const [favorite, setFavorite] = useState(false);
  // 站點策略
  const [allow, setAllow] = useState('');
  const [block, setBlock] = useState('');
  const [copy, setCopy] = useState('');
  // 旗標
  const [flags, setFlagsState] = useState<Flags>({ disableOverlay: false, disableLlm: false, readonly: false });

  useEffect(() => {
    (async () => {
      const k = await storage.getGeminiKey();
      if (k) setKey(k);
      const ts = await storage.getGeminiKeySavedAt();
      if (ts) setSavedAt(ts);
      const m = await storage.getGeminiModel();
      if (m) setModel(m);
      const pref = await storage.getPreferLlm();
      setPreferLlm(pref);
      const list = await listItems();
      setItems(list);
      // 載入站點策略
      try {
        const p = await getSitePolicy();
        setAllow((p.allowlist || []).join('\n'));
        setBlock((p.blocklist || []).join('\n'));
        setCopy((p.copyOnly || []).join('\n'));
      } catch { /* noop */ }
      // 載入旗標
      try {
        const f = await getFlags();
        setFlagsState(f);
      } catch { /* noop */ }
    })();
  }, []);

  async function onSave() {
    setSaving(true);
    try {
      const now = Date.now();
      await storage.setGeminiKey(key);
      await storage.setGeminiKeySavedAt(now);
      await storage.setGeminiModel(model);
      await storage.setPreferLlm(preferLlm);
      setSavedAt(now);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: '24px auto', padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Options</h1>
      <label style={{ display: 'block', marginBottom: 6 }}>Gemini API Key</label>
      <input
        value={key}
        onChange={(e) => setKey(e.target.value)}
        placeholder="輸入 Gemini API Key"
        style={{ width: '98%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, boxSizing: 'border-box' }}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 10 }}>
        <div>
          <label style={{ display: 'block', marginBottom: 6 }}>Model（預設 gemini-2.5-flash）</label>
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="gemini-2.5-flash"
            style={{ width: '98%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6, boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'end' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <input type="checkbox" checked={preferLlm} onChange={(e) => setPreferLlm(e.target.checked)} />
            優先使用 LLM（有 Key 時）
          </label>
        </div>
      </div>
      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <button
          onClick={onSave}
          disabled={saving}
          style={{
            padding: '8px 12px',
            borderRadius: 6,
            border: '1px solid #ddd',
            background: '#f5f5f5',
            cursor: 'pointer',
          }}
        >
          {saving ? '儲存中...' : '儲存'}
        </button>
      </div>
      <div style={{ marginTop: 12, fontSize: 12, color: '#666' }}>
        最近儲存：{savedAt ? new Date(savedAt).toLocaleString() : '—'}
      </div>

      <hr style={{ margin: '24px 0' }} />
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>站點策略</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Allowlist（每行一條，支援 *.domain.com）</div>
          <textarea value={allow} onChange={(e) => setAllow(e.target.value)} rows={6} style={{ width: '100%', boxSizing: 'border-box', padding: '8px', border: '1px solid #ddd', borderRadius: 6 }} />
        </div>
        <div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Blocklist</div>
          <textarea value={block} onChange={(e) => setBlock(e.target.value)} rows={6} style={{ width: '100%', boxSizing: 'border-box', padding: '8px', border: '1px solid #ddd', borderRadius: 6 }} />
        </div>
        
        <div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Copy-only</div>
          <textarea value={copy} onChange={(e) => setCopy(e.target.value)} rows={6} style={{ width: '100%', boxSizing: 'border-box', padding: '8px', border: '1px solid #ddd', borderRadius: 6 }} />
        </div>
      </div>
      <div style={{ marginTop: 10 }}>
        <button
          onClick={async () => {
            const toArr = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);
            await setSitePolicy({ allowlist: toArr(allow), blocklist: toArr(block), copyOnly: toArr(copy) });
            alert('站點策略已儲存');
          }}
          style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#f5f5f5', cursor: 'pointer' }}
        >儲存站點策略</button>
      </div>

      <hr style={{ margin: '24px 0' }} />
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>功能旗標（保險絲）</h2>
      <div style={{ display: 'grid', gap: 8 }}>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={flags.disableOverlay} onChange={(e) => setFlagsState({ ...flags, disableOverlay: e.target.checked })} />
          Disable Overlay（停用快捷鍵注入）
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={flags.disableLlm} onChange={(e) => setFlagsState({ ...flags, disableLlm: e.target.checked })} />
          Disable LLM（僅使用模板法）
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={flags.readonly} onChange={(e) => setFlagsState({ ...flags, readonly: e.target.checked })} />
          Readonly 模式（Popup 僅可複製，禁新增/更新/刪除）
        </label>
      </div>
      <div style={{ marginTop: 10 }}>
        <button
          onClick={async () => { await setFlags(flags); alert('功能旗標已儲存'); }}
          style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#f5f5f5', cursor: 'pointer' }}
        >儲存旗標</button>
      </div>

      <div style={{ marginTop: 16 }}>
        <button
          onClick={async () => {
            const bundle = await exportAll();
            const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = 'export_all.json'; a.click(); URL.revokeObjectURL(url);
          }}
          style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#f5f5f5', cursor: 'pointer' }}
        >一鍵匯出全部</button>
      </div>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Prompt 管理</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'calc(50% - 10px) calc(50% - 10px)', gap: 20, alignItems: 'start' }}>
        <div>
          <PromptForm
            initialData={currentId ? {
              id: currentId,
              title,
              tags: tags.split(',').map(s => s.trim()).filter(Boolean),
              group: group || undefined,
              content,
              favorite
            } : undefined}
            onSubmit={async (data) => {
              const id = data.id || `id-${Date.now()}`;
              const item: PromptItem = {
                id,
                title: data.title,
                content: data.content,
                tags: data.tags,
                group: data.group,
                favorite: data.favorite,
                updatedAt: Date.now(),
              };
              
              await upsertItem(item);
              const next = await listItems();
              setItems(next);
              setCurrentId(id);
              
              // 更新本地表單狀態
              setTitle(item.title);
              setTags(item.tags.join(', '));
              setGroup(item.group || '');
              setContent(item.content);
              setFavorite(item.favorite);
            }}
            submitButtonText={currentId ? '更新' : '新增'}
          />
          
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button
              onClick={async () => {
                const bundle = await exportJSON();
                const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'exportBundle.json';
                a.click();
                URL.revokeObjectURL(url);
              }}
              style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#f5f5f5', cursor: 'pointer' }}
            >
              匯出 JSON
            </button>
            <label style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#f5f5f5', cursor: 'pointer' }}>
              匯入 JSON
              <input
                type="file"
                accept="application/json"
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const text = await f.text();
                  const json = JSON.parse(text);
                  const result = await importJSON(json);
                  const next = await listItems();
                  setItems(next);
                  alert(`已匯入 ${result.imported} 筆`);
                }}
              />
            </label>
          </div>
        </div>
        <div style={{ width: '98%', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontWeight: 600 }}>目前項目（{items.length}）</div>
            <button
              onClick={() => {
                setCurrentId(null);
                setTitle('');
                setTags('');
                setGroup('');
                setContent('');
                setFavorite(false);
              }}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd', background: '#f8f8f8', cursor: 'pointer' }}
            >
              清空表單
            </button>
          </div>
          <div style={{ maxHeight: 360, overflow: 'auto', display: 'grid', gap: 8 }}>
            {items.map((it) => (
              <div key={it.id} style={{ border: '1px solid #eee', borderRadius: 6, padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 600 }}>{it.title}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => {
                        setCurrentId(it.id);
                        setTitle(it.title);
                        setTags(it.tags.join(', '));
                        setGroup(it.group || '');
                        setContent(it.content);
                        setFavorite(it.favorite);
                      }}
                      style={{ 
                        padding: '6px', 
                        borderRadius: 6, 
                        border: '1px solid #ddd', 
                        background: '#f8f8f8', 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="編輯"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                      </svg>
                    </button>
                    <button
                      onClick={async () => {
                        await deleteItem(it.id);
                        const next = await listItems();
                        setItems(next);
                        if (currentId === it.id) {
                          setCurrentId(null);
                        }
                      }}
                      style={{ 
                        padding: '6px', 
                        borderRadius: 6, 
                        border: '1px solid #fca5a5', 
                        background: '#fff5f5', 
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="刪除"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="#dc2626">
                        <path d="M9 3h6a1 1 0 0 1 1 1v2h4v2H4V6h4V4a1 1 0 0 1 1-1Zm2 4h2V5h-2v2ZM7 10h2v9H7v-9Zm4 0h2v9h-2v-9Zm4 0h2v9h-2v-9Z"/>
                      </svg>
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: 11 }}>
                  {it.group && <span style={{ color: '#555' }}>grp:{it.group}</span>}
                  {it.tags.map((t) => (
                    <span key={t} style={{ color: '#666' }}>#{t}</span>
                  ))}
                </div>
                <div style={{ color: '#555', fontSize: 12, whiteSpace: 'pre-wrap' }}>{it.content}</div>
              </div>
            ))}
            {items.length === 0 && <div style={{ color: '#666' }}>尚無資料</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
