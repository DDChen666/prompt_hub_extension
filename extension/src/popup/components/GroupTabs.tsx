import React from 'react';
import type { Group } from '../../contracts/schemas';

interface GroupTabsProps {
  groups: Group[];
  selectedGroupId: string | null;
  onGroupSelect: (groupId: string | null) => void;
  onAddGroup: () => void;
}

// 漸層色配置 - 淡雅色系主題
const gradientColors = {
  blue: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
  green: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
  purple: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)',
  orange: 'linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)',
  pink: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)',
  custom: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)'
} as const;

const hoverGradientColors = {
  blue: 'linear-gradient(135deg, #dbeafe 0%, #93c5fd 100%)',
  green: 'linear-gradient(135deg, #bbf7d0 0%, #86efac 100%)',
  purple: 'linear-gradient(135deg, #e9d5ff 0%, #d8b4fe 100%)',
  orange: 'linear-gradient(135deg, #fed7aa 0%, #fdba74 100%)',
  pink: 'linear-gradient(135deg, #fbcfe8 0%, #f9a8d4 100%)',
  custom: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)'
} as const;

export function GroupTabs({ groups, selectedGroupId, onGroupSelect, onAddGroup }: GroupTabsProps) {
  return (
    <div style={{ 
      display: 'flex', 
      gap: 4, 
      marginBottom: 12,
      overflowX: 'auto',
      paddingBottom: 4,
      scrollbarWidth: 'none',
      msOverflowStyle: 'none'
    }}>
      {/* 全部群組選項 */}
      <button
        onClick={() => onGroupSelect(null)}
        style={{
          padding: '6px 12px',
          borderRadius: '6px 6px 0 0',
          border: '1px solid #ddd',
          borderBottom: selectedGroupId === null ? '2px solid #3b82f6' : '1px solid #ddd',
          background: selectedGroupId === null ? '#f8fafc' : '#fff',
          color: selectedGroupId === null ? '#1e40af' : '#374151',
          fontWeight: selectedGroupId === null ? 600 : 400,
          fontSize: 12,
          whiteSpace: 'nowrap',
          cursor: 'pointer',
          flexShrink: 0
        }}
      >
        全部
      </button>

      {/* 各個群組分頁 */}
      {groups.map((group) => (
        <button
          key={group.id}
          onClick={() => onGroupSelect(group.id)}
          style={{
            padding: '6px 12px',
            borderRadius: '6px 6px 0 0',
            border: '1px solid #ddd',
            borderBottom: selectedGroupId === group.id ? '2px solid #3b82f6' : '1px solid #ddd',
            background: selectedGroupId === group.id 
              ? gradientColors[group.color] 
              : '#fff',
            color: selectedGroupId === group.id ? '#1e293b' : '#374151',
            fontWeight: selectedGroupId === group.id ? 600 : 400,
            fontSize: 12,
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            if (selectedGroupId !== group.id) {
              e.currentTarget.style.background = hoverGradientColors[group.color];
            }
          }}
          onMouseLeave={(e) => {
            if (selectedGroupId !== group.id) {
              e.currentTarget.style.background = '#fff';
            }
          }}
        >
          {group.name}
        </button>
      ))}

      {/* 新增群組按鈕 */}
      <button
        onClick={onAddGroup}
        style={{
          padding: '6px 8px',
          borderRadius: '6px 6px 0 0',
          border: '1px solid #ddd',
          background: '#fff',
          color: '#6b7280',
          fontSize: 12,
          cursor: 'pointer',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 32
        }}
        title="新增群組"
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#f8fafc';
          e.currentTarget.style.color = '#3b82f6';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#fff';
          e.currentTarget.style.color = '#6b7280';
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
        </svg>
      </button>
    </div>
  );
}