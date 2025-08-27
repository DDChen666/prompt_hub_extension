import React, { useState } from 'react';
import type { Group, GradientColor } from '../../contracts/schemas';
import { createGroup, listGroups } from '../../lib/storage/indexed';

interface GroupDropdownProps {
  value: string;
  onChange: (groupId: string) => void;
  onGroupCreated?: (group: Group) => void;
  disabled?: boolean;
  includeEmptyOption?: boolean;
}

export function GroupDropdown({ 
  value, 
  onChange, 
  onGroupCreated, 
  disabled = false,
  includeEmptyOption = true 
}: GroupDropdownProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState<GradientColor>('blue');

  // 加載群組列表
  React.useEffect(() => {
    const loadGroups = async () => {
      try {
        const groupList = await listGroups();
        setGroups(groupList);
      } catch (error) {
        console.error('Failed to load groups:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadGroups();
  }, []);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    
    setIsCreating(true);
    try {
      const group = await createGroup({
        name: newGroupName.trim(),
        color: newGroupColor
      });
      
      // 更新本地群組列表
      setGroups(prev => [...prev, group]);
      
      // 自動選擇新創建的群組
      onChange(group.id);
      
      // 通知父組件
      onGroupCreated?.(group);
      
      // 重置表單
      setNewGroupName('');
      setNewGroupColor('blue');
    } catch (error) {
      console.error('Failed to create group:', error);
      alert('創建群組失敗');
    } finally {
      setIsCreating(false);
    }
  };

  const colorOptions = [
    { value: 'blue' as const, label: '淡藍' },
    { value: 'green' as const, label: '淡綠' },
    { value: 'purple' as const, label: '淡紫' },
    { value: 'orange' as const, label: '淡橙' },
    { value: 'pink' as const, label: '淡粉' }
  ];

  if (isLoading) {
    return (
      <select 
        disabled 
        style={{ width: '98%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6 }}
      >
        <option>載入中...</option>
      </select>
    );
  }

  return (
    <div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        style={{ width: '98%', padding: '8px 10px', border: '1px solid #ddd', borderRadius: 6 }}
      >
        {includeEmptyOption && (
          <option value="">無群組</option>
        )}
        {groups.map((group) => (
          <option key={group.id} value={group.id}>
            {group.name}
          </option>
        ))}
        <option value="__create__">+ 新增群組</option>
      </select>

      {value === '__create__' && (
        <div style={{ 
          marginTop: 8, 
          padding: 12, 
          border: '1px solid #e5e7eb', 
          borderRadius: 6, 
          background: '#f9fafb' 
        }}>
          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>
              新群組名稱
            </label>
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="輸入群組名稱"
              style={{ 
                width: '100%', 
                padding: '6px 8px', 
                border: '1px solid #d1d5db', 
                borderRadius: 4 
              }}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 14 }}>
              顏色
            </label>
            <select
              value={newGroupColor}
              onChange={(e) => setNewGroupColor(e.target.value as GradientColor)}
              style={{ 
                width: '100%', 
                padding: '6px 8px', 
                border: '1px solid #d1d5db', 
                borderRadius: 4 
              }}
            >
              {colorOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleCreateGroup}
              disabled={!newGroupName.trim() || isCreating}
              style={{ 
                padding: '6px 12px', 
                borderRadius: 4, 
                border: '1px solid #3b82f6', 
                background: '#3b82f6', 
                color: 'white',
                cursor: newGroupName.trim() && !isCreating ? 'pointer' : 'not-allowed',
                opacity: newGroupName.trim() && !isCreating ? 1 : 0.6
              }}
            >
              {isCreating ? '創建中...' : '創建群組'}
            </button>
            <button
              onClick={() => onChange('')}
              style={{ 
                padding: '6px 12px', 
                borderRadius: 4, 
                border: '1px solid #d1d5db', 
                background: 'white',
                cursor: 'pointer'
              }}
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}