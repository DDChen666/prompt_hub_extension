import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'warning' | 'info';
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = '確認',
  cancelText = '取消',
  onConfirm,
  onCancel,
  type = 'danger'
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const typeStyles = {
    danger: {
      border: '#fecaca',
      background: '#fef2f2',
      text: '#dc2626'
    },
    warning: {
      border: '#fed7aa',
      background: '#fff7ed',
      text: '#ea580c'
    },
    info: {
      border: '#bfdbfe',
      background: '#eff6ff',
      text: '#1d4ed8'
    }
  };

  const currentStyle = typeStyles[type];

  return (
    <div
      style={{
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
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: '#fff',
          padding: '24px',
          borderRadius: '12px',
          width: '320px',
          maxWidth: '90vw',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
          border: `2px solid ${currentStyle.border}`
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          marginBottom: '16px',
          color: currentStyle.text
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '8px' }}>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
          <h3 style={{ 
            margin: 0, 
            fontSize: '18px', 
            fontWeight: 600 
          }}>
            {title}
          </h3>
        </div>
        
        <p style={{ 
          margin: '0 0 24px 0', 
          color: '#374151', 
          lineHeight: 1.5,
          fontSize: '14px'
        }}>
          {message}
        </p>
        
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          justifyContent: 'flex-end' 
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              background: 'white',
              color: '#374151',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid transparent',
              background: currentStyle.text,
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}