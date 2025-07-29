import { FC, useState, useEffect } from 'react';
import { runnerRegistry, BaseRunner, RunnerStatus } from '../services/runnerSystem';
import { solitudeTheme } from '../styles/theme';
import { ProcessIcon, PlayIcon, StopIcon, SettingsIcon, TimeIcon } from './Icons';

interface RunnerManagementPanelProps {
  onRunnerSelect?: (runnerId: string) => void;
}

const RunnerManagementPanel: FC<RunnerManagementPanelProps> = ({
  onRunnerSelect,
}) => {
  const [runners, setRunners] = useState<BaseRunner[]>([]);
  const [selectedRunner, setSelectedRunner] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [filter, setFilter] = useState<'all' | 'available' | 'busy'>('all');
  const [showMetrics, setShowMetrics] = useState<boolean>(false);

  useEffect(() => {
    loadRunners();
    loadStats();
    
    // Update every 5 seconds
    const interval = setInterval(() => {
      loadRunners();
      loadStats();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const loadRunners = () => {
    const allRunners = runnerRegistry.getAllRunners();
    setRunners(allRunners);
  };

  const loadStats = () => {
    const runnerStats = runnerRegistry.getRunnerStats();
    setStats(runnerStats);
  };

  const handleRunnerSelect = (runnerId: string) => {
    setSelectedRunner(selectedRunner === runnerId ? null : runnerId);
    onRunnerSelect?.(runnerId);
  };

  const handleSetDefaultRunner = (runnerId: string) => {
    runnerRegistry.setDefaultRunner(runnerId);
    loadRunners();
  };

  const getFilteredRunners = () => {
    let filtered = [...runners];
    
    if (filter !== 'all') {
      filtered = filtered.filter(runner => {
        const status = runner.getStatus().status;
        return filter === 'available' ? status === 'available' : status === 'busy';
      });
    }
    
    return filtered;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return solitudeTheme.colors.success;
      case 'busy': return solitudeTheme.colors.warning;
      case 'error': return solitudeTheme.colors.error;
      case 'maintenance': return solitudeTheme.colors.textSecondary;
      default: return solitudeTheme.colors.textSecondary;
    }
  };

  const getRunnerTypeColor = (type: string) => {
    switch (type) {
      case 'sequential': return solitudeTheme.colors.textSecondary;
      case 'parallel': return solitudeTheme.colors.accent;
      case 'distributed': return solitudeTheme.colors.success;
      case 'spark': return '#e25a1c';
      case 'kubernetes': return '#326ce5';
      default: return solitudeTheme.colors.textSecondary;
    }
  };

  const formatCapabilities = (capabilities: any) => {
    const caps = [];
    if (capabilities.supportsParallelExecution) caps.push('Parallel');
    if (capabilities.supportsDistributedExecution) caps.push('Distributed');
    if (capabilities.supportsResourceManagement) caps.push('Resources');
    if (capabilities.supportsAutoScaling) caps.push('Auto-scaling');
    if (capabilities.supportsGPU) caps.push('GPU');
    return caps.join(', ');
  };

  const formatExecutionTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
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

  const runnerCardStyle = {
    border: `1px solid ${solitudeTheme.colors.border}`,
    borderRadius: solitudeTheme.borderRadius.md,
    padding: solitudeTheme.spacing.md,
    marginBottom: solitudeTheme.spacing.sm,
    backgroundColor: solitudeTheme.colors.surface,
    cursor: 'pointer',
  };

  const selectedRunnerCardStyle = {
    ...runnerCardStyle,
    borderColor: solitudeTheme.colors.accent,
    backgroundColor: solitudeTheme.colors.surfaceHover,
  };

  const runnerHeaderStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: solitudeTheme.spacing.sm,
  };

  const runnerTitleStyle = {
    fontSize: solitudeTheme.typography.fontSize.lg,
    fontWeight: solitudeTheme.typography.fontWeight.semiBold,
    color: solitudeTheme.colors.textPrimary,
    margin: 0,
  };

  const runnerMetaStyle = {
    fontSize: solitudeTheme.typography.fontSize.sm,
    color: solitudeTheme.colors.textSecondary,
    marginBottom: solitudeTheme.spacing.xs,
  };

  const metricsGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: solitudeTheme.spacing.sm,
    marginBottom: solitudeTheme.spacing.sm,
  };

  const metricStyle = {
    textAlign: 'center' as const,
    padding: solitudeTheme.spacing.sm,
    backgroundColor: solitudeTheme.colors.background,
    borderRadius: solitudeTheme.borderRadius.sm,
    border: `1px solid ${solitudeTheme.colors.border}`,
  };

  const metricValueStyle = {
    fontSize: solitudeTheme.typography.fontSize.lg,
    fontWeight: solitudeTheme.typography.fontWeight.bold,
    color: solitudeTheme.colors.accent,
  };

  const metricLabelStyle = {
    fontSize: solitudeTheme.typography.fontSize.xs,
    color: solitudeTheme.colors.textSecondary,
    marginTop: '2px',
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
          Runner Management
        </h3>
        <div style={{ display: 'flex', gap: solitudeTheme.spacing.sm }}>
          <button
            style={showMetrics ? activeButtonStyle : buttonStyle}
            onClick={() => setShowMetrics(!showMetrics)}
          >
            <TimeIcon size={14} />
            Metrics
          </button>
        </div>
      </div>

      {/* Global Statistics */}
      {stats && (
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Overview</div>
          <div style={statsGridStyle}>
            <div style={statCardStyle}>
              <div style={statValueStyle}>{stats.totalRunners}</div>
              <div style={statLabelStyle}>Total Runners</div>
            </div>
            <div style={statCardStyle}>
              <div style={statValueStyle}>{stats.availableRunners}</div>
              <div style={statLabelStyle}>Available</div>
            </div>
            <div style={statCardStyle}>
              <div style={statValueStyle}>{stats.totalExecutions}</div>
              <div style={statLabelStyle}>Total Executions</div>
            </div>
            <div style={statCardStyle}>
              <div style={statValueStyle}>
                {(stats.averageSuccessRate * 100).toFixed(1)}%
              </div>
              <div style={statLabelStyle}>Success Rate</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Filters</div>
        <div style={{ display: 'flex', gap: solitudeTheme.spacing.sm }}>
          {(['all', 'available', 'busy'] as const).map(filterType => (
            <button
              key={filterType}
              style={filter === filterType ? activeButtonStyle : buttonStyle}
              onClick={() => setFilter(filterType)}
            >
              {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Runner List */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>
          Runners ({getFilteredRunners().length})
        </div>
        <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
          {getFilteredRunners().map(runner => {
            const status = runner.getStatus();
            const config = runner.getConfiguration();
            const capabilities = runner.getCapabilities();
            const metrics = runner.getMetrics();
            const isDefault = runnerRegistry.getDefaultRunner()?.getId() === runner.getId();
            
            return (
              <div
                key={runner.getId()}
                style={selectedRunner === runner.getId() ? selectedRunnerCardStyle : runnerCardStyle}
                onClick={() => handleRunnerSelect(runner.getId())}
              >
                <div style={runnerHeaderStyle}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: solitudeTheme.spacing.sm }}>
                      <h4 style={runnerTitleStyle}>{runner.getName()}</h4>
                      {isDefault && (
                        <span style={{
                          padding: '2px 6px',
                          backgroundColor: solitudeTheme.colors.accent,
                          color: 'white',
                          borderRadius: solitudeTheme.borderRadius.sm,
                          fontSize: solitudeTheme.typography.fontSize.xs,
                        }}>
                          DEFAULT
                        </span>
                      )}
                    </div>
                    <div style={runnerMetaStyle}>
                      <span style={{ color: getRunnerTypeColor(config.type) }}>
                        {config.type.toUpperCase()}
                      </span>
                      {' • '}
                      <span style={{ color: getStatusColor(status.status) }}>
                        {status.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: solitudeTheme.spacing.sm }}>
                    <button
                      style={{
                        ...buttonStyle,
                        backgroundColor: isDefault ? solitudeTheme.colors.textSecondary : solitudeTheme.colors.success,
                        color: 'white',
                        padding: '4px 8px',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetDefaultRunner(runner.getId());
                      }}
                      disabled={isDefault}
                    >
                      {isDefault ? 'Default' : 'Set Default'}
                    </button>
                  </div>
                </div>
                
                <div style={runnerMetaStyle}>
                  <strong>Capabilities:</strong> {formatCapabilities(capabilities)}
                </div>
                
                <div style={runnerMetaStyle}>
                  <strong>Max Concurrency:</strong> {capabilities.maxConcurrency || 'N/A'}
                </div>
                
                {showMetrics && (
                  <div style={metricsGridStyle}>
                    <div style={metricStyle}>
                      <div style={metricValueStyle}>{metrics.totalExecutions}</div>
                      <div style={metricLabelStyle}>Total</div>
                    </div>
                    <div style={metricStyle}>
                      <div style={metricValueStyle}>{metrics.successfulExecutions}</div>
                      <div style={metricLabelStyle}>Success</div>
                    </div>
                    <div style={metricStyle}>
                      <div style={metricValueStyle}>{metrics.failedExecutions}</div>
                      <div style={metricLabelStyle}>Failed</div>
                    </div>
                    <div style={metricStyle}>
                      <div style={metricValueStyle}>
                        {formatExecutionTime(metrics.averageExecutionTime)}
                      </div>
                      <div style={metricLabelStyle}>Avg Time</div>
                    </div>
                    <div style={metricStyle}>
                      <div style={metricValueStyle}>{metrics.activeJobs}</div>
                      <div style={metricLabelStyle}>Active</div>
                    </div>
                    <div style={metricStyle}>
                      <div style={metricValueStyle}>{metrics.queuedJobs}</div>
                      <div style={metricLabelStyle}>Queued</div>
                    </div>
                  </div>
                )}
                
                {selectedRunner === runner.getId() && (
                  <div style={{
                    marginTop: solitudeTheme.spacing.md,
                    padding: solitudeTheme.spacing.sm,
                    backgroundColor: solitudeTheme.colors.background,
                    borderRadius: solitudeTheme.borderRadius.sm,
                  }}>
                    <div style={sectionTitleStyle}>Runner Details</div>
                    
                    <div style={{ marginBottom: solitudeTheme.spacing.sm }}>
                      <strong>ID:</strong> {runner.getId()}
                    </div>
                    
                    <div style={{ marginBottom: solitudeTheme.spacing.sm }}>
                      <strong>Version:</strong> {status.version}
                    </div>
                    
                    <div style={{ marginBottom: solitudeTheme.spacing.sm }}>
                      <strong>Last Heartbeat:</strong> {status.lastHeartbeat.toLocaleString()}
                    </div>
                    
                    <div style={{ marginBottom: solitudeTheme.spacing.sm }}>
                      <strong>Resource Utilization:</strong>
                      <div style={{ marginLeft: solitudeTheme.spacing.md }}>
                        <div>CPU: {metrics.resourceUtilization.cpu.toFixed(1)}%</div>
                        <div>Memory: {metrics.resourceUtilization.memory.toFixed(1)}%</div>
                        {metrics.resourceUtilization.gpu !== undefined && (
                          <div>GPU: {metrics.resourceUtilization.gpu.toFixed(1)}%</div>
                        )}
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: solitudeTheme.spacing.sm }}>
                      <strong>Configuration:</strong>
                      <pre style={{
                        marginTop: '4px',
                        padding: solitudeTheme.spacing.sm,
                        backgroundColor: solitudeTheme.colors.surface,
                        borderRadius: solitudeTheme.borderRadius.sm,
                        fontSize: solitudeTheme.typography.fontSize.xs,
                        overflow: 'auto',
                        maxHeight: '200px',
                      }}>
                        {JSON.stringify(config, null, 2)}
                      </pre>
                    </div>
                    
                    <div style={{ marginBottom: solitudeTheme.spacing.sm }}>
                      <strong>Supported Node Types:</strong>
                      <div style={{ marginTop: '4px' }}>
                        {capabilities.supportedNodeTypes.map(type => (
                          <span key={type} style={{
                            display: 'inline-block',
                            padding: '2px 6px',
                            margin: '2px',
                            backgroundColor: solitudeTheme.colors.surfaceHover,
                            borderRadius: solitudeTheme.borderRadius.sm,
                            fontSize: solitudeTheme.typography.fontSize.xs,
                          }}>
                            {type}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          
          {getFilteredRunners().length === 0 && (
            <div style={{
              textAlign: 'center',
              color: solitudeTheme.colors.textSecondary,
              padding: solitudeTheme.spacing.xl,
            }}>
              No runners found matching the current filters
            </div>
          )}
        </div>
      </div>

      {/* Runner Performance Summary */}
      {stats && (
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Performance Summary</div>
          <div style={{
            padding: solitudeTheme.spacing.md,
            backgroundColor: solitudeTheme.colors.surface,
            borderRadius: solitudeTheme.borderRadius.md,
            border: `1px solid ${solitudeTheme.colors.border}`,
          }}>
            <div style={metricsGridStyle}>
              {Object.entries(stats.runnersByType).map(([type, count]) => (
                <div key={type} style={metricStyle}>
                  <div style={metricValueStyle}>{count as React.ReactNode}</div>
                  <div style={metricLabelStyle}>{type} runners</div>
                </div>
              ))}
            </div>
            
            <div style={{
              marginTop: solitudeTheme.spacing.md,
              fontSize: solitudeTheme.typography.fontSize.sm,
              color: solitudeTheme.colors.textSecondary,
            }}>
              <strong>Recommendation:</strong> {' '}
              {stats.availableRunners === 0 
                ? 'All runners are busy. Consider adding more runners or using distributed execution.'
                : stats.averageSuccessRate < 0.8
                ? 'Low success rate detected. Check runner configurations and error logs.'
                : 'Runner performance is optimal.'
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RunnerManagementPanel;