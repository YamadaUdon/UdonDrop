import { FC, useState, useEffect } from 'react';
import { PluginManifest, Plugin, pluginSystem } from '../services/pluginSystem';
import { solitudeTheme } from '../styles/theme';
import { ProcessIcon, SettingsIcon, DownloadIcon, PlayIcon, StopIcon, DeleteIcon } from './Icons';

interface PluginManagerPanelProps {
  onPluginToggle?: (pluginId: string, enabled: boolean) => void;
}

const PluginManagerPanel: FC<PluginManagerPanelProps> = ({
  onPluginToggle,
}) => {
  const [plugins, setPlugins] = useState<PluginManifest[]>([]);
  const [selectedPlugin, setSelectedPlugin] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadPlugins();
    loadStats();
  }, []);

  const loadPlugins = async () => {
    const allPlugins = pluginSystem.getAllPluginManifests();
    setPlugins(allPlugins);
  };

  const loadStats = () => {
    const pluginStats = pluginSystem.getPluginStats();
    setStats(pluginStats);
  };

  const handlePluginToggle = async (pluginId: string, enabled: boolean) => {
    if (enabled) {
      await pluginSystem.loadPlugin(pluginId);
    } else {
      await pluginSystem.unloadPlugin(pluginId);
    }
    
    pluginSystem.setPluginConfiguration(pluginId, { enabled });
    await loadPlugins();
    onPluginToggle?.(pluginId, enabled);
  };

  const handlePluginUninstall = async (pluginId: string) => {
    if (window.confirm('Are you sure you want to uninstall this plugin?')) {
      await pluginSystem.uninstallPlugin(pluginId);
      await loadPlugins();
      loadStats();
    }
  };

  const getFilteredPlugins = () => {
    let filtered = [...plugins];
    
    if (filter !== 'all') {
      filtered = filtered.filter(plugin => 
        filter === 'active' ? plugin.status === 'active' : plugin.status !== 'active'
      );
    }
    
    if (searchTerm) {
      filtered = filtered.filter(plugin => 
        plugin.metadata.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plugin.metadata.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plugin.metadata.keywords?.some(keyword => 
          keyword.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
    
    return filtered;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return solitudeTheme.colors.success;
      case 'inactive': return solitudeTheme.colors.textSecondary;
      case 'error': return solitudeTheme.colors.error;
      case 'updating': return solitudeTheme.colors.warning;
      default: return solitudeTheme.colors.textSecondary;
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const panelStyle = {
    backgroundColor: solitudeTheme.colors.background,
    border: `1px solid ${solitudeTheme.colors.border}`,
    borderRadius: solitudeTheme.borderRadius.lg,
    padding: solitudeTheme.spacing.md,
    margin: solitudeTheme.spacing.md,
    maxHeight: '800px',
    overflowY: 'auto' as const,
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: solitudeTheme.spacing.md,
  };

  const sectionStyle = {
    marginBottom: solitudeTheme.spacing.md,
  };

  const sectionTitleStyle = {
    fontSize: solitudeTheme.typography.fontSize.md,
    fontWeight: solitudeTheme.typography.fontWeight.semiBold,
    color: solitudeTheme.colors.textPrimary,
    marginBottom: solitudeTheme.spacing.sm,
  };

  const buttonStyle = {
    padding: solitudeTheme.spacing.sm,
    borderRadius: solitudeTheme.borderRadius.sm,
    border: `1px solid ${solitudeTheme.colors.border}`,
    backgroundColor: solitudeTheme.colors.surface,
    color: solitudeTheme.colors.textPrimary,
    cursor: 'pointer',
    fontSize: solitudeTheme.typography.fontSize.sm,
    margin: '2px',
  };

  const activeButtonStyle = {
    ...buttonStyle,
    backgroundColor: solitudeTheme.colors.accent,
    color: 'white',
    borderColor: solitudeTheme.colors.accent,
  };

  const pluginCardStyle = {
    border: `1px solid ${solitudeTheme.colors.border}`,
    borderRadius: solitudeTheme.borderRadius.md,
    padding: solitudeTheme.spacing.md,
    marginBottom: solitudeTheme.spacing.sm,
    backgroundColor: solitudeTheme.colors.surface,
  };

  const selectedPluginCardStyle = {
    ...pluginCardStyle,
    borderColor: solitudeTheme.colors.accent,
    backgroundColor: solitudeTheme.colors.surfaceHover,
  };

  const pluginHeaderStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: solitudeTheme.spacing.sm,
  };

  const pluginTitleStyle = {
    fontSize: solitudeTheme.typography.fontSize.lg,
    fontWeight: solitudeTheme.typography.fontWeight.semiBold,
    color: solitudeTheme.colors.textPrimary,
    margin: 0,
  };

  const pluginMetaStyle = {
    fontSize: solitudeTheme.typography.fontSize.sm,
    color: solitudeTheme.colors.textSecondary,
    marginBottom: solitudeTheme.spacing.xs,
  };

  const pluginDescriptionStyle = {
    fontSize: solitudeTheme.typography.fontSize.sm,
    color: solitudeTheme.colors.textPrimary,
    marginBottom: solitudeTheme.spacing.sm,
  };

  const keywordStyle = {
    display: 'inline-block',
    padding: '2px 6px',
    margin: '2px',
    backgroundColor: solitudeTheme.colors.surfaceHover,
    borderRadius: solitudeTheme.borderRadius.sm,
    fontSize: solitudeTheme.typography.fontSize.xs,
    color: solitudeTheme.colors.textSecondary,
  };

  const toggleStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: solitudeTheme.spacing.sm,
  };

  const statsGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: solitudeTheme.spacing.md,
    marginBottom: solitudeTheme.spacing.md,
  };

  const statCardStyle = {
    padding: solitudeTheme.spacing.sm,
    backgroundColor: solitudeTheme.colors.surface,
    borderRadius: solitudeTheme.borderRadius.md,
    border: `1px solid ${solitudeTheme.colors.border}`,
    textAlign: 'center' as const,
  };

  const statValueStyle = {
    fontSize: solitudeTheme.typography.fontSize.xl,
    fontWeight: solitudeTheme.typography.fontWeight.bold,
    color: solitudeTheme.colors.accent,
  };

  const statLabelStyle = {
    fontSize: solitudeTheme.typography.fontSize.sm,
    color: solitudeTheme.colors.textSecondary,
  };

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <h3 style={{ margin: 0, color: solitudeTheme.colors.textPrimary }}>
          Plugin Manager
        </h3>
        <div style={{ display: 'flex', gap: solitudeTheme.spacing.sm }}>
          <button
            style={buttonStyle}
            onClick={() => setShowSettings(!showSettings)}
          >
            <SettingsIcon size={14} />
            Settings
          </button>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Overview</div>
          <div style={statsGridStyle}>
            <div style={statCardStyle}>
              <div style={statValueStyle}>{stats.totalPlugins}</div>
              <div style={statLabelStyle}>Total Plugins</div>
            </div>
            <div style={statCardStyle}>
              <div style={statValueStyle}>{stats.activePlugins}</div>
              <div style={statLabelStyle}>Active Plugins</div>
            </div>
            <div style={statCardStyle}>
              <div style={statValueStyle}>{stats.recentInstalls}</div>
              <div style={statLabelStyle}>Recent Installs</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Filters</div>
        <div style={{ display: 'flex', gap: solitudeTheme.spacing.sm, marginBottom: solitudeTheme.spacing.sm }}>
          {(['all', 'active', 'inactive'] as const).map(filterType => (
            <button
              key={filterType}
              style={filter === filterType ? activeButtonStyle : buttonStyle}
              onClick={() => setFilter(filterType)}
            >
              {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search plugins..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: solitudeTheme.spacing.sm,
            border: `1px solid ${solitudeTheme.colors.border}`,
            borderRadius: solitudeTheme.borderRadius.sm,
            fontSize: solitudeTheme.typography.fontSize.sm,
            backgroundColor: solitudeTheme.colors.surface,
          }}
        />
      </div>

      {/* Plugin List */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          Plugins ({getFilteredPlugins().length})
        </div>
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {getFilteredPlugins().map(plugin => (
            <div
              key={plugin.id}
              style={selectedPlugin === plugin.id ? selectedPluginCardStyle : pluginCardStyle}
              onClick={() => setSelectedPlugin(selectedPlugin === plugin.id ? null : plugin.id)}
            >
              <div style={pluginHeaderStyle}>
                <div>
                  <h4 style={pluginTitleStyle}>{plugin.metadata.name}</h4>
                  <div style={pluginMetaStyle}>
                    v{plugin.metadata.version} • by {plugin.metadata.author}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: solitudeTheme.spacing.sm }}>
                  <span style={{ 
                    color: getStatusColor(plugin.status),
                    fontWeight: solitudeTheme.typography.fontWeight.medium,
                    fontSize: solitudeTheme.typography.fontSize.sm,
                  }}>
                    {plugin.status.toUpperCase()}
                  </span>
                  <div style={toggleStyle}>
                    <input
                      type="checkbox"
                      checked={plugin.configuration.enabled}
                      onChange={(e) => {
                        e.stopPropagation();
                        handlePluginToggle(plugin.id, e.target.checked);
                      }}
                    />
                    <button
                      style={{
                        ...buttonStyle,
                        backgroundColor: solitudeTheme.colors.error,
                        color: 'white',
                        padding: '4px 8px',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePluginUninstall(plugin.id);
                      }}
                    >
                      <DeleteIcon size={12} />
                    </button>
                  </div>
                </div>
              </div>
              
              <div style={pluginDescriptionStyle}>
                {plugin.metadata.description}
              </div>
              
              <div style={{ marginBottom: solitudeTheme.spacing.sm }}>
                {plugin.metadata.keywords?.map(keyword => (
                  <span key={keyword} style={keywordStyle}>
                    {keyword}
                  </span>
                ))}
              </div>
              
              <div style={pluginMetaStyle}>
                Installed: {formatDate(plugin.installationDate)} • 
                Updated: {formatDate(plugin.lastUpdateDate)}
              </div>
              
              {selectedPlugin === plugin.id && (
                <div style={{ 
                  marginTop: solitudeTheme.spacing.md,
                  padding: solitudeTheme.spacing.sm,
                  backgroundColor: solitudeTheme.colors.background,
                  borderRadius: solitudeTheme.borderRadius.sm,
                }}>
                  <div style={sectionTitleStyle}>Plugin Details</div>
                  
                  <div style={{ marginBottom: solitudeTheme.spacing.sm }}>
                    <strong>Capabilities:</strong>
                    <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                      {plugin.capabilities.hooks && (
                        <li>Hooks: {plugin.capabilities.hooks.join(', ')}</li>
                      )}
                      {plugin.capabilities.nodes && (
                        <li>Nodes: {plugin.capabilities.nodes.join(', ')}</li>
                      )}
                      {plugin.capabilities.datasets && (
                        <li>Datasets: {plugin.capabilities.datasets.join(', ')}</li>
                      )}
                      {plugin.capabilities.commands && (
                        <li>Commands: {plugin.capabilities.commands.join(', ')}</li>
                      )}
                    </ul>
                  </div>
                  
                  {plugin.metadata.website && (
                    <div style={{ marginBottom: solitudeTheme.spacing.sm }}>
                      <strong>Website:</strong>{' '}
                      <a href={plugin.metadata.website} target="_blank" rel="noopener noreferrer">
                        {plugin.metadata.website}
                      </a>
                    </div>
                  )}
                  
                  {plugin.metadata.repository && (
                    <div style={{ marginBottom: solitudeTheme.spacing.sm }}>
                      <strong>Repository:</strong>{' '}
                      <a href={plugin.metadata.repository} target="_blank" rel="noopener noreferrer">
                        {plugin.metadata.repository}
                      </a>
                    </div>
                  )}
                  
                  <div style={{ marginBottom: solitudeTheme.spacing.sm }}>
                    <strong>Entry Point:</strong> {plugin.entryPoint}
                  </div>
                  
                  {plugin.metadata.license && (
                    <div style={{ marginBottom: solitudeTheme.spacing.sm }}>
                      <strong>License:</strong> {plugin.metadata.license}
                    </div>
                  )}
                  
                  {plugin.configuration.settings && (
                    <div>
                      <strong>Settings:</strong>
                      <pre style={{
                        marginTop: '4px',
                        padding: solitudeTheme.spacing.sm,
                        backgroundColor: solitudeTheme.colors.surface,
                        borderRadius: solitudeTheme.borderRadius.sm,
                        fontSize: solitudeTheme.typography.fontSize.xs,
                        overflow: 'auto',
                      }}>
                        {JSON.stringify(plugin.configuration.settings, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          
          {getFilteredPlugins().length === 0 && (
            <div style={{
              textAlign: 'center',
              color: solitudeTheme.colors.textSecondary,
              padding: solitudeTheme.spacing.xl,
            }}>
              No plugins found matching the current filters
            </div>
          )}
        </div>
      </div>

      {/* Plugin Installation (Future Enhancement) */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Install New Plugin</div>
        <div style={{
          padding: solitudeTheme.spacing.md,
          backgroundColor: solitudeTheme.colors.surface,
          borderRadius: solitudeTheme.borderRadius.md,
          border: `1px solid ${solitudeTheme.colors.border}`,
          textAlign: 'center',
        }}>
          <DownloadIcon size={24} />
          <div style={{ marginTop: solitudeTheme.spacing.sm }}>
            Plugin marketplace and installation coming soon!
          </div>
          <div style={{ 
            marginTop: solitudeTheme.spacing.xs,
            fontSize: solitudeTheme.typography.fontSize.sm,
            color: solitudeTheme.colors.textSecondary,
          }}>
            Currently showing built-in plugins only
          </div>
        </div>
      </div>
    </div>
  );
};

export default PluginManagerPanel;