import { FC, useState, useEffect, useRef } from 'react';
import { useTranslation } from '../../node_modules/react-i18next';
import { NodeGroup } from '../types';
import { groupManager } from '../services/groupManager';
import { solitudeTheme } from '../styles/theme';
import * as Icons from './Icons';
import { TrashIcon } from './UIIcons';

interface GroupManagerPanelProps {
  selectedGroupIds: Set<string>;
  onGroupSelectionChange: (groupIds: Set<string>) => void;
  onClose?: () => void;
}

const GroupManagerPanel: FC<GroupManagerPanelProps> = ({
  selectedGroupIds,
  onGroupSelectionChange,
  onClose,
}) => {
  const { t } = useTranslation();
  const [groups, setGroups] = useState<NodeGroup[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [position, setPosition] = useState({ x: window.innerWidth - 340, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load initial groups
    setGroups(groupManager.getAllGroups());
    
    // Listen for group changes
    const handleGroupsChanged = (updatedGroups: NodeGroup[]) => {
      setGroups(updatedGroups);
    };
    
    const handleGroupDeleted = (deletedGroupId: string) => {
      // Remove deleted group from selection
      if (selectedGroupIds.has(deletedGroupId)) {
        const newSelection = new Set(selectedGroupIds);
        newSelection.delete(deletedGroupId);
        onGroupSelectionChange(newSelection);
      }
    };

    groupManager.on('groups:changed', handleGroupsChanged);
    groupManager.on('group:deleted', handleGroupDeleted);
    
    return () => {
      groupManager.off('groups:changed', handleGroupsChanged);
      groupManager.off('group:deleted', handleGroupDeleted);
    };
  }, [selectedGroupIds, onGroupSelectionChange]);

  const resetForm = () => {
    setFormData({ name: '', description: '', color: '' });
    setFormErrors({});
    setEditingGroupId(null);
  };

  const handleCreateGroup = () => {
    const validation = groupManager.validateGroupName(formData.name);
    if (!validation.valid) {
      setFormErrors({ name: validation.error! });
      return;
    }

    try {
      const availableColors = groupManager.getAvailableColors();
      const color = formData.color || availableColors[0] || '#E3F2FD';
      
      groupManager.createGroup(formData.name, formData.description, color);
      
      resetForm();
      setShowCreateForm(false);
    } catch (error) {
      setFormErrors({ general: t('groups.failedToCreate') });
    }
  };

  const handleEditGroup = (group: NodeGroup) => {
    setFormData({
      name: group.name,
      description: group.description || '',
      color: group.color,
    });
    setEditingGroupId(group.id);
    setShowCreateForm(true);
  };

  const handleUpdateGroup = () => {
    if (!editingGroupId) return;

    const validation = groupManager.validateGroupName(formData.name);
    if (!validation.valid && !groupManager.isGroupNameUnique(formData.name, editingGroupId)) {
      setFormErrors({ name: validation.error! });
      return;
    }

    try {
      groupManager.updateGroup(editingGroupId, {
        name: formData.name,
        description: formData.description,
        color: formData.color,
      });
      
      resetForm();
      setShowCreateForm(false);
    } catch (error) {
      setFormErrors({ general: t('groups.failedToUpdate') });
    }
  };

  const handleDeleteGroup = (groupId: string) => {
    if (window.confirm(t('groups.confirmDelete'))) {
      groupManager.deleteGroup(groupId);
    }
  };

  const handleGroupToggle = (groupId: string) => {
    const newSelection = new Set(selectedGroupIds);
    if (newSelection.has(groupId)) {
      newSelection.delete(groupId);
    } else {
      newSelection.add(groupId);
    }
    onGroupSelectionChange(newSelection);
  };

  const handleSelectAllGroups = () => {
    if (selectedGroupIds.size === groups.length) {
      // Deselect all
      onGroupSelectionChange(new Set());
    } else {
      // Select all
      onGroupSelectionChange(new Set(groups.map(g => g.id)));
    }
  };

  // Handle drag functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, select')) {
      return; // Don't start drag if clicking on interactive elements
    }
    
    const rect = panelRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setIsDragging(true);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    
    // Keep panel within viewport bounds
    const maxX = window.innerWidth - 320; // panel width
    const maxY = window.innerHeight - 100; // minimum space from bottom
    
    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY)),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add global mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none'; // Prevent text selection while dragging
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.userSelect = '';
      };
    }
  }, [isDragging, dragOffset]);

  const panelStyle = {
    position: 'fixed' as const,
    left: `${position.x}px`,
    top: `${position.y}px`,
    backgroundColor: solitudeTheme.colors.background,
    border: `1px solid ${solitudeTheme.colors.border}`,
    borderRadius: solitudeTheme.borderRadius.lg,
    padding: solitudeTheme.spacing.md,
    width: '320px',
    maxHeight: 'calc(100vh - 100px)',
    overflowY: 'auto' as const,
    boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.3)' : '0 4px 16px rgba(0,0,0,0.2)',
    zIndex: 99996,
    cursor: isDragging ? 'grabbing' : 'grab',
    transition: isDragging ? 'none' : 'box-shadow 0.2s ease',
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: solitudeTheme.spacing.md,
    borderBottom: `1px solid ${solitudeTheme.colors.border}`,
    paddingBottom: solitudeTheme.spacing.sm,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  const buttonStyle = {
    padding: solitudeTheme.spacing.sm,
    borderRadius: solitudeTheme.borderRadius.sm,
    border: `1px solid ${solitudeTheme.colors.border}`,
    backgroundColor: solitudeTheme.colors.surface,
    color: solitudeTheme.colors.textPrimary,
    cursor: 'pointer',
    fontSize: solitudeTheme.typography.fontSize.sm,
    fontWeight: solitudeTheme.typography.fontWeight.medium,
    minWidth: '80px',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const primaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: solitudeTheme.colors.accent,
    color: 'white',
    borderColor: solitudeTheme.colors.accent,
    minWidth: '90px',
  };

  const inputStyle = {
    width: '100%',
    padding: solitudeTheme.spacing.sm,
    border: `1px solid ${solitudeTheme.colors.border}`,
    borderRadius: solitudeTheme.borderRadius.sm,
    fontSize: solitudeTheme.typography.fontSize.sm,
    marginBottom: solitudeTheme.spacing.sm,
  };

  const groupItemStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: solitudeTheme.spacing.sm,
    marginBottom: solitudeTheme.spacing.xs,
    borderRadius: solitudeTheme.borderRadius.md,
    border: `1px solid ${solitudeTheme.colors.border}`,
    backgroundColor: solitudeTheme.colors.surface,
  };

  return (
    <div 
      ref={panelRef}
      style={panelStyle}
      onMouseDown={handleMouseDown}
    >
      <div style={headerStyle}>
        <h3 style={{ margin: 0, color: solitudeTheme.colors.textPrimary }}>
          {t('groups.title')}
        </h3>
        <div style={{ display: 'flex', gap: solitudeTheme.spacing.sm }}>
          <button
            style={{
              ...buttonStyle,
              minWidth: '100px',
            }}
            onClick={() => setShowCreateForm(!showCreateForm)}
            title="Create new group"
          >
            {showCreateForm ? t('groups.cancel') : t('groups.newGroup')}
          </button>
          {onClose && (
            <button
              style={{
                ...buttonStyle,
                minWidth: '32px',
                padding: '8px',
              }}
              onClick={onClose}
              title="Close group manager"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <div style={{
          marginBottom: solitudeTheme.spacing.md,
          padding: solitudeTheme.spacing.md,
          backgroundColor: solitudeTheme.colors.surfaceHover,
          borderRadius: solitudeTheme.borderRadius.md,
        }}>
          <h4 style={{ margin: `0 0 ${solitudeTheme.spacing.sm} 0` }}>
            {editingGroupId ? t('groups.editGroup') : t('groups.createNewGroup')}
          </h4>
          
          {formErrors.general && (
            <div style={{ color: solitudeTheme.colors.error, fontSize: solitudeTheme.typography.fontSize.sm, marginBottom: solitudeTheme.spacing.sm }}>
              {formErrors.general}
            </div>
          )}

          <input
            style={{
              ...inputStyle,
              borderColor: formErrors.name ? solitudeTheme.colors.error : solitudeTheme.colors.border,
            }}
            type="text"
            placeholder={t('groups.namePlaceholder')}
            value={formData.name}
            onChange={(e) => {
              setFormData({ ...formData, name: e.target.value });
              if (formErrors.name) setFormErrors({ ...formErrors, name: '' });
            }}
          />
          {formErrors.name && (
            <div style={{ color: solitudeTheme.colors.error, fontSize: solitudeTheme.typography.fontSize.xs, marginTop: '-8px', marginBottom: solitudeTheme.spacing.sm }}>
              {formErrors.name}
            </div>
          )}

          <input
            style={inputStyle}
            type="text"
            placeholder={t('groups.descriptionPlaceholder')}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />

          <div style={{ marginBottom: solitudeTheme.spacing.sm }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label style={{ fontSize: solitudeTheme.typography.fontSize.sm }}>
                {t('groups.color')}
              </label>
              <button
                type="button"
                style={{
                  padding: '2px 6px',
                  fontSize: '10px',
                  borderRadius: '4px',
                  border: `1px solid ${solitudeTheme.colors.border}`,
                  backgroundColor: solitudeTheme.colors.surface,
                  color: solitudeTheme.colors.textSecondary,
                  cursor: 'pointer',
                }}
                onClick={() => {
                  const randomColor = groupManager.generateRandomColorPalette(1)[0];
                  setFormData({ ...formData, color: randomColor });
                }}
                title={t('groups.generateRandomColor') || 'Generate random color'}
              >
                🎲 Random
              </button>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              {groupManager.getAllAvailableColors().slice(0, 30).map(color => (
                <button
                  key={color}
                  type="button"
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    border: formData.color === color ? '3px solid #333' : '1px solid #ccc',
                    backgroundColor: color,
                    cursor: 'pointer',
                  }}
                  onClick={() => setFormData({ ...formData, color })}
                  title={color}
                />
              ))}
              <button
                type="button"
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  border: '2px dashed #999',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                }}
                onClick={() => {
                  const randomColors = groupManager.generateRandomColorPalette(8);
                  setFormData({ ...formData, color: randomColors[0] });
                }}
                title={t('groups.moreColors') || 'More random colors'}
              >
                +
              </button>
            </div>
            {formData.color && (
              <div style={{ 
                marginTop: '8px', 
                fontSize: '11px', 
                color: solitudeTheme.colors.textSecondary,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                Selected: 
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: formData.color,
                  border: '1px solid #ccc',
                }} />
                {formData.color}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: solitudeTheme.spacing.sm }}>
            <button
              style={{
                ...primaryButtonStyle,
                minWidth: '80px',
              }}
              onClick={editingGroupId ? handleUpdateGroup : handleCreateGroup}
              disabled={!formData.name.trim()}
            >
              {editingGroupId ? t('groups.update') : t('groups.create')}
            </button>
            <button
              style={{
                ...buttonStyle,
                minWidth: '80px',
              }}
              onClick={() => {
                resetForm();
                setShowCreateForm(false);
              }}
            >
              {t('groups.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Groups List */}
      <div style={{ marginBottom: solitudeTheme.spacing.md }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: solitudeTheme.spacing.sm,
        }}>
          <h4 style={{ margin: 0 }}>{t('groups.groupsList', { count: groups.length })}</h4>
          {groups.length > 0 && (
            <button
              style={{
                ...buttonStyle,
                fontSize: solitudeTheme.typography.fontSize.xs,
                padding: `${solitudeTheme.spacing.xs} ${solitudeTheme.spacing.sm}`,
                minWidth: '100px',
              }}
              onClick={handleSelectAllGroups}
            >
              {selectedGroupIds.size === groups.length ? t('groups.deselectAll') : t('groups.selectAll')}
            </button>
          )}
        </div>

        {groups.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: solitudeTheme.spacing.lg,
            color: solitudeTheme.colors.textSecondary,
            fontSize: solitudeTheme.typography.fontSize.sm,
          }}>
            {t('groups.noGroups')}
          </div>
        ) : (
          groups.map(group => (
            <div key={group.id} style={groupItemStyle}>
              <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <input
                  type="checkbox"
                  checked={selectedGroupIds.has(group.id)}
                  onChange={() => handleGroupToggle(group.id)}
                  style={{ marginRight: solitudeTheme.spacing.sm }}
                />
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    backgroundColor: group.color,
                    border: '1px solid #ccc',
                    marginRight: solitudeTheme.spacing.sm,
                  }}
                />
                <div>
                  <div style={{ 
                    fontSize: solitudeTheme.typography.fontSize.sm,
                    fontWeight: solitudeTheme.typography.fontWeight.medium,
                  }}>
                    {group.name}
                  </div>
                  {group.description && (
                    <div style={{ 
                      fontSize: solitudeTheme.typography.fontSize.xs,
                      color: solitudeTheme.colors.textSecondary,
                    }}>
                      {group.description}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  style={{
                    ...buttonStyle,
                    padding: '4px',
                    fontSize: '12px',
                    minWidth: '28px',
                    width: '28px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onClick={() => handleEditGroup(group)}
                  title="Edit group"
                >
                  ✏️
                </button>
                <button
                  style={{
                    ...buttonStyle,
                    padding: '4px',
                    fontSize: '12px',
                    minWidth: '28px',
                    width: '28px',
                    height: '28px',
                    borderColor: solitudeTheme.colors.error,
                    color: solitudeTheme.colors.error,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onClick={() => handleDeleteGroup(group.id)}
                  title="Delete group"
                >
                  <TrashIcon size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Filter Status */}
      {selectedGroupIds.size > 0 && (
        <div style={{
          padding: solitudeTheme.spacing.sm,
          backgroundColor: solitudeTheme.colors.accent + '20',
          borderRadius: solitudeTheme.borderRadius.md,
          fontSize: solitudeTheme.typography.fontSize.sm,
          color: solitudeTheme.colors.textPrimary,
        }}>
          {t('groups.filteringBy', { count: selectedGroupIds.size })}
        </div>
      )}
    </div>
  );
};

export default GroupManagerPanel;