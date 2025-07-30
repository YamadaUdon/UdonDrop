import { FC, useState, useRef, useEffect } from 'react';
import { Node, Edge } from 'reactflow';
import { useTheme } from '../contexts/ThemeContext';
import { getTheme } from '../utils/theme';
import { LanguageIcon } from './UIIcons';
import { useTranslation } from '../../node_modules/react-i18next';
import { usePipeline } from '../hooks/usePipeline';
import { isTauri } from '../utils/platform';
import { useNavigate } from 'react-router-dom';

interface MenuBarProps {
  nodes: Node[];
  edges: Edge[];
  onSave: (name: string, description?: string) => void;
  onLoad: (pipeline: any) => void;
  onNew: () => void;
  onExportPNG?: () => void;
  onExportSVG?: () => void;
  onExportJSON?: () => void;
  onImportJSON?: (jsonData: any) => void;
  isLoading: boolean;
}

const MenuBar: FC<MenuBarProps> = ({ nodes, edges, onSave, onLoad, onNew, onExportPNG, onExportSVG, onExportJSON, onImportJSON, isLoading }) => {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [pipelineName, setPipelineName] = useState('');
  const [pipelineDescription, setPipelineDescription] = useState('');
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);
  const [availablePipelines, setAvailablePipelines] = useState<string[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isDark } = useTheme();
  const theme = getTheme(isDark);
  const { t, i18n } = useTranslation();
  const { loadPipeline, listPipelines } = usePipeline();
  const navigate = useNavigate();

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-language-menu]')) {
        setShowLanguageMenu(false);
      }
      if (!target.closest('[data-hamburger-menu]')) {
        setShowHamburgerMenu(false);
      }
    };

    if (showLanguageMenu || showHamburgerMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showLanguageMenu, showHamburgerMenu]);

  const handleSave = async () => {
    if (pipelineName.trim()) {
      try {
        await onSave(pipelineName.trim(), pipelineDescription.trim() || undefined);
        setShowSaveDialog(false);
        setPipelineName('');
        setPipelineDescription('');
      } catch (error) {
        console.error('Save error in MenuBar:', error);
        // エラーは親コンポーネントで処理されるので、ダイアログは閉じない
      }
    }
  };

  const handleShowLoadDialog = async () => {
    if (isTauri()) {
      // Tauriアプリでは直接ファイルダイアログを開く
      try {
        const pipeline = await loadPipeline();
        if (pipeline) {
          onLoad(pipeline);
        }
      } catch (error) {
        console.error('Error loading pipeline:', error);
        alert(t('alerts.loadError') || 'Error loading pipeline');
      }
    } else {
      // ブラウザではLocalStorageからの一覧を表示
      try {
        const pipelines = await listPipelines();
        setAvailablePipelines(pipelines);
        setShowLoadDialog(true);
        setSearchFilter('');
      } catch (error) {
        console.error('Error loading pipelines:', error);
      }
    }
  };

  const handleLoadPipeline = async (filename: string) => {
    try {
      const pipeline = await loadPipeline(filename);
      if (pipeline) {
        onLoad(pipeline);
        setShowLoadDialog(false);
      }
    } catch (error) {
      console.error('Error loading pipeline:', error);
      alert(t('alerts.loadError') || 'Error loading pipeline');
    }
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/json') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const jsonData = JSON.parse(e.target?.result as string);
          onImportJSON?.(jsonData);
        } catch (error) {
          alert(t('alerts.importError'));
        }
      };
      reader.readAsText(file);
    } else {
      alert(t('alerts.importError'));
    }
    // Clear the input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const menuBarStyle = {
    backgroundColor: theme.colors.surface,
    color: theme.colors.textPrimary,
    padding: '10px 20px',
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
    borderBottom: `1px solid ${theme.colors.border}`,
    boxShadow: theme.colors.shadowLight,
  };

  const buttonStyle = {
    backgroundColor: theme.colors.accent,
    color: theme.colors.surface,
    border: 'none',
    padding: '8px 16px',
    borderRadius: theme.borderRadius.md,
    cursor: 'pointer',
    fontSize: theme.typography.fontSize.md,
    transition: theme.transitions.fast,
    minWidth: '80px',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const buttonHoverStyle = {
    ...buttonStyle,
    backgroundColor: theme.colors.accentHover,
  };

  const themeButtonStyle = {
    backgroundColor: 'transparent',
    color: theme.colors.textPrimary,
    border: `1px solid ${theme.colors.border}`,
    padding: '8px',
    borderRadius: theme.borderRadius.md,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: theme.transitions.fast,
  };

  const dialogStyle = {
    position: 'fixed' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: theme.colors.surface,
    color: theme.colors.textPrimary,
    padding: '20px',
    borderRadius: theme.borderRadius.lg,
    boxShadow: `0 4px 6px ${theme.colors.shadowMedium}`,
    border: `1px solid ${theme.colors.border}`,
    zIndex: 100001,
  };

  const overlayStyle = {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 100000,
  };

  const inputStyle = {
    width: '100%',
    padding: '8px',
    marginBottom: '10px',
    border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
    color: theme.colors.textPrimary,
    fontSize: theme.typography.fontSize.md,
  };

  return (
    <>
      <div style={menuBarStyle}>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px', alignItems: 'center' }}>
          
          {/* Language Menu */}
          <div style={{ position: 'relative', display: 'inline-block' }} data-language-menu>
            <button
              style={themeButtonStyle}
              onClick={() => setShowLanguageMenu(!showLanguageMenu)}
              title="Change language"
            >
              <LanguageIcon size={16} />
            </button>
            {showLanguageMenu && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                backgroundColor: theme.colors.surface,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.md,
                boxShadow: `0 2px 8px ${theme.colors.shadowMedium}`,
                zIndex: 100000,
                minWidth: '120px',
                marginTop: '4px',
              }}>
                <button
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '8px 12px',
                    border: 'none',
                    backgroundColor: i18n.language === 'en' ? theme.colors.surfaceHover : 'transparent',
                    color: theme.colors.textPrimary,
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: theme.typography.fontSize.md,
                    transition: theme.transitions.fast,
                  }}
                  onClick={() => {
                    i18n.changeLanguage('en');
                    setShowLanguageMenu(false);
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.colors.surfaceHover}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = i18n.language === 'en' ? theme.colors.surfaceHover : 'transparent'}
                >
                  English
                </button>
                <button
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '8px 12px',
                    border: 'none',
                    backgroundColor: i18n.language === 'ja' ? theme.colors.surfaceHover : 'transparent',
                    color: theme.colors.textPrimary,
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: theme.typography.fontSize.md,
                    transition: theme.transitions.fast,
                  }}
                  onClick={() => {
                    i18n.changeLanguage('ja');
                    setShowLanguageMenu(false);
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.colors.surfaceHover}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = i18n.language === 'ja' ? theme.colors.surfaceHover : 'transparent'}
                >
                  日本語
                </button>
              </div>
            )}
          </div>
          
          <button
            style={buttonStyle}
            onClick={onNew}
            disabled={isLoading}
          >
            {t('menu.new')}
          </button>
          <button
            style={buttonStyle}
            onClick={() => setShowSaveDialog(true)}
            disabled={isLoading || nodes.length === 0}
            title={isTauri() ? "Save to file" : "Save to browser storage"}
          >
            {t('menu.save')}
          </button>
          <button
            style={buttonStyle}
            disabled={isLoading}
            onClick={handleShowLoadDialog}
            title={isTauri() ? "Load from file" : "Load from browser storage"}
          >
            {t('menu.load')}
          </button>
          
          {/* Export Menu */}
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <button
              style={buttonStyle}
              disabled={isLoading || nodes.length === 0}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const menu = e.currentTarget.nextElementSibling as HTMLElement;
                if (menu) {
                  menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
                }
                setShowLanguageMenu(false);
              }}
            >
{t('menu.export')} ▼
            </button>
            <div style={{
              display: 'none',
              position: 'absolute',
              top: '100%',
              left: 0,
              backgroundColor: theme.colors.surface,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.borderRadius.md,
              boxShadow: `0 2px 8px ${theme.colors.shadowMedium}`,
              zIndex: 100000,
              minWidth: '120px',
            }}>
              <button
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '8px 12px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: theme.colors.textPrimary,
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: theme.typography.fontSize.md,
                  transition: theme.transitions.fast,
                }}
                onClick={() => {
                  onExportPNG?.();
                  (document.querySelector('[style*="display: block"]') as HTMLElement).style.display = 'none';
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.colors.surfaceHover}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                {t('menu.exportPNG')}
              </button>
              <button
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '8px 12px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: theme.colors.textPrimary,
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: theme.typography.fontSize.md,
                  transition: theme.transitions.fast,
                }}
                onClick={() => {
                  onExportSVG?.();
                  (document.querySelector('[style*="display: block"]') as HTMLElement).style.display = 'none';
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.colors.surfaceHover}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                {t('menu.exportSVG')}
              </button>
              <button
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '8px 12px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: theme.colors.textPrimary,
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: theme.typography.fontSize.md,
                  transition: theme.transitions.fast,
                }}
                onClick={() => {
                  onExportJSON?.();
                  (document.querySelector('[style*="display: block"]') as HTMLElement).style.display = 'none';
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.colors.surfaceHover}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                {t('menu.exportJSON')}
              </button>
            </div>
          </div>
          
          {/* Hamburger Menu */}
          <div style={{ position: 'relative', display: 'inline-block' }} data-hamburger-menu>
            <button
              style={{
                ...themeButtonStyle,
                fontSize: '16px',
                lineHeight: '1',
                width: '32px',
                height: '32px',
              }}
              onClick={() => setShowHamburgerMenu(!showHamburgerMenu)}
              title="More options"
            >
              ☰
            </button>
            {showHamburgerMenu && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                backgroundColor: theme.colors.surface,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.md,
                boxShadow: `0 2px 8px ${theme.colors.shadowMedium}`,
                zIndex: 100000,
                minWidth: '160px',
                marginTop: '4px',
              }}>
                <button
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '8px 12px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: theme.colors.textPrimary,
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: theme.typography.fontSize.md,
                    transition: theme.transitions.fast,
                  }}
                  onClick={() => {
                    navigate('/sql-generator');
                    setShowHamburgerMenu(false);
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.colors.surfaceHover}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {t('menu.sqlGenerator')}
                </button>
                <button
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '8px 12px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: theme.colors.textPrimary,
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: theme.typography.fontSize.md,
                    transition: theme.transitions.fast,
                  }}
                  onClick={() => {
                    fileInputRef.current?.click();
                    setShowHamburgerMenu(false);
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.colors.surfaceHover}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {t('menu.importJSON')}
                </button>
              </div>
            )}
          </div>
          
          <span style={{ fontSize: '12px', color: '#a0aec0' }}>
            Nodes: {nodes.length} | Edges: {edges.length}
          </span>
        </div>
      </div>

      {showSaveDialog && (
        <>
          <div style={overlayStyle} onClick={() => setShowSaveDialog(false)} />
          <div style={dialogStyle}>
            <h3 style={{ marginTop: 0 }}>{t('save.title')}</h3>
            <label style={{ display: 'block', marginBottom: '5px' }}>{t('save.name')}:</label>
            <input
              style={inputStyle}
              type="text"
              value={pipelineName}
              onChange={(e) => setPipelineName(e.target.value)}
            />
            <label style={{ display: 'block', marginBottom: '5px' }}>{t('save.description')}:</label>
            <input
              style={inputStyle}
              type="text"
              value={pipelineDescription}
              onChange={(e) => setPipelineDescription(e.target.value)}
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                style={buttonStyle}
                onClick={() => setShowSaveDialog(false)}
              >
                {t('save.cancel')}
              </button>
              <button
                style={{ ...buttonStyle, backgroundColor: '#2b6cb0' }}
                onClick={handleSave}
                disabled={!pipelineName.trim()}
              >
                {t('save.save')}
              </button>
            </div>
          </div>
        </>
      )}

      {showLoadDialog && (
        <>
          <div style={overlayStyle} onClick={() => setShowLoadDialog(false)} />
          <div style={dialogStyle}>
            <h3 style={{ marginTop: 0 }}>{t('load.title')}</h3>
            
            {/* Search filter */}
            <input
              style={{
                ...inputStyle,
                marginBottom: '15px'
              }}
              type="text"
              placeholder={t('load.search')}
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
            />
            
            {/* Pipeline list */}
            <div style={{
              maxHeight: '300px',
              overflowY: 'auto',
              border: `1px solid ${theme.colors.border}`,
              borderRadius: '4px',
              marginBottom: '15px'
            }}>
              {availablePipelines
                .filter(pipeline => 
                  pipeline.toLowerCase().includes(searchFilter.toLowerCase())
                )
                .map((pipeline, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '10px',
                      borderBottom: index < availablePipelines.length - 1 ? `1px solid ${theme.colors.border}` : 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: 'transparent',
                      transition: 'background-color 0.2s'
                    }}
                    onClick={() => handleLoadPipeline(pipeline)}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.colors.surfaceHover}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <span style={{ fontSize: '14px', color: theme.colors.textPrimary }}>
                      {pipeline.replace('.json', '')}
                    </span>
                  </div>
                ))
              }
              {availablePipelines.length === 0 && (
                <div style={{
                  padding: '20px',
                  textAlign: 'center',
                  color: theme.colors.textSecondary,
                  fontSize: '14px'
                }}>
                  {t('load.noPipelines')}
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                style={buttonStyle}
                onClick={() => setShowLoadDialog(false)}
              >
                {t('load.cancel')}
              </button>
            </div>
          </div>
        </>
      )}
      
      {/* Hidden file input for JSON import */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFileImport}
      />
    </>
  );
};

export default MenuBar;