import { FC, useState, useEffect } from 'react';
import { PipelineExecution, NodeStatus } from '../types';
import { pipelineExecutionEngine } from '../services/pipelineExecution';
import { experimentTracker } from '../services/experimentTracking';
import { solitudeTheme } from '../styles/theme';
import { TimeIcon, ClockIcon, CloseIcon } from './Icons';

interface ExecutionPanelProps {
  pipelineId: string;
  onExecutionStart?: (execution: PipelineExecution) => void;
  onExecutionComplete?: (execution: PipelineExecution) => void;
}

const ExecutionPanel: FC<ExecutionPanelProps> = ({ 
  pipelineId, 
  onExecutionStart,
  onExecutionComplete 
}) => {
  const [executions, setExecutions] = useState<PipelineExecution[]>([]);
  const [currentExecution, setCurrentExecution] = useState<PipelineExecution | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    loadExecutions();
  }, [pipelineId]);

  const loadExecutions = () => {
    const allExecutions = pipelineExecutionEngine.getExecutionsForPipeline(pipelineId);
    setExecutions(allExecutions.sort((a, b) => b.startTime.getTime() - a.startTime.getTime()));
  };

  const startExecution = async () => {
    if (isExecuting) return;
    
    setIsExecuting(true);
    try {
      // Mock pipeline data - in real implementation, get from pipeline state
      const mockNodes = [
        { id: '1', type: 'csv_input' as const, data: { label: 'Load Data' }, position: { x: 0, y: 0 } },
        { id: '2', type: 'transform' as const, data: { label: 'Transform' }, position: { x: 200, y: 0 } },
        { id: '3', type: 'csv_output' as const, data: { label: 'Save Results' }, position: { x: 400, y: 0 } },
      ];
      const mockEdges = [
        { id: 'e1-2', source: '1', target: '2' },
        { id: 'e2-3', source: '2', target: '3' },
      ];

      const execution = await pipelineExecutionEngine.executePipeline(
        pipelineId,
        mockNodes,
        mockEdges,
        parameters
      );

      setCurrentExecution(execution);
      onExecutionStart?.(execution);
      
      // Track experiment
      experimentTracker.trackPipelineExecution(pipelineId, execution);
      
      loadExecutions();
      onExecutionComplete?.(execution);
    } catch (error) {
      console.error('Execution failed:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  const getStatusColor = (status: NodeStatus | 'running' | 'completed' | 'failed') => {
    switch (status) {
      case 'running': return solitudeTheme.colors.warning;
      case 'completed': return solitudeTheme.colors.success;
      case 'failed': return solitudeTheme.colors.error;
      case 'pending': return solitudeTheme.colors.textTertiary;
      default: return solitudeTheme.colors.textTertiary;
    }
  };

  const formatDuration = (start: Date, end?: Date) => {
    const endTime = end || new Date();
    const duration = endTime.getTime() - start.getTime();
    return `${(duration / 1000).toFixed(1)}s`;
  };

  const panelStyle = {
    backgroundColor: solitudeTheme.colors.background,
    padding: solitudeTheme.spacing.md,
    borderRadius: solitudeTheme.borderRadius.lg,
    marginBottom: solitudeTheme.spacing.md,
    border: `1px solid ${solitudeTheme.colors.border}`,
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: solitudeTheme.spacing.md,
  };

  const buttonStyle = {
    padding: '8px 16px',
    borderRadius: solitudeTheme.borderRadius.sm,
    border: 'none',
    cursor: 'pointer',
    fontSize: solitudeTheme.typography.fontSize.sm,
    fontWeight: solitudeTheme.typography.fontWeight.medium,
    transition: solitudeTheme.transitions.fast,
  };

  const primaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: solitudeTheme.colors.accent,
    color: 'white',
  };

  const secondaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: solitudeTheme.colors.surface,
    color: solitudeTheme.colors.textPrimary,
    border: `1px solid ${solitudeTheme.colors.border}`,
  };

  const executionItemStyle = {
    backgroundColor: solitudeTheme.colors.surface,
    padding: solitudeTheme.spacing.sm,
    borderRadius: solitudeTheme.borderRadius.md,
    marginBottom: solitudeTheme.spacing.sm,
    border: `1px solid ${solitudeTheme.colors.border}`,
  };

  const nodeStatusStyle = {
    display: 'inline-block',
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    marginRight: solitudeTheme.spacing.sm,
  };

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <h3 style={{ margin: 0, color: solitudeTheme.colors.textPrimary }}>Pipeline Execution</h3>
        <div style={{ display: 'flex', gap: solitudeTheme.spacing.sm }}>
          <button
            style={secondaryButtonStyle}
            onClick={() => setShowHistory(!showHistory)}
          >
            {showHistory ? 'Hide' : 'Show'} History
          </button>
          <button
            style={{
              ...primaryButtonStyle,
              backgroundColor: isExecuting ? solitudeTheme.colors.warning : solitudeTheme.colors.accent,
            }}
            onClick={startExecution}
            disabled={isExecuting}
          >
            {isExecuting ? 'Executing...' : 'Run Pipeline'}
          </button>
        </div>
      </div>

      {/* Parameters Section */}
      <div style={{ marginBottom: solitudeTheme.spacing.md }}>
        <h4 style={{ 
          margin: '0 0 8px 0', 
          fontSize: solitudeTheme.typography.fontSize.md,
          color: solitudeTheme.colors.textPrimary
        }}>Parameters</h4>
        <div style={{ display: 'flex', gap: solitudeTheme.spacing.sm, flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Parameter key"
            style={{
              padding: '6px 8px',
              border: `1px solid ${solitudeTheme.colors.border}`,
              borderRadius: solitudeTheme.borderRadius.sm,
              fontSize: solitudeTheme.typography.fontSize.sm,
              color: solitudeTheme.colors.textPrimary,
              backgroundColor: solitudeTheme.colors.surface,
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                const key = e.currentTarget.value;
                const value = prompt(`Value for ${key}:`);
                if (key && value) {
                  setParameters(prev => ({ ...prev, [key]: value }));
                  e.currentTarget.value = '';
                }
              }
            }}
          />
          <div style={{ 
            fontSize: solitudeTheme.typography.fontSize.sm, 
            color: solitudeTheme.colors.textSecondary 
          }}>
            Press Enter to add parameter
          </div>
        </div>
        {Object.entries(parameters).length > 0 && (
          <div style={{ marginTop: solitudeTheme.spacing.sm }}>
            {Object.entries(parameters).map(([key, value]) => (
              <span
                key={key}
                style={{
                  display: 'inline-block',
                  backgroundColor: solitudeTheme.colors.surfaceHover,
                  color: solitudeTheme.colors.accent,
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: solitudeTheme.typography.fontSize.xs,
                  marginRight: solitudeTheme.spacing.sm,
                  marginBottom: solitudeTheme.spacing.xs,
                  border: `1px solid ${solitudeTheme.colors.border}`,
                }}
              >
                {key}: {value}
                <button
                  style={{
                    marginLeft: solitudeTheme.spacing.xs,
                    border: 'none',
                    background: 'none',
                    color: solitudeTheme.colors.error,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  onClick={() => {
                    const newParams = { ...parameters };
                    delete newParams[key];
                    setParameters(newParams);
                  }}
                >
                  <CloseIcon size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Current Execution Status */}
      {currentExecution && (
        <div style={{ marginBottom: solitudeTheme.spacing.md }}>
          <h4 style={{ 
            margin: '0 0 8px 0', 
            fontSize: solitudeTheme.typography.fontSize.md,
            color: solitudeTheme.colors.textPrimary
          }}>Current Execution</h4>
          <div style={executionItemStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: solitudeTheme.typography.fontWeight.semiBold }}>
                {currentExecution.id}
              </span>
              <span style={{
                color: getStatusColor(currentExecution.status),
                fontWeight: solitudeTheme.typography.fontWeight.medium,
                fontSize: solitudeTheme.typography.fontSize.sm,
              }}>
                {currentExecution.status.toUpperCase()}
              </span>
            </div>
            <div style={{ 
              fontSize: solitudeTheme.typography.fontSize.sm, 
              color: solitudeTheme.colors.textSecondary, 
              marginTop: solitudeTheme.spacing.xs 
            }}>
              Started: {currentExecution.startTime.toLocaleString()}
              {currentExecution.endTime && (
                <span> • Duration: {formatDuration(currentExecution.startTime, currentExecution.endTime)}</span>
              )}
            </div>
            <div style={{ marginTop: solitudeTheme.spacing.sm }}>
              <div style={{ 
                fontSize: solitudeTheme.typography.fontSize.sm, 
                fontWeight: solitudeTheme.typography.fontWeight.medium, 
                marginBottom: solitudeTheme.spacing.xs 
              }}>Node Status:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: solitudeTheme.spacing.xs }}>
                {currentExecution.nodes.map(node => (
                  <div key={node.nodeId} style={{
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: solitudeTheme.typography.fontSize.xs,
                    padding: '2px 6px',
                    backgroundColor: solitudeTheme.colors.surfaceHover,
                    borderRadius: solitudeTheme.borderRadius.sm,
                    border: `1px solid ${solitudeTheme.colors.border}`,
                  }}>
                    <div style={{
                      ...nodeStatusStyle,
                      backgroundColor: getStatusColor(node.status),
                    }}></div>
                    {node.nodeId}
                    {node.metrics?.executionTime && (
                      <span style={{ 
                        marginLeft: solitudeTheme.spacing.xs, 
                        color: solitudeTheme.colors.textTertiary,
                        display: 'flex',
                        alignItems: 'center',
                        gap: solitudeTheme.spacing.xs
                      }}>
                        <TimeIcon size={10} />
                        {node.metrics.executionTime}ms
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Execution History */}
      {showHistory && (
        <div>
          <h4 style={{ 
            margin: '0 0 8px 0', 
            fontSize: solitudeTheme.typography.fontSize.md,
            color: solitudeTheme.colors.textPrimary
          }}>Execution History</h4>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {executions.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                color: solitudeTheme.colors.textSecondary, 
                fontSize: solitudeTheme.typography.fontSize.sm, 
                padding: solitudeTheme.spacing.md 
              }}>
                No executions yet
              </div>
            ) : (
              executions.map(execution => (
                <div key={execution.id} style={executionItemStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ 
                      fontWeight: solitudeTheme.typography.fontWeight.medium, 
                      fontSize: solitudeTheme.typography.fontSize.sm 
                    }}>{execution.id}</span>
                    <span style={{
                      color: getStatusColor(execution.status),
                      fontWeight: solitudeTheme.typography.fontWeight.medium,
                      fontSize: solitudeTheme.typography.fontSize.xs,
                    }}>
                      {execution.status.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ 
                    fontSize: solitudeTheme.typography.fontSize.xs, 
                    color: solitudeTheme.colors.textSecondary, 
                    marginTop: solitudeTheme.spacing.xs 
                  }}>
                    {execution.startTime.toLocaleString()}
                    {execution.endTime && (
                      <span> • {formatDuration(execution.startTime, execution.endTime)}</span>
                    )}
                  </div>
                  <div style={{ 
                    fontSize: solitudeTheme.typography.fontSize.xs, 
                    color: solitudeTheme.colors.textSecondary, 
                    marginTop: solitudeTheme.spacing.xs 
                  }}>
                    Nodes: {execution.nodes.filter(n => n.status === 'completed').length}/
                    {execution.nodes.length} completed
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExecutionPanel;