import { FC, useState, useEffect, useRef } from 'react';
import { Node } from 'reactflow';
import { useTranslation } from '../../node_modules/react-i18next';
import { NodeGroup } from '../types';
import { groupManager } from '../services/groupManager';
import { useTheme } from '../contexts/ThemeContext';
import { getTheme } from '../utils/theme';
import { isTauri } from '../utils/platform';
import '../styles/scrollbar.css';

interface PropertiesPanelProps {
  selectedNode: Node | null;
  onNodeUpdate: (nodeId: string, data: any) => void;
  onNodeTypeChange?: (nodeId: string, newType: string) => void;
  onClose?: () => void;
  onEditingChange?: (isEditing: boolean) => void;
}

const PropertiesPanel: FC<PropertiesPanelProps> = ({ selectedNode, onNodeUpdate, onNodeTypeChange, onClose, onEditingChange }) => {
  const [nodeData, setNodeData] = useState<any>({});
  const [availableGroups, setAvailableGroups] = useState<NodeGroup[]>([]);
  const [position, setPosition] = useState({ x: window.innerWidth - 320, y: isTauri() ? 42 : 10 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);
  const { isDark } = useTheme();
  const theme = getTheme(isDark);
  const { t } = useTranslation();

  useEffect(() => {
    if (selectedNode) {
      setNodeData(selectedNode.data);
    }
  }, [selectedNode]);

  useEffect(() => {
    // Load available groups
    setAvailableGroups(groupManager.getAllGroups());
    
    // Listen for group changes
    const handleGroupsChanged = (groups: NodeGroup[]) => {
      setAvailableGroups(groups);
    };
    
    groupManager.on('groups:changed', handleGroupsChanged);
    
    return () => {
      groupManager.off('groups:changed', handleGroupsChanged);
    };
  }, []);

  const handleInputChange = (field: string, value: string) => {
    const updatedData = { ...nodeData, [field]: value };
    setNodeData(updatedData);
    if (selectedNode) {
      onNodeUpdate(selectedNode.id, updatedData);
    }
  };

  const handleNodeTypeChange = (newType: string) => {
    if (selectedNode && onNodeTypeChange) {
      onNodeTypeChange(selectedNode.id, newType);
    }
  };

  // Node type options grouped by category
  const nodeTypeOptions = [
    {
      category: t('sidebar.categories.dataArchitecture'),
      types: [
        { value: 'data_lake', label: t('nodes.data_lake') },
        { value: 'data_warehouse', label: t('nodes.data_warehouse') },
        { value: 'data_mart', label: t('nodes.data_mart') },
        { value: 'bi_tool', label: t('nodes.bi_tool') },
      ]
    },
    {
      category: t('sidebar.categories.input'),
      types: [
        { value: 'csv_input', label: t('nodes.csv_input') },
        { value: 'json_input', label: t('nodes.json_input') },
        { value: 'parquet_input', label: t('nodes.parquet_input') },
        { value: 'database_input', label: t('nodes.database_input') },
        { value: 'api_input', label: t('nodes.api_input') },
      ]
    },
    {
      category: t('sidebar.categories.processing'),
      types: [
        { value: 'process', label: t('nodes.process') },
        { value: 'transform', label: t('nodes.transform') },
        { value: 'filter', label: t('nodes.filter') },
        { value: 'aggregate', label: t('nodes.aggregate') },
        { value: 'join', label: t('nodes.join') },
        { value: 'split', label: t('nodes.split') },
      ]
    },
    {
      category: t('sidebar.categories.mlAI'),
      types: [
        { value: 'model_train', label: t('nodes.model_train') },
        { value: 'model_predict', label: t('nodes.model_predict') },
        { value: 'model_evaluate', label: t('nodes.model_evaluate') },
      ]
    },
    {
      category: t('sidebar.categories.output'),
      types: [
        { value: 'csv_output', label: t('nodes.csv_output') },
        { value: 'json_output', label: t('nodes.json_output') },
        { value: 'parquet_output', label: t('nodes.parquet_output') },
        { value: 'database_output', label: t('nodes.database_output') },
        { value: 'api_output', label: t('nodes.api_output') },
      ]
    }
  ];

  // Handle input focus to notify editing state
  const handleInputFocus = () => {
    onEditingChange?.(true);
  };

  const handleInputBlur = () => {
    onEditingChange?.(false);
  };

  // Prevent keyboard shortcuts from triggering when typing in input fields
  const handleInputKeyDown = (event: React.KeyboardEvent) => {
    // Stop propagation for Delete and Backspace keys to prevent node deletion
    if (event.key === 'Delete' || event.key === 'Backspace' || event.key === 'f' || event.key === 'F') {
      event.stopPropagation();
    }
  };

  // Handle drag functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, select, textarea')) {
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
    const maxX = window.innerWidth - 300; // panel width
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
    backgroundColor: theme.colors.surface,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: '8px',
    width: '300px',
    maxHeight: 'calc(100vh - 100px)',
    boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.3)' : `0 2px 8px ${theme.colors.shadowMedium}`,
    zIndex: 99997,
    display: 'flex',
    flexDirection: 'column' as const,
    cursor: isDragging ? 'grabbing' : 'grab',
    transition: isDragging ? 'none' : 'box-shadow 0.2s ease',
  };

  const titleStyle = {
    fontWeight: 'bold',
    fontSize: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px',
    borderBottom: `1px solid ${theme.colors.border}`,
    margin: '0',
    color: theme.colors.textPrimary,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  const contentStyle = {
    padding: '15px',
    overflowY: 'auto' as const,
    flexGrow: 1,
  };

  const closeButtonStyle = {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    color: theme.colors.textSecondary,
    padding: '0',
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const fieldStyle = {
    marginBottom: '10px',
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '5px',
    fontSize: '12px',
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  };

  const inputStyle = {
    width: '100%',
    padding: '5px',
    border: `1px solid ${theme.colors.border}`,
    borderRadius: '4px',
    fontSize: '12px',
    backgroundColor: theme.colors.background,
    color: theme.colors.textPrimary,
  };

  if (!selectedNode) {
    return null;
  }

  return (
    <div 
      ref={panelRef}
      style={panelStyle} 
      data-panel-type="properties"
      onMouseDown={handleMouseDown}
    >
      <div style={titleStyle}>
        <span>{t('properties.title')}</span>
        {onClose && (
          <button
            style={closeButtonStyle}
            onClick={onClose}
            title={t('properties.closePanel')}
          >
            ×
          </button>
        )}
      </div>
      <div style={contentStyle} className={`custom-scrollbar ${isDark ? 'scrollbar-dark' : 'scrollbar-light'}`}>
      <div style={fieldStyle}>
        <label style={labelStyle}>{t('properties.label') + ':'}</label>
        <input
          style={inputStyle}
          type="text"
          value={nodeData.label || ''}
          onChange={(e) => handleInputChange('label', e.target.value)}
          onKeyDown={handleInputKeyDown}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
        />
      </div>
      <div style={fieldStyle}>
        <label style={labelStyle}>{t('properties.description') + ':'}</label>
        <input
          style={inputStyle}
          type="text"
          value={nodeData.description || ''}
          onChange={(e) => handleInputChange('description', e.target.value)}
          onKeyDown={handleInputKeyDown}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
        />
      </div>
      <div style={fieldStyle}>
        <label style={labelStyle}>{t('properties.nodeType') + ':'}</label>
        <select
          style={inputStyle}
          value={selectedNode.type || 'process'}
          onChange={(e) => handleNodeTypeChange(e.target.value)}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
        >
          {nodeTypeOptions.map((category) => (
            <optgroup key={category.category} label={category.category}>
              {category.types.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Database name field for Data Warehouse and Data Mart */}
      {(selectedNode.type === 'data_warehouse' || selectedNode.type === 'data_mart') && (
        <div style={fieldStyle}>
          <label style={labelStyle}>{t('properties.databaseName')}</label>
          <input
            style={inputStyle}
            type="text"
            value={nodeData.databaseName || ''}
            onChange={(e) => handleInputChange('databaseName', e.target.value)}
            onKeyDown={handleInputKeyDown}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder={t('properties.databaseNamePlaceholder')}
          />
        </div>
      )}

      {/* Data Architecture specific fields */}
      {(selectedNode.type === 'data_lake' || selectedNode.type === 'data_warehouse' || 
        selectedNode.type === 'data_mart' || selectedNode.type === 'bi_tool') && (
        <>
          <div style={fieldStyle}>
            <label style={labelStyle}>{t('properties.updateFrequency')}</label>
            <select
              style={inputStyle}
              value={nodeData.updateFrequency || 'none'}
              onChange={(e) => handleInputChange('updateFrequency', e.target.value === 'none' ? '' : e.target.value)}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
            >
              <option value="none">{t('filter.none')}</option>
              <option value="realtime">{t('properties.realtime')}</option>
              <option value="hourly">{t('properties.hourly')}</option>
              <option value="daily">{t('properties.daily')}</option>
              <option value="weekly">{t('properties.weekly')}</option>
              <option value="monthly">{t('properties.monthly')}</option>
            </select>
          </div>
          
          <div style={fieldStyle}>
            <label style={labelStyle}>{t('properties.dataVolume')}</label>
            <input
              style={inputStyle}
              type="text"
              value={nodeData.dataVolume || ''}
              onChange={(e) => handleInputChange('dataVolume', e.target.value)}
              onKeyDown={handleInputKeyDown}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder={t('properties.dataVolumePlaceholder')}
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>{t('properties.owner')}</label>
            <input
              style={inputStyle}
              type="text"
              value={nodeData.owner || ''}
              onChange={(e) => handleInputChange('owner', e.target.value)}
              onKeyDown={handleInputKeyDown}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder={t('properties.ownerPlaceholder')}
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>{t('properties.department')}</label>
            <input
              style={inputStyle}
              type="text"
              value={nodeData.department || ''}
              onChange={(e) => handleInputChange('department', e.target.value)}
              onKeyDown={handleInputKeyDown}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder={t('properties.departmentPlaceholder')}
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>{t('properties.lastUpdated')}</label>
            <input
              style={inputStyle}
              type="datetime-local"
              value={nodeData.lastUpdated ? new Date(nodeData.lastUpdated).toISOString().slice(0, 16) : ''}
              onChange={(e) => handleInputChange('lastUpdated', e.target.value ? new Date(e.target.value).toISOString() : '')}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>{t('properties.urlLink')}</label>
            <input
              style={inputStyle}
              type="url"
              value={nodeData.urlLink || ''}
              onChange={(e) => handleInputChange('urlLink', e.target.value)}
              onKeyDown={handleInputKeyDown}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder={t('properties.urlLinkPlaceholder')}
            />
          </div>
        </>
      )}

      {/* Group Selection */}
      <div style={fieldStyle}>
        <label style={labelStyle}>{t('properties.group') + ':'}</label>
        <select
          style={inputStyle}
          value={nodeData.groupId || ''}
          onChange={(e) => handleInputChange('groupId', e.target.value)}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
        >
          <option value="">{t('properties.selectGroup')}</option>
          {availableGroups.map(group => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
        {nodeData.groupId && availableGroups.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginTop: '4px',
          }}>
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: availableGroups.find(g => g.id === nodeData.groupId)?.color || '#ccc',
                border: '1px solid #ccc',
                marginRight: '6px',
              }}
            />
            <span style={{ fontSize: '11px', color: theme.colors.textSecondary }}>
              {availableGroups.find(g => g.id === nodeData.groupId)?.name}
            </span>
          </div>
        )}
      </div>

      <div style={fieldStyle}>
        <label style={labelStyle}>{t('properties.nodeId') + ':'}</label>
        <input
          style={inputStyle}
          type="text"
          value={selectedNode.id}
          disabled
        />
      </div>

      {/* Node statistics */}
      <div style={{ ...fieldStyle, marginTop: '20px', padding: '10px', backgroundColor: theme.colors.background, borderRadius: '4px', border: `1px solid ${theme.colors.border}` }}>
        <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: theme.colors.textPrimary }}>{t('properties.metadata') + ':'}</div>
        <div style={{ fontSize: '11px', color: theme.colors.textSecondary }}>
          <div>{t('properties.position')}: ({Math.round(selectedNode.position.x)}, {Math.round(selectedNode.position.y)})</div>
          <div>{t('properties.nodeType')}: {selectedNode.type}</div>
          {nodeData.updateFrequency && (
            <div>{t('properties.updateFrequency')}: {nodeData.updateFrequency}</div>
          )}
          {nodeData.dataVolume && (
            <div>{t('properties.dataVolume')}: {nodeData.dataVolume}</div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
};

export default PropertiesPanel;