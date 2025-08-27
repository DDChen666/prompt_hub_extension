import React, { useState } from 'react';
import type { PromptItem } from '../../contracts/schemas';
import { GroupDropdown } from './GroupDropdown';

interface PromptFormProps {
  initialData?: Partial<PromptItem>;
  onSubmit: (data: Omit<PromptItem, 'id' | 'updatedAt'> & { id?: string }) => void;
  onCancel?: () => void;
  fixedGroupId?: string;
  submitButtonText?: string;
}

export function PromptForm({ 
  initialData, 
  onSubmit, 
  onCancel, 
  fixedGroupId,
  submitButtonText = '儲存' 
}: PromptFormProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [tags, setTags] = useState(initialData?.tags?.join(', ') || '');
  const [groupId, setGroupId] = useState(initialData?.group || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [favorite, setFavorite] = useState(initialData?.favorite || false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !content.trim()) {
      alert('標題與內容為必填');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        id: initialData?.id,
        title: title.trim(),
        content: content.trim(),
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        group: fixedGroupId || groupId || undefined,
        favorite
      });
      
      // 如果不是編輯模式，清空表單
      if (!initialData?.id) {
        setTitle('');
        setTags('');
        setGroupId('');
        setContent('');
        setFavorite(false);
      }
    } catch (error) {
      console.error('Failed to submit prompt:', error);
      alert('儲存失敗');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGroupCreated = (group: any) => {
    // 群組創建成功後，可以選擇執行一些操作
    console.log('Group created:', group);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
      <div>
        <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>
          標題 *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="輸入提示詞標題"
          style={{ 
            width: '100%', 
            padding: '8px 12px', 
            border: '1px solid #d1d5db', 
            borderRadius: 6,
            boxSizing: 'border-box'
          }}
          required
        />
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>
          標籤
        </label>
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="逗號分隔多個標籤（例如: tag1, tag2）"
          style={{ 
            width: '100%', 
            padding: '8px 12px', 
            border: '1px solid #d1d5db', 
            borderRadius: 6,
            boxSizing: 'border-box'
          }}
        />
      </div>

      {!fixedGroupId && (
        <div>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>
            群組
          </label>
          <GroupDropdown
            value={groupId}
            onChange={setGroupId}
            onGroupCreated={handleGroupCreated}
            includeEmptyOption={true}
          />
        </div>
      )}

      {fixedGroupId && (
        <div>
          <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>
            群組
          </label>
          <div style={{ 
            padding: '8px 12px', 
            border: '1px solid #e5e7eb', 
            borderRadius: 6, 
            background: '#f9fafb',
            color: '#6b7280'
          }}>
            已鎖定：{fixedGroupId}
          </div>
        </div>
      )}

      <div>
        <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>
          內容 *
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="輸入提示詞內容"
          rows={6}
          style={{ 
            width: '100%', 
            padding: '8px 12px', 
            border: '1px solid #d1d5db', 
            borderRadius: 6,
            boxSizing: 'border-box',
            resize: 'vertical'
          }}
          required
        />
      </div>

      <div>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={favorite}
            onChange={(e) => setFavorite(e.target.checked)}
          />
          加入最愛
        </label>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{ 
              padding: '8px 16px', 
              borderRadius: 6, 
              border: '1px solid #d1d5db', 
              background: 'white',
              cursor: 'pointer'
            }}
          >
            取消
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting || !title.trim() || !content.trim()}
          style={{ 
            padding: '8px 16px', 
            borderRadius: 6, 
            border: '1px solid #3b82f6', 
            background: '#3b82f6', 
            color: 'white',
            cursor: !isSubmitting && title.trim() && content.trim() ? 'pointer' : 'not-allowed',
            opacity: !isSubmitting && title.trim() && content.trim() ? 1 : 0.6
          }}
        >
          {isSubmitting ? '儲存中...' : submitButtonText}
        </button>
      </div>
    </form>
  );
}