import React, { useEffect, useMemo, useRef, useState } from 'react';
import { 
  listItems, onChanged, storage, upsertItem, getFlags, deleteItem, 
  listGroups, createGroup, onGroupsChanged, deleteGroup
} from '../lib/storage/indexed';
import { filterAndSort, filterByGroup } from '../lib/search/query';
import type { PromptItem, GradientColor } from '../contracts/schemas';
import { builtins } from '../lib/templates';
import { getLlmClient } from '../lib/llm';
import { GroupTabs } from './components/GroupTabs';
import { GroupModal } from './components/GroupModal';
import { PromptForm } from '../shared/components/PromptForm';
import { ConfirmModal } from '../shared/components/ConfirmModal';

function GearButton() {
  return (
    <button
      aria-label="開啟設定"
      title="開啟設定"
      onClick={() => chrome.runtime.openOptionsPage()}
      style={{
        position: 'absolute', top: 8, right: 8,
        padding: 6, borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer'
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M19.14,12.94a7.43,7.43,0,0,0,.05-1l2-1.55a.5.5,0,0,0,.12-.64l-1.9-3.29a.5.5,0,0,0-.6-.22l-2.34,1a7.22,7.22,0,0,0-1.73-1L14.4,2.7a.5.5,0,0,0-.49-.4H10.09a.5.5,0,0,0-.49.4L9,4.24a7.22,7.22,0,0,0-1.73,1l-2.34-1a.5.5,0,0,0-.6.22L2.43,7.79a.5.5,0,0,0,.12.64l2,1.55a7.43,7.43,0,0,0,0,2l-2,1.55a.5.5,0,0,0-.12.64l1.9,3.29a.5.5,0,0,0,.6.22l2.34-1a7.22,7.22,0,0,0,1.73,1l.61,1.54a.5.5,0,0,0,.49.4h3.82a.5.5,0,0,0,.49-.4l.61-1.54a7.22,7.22,0,0,0,1.73-1l2.34,1a.5.5,0,0,0,.6-.22l1.9-3.29a.5.5,0,0,0-.12-.64ZM12,15.5A3.5,3.5,0,1,1,15.5,12,3.5,3.5,0,0,1,12,15.5Z"/>
      </svg>
    </button>
  );
}

export default function App() {
  const [items, setItems] = useState<PromptItem[]>([]);
  const [groups, setGroups] = useState<Awaited<ReturnType<typeof listGroups>>>([]);
  const [query, setQuery] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
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
      const [currentItems, currentGroups] = await Promise.all([
        listItems(),
        listGroups()
      ]);
      setItems(currentItems);
      setGroups(currentGroups);
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
    
    const offItems = onChanged((next) => setItems(next));
    const offGroups = onGroupsChanged((next) => setGroups(next));
    
    // 全局鍵盤快捷鍵監聽
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Cmd+Shift+K - 切換群組選擇模式
      if (e.key === 'k' && e.metaKey && e.shiftKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        // 這裡可以實現群組選擇的鍵盤導航
        // 暫時先聚焦到搜索框
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    
    return () => {
      offItems();
      offGroups();
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  const filtered = useMemo(() => {
    let result = filterAndSort(items, query);
    // 應用群組過濾
    if (selectedGroupId !== null) {
      result = filterByGroup(result, selectedGroupId);
    }
    return result;
  }, [items, query, selectedGroupId]);

  useEffect(() => {
    // 查詢變更時重置 activeIndex
    setActiveIndex(0);
  }, [query, selectedGroupId]);

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

  const handleGroupSelect = (groupId: string | null) => {
    setSelectedGroupId(groupId);
    setQuery(''); // 切換群組時清空搜索
  };

  const handleAddGroup = () => {
    setIsGroupModalOpen(true);
  };

  const handleCreateGroup = async (data: { name: string; color: GradientColor }) => {
    try {
      await createGroup(data);
      setIsGroupModalOpen(false);
    } catch (error) {
      console.error('Failed to create group:', error);
    }
  };

  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<PromptItem | null>(null);
  
  // 確認對話框狀態
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'danger'
  });

  const handleEditPrompt = (prompt: PromptItem) => {
    setEditingPrompt(prompt);
    setIsPromptModalOpen(true);
  };

  const handleSavePrompt = async (data: Omit<PromptItem, 'id' | 'updatedAt'> & { id?: string }) => {
    try {
      const item: PromptItem = {
        id: data.id || `id-${Date.now()}`,
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
      setIsPromptModalOpen(false);
      setEditingPrompt(null);
    } catch (error) {
      console.error('Failed to save prompt:', error);
    }
  };

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
    <div style={{ position: 'relative' }}>
      <GearButton />
      <div style={{ width: 360, padding: 12, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Prompt Organizer (MVP)</h1>
      {readonly && (
        <div style={{ background: '#fff7ed', color: '#9a3412', border: '1px solid #fed7aa', padding: 8, borderRadius: 6, marginBottom: 8, fontSize: 12 }}>
          目前為唯讀模式：僅可複製
        </div>
      )}
      {/* 群組分頁 */}
      <GroupTabs
        groups={groups}
        selectedGroupId={selectedGroupId}
        onGroupSelect={handleGroupSelect}
        onAddGroup={handleAddGroup}
      />

      {/* 群組刪除按鈕（右下角） */}
      {selectedGroupId && !readonly && (
        <button
          aria-label="刪除群組"
          title="刪除群組"
          onClick={() => {
            const group = groups.find(g => g.id === selectedGroupId);
            if (group) {
              setConfirmModal({
                isOpen: true,
                title: '確認刪除群組',
                message: `你確定要刪除群組「${group.name}」嗎？此操作無法復原。`,
                type: 'danger',
                onConfirm: async () => {
                  await deleteGroup(selectedGroupId);
                  setSelectedGroupId(null);
                  setConfirmModal({ ...confirmModal, isOpen: false });
                }
              });
            }
          }}
          style={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            padding: '6px',
            borderRadius: 6,
            border: '1px solid #fca5a5',
            background: '#fff5f5',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#dc2626">
            <path d="M9 3h6a1 1 0 0 1 1 1v2h4v2H4V6h4V4a1 1 0 0 1 1-1Zm2 4h2V5h-2v2ZM7 10h2v9H7v-9Zm4 0h2v9h-2v-9Zm4 0h2v9h-2v-9Z"/>
          </svg>
        </button>
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
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
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
                {!readonly && (
                  <>
                    <button
                      aria-label="編輯"
                      title="編輯"
                      onClick={() => handleEditPrompt(it)}
                      style={{
                        padding: '6px',
                        borderRadius: 6,
                        border: '1px solid #ddd',
                        background: '#f8f8f8',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                      </svg>
                    </button>
                    <button
                      aria-label="刪除"
                      title="刪除"
                      onClick={() => {
                        setConfirmModal({
                          isOpen: true,
                          title: '確認刪除 Prompt',
                          message: `你確定要刪除「${it.title}」嗎？此操作無法復原。`,
                          type: 'danger',
                          onConfirm: async () => {
                            await deleteItem(it.id);
                            const next = await listItems();
                            setItems(next);
                            setConfirmModal({ ...confirmModal, isOpen: false });
                          }
                        });
                      }}
                      style={{
                        padding: '6px',
                        borderRadius: 6,
                        border: '1px solid #fca5a5',
                        background: '#fff5f5',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="#dc2626">
                        <path d="M9 3h6a1 1 0 0 1 1 1v2h4v2H4V6h4V4a1 1 0 0 1 1-1Zm2 4h2V5h-2v2ZM7 10h2v9H7v-9Zm4 0h2v9h-2v-9Zm4 0h2v9h-2v-9Z"/>
                      </svg>
                    </button>
                  </>
                )}
              </div>
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
          <div style={{ 
            color: '#666', 
            textAlign: 'center',
            padding: 20
          }}>
            <div style={{ marginBottom: 12 }}>
              尚無資料{selectedGroupId ? '在此群組中' : ''}
            </div>
            {!readonly && selectedGroupId && (
              <button
                onClick={() => {
                  // 快速新增到當前群組
                  setEditingPrompt({
                    id: '',
                    title: '',
                    content: '',
                    tags: [],
                    group: selectedGroupId,
                    favorite: false,
                    updatedAt: Date.now()
                  });
                  setIsPromptModalOpen(true);
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: '1px solid #3b82f6',
                  background: '#3b82f6',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                + 新增 Prompt
              </button>
            )}
            {!selectedGroupId && (
              <div style={{ fontSize: 12, color: '#999', marginTop: 8 }}>
                請至 Options 頁面新增
              </div>
            )}
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

    {/* 群組模態框 */}
    <GroupModal
      isOpen={isGroupModalOpen}
      onClose={() => setIsGroupModalOpen(false)}
      onSubmit={handleCreateGroup}
      mode="create"
    />

    {/* Prompt 編輯模態框 */}
    {isPromptModalOpen && (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          background: '#fff',
          padding: 20,
          borderRadius: 8,
          width: 400,
          maxWidth: '90vw',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600 }}>
            編輯 Prompt
          </h3>
          <PromptForm
            initialData={editingPrompt || undefined}
            onSubmit={handleSavePrompt}
            onCancel={() => {
              setIsPromptModalOpen(false);
              setEditingPrompt(null);
            }}
            submitButtonText="更新"
          />
        </div>
      </div>
    )}

    {/* 統一確認對話框 */}
    <ConfirmModal
      isOpen={confirmModal.isOpen}
      title={confirmModal.title}
      message={confirmModal.message}
      type={confirmModal.type}
      onConfirm={confirmModal.onConfirm}
      onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
      confirmText="確認刪除"
      cancelText="取消"
    />
  </div>
  );
}
