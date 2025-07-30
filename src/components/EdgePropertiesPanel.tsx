import { useCallback } from 'react';
import { Edge, Node } from 'reactflow';
import { useTheme } from '../contexts/ThemeContext';
import { getTheme } from '../utils/theme';
import { useTranslation } from '../../node_modules/react-i18next';

interface EdgePropertiesPanelProps {
  selectedEdge: Edge | null;
  nodes: Node[];
  onClose: () => void;
  onStartReconnection: (edge: Edge, mode: 'source' | 'target') => void;
  onEdgeDelete: (edgeId: string) => void;
  reconnectingEdge: { edge: Edge; mode: 'source' | 'target' } | null;
  onCancelReconnection: () => void;
}

const EdgePropertiesPanel = ({
  selectedEdge,
  nodes,
  onClose,
  onStartReconnection,
  onEdgeDelete,
  reconnectingEdge,
  onCancelReconnection,
}: EdgePropertiesPanelProps) => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const theme = getTheme(isDark);
  

  const handleDelete = useCallback(() => {
    if (!selectedEdge) return;
    
    const confirmDelete = window.confirm(t('edge.confirmDelete'));
    if (confirmDelete) {
      onEdgeDelete(selectedEdge.id);
      onClose();
    }
  }, [selectedEdge, onEdgeDelete, onClose, t]);

  if (!selectedEdge && !reconnectingEdge) return null;

  const currentEdge = selectedEdge || reconnectingEdge?.edge;
  if (!currentEdge) return null;

  const sourceNode = nodes.find(n => n.id === currentEdge.source);
  const targetNode = nodes.find(n => n.id === currentEdge.target);

  const panelStyle = {
    position: 'fixed' as const,
    top: '50%',
    right: '20px',
    transform: 'translateY(-50%)',
    width: '320px',
    maxHeight: '80vh',
    backgroundColor: theme.colors.surface,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius.lg,
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    zIndex: 99999,
    padding: '20px',
    overflowY: 'auto' as const,
  };

  const headerStyle = {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semiBold,
    color: theme.colors.textPrimary,
    marginBottom: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const closeButtonStyle = {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    color: theme.colors.textSecondary,
    cursor: 'pointer',
    padding: '0',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const sectionStyle = {
    marginBottom: '16px',
  };

  const labelStyle = {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
    marginBottom: '8px',
    display: 'block',
  };


  const buttonStyle = {
    padding: '8px 16px',
    borderRadius: theme.borderRadius.md,
    border: 'none',
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    cursor: 'pointer',
    transition: theme.transitions.fast,
    marginRight: '8px',
    marginBottom: '8px',
  };


  const secondaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: theme.colors.surfaceHover,
    color: theme.colors.textPrimary,
    border: `1px solid ${theme.colors.border}`,
  };

  const dangerButtonStyle = {
    ...buttonStyle,
    backgroundColor: theme.colors.error,
    color: theme.colors.surface,
  };

  const warningButtonStyle = {
    ...buttonStyle,
    backgroundColor: theme.colors.warning,
    color: theme.colors.surface,
  };

  const nodeInfoStyle = {
    padding: '8px',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: '8px',
  };

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <span>
          {reconnectingEdge ? t('edge.reconnectingTitle') : t('edge.title')}
        </span>
        <button 
          style={closeButtonStyle} 
          onClick={reconnectingEdge ? onCancelReconnection : onClose}
          title={t('properties.closePanel')}
        >
          ×
        </button>
      </div>

      {reconnectingEdge && (
        <div style={{
          padding: '12px',
          backgroundColor: `${theme.colors.warning}20`,
          border: `1px solid ${theme.colors.warning}`,
          borderRadius: theme.borderRadius.md,
          marginBottom: '16px',
          fontSize: theme.typography.fontSize.sm,
          color: theme.colors.textPrimary,
        }}>
          <strong>{t('edge.reconnectionMode')}:</strong><br />
          {t('edge.reconnectionInstructions', { mode: t(`edge.${reconnectingEdge.mode}`) })}
          <br />
          <button
            style={secondaryButtonStyle}
            onClick={onCancelReconnection}
          >
            {t('edge.cancel')}
          </button>
        </div>
      )}

      <div style={sectionStyle}>
        <label style={labelStyle}>{t('edge.connectionInfo')}:</label>
        <div style={nodeInfoStyle}>
          <strong>{t('edge.from')}:</strong> {sourceNode?.data.label || t('edge.unknown')} ({currentEdge.source})
        </div>
        <div style={nodeInfoStyle}>
          <strong>{t('edge.to')}:</strong> {targetNode?.data.label || t('edge.unknown')} ({currentEdge.target})
        </div>
      </div>

      {!reconnectingEdge && (
        <>
          <div style={sectionStyle}>
            <label style={labelStyle}>{t('edge.reconnection')}:</label>
            <button
              style={warningButtonStyle}
              onClick={() => onStartReconnection(currentEdge, 'source')}
            >
              {t('edge.changeSource')}
            </button>
            <button
              style={warningButtonStyle}  
              onClick={() => onStartReconnection(currentEdge, 'target')}
            >
              {t('edge.changeTarget')}
            </button>
          </div>

          <div style={sectionStyle}>
            <button
              style={dangerButtonStyle}
              onClick={handleDelete}
            >
              {t('edge.deleteConnection')}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default EdgePropertiesPanel;