import { FC, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from '../../node_modules/react-i18next';

interface LayoutSelectorProps {
  onLayoutChange: (layoutType: 'hierarchical' | 'force' | 'circular' | 'grid') => void;
  isVisible: boolean;
  onClose: () => void;
}

const LayoutSelector: FC<LayoutSelectorProps> = ({ onLayoutChange, isVisible, onClose }) => {
  const { isDark } = useTheme();
  const { t } = useTranslation();
  const [selectedLayout, setSelectedLayout] = useState<'hierarchical' | 'force' | 'circular' | 'grid'>('hierarchical');

  const layouts = [
    {
      id: 'hierarchical' as const,
      name: t('layout.hierarchical', 'Hierarchical'),
      description: t('layout.hierarchicalDesc', 'Organizes nodes in layers based on data flow'),
      icon: '📊'
    },
    {
      id: 'force' as const,
      name: t('layout.force', 'Force-Directed'),
      description: t('layout.forceDesc', 'Uses physics simulation for natural positioning'),
      icon: '🎯'
    },
    {
      id: 'circular' as const,
      name: t('layout.circular', 'Circular'),
      description: t('layout.circularDesc', 'Arranges nodes in a circle'),
      icon: '⭕'
    },
    {
      id: 'grid' as const,
      name: t('layout.grid', 'Grid'),
      description: t('layout.gridDesc', 'Organizes nodes in a regular grid pattern'),
      icon: '⬜'
    }
  ];

  const handleApply = () => {
    onLayoutChange(selectedLayout);
    onClose();
  };

  if (!isVisible) return null;

  const overlayStyle = {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
  };

  const modalStyle = {
    backgroundColor: isDark ? '#1a1a1a' : 'white',
    borderRadius: '12px',
    padding: '24px',
    width: '500px',
    maxWidth: '90vw',
    border: `1px solid ${isDark ? '#333' : '#e5e5e5'}`,
    boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.7)' : '0 8px 32px rgba(0,0,0,0.2)',
    color: isDark ? '#e0e0e0' : '#333',
  };

  const optionStyle = (isSelected: boolean) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px',
    borderRadius: '8px',
    border: `2px solid ${isSelected ? '#3b82f6' : (isDark ? '#333' : '#e5e5e5')}`,
    backgroundColor: isSelected ? (isDark ? '#1e3a8a20' : '#3b82f620') : 'transparent',
    cursor: 'pointer',
    marginBottom: '12px',
    transition: 'all 0.2s ease',
  });

  const buttonStyle = {
    padding: '12px 20px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
  };

  const primaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#3b82f6',
    color: 'white',
  };

  const secondaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: isDark ? '#333' : '#f5f5f5',
    color: isDark ? '#e0e0e0' : '#333',
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: '600' }}>
          {t('layout.selectTitle', 'Select Layout Algorithm')}
        </h3>
        
        <div style={{ marginBottom: '24px' }}>
          {layouts.map(layout => (
            <div
              key={layout.id}
              style={optionStyle(selectedLayout === layout.id)}
              onClick={() => setSelectedLayout(layout.id)}
            >
              <div style={{ fontSize: '24px', minWidth: '32px' }}>
                {layout.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                  {layout.name}
                </div>
                <div style={{ fontSize: '14px', color: isDark ? '#999' : '#666', lineHeight: '1.4' }}>
                  {layout.description}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button style={secondaryButtonStyle} onClick={onClose}>
            {t('common.cancel', 'Cancel')}
          </button>
          <button style={primaryButtonStyle} onClick={handleApply}>
            {t('layout.apply', 'Apply Layout')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LayoutSelector;