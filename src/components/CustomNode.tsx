import { memo, FC, useState, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import * as Icons from './Icons';
import { groupManager } from '../services/groupManager';
import { useTheme } from '../contexts/ThemeContext';
import { getTheme } from '../utils/theme';

interface CustomNodeData {
  label: string;
  description?: string;
  inputs?: string[];
  outputs?: string[];
  isEditing?: boolean;
  updateFrequency?: 'realtime' | 'hourly' | 'daily' | 'weekly' | 'monthly';
  dataVolume?: string;
  lastUpdated?: Date;
  owner?: string;
  department?: string;
  groupId?: string;
  databaseName?: string;
  urlLink?: string;
  isReconnectTarget?: boolean;
  onReconnect?: () => void;
}

interface CustomNodeProps extends NodeProps<CustomNodeData> {
  isEditing?: boolean;
}

const CustomNode: FC<CustomNodeProps> = ({ data, selected, isEditing, type }) => {
  // Use isEditing from data if available, otherwise use prop
  const nodeIsEditing = data.isEditing ?? isEditing ?? false;
  
  // Get group information
  const nodeGroup = data.groupId ? groupManager.getGroup(data.groupId) : null;
  
  // Get theme
  const { isDark } = useTheme();
  const theme = getTheme(isDark);
  
  // Get node color based on type
  const getNodeColor = () => {
    switch (type) {
      case 'data_lake':
        return '#2196F3'; // Blue
      case 'data_warehouse':
        return '#4CAF50'; // Green
      case 'data_mart':
        return '#FF9800'; // Orange
      case 'bi_tool':
        return '#9C27B0'; // Purple
      case 'csv_input':
      case 'json_input':
      case 'parquet_input':
      case 'database_input':
      case 'api_input':
        return '#00BCD4'; // Cyan
      case 'csv_output':
      case 'json_output':
      case 'parquet_output':
      case 'database_output':
      case 'api_output':
        return '#795548'; // Brown
      case 'model_train':
      case 'model_predict':
      case 'model_evaluate':
        return '#E91E63'; // Pink
      default:
        return '#607D8B'; // Blue Grey
    }
  };

  // Get node icon based on type
  const getNodeIcon = () => {
    switch (type) {
      case 'data_lake':
        return <Icons.DataLakeIcon size={20} color="#fff" />;
      case 'data_warehouse':
        return <Icons.DataWarehouseIcon size={20} color="#fff" />;
      case 'data_mart':
        return <Icons.DataMartIcon size={20} color="#fff" />;
      case 'bi_tool':
        return <Icons.ChartIcon size={20} color="#fff" />;
      case 'database_input':
      case 'database_output':
        return <Icons.DatabaseIcon size={20} color="#fff" />;
      case 'api_input':
      case 'api_output':
        return <Icons.ApiIcon size={20} color="#fff" />;
      default:
        return <Icons.ProcessIcon size={20} color="#fff" />;
    }
  };

  // Function to darken a color
  const darkenColor = (color: string, amount: number = 0.3): string => {
    // Convert hex to RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Darken the color
    const newR = Math.round(r * (1 - amount));
    const newG = Math.round(g * (1 - amount));
    const newB = Math.round(b * (1 - amount));
    
    // Convert back to hex
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  };
  
  // Determine border color based on selection and editing state
  const getBorderColor = () => {
    const baseColor = getNodeColor();
    if (!selected) return baseColor;
    if (nodeIsEditing) return darkenColor(baseColor, 0.2); // Slightly darker when editing
    return darkenColor(baseColor, 0.4); // More darker when just selected
  };

  const nodeStyle = {
    padding: '10px',
    borderRadius: '8px',
    border: `2px solid ${getBorderColor()}`,
    backgroundColor: theme.colors.surface,
    minWidth: '150px',
    fontSize: '12px',
    position: 'relative' as const,
    transition: 'border-color 0.2s ease',
    boxShadow: selected ? `0 2px 8px ${theme.colors.shadowMedium}` : 'none',
  };

  const headerStyle = {
    fontWeight: 'bold',
    marginBottom: '5px',
    color: theme.colors.textPrimary,
  };

  const descriptionStyle = {
    fontSize: '11px',
    color: theme.colors.textSecondary,
    marginBottom: '5px',
  };

  const baseHandleStyle = {
    width: '10px',
    height: '10px',
    border: `2px solid ${theme.colors.surface}`,
  };

  const inputHandleStyle = {
    ...baseHandleStyle,
    background: '#4CAF50', // Green for input/target
  };

  const outputHandleStyle = {
    ...baseHandleStyle,
    background: '#FF6B35', // Orange for output/source
  };

  const handleNodeClick = (e: React.MouseEvent) => {
    if (data.isReconnectTarget && data.onReconnect) {
      e.stopPropagation();
      data.onReconnect();
    }
  };

  return (
    <div 
      style={nodeStyle}
      onClick={handleNodeClick}
    >
      {/* Top Handle - Input */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        style={{
          ...inputHandleStyle,
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      />
      
      {/* Left Handle - Input */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        style={{
          ...inputHandleStyle,
          top: '50%',
          transform: 'translateY(-50%)',
        }}
      />
      
      {/* Right Handle - Output */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{
          ...outputHandleStyle,
          top: '50%',
          transform: 'translateY(-50%)',
        }}
      />
      
      {/* Bottom Handle - Output */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{
          ...outputHandleStyle,
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      />
      
      {/* Node Icon Header */}
      <div style={{
        position: 'absolute',
        top: '-15px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: getNodeColor(),
        borderRadius: '50%',
        width: '30px',
        height: '30px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
      }}>
        {getNodeIcon()}
      </div>
      
      <div style={{ ...headerStyle, marginTop: '15px' }}>{data.label}</div>
      {data.description && (
        <div style={descriptionStyle}>{data.description}</div>
      )}
      
      {/* Database name for Data Warehouse and Data Mart */}
      {data.databaseName && (type === 'data_warehouse' || type === 'data_mart') && (
        <div style={{
          fontSize: '10px',
          backgroundColor: '#607D8B',
          color: 'white',
          padding: '2px 6px',
          borderRadius: '10px',
          display: 'inline-block',
          marginBottom: '5px',
          fontWeight: 'bold',
        }}>
          DB: {data.databaseName}
        </div>
      )}
      
      {/* URL Link */}
      {data.urlLink && (
        <div style={{
          marginTop: '5px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}>
          <a
            href={data.urlLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#2196F3',
              textDecoration: 'none',
              fontSize: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              padding: '2px 4px',
              borderRadius: '4px',
              backgroundColor: 'rgba(33, 150, 243, 0.1)',
              border: '1px solid rgba(33, 150, 243, 0.3)',
            }}
            title={data.urlLink}
            onClick={(e) => e.stopPropagation()} // Prevent node selection when clicking link
          >
            🔗 Link
          </a>
        </div>
      )}
      
      {/* Metadata badges */}
      {data.updateFrequency && (
        <div style={{
          fontSize: '10px',
          backgroundColor: data.updateFrequency === 'realtime' ? '#4CAF50' : '#2196F3',
          color: 'white',
          padding: '2px 6px',
          borderRadius: '10px',
          marginTop: '5px',
          display: 'inline-block',
        }}>
          {data.updateFrequency}
        </div>
      )}
      
      {/* Group badge */}
      {nodeGroup && (
        <div style={{
          position: 'absolute',
          top: '-8px',
          right: '-8px',
          backgroundColor: nodeGroup.color,
          border: `2px solid ${theme.colors.surface}`,
          borderRadius: '12px',
          padding: '2px 6px',
          minWidth: '20px',
          height: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '9px',
          fontWeight: 'bold',
          color: isDark ? '#fff' : '#333',
          boxShadow: `0 2px 6px ${nodeGroup.color}60`,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: '60px',
        }} title={`Group: ${nodeGroup.name}`}>
          {nodeGroup.name.charAt(0).toUpperCase()}
        </div>
      )}
      
      {/* Reconnection target indicator */}
      {data.isReconnectTarget && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: `${theme.colors.accent}20`,
          border: `2px dashed ${theme.colors.accent}`,
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          color: theme.colors.accent,
          fontWeight: 'bold',
          zIndex: 1000,
          animation: 'pulse 2s infinite',
          cursor: 'pointer',
        }}>
          🎯
        </div>
      )}
    </div>
  );
};

export default memo(CustomNode);