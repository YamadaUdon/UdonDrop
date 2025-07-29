import { FC, useState, useEffect } from 'react';
import { DataNode, DataEdge } from '../types';
import { solitudeTheme } from '../styles/theme';
import { FilterIcon, ProcessIcon, CloseIcon } from './Icons';
import { pipelineExecutionEngine } from '../services/pipelineExecution';

interface PipelineSlicingPanelProps {
  nodes: DataNode[];
  edges: DataEdge[];
  onSliceChange?: (slicedNodes: DataNode[], slicedEdges: DataEdge[]) => void;
  onGenerateCommand?: (command: string) => void;
}

const PipelineSlicingPanel: FC<PipelineSlicingPanelProps> = ({
  nodes,
  edges,
  onSliceChange,
  onGenerateCommand,
}) => {
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [filterNodeTypes, setFilterNodeTypes] = useState<string[]>([]);
  const [sliceMode, setSliceMode] = useState<'from' | 'to' | 'between' | 'around'>('from');
  const [sliceDepth, setSliceDepth] = useState<number>(1);
  const [previewMode, setPreviewMode] = useState<boolean>(false);
  const [generatedCommand, setGeneratedCommand] = useState<string>('');

  // Get all unique tags from nodes
  const availableTags = Array.from(
    new Set(nodes.flatMap(node => node.data.tags || []))
  ).sort();

  // Get all unique node types
  const availableNodeTypes = Array.from(
    new Set(nodes.map(node => node.type))
  ).sort();

  useEffect(() => {
    updateSlice();
  }, [selectedNodes, filterTags, filterNodeTypes, sliceMode, sliceDepth]);

  const updateSlice = () => {
    let slicedNodes = [...nodes];
    let slicedEdges = [...edges];

    // Apply tag filter
    if (filterTags.length > 0) {
      slicedNodes = slicedNodes.filter(node => 
        node.data.tags?.some(tag => filterTags.includes(tag))
      );
    }

    // Apply node type filter
    if (filterNodeTypes.length > 0) {
      slicedNodes = slicedNodes.filter(node => 
        filterNodeTypes.includes(node.type)
      );
    }

    // Apply node selection slice
    if (selectedNodes.size > 0) {
      const targetNodes = Array.from(selectedNodes);
      const slice = pipelineExecutionEngine.getPipelineSlice(slicedNodes, slicedEdges, targetNodes);
      slicedNodes = slice.nodes;
      slicedEdges = slice.edges;
    }

    // Filter edges to only include connections between visible nodes
    const visibleNodeIds = new Set(slicedNodes.map(node => node.id));
    slicedEdges = slicedEdges.filter(edge => 
      visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
    );

    onSliceChange?.(slicedNodes, slicedEdges);
    generateCommandString(slicedNodes, slicedEdges);
  };

  const generateCommandString = (slicedNodes: DataNode[], slicedEdges: DataEdge[]) => {
    const parts = ['pipeline run'];
    
    if (selectedNodes.size > 0) {
      const nodeNames = Array.from(selectedNodes);
      if (sliceMode === 'from') {
        parts.push(`--from-nodes=${nodeNames.join(',')}`);
      } else if (sliceMode === 'to') {
        parts.push(`--to-nodes=${nodeNames.join(',')}`);
      }
    }

    if (filterTags.length > 0) {
      parts.push(`--tags=${filterTags.join(',')}`);
    }

    if (filterNodeTypes.length > 0) {
      parts.push(`--node-types=${filterNodeTypes.join(',')}`);
    }

    const command = parts.join(' ');
    setGeneratedCommand(command);
    onGenerateCommand?.(command);
  };

  const toggleNodeSelection = (nodeId: string) => {
    const newSelected = new Set(selectedNodes);
    if (newSelected.has(nodeId)) {
      newSelected.delete(nodeId);
    } else {
      newSelected.add(nodeId);
    }
    setSelectedNodes(newSelected);
  };

  const toggleTagFilter = (tag: string) => {
    setFilterTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const toggleNodeTypeFilter = (nodeType: string) => {
    setFilterNodeTypes(prev => 
      prev.includes(nodeType) 
        ? prev.filter(t => t !== nodeType)
        : [...prev, nodeType]
    );
  };

  const clearAllFilters = () => {
    setSelectedNodes(new Set());
    setFilterTags([]);
    setFilterNodeTypes([]);
  };

  const panelStyle = {
    backgroundColor: solitudeTheme.colors.background,
    border: `1px solid ${solitudeTheme.colors.border}`,
    borderRadius: solitudeTheme.borderRadius.lg,
    padding: solitudeTheme.spacing.md,
    margin: solitudeTheme.spacing.md,
    maxHeight: '600px',
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
    margin: solitudeTheme.spacing.xs,
  };

  const activeButtonStyle = {
    ...buttonStyle,
    backgroundColor: solitudeTheme.colors.accent,
    color: 'white',
    borderColor: solitudeTheme.colors.accent,
  };

  const tagStyle = {
    display: 'inline-block',
    padding: '4px 8px',
    margin: '2px',
    borderRadius: solitudeTheme.borderRadius.sm,
    fontSize: solitudeTheme.typography.fontSize.xs,
    cursor: 'pointer',
    border: `1px solid ${solitudeTheme.colors.border}`,
    backgroundColor: solitudeTheme.colors.surface,
    color: solitudeTheme.colors.textPrimary,
  };

  const activeTagStyle = {
    ...tagStyle,
    backgroundColor: solitudeTheme.colors.accent,
    color: 'white',
    borderColor: solitudeTheme.colors.accent,
  };

  const nodeListStyle = {
    maxHeight: '200px',
    overflowY: 'auto' as const,
    border: `1px solid ${solitudeTheme.colors.border}`,
    borderRadius: solitudeTheme.borderRadius.md,
    padding: solitudeTheme.spacing.sm,
    backgroundColor: solitudeTheme.colors.surface,
  };

  const nodeItemStyle = {
    display: 'flex',
    alignItems: 'center',
    padding: solitudeTheme.spacing.xs,
    margin: '2px 0',
    borderRadius: solitudeTheme.borderRadius.sm,
    cursor: 'pointer',
    fontSize: solitudeTheme.typography.fontSize.sm,
  };

  const selectedNodeItemStyle = {
    ...nodeItemStyle,
    backgroundColor: solitudeTheme.colors.surfaceHover,
    border: `1px solid ${solitudeTheme.colors.accent}`,
  };

  const commandStyle = {
    fontFamily: 'monospace',
    fontSize: solitudeTheme.typography.fontSize.sm,
    padding: solitudeTheme.spacing.sm,
    backgroundColor: solitudeTheme.colors.surface,
    border: `1px solid ${solitudeTheme.colors.border}`,
    borderRadius: solitudeTheme.borderRadius.md,
    color: solitudeTheme.colors.textPrimary,
    wordBreak: 'break-all' as const,
  };

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <h3 style={{ margin: 0, color: solitudeTheme.colors.textPrimary }}>
          Pipeline Slicing
        </h3>
        <div style={{ display: 'flex', gap: solitudeTheme.spacing.sm }}>
          <button
            style={{
              ...buttonStyle,
              backgroundColor: previewMode ? solitudeTheme.colors.warning : solitudeTheme.colors.surface,
              color: previewMode ? 'white' : solitudeTheme.colors.textPrimary,
            }}
            onClick={() => setPreviewMode(!previewMode)}
          >
            {previewMode ? 'Exit Preview' : 'Preview Mode'}
          </button>
          <button
            style={{
              ...buttonStyle,
              backgroundColor: solitudeTheme.colors.error,
              color: 'white',
            }}
            onClick={clearAllFilters}
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Slice Mode Selection */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Slice Mode</div>
        <div>
          {(['from', 'to', 'between', 'around'] as const).map(mode => (
            <button
              key={mode}
              style={sliceMode === mode ? activeButtonStyle : buttonStyle}
              onClick={() => setSliceMode(mode)}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Node Selection */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Selected Nodes ({selectedNodes.size})</div>
        <div style={nodeListStyle}>
          {nodes.map(node => (
            <div
              key={node.id}
              style={selectedNodes.has(node.id) ? selectedNodeItemStyle : nodeItemStyle}
              onClick={() => toggleNodeSelection(node.id)}
            >
              <input
                type="checkbox"
                checked={selectedNodes.has(node.id)}
                onChange={() => toggleNodeSelection(node.id)}
                style={{ marginRight: solitudeTheme.spacing.sm }}
              />
              <ProcessIcon size={16} />
              <span style={{ marginLeft: solitudeTheme.spacing.sm }}>
                {node.data.label} ({node.type})
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Tag Filter */}
      {availableTags.length > 0 && (
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Filter by Tags</div>
          <div>
            {availableTags.map(tag => (
              <span
                key={tag}
                style={filterTags.includes(tag) ? activeTagStyle : tagStyle}
                onClick={() => toggleTagFilter(tag)}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Node Type Filter */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Filter by Node Type</div>
        <div>
          {availableNodeTypes.map(nodeType => (
            <span
              key={nodeType}
              style={filterNodeTypes.includes(nodeType) ? activeTagStyle : tagStyle}
              onClick={() => toggleNodeTypeFilter(nodeType)}
            >
              {nodeType.replace('_', ' ')}
            </span>
          ))}
        </div>
      </div>

      {/* Slice Depth */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Slice Depth</div>
        <input
          type="range"
          min="1"
          max="10"
          value={sliceDepth}
          onChange={(e) => setSliceDepth(Number(e.target.value))}
          style={{ width: '100%' }}
        />
        <div style={{ 
          fontSize: solitudeTheme.typography.fontSize.sm,
          color: solitudeTheme.colors.textSecondary,
          marginTop: solitudeTheme.spacing.xs,
        }}>
          Depth: {sliceDepth} level{sliceDepth > 1 ? 's' : ''}
        </div>
      </div>

      {/* Generated Command */}
      {generatedCommand && (
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Generated Command</div>
          <div style={commandStyle}>
            {generatedCommand}
          </div>
          <button
            style={{
              ...buttonStyle,
              marginTop: solitudeTheme.spacing.sm,
              backgroundColor: solitudeTheme.colors.success,
              color: 'white',
            }}
            onClick={() => navigator.clipboard.writeText(generatedCommand)}
          >
            Copy to Clipboard
          </button>
        </div>
      )}

      {/* Slice Statistics */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Slice Statistics</div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: solitudeTheme.spacing.sm,
          fontSize: solitudeTheme.typography.fontSize.sm,
          color: solitudeTheme.colors.textSecondary,
        }}>
          <div>Original Nodes: {nodes.length}</div>
          <div>Sliced Nodes: {nodes.filter(n => 
            (filterTags.length === 0 || n.data.tags?.some(tag => filterTags.includes(tag))) &&
            (filterNodeTypes.length === 0 || filterNodeTypes.includes(n.type))
          ).length}</div>
          <div>Original Edges: {edges.length}</div>
          <div>Selected Nodes: {selectedNodes.size}</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Quick Actions</div>
        <div style={{ display: 'flex', gap: solitudeTheme.spacing.sm, flexWrap: 'wrap' }}>
          <button
            style={buttonStyle}
            onClick={() => {
              const inputNodes = nodes.filter(n => n.type.includes('input'));
              setSelectedNodes(new Set(inputNodes.map(n => n.id)));
            }}
          >
            Select All Inputs
          </button>
          <button
            style={buttonStyle}
            onClick={() => {
              const outputNodes = nodes.filter(n => n.type.includes('output'));
              setSelectedNodes(new Set(outputNodes.map(n => n.id)));
            }}
          >
            Select All Outputs
          </button>
          <button
            style={buttonStyle}
            onClick={() => {
              const mlNodes = nodes.filter(n => n.type.includes('model'));
              setSelectedNodes(new Set(mlNodes.map(n => n.id)));
            }}
          >
            Select ML Nodes
          </button>
        </div>
      </div>
    </div>
  );
};

export default PipelineSlicingPanel;