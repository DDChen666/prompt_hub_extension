import React, { useState } from 'react';
import type { GradientColor } from '../../contracts/schemas';

interface GroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; color: GradientColor }) => void;
  initialData?: { name: string; color: GradientColor };
  mode: 'create' | 'edit';
}

const colorOptions = [
  { value: 'blue' as const, label: '淡藍', preview: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)' },
  { value: 'green' as const, label: '淡綠', preview: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)' },
  { value: 'purple' as const, label: '淡紫', preview: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)' },
  { value: 'orange' as const, label: '淡橙', preview: 'linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)' },
  { value: 'pink' as const, label: '淡粉', preview: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)' }
];

export function GroupModal({ isOpen, onClose, onSubmit, initialData, mode }: GroupModalProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [color, setColor] = useState<GradientColor>(initialData?.color || 'blue');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit({ name: name.trim(), color });
      setName('');
      setColor('blue');
    }
  };

  const handleClose = () => {
    onClose();
    setName(initialData?.name || '');
    setColor(initialData?.color || 'blue');
  };

  return (
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
        width: 320,
        maxWidth: '90vw',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600 }}>
          {mode === 'create' ? '新增群組' : '編輯群組'}
        </h3>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>
              群組名稱
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="輸入群組名稱"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                fontSize: 14
              }}
              autoFocus
              maxLength={50}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>
              顏色選擇
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {colorOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setColor(option.value)}
                  style={{
                    padding: '8px 12px',
                    border: `2px solid ${color === option.value ? '#3b82f6' : '#e5e7eb'}`,
                    borderRadius: 6,
                    background: option.preview,
                    color: color === option.value ? '#1e40af' : '#374151',
                    fontWeight: color === option.value ? 600 : 400,
                    fontSize: 12,
                    cursor: 'pointer',
                    minWidth: 60,
                    transition: 'all 0.2s ease'
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleClose}
              style={{
                padding: '8px 16px',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                background: '#fff',
                color: '#374151',
                cursor: 'pointer',
                fontSize: 14
              }}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              style={{
                padding: '8px 16px',
                border: '1px solid #3b82f6',
                borderRadius: 6,
                background: '#3b82f6',
                color: '#fff',
                cursor: name.trim() ? 'pointer' : 'not-allowed',
                opacity: name.trim() ? 1 : 0.6,
                fontSize: 14
              }}
            >
              {mode === 'create' ? '建立' : '更新'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}