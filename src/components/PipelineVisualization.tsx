import { FC, useState, useEffect } from 'react';
import { DataNode, DataEdge, NodeStatus } from '../types';
import { solitudeTheme } from '../styles/theme';
import { FilterIcon, ProcessIcon, TimeIcon } from './Icons';

interface PipelineVisualizationProps {
  nodes: DataNode[];
  edges: DataEdge[];
  onNodeClick?: (node: DataNode) => void;
  selectedNodeId?: string;
  filterTags?: string[];
  showOnlySlice?: boolean;
  sliceNodes?: string[];
}

const PipelineVisualization: FC<PipelineVisualizationProps> = ({
  nodes,
  edges,
  onNodeClick,
  selectedNodeId,
  filterTags = [],
  showOnlySlice = false,
  sliceNodes = [],
}) => {
  const [filteredNodes, setFilteredNodes] = useState<DataNode[]>([]);
  const [filteredEdges, setFilteredEdges] = useState<DataEdge[]>([]);
  const [highlightedPath, setHighlightedPath] = useState<string[]>([]);
  const [showMetrics, setShowMetrics] = useState(false);

  useEffect(() => {
    applyFilters();
  }, [nodes, edges, filterTags, showOnlySlice, sliceNodes]);

  const applyFilters = () => {
    let visibleNodes = [...nodes];
    let visibleEdges = [...edges];

    // Apply tag filter
    if (filterTags.length > 0) {
      visibleNodes = visibleNodes.filter(node => 
        node.data.tags?.some(tag => filterTags.includes(tag))
      );
    }

    // Apply slice filter
    if (showOnlySlice && sliceNodes.length > 0) {
      visibleNodes = visibleNodes.filter(node => sliceNodes.includes(node.id));
    }

    // Filter edges to only show connections between visible nodes
    const visibleNodeIds = new Set(visibleNodes.map(node => node.id));
    visibleEdges = visibleEdges.filter(edge => 
      visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
    );

    setFilteredNodes(visibleNodes);
    setFilteredEdges(visibleEdges);
  };

  const getNodesByLayer = () => {
    const layers: DataNode[][] = [];
    const visited = new Set<string>();
    const nodeMap = new Map(filteredNodes.map(node => [node.id, node]));

    // Find input nodes (nodes with no incoming edges)
    const inputNodes = filteredNodes.filter(node => 
      !filteredEdges.some(edge => edge.target === node.id)
    );

    if (inputNodes.length === 0) {
      return [filteredNodes]; // Fallback for circular dependencies
    }

    let currentLayer = inputNodes;
    
    while (currentLayer.length > 0) {
      layers.push([...currentLayer]);
      currentLayer.forEach(node => visited.add(node.id));
      
      // Find next layer nodes
      const nextLayer = new Set<DataNode>();
      currentLayer.forEach(node => {
        filteredEdges
          .filter(edge => edge.source === node.id)
          .forEach(edge => {
            const targetNode = nodeMap.get(edge.target);
            if (targetNode && !visited.has(targetNode.id)) {
              // Check if all dependencies are satisfied
              const dependencies = filteredEdges
                .filter(e => e.target === targetNode.id)
                .map(e => e.source);
              
              if (dependencies.every(dep => visited.has(dep))) {
                nextLayer.add(targetNode);
              }
            }
          });
      });
      
      currentLayer = Array.from(nextLayer);
    }

    return layers;
  };

  const getStatusColor = (status?: NodeStatus) => {
    switch (status) {
      case 'running': return solitudeTheme.colors.warning;
      case 'completed': return solitudeTheme.colors.success;
      case 'failed': return solitudeTheme.colors.error;
      case 'pending': return solitudeTheme.colors.textTertiary;
      default: return solitudeTheme.colors.accent;
    }
  };

  const getNodeTypeColor = (type: string) => {
    if (type.includes('input')) return solitudeTheme.colors.nodeInput;
    if (type.includes('output')) return solitudeTheme.colors.nodeOutput;
    if (type.includes('model')) return solitudeTheme.colors.nodeML;
    return solitudeTheme.colors.nodeProcess;
  };

  const calculateNodePosition = (node: DataNode, layerIndex: number, nodeIndex: number, totalInLayer: number) => {
    const layerWidth = 200;
    const nodeHeight = 80;
    const nodeSpacing = 20;
    
    const x = layerIndex * layerWidth + 50;
    const totalHeight = totalInLayer * nodeHeight + (totalInLayer - 1) * nodeSpacing;
    const startY = (400 - totalHeight) / 2; // Center vertically
    const y = startY + nodeIndex * (nodeHeight + nodeSpacing);
    
    return { x, y };
  };

  const handleNodeClick = (node: DataNode) => {
    onNodeClick?.(node);
    
    // Highlight path from this node
    const path = findNodePath(node.id);
    setHighlightedPath(path);
  };

  const findNodePath = (nodeId: string): string[] => {
    const path: string[] = [];
    const visited = new Set<string>();
    
    const dfs = (currentId: string) => {
      if (visited.has(currentId)) return;
      visited.add(currentId);
      path.push(currentId);
      
      filteredEdges
        .filter(edge => edge.source === currentId)
        .forEach(edge => dfs(edge.target));
    };
    
    dfs(nodeId);
    return path;
  };

  const renderNode = (node: DataNode, position: { x: number; y: number }) => {
    const isSelected = selectedNodeId === node.id;
    const isHighlighted = highlightedPath.includes(node.id);
    const statusColor = getStatusColor(node.status);
    const nodeTypeColor = getNodeTypeColor(node.type);

    return (
      <g
        key={node.id}
        transform={`translate(${position.x}, ${position.y})`}
        onClick={() => handleNodeClick(node)}
        style={{ cursor: 'pointer' }}
      >
        {/* Node background */}
        <rect
          width="160"
          height="60"
          rx="8"
          fill={isSelected ? solitudeTheme.colors.surfaceHover : solitudeTheme.colors.surface}
          stroke={isSelected ? solitudeTheme.colors.accent : isHighlighted ? nodeTypeColor : solitudeTheme.colors.border}
          strokeWidth={isSelected ? 2 : isHighlighted ? 2 : 1}
          opacity={showOnlySlice && sliceNodes.length > 0 && !sliceNodes.includes(node.id) ? 0.3 : 1}
        />
        
        {/* Status indicator */}
        {node.status && (
          <rect
            width="160"
            height="3"
            y="0"
            rx="4"
            fill={statusColor}
          />
        )}
        
        {/* Node icon */}
        <foreignObject x="8" y="8" width="20" height="20">
          <div style={{ color: nodeTypeColor }}>
            <ProcessIcon size={16} />
          </div>
        </foreignObject>
        
        {/* Node label */}
        <text
          x="35"
          y="20"
          fontSize={solitudeTheme.typography.fontSize.sm}
          fill={solitudeTheme.colors.textPrimary}
          fontWeight={solitudeTheme.typography.fontWeight.medium}
        >
          {node.data.label}
        </text>
        
        {/* Node type */}
        <text
          x="35"
          y="35"
          fontSize={solitudeTheme.typography.fontSize.xs}
          fill={solitudeTheme.colors.textSecondary}
        >
          {node.type.replace('_', ' ')}
        </text>
        
        {/* Execution time */}
        {showMetrics && node.executionTime && (
          <text
            x="35"
            y="50"
            fontSize={solitudeTheme.typography.fontSize.xs}
            fill={solitudeTheme.colors.textTertiary}
          >
            {node.executionTime}ms
          </text>
        )}
        
        {/* Tags */}
        {node.data.tags && node.data.tags.length > 0 && (
          <g>
            {node.data.tags.slice(0, 2).map((tag, index) => (
              <rect
                key={tag}
                x={120 + index * 20}
                y="8"
                width="15"
                height="12"
                rx="2"
                fill={solitudeTheme.colors.accent}
                opacity="0.8"
              />
            ))}
          </g>
        )}
      </g>
    );
  };

  const renderEdge = (edge: DataEdge, fromPos: { x: number; y: number }, toPos: { x: number; y: number }) => {
    const isHighlighted = highlightedPath.includes(edge.source) && highlightedPath.includes(edge.target);
    const strokeColor = isHighlighted ? solitudeTheme.colors.accent : solitudeTheme.colors.border;
    const strokeWidth = isHighlighted ? 2 : 1;

    const startX = fromPos.x + 160;
    const startY = fromPos.y + 30;
    const endX = toPos.x;
    const endY = toPos.y + 30;

    const controlX1 = startX + 50;
    const controlX2 = endX - 50;

    return (
      <g key={edge.id}>
        <path
          d={`M ${startX} ${startY} C ${controlX1} ${startY} ${controlX2} ${endY} ${endX} ${endY}`}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill="none"
          markerEnd="url(#arrowhead)"
        />
        
        {/* Edge label */}
        {edge.data?.label && (
          <text
            x={(startX + endX) / 2}
            y={(startY + endY) / 2 - 5}
            fontSize={solitudeTheme.typography.fontSize.xs}
            fill={solitudeTheme.colors.textSecondary}
            textAnchor="middle"
          >
            {edge.data.label}
          </text>
        )}
      </g>
    );
  };

  const layers = getNodesByLayer();
  const nodePositions = new Map<string, { x: number; y: number }>();

  // Calculate positions for all nodes
  layers.forEach((layer, layerIndex) => {
    layer.forEach((node, nodeIndex) => {
      const position = calculateNodePosition(node, layerIndex, nodeIndex, layer.length);
      nodePositions.set(node.id, position);
    });
  });

  const containerStyle = {
    backgroundColor: solitudeTheme.colors.background,
    border: `1px solid ${solitudeTheme.colors.border}`,
    borderRadius: solitudeTheme.borderRadius.lg,
    padding: solitudeTheme.spacing.md,
    margin: solitudeTheme.spacing.md,
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: solitudeTheme.spacing.md,
  };

  const buttonStyle = {
    padding: solitudeTheme.spacing.sm,
    backgroundColor: solitudeTheme.colors.surface,
    border: `1px solid ${solitudeTheme.colors.border}`,
    borderRadius: solitudeTheme.borderRadius.sm,
    cursor: 'pointer',
    fontSize: solitudeTheme.typography.fontSize.sm,
    color: solitudeTheme.colors.textPrimary,
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h3 style={{ margin: 0, color: solitudeTheme.colors.textPrimary }}>
          Pipeline Visualization
        </h3>
        <div style={{ display: 'flex', gap: solitudeTheme.spacing.sm }}>
          <button
            style={{
              ...buttonStyle,
              backgroundColor: showMetrics ? solitudeTheme.colors.accent : solitudeTheme.colors.surface,
              color: showMetrics ? 'white' : solitudeTheme.colors.textPrimary,
            }}
            onClick={() => setShowMetrics(!showMetrics)}
          >
            <TimeIcon size={14} /> Metrics
          </button>
          <button
            style={buttonStyle}
            onClick={() => setHighlightedPath([])}
          >
            Clear Highlight
          </button>
        </div>
      </div>

      <div style={{ 
        overflowX: 'auto', 
        overflowY: 'auto', 
        maxHeight: '500px',
        border: `1px solid ${solitudeTheme.colors.border}`,
        borderRadius: solitudeTheme.borderRadius.md,
        backgroundColor: solitudeTheme.colors.surface,
      }}>
        <svg width="1000" height="600" style={{ minWidth: '800px' }}>
          {/* Arrow marker definition */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill={solitudeTheme.colors.border}
              />
            </marker>
          </defs>

          {/* Render edges */}
          {filteredEdges.map(edge => {
            const fromPos = nodePositions.get(edge.source);
            const toPos = nodePositions.get(edge.target);
            if (fromPos && toPos) {
              return renderEdge(edge, fromPos, toPos);
            }
            return null;
          })}

          {/* Render nodes */}
          {filteredNodes.map(node => {
            const position = nodePositions.get(node.id);
            if (position) {
              return renderNode(node, position);
            }
            return null;
          })}
        </svg>
      </div>

      {/* Pipeline statistics */}
      <div style={{ 
        marginTop: solitudeTheme.spacing.md,
        padding: solitudeTheme.spacing.sm,
        backgroundColor: solitudeTheme.colors.surface,
        borderRadius: solitudeTheme.borderRadius.md,
        border: `1px solid ${solitudeTheme.colors.border}`,
      }}>
        <div style={{ 
          display: 'flex', 
          gap: solitudeTheme.spacing.lg,
          fontSize: solitudeTheme.typography.fontSize.sm,
          color: solitudeTheme.colors.textSecondary,
        }}>
          <span>Nodes: {filteredNodes.length}</span>
          <span>Edges: {filteredEdges.length}</span>
          <span>Layers: {layers.length}</span>
          {highlightedPath.length > 0 && (
            <span style={{ color: solitudeTheme.colors.accent }}>
              Highlighted: {highlightedPath.length} nodes
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default PipelineVisualization;