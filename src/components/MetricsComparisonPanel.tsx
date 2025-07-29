import { FC, useState, useEffect } from 'react';
import { Experiment, ExperimentMetric } from '../services/experimentTracking';
import { solitudeTheme } from '../styles/theme';
import { ProcessIcon, EvaluateIcon, TimeIcon } from './Icons';
import { experimentTracker } from '../services/experimentTracking';

interface MetricsComparisonPanelProps {
  experiments?: Experiment[];
  onExperimentSelect?: (experiment: Experiment) => void;
}

const MetricsComparisonPanel: FC<MetricsComparisonPanelProps> = ({
  experiments = [],
  onExperimentSelect,
}) => {
  const [selectedExperiments, setSelectedExperiments] = useState<Set<string>>(new Set());
  const [comparisonData, setComparisonData] = useState<any>(null);
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [metricsFilter, setMetricsFilter] = useState<string>('');
  const [showOnlyDifferences, setShowOnlyDifferences] = useState<boolean>(false);

  useEffect(() => {
    if (selectedExperiments.size > 0) {
      const selectedIds = Array.from(selectedExperiments);
      const comparison = experimentTracker.compareExperiments(selectedIds);
      setComparisonData(comparison);
    } else {
      setComparisonData(null);
    }
  }, [selectedExperiments]);

  const toggleExperimentSelection = (experimentId: string) => {
    const newSelected = new Set(selectedExperiments);
    if (newSelected.has(experimentId)) {
      newSelected.delete(experimentId);
    } else {
      newSelected.add(experimentId);
    }
    setSelectedExperiments(newSelected);
  };

  const clearSelection = () => {
    setSelectedExperiments(new Set());
    setComparisonData(null);
  };

  const getFilteredExperiments = () => {
    let filtered = [...experiments];
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(exp => exp.status === filterStatus);
    }
    
    filtered.sort((a, b) => {
      const aValue = a[sortBy as keyof Experiment];
      const bValue = b[sortBy as keyof Experiment];
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    
    return filtered;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return solitudeTheme.colors.success;
      case 'failed': return solitudeTheme.colors.error;
      case 'active': return solitudeTheme.colors.warning;
      default: return solitudeTheme.colors.textSecondary;
    }
  };

  const formatMetricValue = (value: any) => {
    if (typeof value === 'number') {
      return value.toFixed(4);
    }
    return String(value);
  };

  const getMetricTrend = (metric: any) => {
    if (metric.values.length < 2) return null;
    
    const values = metric.values.map((v: any) => v.value).filter((v: any) => typeof v === 'number');
    if (values.length < 2) return null;
    
    const first = values[0];
    const last = values[values.length - 1];
    const change = ((last - first) / first) * 100;
    
    return {
      change,
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
      arrow: change > 0 ? '↑' : change < 0 ? '↓' : '→',
    };
  };

  const getFilteredMetrics = () => {
    if (!comparisonData) return [];
    
    let metrics = comparisonData.metrics;
    
    if (metricsFilter) {
      metrics = metrics.filter((metric: any) => 
        metric.name.toLowerCase().includes(metricsFilter.toLowerCase())
      );
    }
    
    if (showOnlyDifferences) {
      metrics = metrics.filter((metric: any) => {
        const values = metric.values.map((v: any) => v.value);
        return new Set(values).size > 1; // Only show metrics with different values
      });
    }
    
    return metrics;
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

  const experimentItemStyle = {
    display: 'flex',
    alignItems: 'center',
    padding: solitudeTheme.spacing.sm,
    margin: '2px 0',
    borderRadius: solitudeTheme.borderRadius.sm,
    cursor: 'pointer',
    fontSize: solitudeTheme.typography.fontSize.sm,
    border: `1px solid ${solitudeTheme.colors.border}`,
    backgroundColor: solitudeTheme.colors.surface,
  };

  const selectedExperimentItemStyle = {
    ...experimentItemStyle,
    backgroundColor: solitudeTheme.colors.surfaceHover,
    borderColor: solitudeTheme.colors.accent,
  };

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: solitudeTheme.typography.fontSize.sm,
  };

  const cellStyle = {
    padding: solitudeTheme.spacing.sm,
    border: `1px solid ${solitudeTheme.colors.border}`,
    textAlign: 'left' as const,
    backgroundColor: solitudeTheme.colors.surface,
  };

  const headerCellStyle = {
    ...cellStyle,
    backgroundColor: solitudeTheme.colors.surfaceHover,
    fontWeight: solitudeTheme.typography.fontWeight.semiBold,
  };

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <h3 style={{ margin: 0, color: solitudeTheme.colors.textPrimary }}>
          Metrics Comparison
        </h3>
        <div style={{ display: 'flex', gap: solitudeTheme.spacing.sm }}>
          <button
            style={{
              ...buttonStyle,
              backgroundColor: solitudeTheme.colors.error,
              color: 'white',
            }}
            onClick={clearSelection}
            disabled={selectedExperiments.size === 0}
          >
            Clear Selection
          </button>
        </div>
      </div>

      {/* Filters and Controls */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Filters & Controls</div>
        <div style={{ display: 'flex', gap: solitudeTheme.spacing.sm, flexWrap: 'wrap', marginBottom: solitudeTheme.spacing.sm }}>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              ...buttonStyle,
              minWidth: '120px',
            }}
          >
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="active">Active</option>
            <option value="failed">Failed</option>
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              ...buttonStyle,
              minWidth: '120px',
            }}
          >
            <option value="createdAt">Created Date</option>
            <option value="name">Name</option>
            <option value="status">Status</option>
          </select>
          
          <button
            style={sortOrder === 'desc' ? activeButtonStyle : buttonStyle}
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            {sortOrder === 'desc' ? '↓' : '↑'} {sortOrder.toUpperCase()}
          </button>
        </div>
        
        <div style={{ display: 'flex', gap: solitudeTheme.spacing.sm, alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Filter metrics..."
            value={metricsFilter}
            onChange={(e) => setMetricsFilter(e.target.value)}
            style={{
              padding: solitudeTheme.spacing.sm,
              border: `1px solid ${solitudeTheme.colors.border}`,
              borderRadius: solitudeTheme.borderRadius.sm,
              fontSize: solitudeTheme.typography.fontSize.sm,
              backgroundColor: solitudeTheme.colors.surface,
            }}
          />
          
          <label style={{ display: 'flex', alignItems: 'center', gap: solitudeTheme.spacing.xs }}>
            <input
              type="checkbox"
              checked={showOnlyDifferences}
              onChange={(e) => setShowOnlyDifferences(e.target.checked)}
            />
            <span style={{ fontSize: solitudeTheme.typography.fontSize.sm }}>Show only differences</span>
          </label>
        </div>
      </div>

      {/* Experiment Selection */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Experiments ({selectedExperiments.size} selected)</div>
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {getFilteredExperiments().map(experiment => (
            <div
              key={experiment.id}
              style={selectedExperiments.has(experiment.id) ? selectedExperimentItemStyle : experimentItemStyle}
              onClick={() => toggleExperimentSelection(experiment.id)}
            >
              <input
                type="checkbox"
                checked={selectedExperiments.has(experiment.id)}
                onChange={() => toggleExperimentSelection(experiment.id)}
                style={{ marginRight: solitudeTheme.spacing.sm }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: solitudeTheme.typography.fontWeight.medium }}>
                  {experiment.name}
                </div>
                <div style={{ 
                  fontSize: solitudeTheme.typography.fontSize.xs,
                  color: solitudeTheme.colors.textSecondary,
                }}>
                  {experiment.id} • {experiment.createdAt.toLocaleDateString()}
                </div>
              </div>
              <div style={{
                color: getStatusColor(experiment.status),
                fontWeight: solitudeTheme.typography.fontWeight.medium,
                fontSize: solitudeTheme.typography.fontSize.xs,
              }}>
                {experiment.status.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comparison Results */}
      {comparisonData && (
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Comparison Results</div>
          
          {/* Metrics Comparison Table */}
          <div style={{ marginBottom: solitudeTheme.spacing.md }}>
            <h4 style={{ 
              fontSize: solitudeTheme.typography.fontSize.md,
              color: solitudeTheme.colors.textPrimary,
              marginBottom: solitudeTheme.spacing.sm,
            }}>Metrics</h4>
            
            {getFilteredMetrics().length === 0 ? (
              <div style={{ 
                textAlign: 'center',
                color: solitudeTheme.colors.textSecondary,
                padding: solitudeTheme.spacing.md,
              }}>
                No metrics found matching current filters
              </div>
            ) : (
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={headerCellStyle}>Metric</th>
                    {comparisonData.experiments.map((exp: Experiment) => (
                      <th key={exp.id} style={headerCellStyle}>
                        {exp.name}
                      </th>
                    ))}
                    <th style={headerCellStyle}>Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredMetrics().map((metric: any, index: number) => {
                    const trend = getMetricTrend(metric);
                    return (
                      <tr key={index}>
                        <td style={cellStyle}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: solitudeTheme.spacing.xs }}>
                            <EvaluateIcon size={14} />
                            {metric.name}
                          </div>
                        </td>
                        {metric.values.map((value: any, valueIndex: number) => (
                          <td key={valueIndex} style={cellStyle}>
                            {formatMetricValue(value.value)}
                          </td>
                        ))}
                        <td style={cellStyle}>
                          {trend && (
                            <span style={{
                              color: trend.trend === 'up' ? solitudeTheme.colors.success :
                                     trend.trend === 'down' ? solitudeTheme.colors.error :
                                     solitudeTheme.colors.textSecondary,
                            }}>
                              {trend.arrow} {Math.abs(trend.change).toFixed(1)}%
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Parameters Comparison */}
          <div style={{ marginBottom: solitudeTheme.spacing.md }}>
            <h4 style={{ 
              fontSize: solitudeTheme.typography.fontSize.md,
              color: solitudeTheme.colors.textPrimary,
              marginBottom: solitudeTheme.spacing.sm,
            }}>Parameters</h4>
            
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={headerCellStyle}>Parameter</th>
                  {comparisonData.experiments.map((exp: Experiment) => (
                    <th key={exp.id} style={headerCellStyle}>
                      {exp.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonData.parameters.map((param: any, index: number) => (
                  <tr key={index}>
                    <td style={cellStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: solitudeTheme.spacing.xs }}>
                        <ProcessIcon size={14} />
                        {param.name}
                      </div>
                    </td>
                    {param.values.map((value: any, valueIndex: number) => (
                      <td key={valueIndex} style={cellStyle}>
                        {formatMetricValue(value.value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary Statistics */}
          <div style={sectionStyle}>
            <h4 style={{ 
              fontSize: solitudeTheme.typography.fontSize.md,
              color: solitudeTheme.colors.textPrimary,
              marginBottom: solitudeTheme.spacing.sm,
            }}>Summary</h4>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: solitudeTheme.spacing.md,
            }}>
              <div style={{
                padding: solitudeTheme.spacing.sm,
                backgroundColor: solitudeTheme.colors.surface,
                borderRadius: solitudeTheme.borderRadius.md,
                border: `1px solid ${solitudeTheme.colors.border}`,
              }}>
                <div style={{ fontWeight: solitudeTheme.typography.fontWeight.medium }}>
                  Experiments Compared
                </div>
                <div style={{ 
                  fontSize: solitudeTheme.typography.fontSize.lg,
                  color: solitudeTheme.colors.accent,
                  fontWeight: solitudeTheme.typography.fontWeight.bold,
                }}>
                  {comparisonData.experiments.length}
                </div>
              </div>
              
              <div style={{
                padding: solitudeTheme.spacing.sm,
                backgroundColor: solitudeTheme.colors.surface,
                borderRadius: solitudeTheme.borderRadius.md,
                border: `1px solid ${solitudeTheme.colors.border}`,
              }}>
                <div style={{ fontWeight: solitudeTheme.typography.fontWeight.medium }}>
                  Metrics Compared
                </div>
                <div style={{ 
                  fontSize: solitudeTheme.typography.fontSize.lg,
                  color: solitudeTheme.colors.accent,
                  fontWeight: solitudeTheme.typography.fontWeight.bold,
                }}>
                  {comparisonData.metrics.length}
                </div>
              </div>
              
              <div style={{
                padding: solitudeTheme.spacing.sm,
                backgroundColor: solitudeTheme.colors.surface,
                borderRadius: solitudeTheme.borderRadius.md,
                border: `1px solid ${solitudeTheme.colors.border}`,
              }}>
                <div style={{ fontWeight: solitudeTheme.typography.fontWeight.medium }}>
                  Parameters Compared
                </div>
                <div style={{ 
                  fontSize: solitudeTheme.typography.fontSize.lg,
                  color: solitudeTheme.colors.accent,
                  fontWeight: solitudeTheme.typography.fontWeight.bold,
                }}>
                  {comparisonData.parameters.length}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {selectedExperiments.size === 0 && (
        <div style={{
          textAlign: 'center',
          color: solitudeTheme.colors.textSecondary,
          padding: solitudeTheme.spacing.xl,
        }}>
          Select experiments to compare their metrics and parameters
        </div>
      )}
    </div>
  );
};

export default MetricsComparisonPanel;