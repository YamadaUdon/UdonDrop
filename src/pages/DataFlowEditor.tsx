import { useCallback, useRef, useState, useMemo, useEffect } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  BackgroundVariant,
  Node,
  OnConnect,
  ReactFlowInstance,
  getNodesBounds,
  getViewportForBounds,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../node_modules/react-i18next';
// html2canvasは動的インポートで使用

import { useTheme } from '../contexts/ThemeContext';
import { getTheme } from '../utils/theme';
import { isTauri } from '../utils/platform';

import Sidebar from '../components/Sidebar';
import CustomNode from '../components/CustomNode';
import PropertiesPanel from '../components/PropertiesPanel';
import EdgePropertiesPanel from '../components/EdgePropertiesPanel';
import MenuBar from '../components/MenuBar';
import GroupManagerPanel from '../components/GroupManagerPanel';
import LayoutSelector from '../components/LayoutSelector';
import { usePipeline } from '../hooks/usePipeline';
import { groupManager } from '../services/groupManager';
import { exportToExcel } from '../utils/excelExport';

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

// Generate UUID-like unique identifier
const generateId = () => {
  return 'node-' + 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const getId = () => generateId();

function DataFlowEditorInner() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  
  // Load initial state from localStorage if available
  const getInitialNodes = () => {
    try {
      const saved = localStorage.getItem('dataflow_editor_nodes');
      return saved ? JSON.parse(saved) : initialNodes;
    } catch (error) {
      console.error('Error loading nodes from localStorage:', error);
      return initialNodes;
    }
  };
  
  const getInitialEdges = () => {
    try {
      const saved = localStorage.getItem('dataflow_editor_edges');
      return saved ? JSON.parse(saved) : initialEdges;
    } catch (error) {
      console.error('Error loading edges from localStorage:', error);
      return initialEdges;
    }
  };
  
  const [nodes, setNodes, onNodesChange] = useNodesState(getInitialNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState(getInitialEdges());
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [reconnectingEdge, setReconnectingEdge] = useState<{
    edge: Edge;
    mode: 'source' | 'target';
  } | null>(null);
  const [showOnlyRelated, setShowOnlyRelated] = useState(false);
  const [showUpstream, setShowUpstream] = useState(true);
  const [showDownstream, setShowDownstream] = useState(true);
  const [lineageMode, setLineageMode] = useState<'none' | 'impact' | 'dependency' | 'path' | 'critical'>('none');
  const [persistedAnalysisNodes, setPersistedAnalysisNodes] = useState<Set<string>>(new Set());
  const [persistedAnalysisMode, setPersistedAnalysisMode] = useState<'none' | 'impact' | 'dependency' | 'path' | 'critical'>('none');
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [showGroupManager, setShowGroupManager] = useState(false);
  const [showLayoutSelector, setShowLayoutSelector] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Set<string>>(new Set());
  const { savePipeline, loadPipeline, isLoading } = usePipeline();
  const { isDark } = useTheme();
  const theme = getTheme(isDark);


  // Apply theme CSS variables for React Flow selection box and add animations
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--rf-selection-bg', theme.colors.accent + '20'); // Semi-transparent accent color
    root.style.setProperty('--rf-selection-border', theme.colors.accent);
    
    // Add minimal CSS for better performance
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
      .react-flow__node {
        transition: box-shadow 0.2s ease, border 0.2s ease;
      }
      
      .react-flow__node:hover {
        filter: brightness(1.05);
      }
      
      .react-flow__edge:hover {
        filter: brightness(1.1);
      }
      
      .react-flow__node.dragging {
        transition: none !important;
      }
      
      @keyframes pulse {
        0% {
          transform: translate(-50%, -50%) scale(1);
          opacity: 1;
        }
        50% {
          transform: translate(-50%, -50%) scale(1.1);
          opacity: 0.8;
        }
        100% {
          transform: translate(-50%, -50%) scale(1);
          opacity: 1;
        }
      }
    `;
    
    // Remove existing style if it exists
    const existingStyle = document.getElementById('dataflow-animations');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    styleSheet.id = 'dataflow-animations';
    document.head.appendChild(styleSheet);
    
    return () => {
      const style = document.getElementById('dataflow-animations');
      if (style) {
        style.remove();
      }
    };
  }, [theme]);

  // Search functionality
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setSearchResults(new Set());
      return;
    }

    const results = new Set<string>();
    const term = searchTerm.toLowerCase();
    
    nodes.forEach(node => {
      if (node.data.label?.toLowerCase().includes(term)) {
        results.add(node.id);
      }
    });
    
    setSearchResults(results);
  }, [searchTerm, nodes]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setSearchResults(new Set());
  }, []);

  // Auto-save nodes and edges to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('dataflow_editor_nodes', JSON.stringify(nodes));
    } catch (error) {
      console.error('Error saving nodes to localStorage:', error);
    }
  }, [nodes]);

  useEffect(() => {
    try {
      localStorage.setItem('dataflow_editor_edges', JSON.stringify(edges));
    } catch (error) {
      console.error('Error saving edges to localStorage:', error);
    }
  }, [edges]);

  // Check for generated data from SQL Generator on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('loadGenerated') === 'true') {
      const generatedData = localStorage.getItem('sql_generated_data');
      if (generatedData) {
        try {
          const { nodes: generatedNodes, edges: generatedEdges, mode } = JSON.parse(generatedData);
          
          if (mode === 'new') {
            // Create new diagram - replace existing nodes and edges
            setNodes(generatedNodes);
            setEdges(generatedEdges);
            
            // Show success message
            setTimeout(() => {
              alert(`Successfully created new diagram with ${generatedNodes.length} nodes and ${generatedEdges.length} edges from SQL query!`);
            }, 100);
          } else {
            // Add to existing diagram
            // Apply auto-layout to generated nodes to avoid overlap
            const layoutNodes = generatedNodes.map((node: Node, index: number) => ({
              ...node,
              position: {
                x: 100 + (index % 4) * 250, // 4 columns
                y: 100 + Math.floor(index / 4) * 150 // Multiple rows
              }
            }));
            
            // Add generated nodes and edges to existing ones
            setNodes(prev => [...prev, ...layoutNodes]);
            setEdges(prev => [...prev, ...generatedEdges]);
            
            // Show success message
            setTimeout(() => {
              alert(`Successfully added ${generatedNodes.length} nodes and ${generatedEdges.length} edges from SQL query to existing diagram!`);
            }, 100);
          }
          
          // Clear the generated data and URL param
          localStorage.removeItem('sql_generated_data');
          window.history.replaceState({}, '', window.location.pathname);
        } catch (error) {
          console.error('Error loading generated data:', error);
        }
      }
    }
  }, [setNodes, setEdges]);

  const nodeTypes = useMemo(
    () => ({
      custom: CustomNode,
      csv_input: CustomNode,
      json_input: CustomNode,
      parquet_input: CustomNode,
      database_input: CustomNode,
      api_input: CustomNode,
      process: CustomNode,
      transform: CustomNode,
      filter: CustomNode,
      aggregate: CustomNode,
      join: CustomNode,
      split: CustomNode,
      model_train: CustomNode,
      model_predict: CustomNode,
      model_evaluate: CustomNode,
      csv_output: CustomNode,
      json_output: CustomNode,
      parquet_output: CustomNode,
      database_output: CustomNode,
      api_output: CustomNode,
      data_lake: CustomNode,
      data_warehouse: CustomNode,
      data_mart: CustomNode,
      bi_tool: CustomNode,
    }),
    []
  );

  const onConnect: OnConnect = useCallback(
    (params) => {
      const newEdge = {
        ...params,
        id: `edge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        sourceHandle: params.sourceHandle,
        targetHandle: params.targetHandle,
        data: {
          transferType: 'batch', // Default to batch
          label: 'Data Flow',
        },
        style: {
          stroke: '#2563eb',
          strokeWidth: 2,
          strokeOpacity: 0.7,
        },
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  // Custom wheel handler for zoom
  const handleWheel = useCallback((event: React.WheelEvent) => {
    if (!reactFlowInstance) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    const zoomIn = event.deltaY < 0;
    const zoomOut = event.deltaY > 0;
    
    if (zoomIn) {
      reactFlowInstance.zoomIn();
    } else if (zoomOut) {
      reactFlowInstance.zoomOut();
    }
  }, [reactFlowInstance]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      const label = event.dataTransfer.getData('label');

      if (typeof type === 'undefined' || !type || !reactFlowInstance || !reactFlowWrapper.current) {
        return;
      }

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode: Node = {
        id: getId(),
        type,
        position,
        data: {
          label,
          inputs: type === 'output' ? ['input-0'] : type === 'input' ? [] : ['input-0'],
          outputs: type === 'input' ? ['output-0'] : type === 'output' ? [] : ['output-0'],
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setSelectedEdge(null);
    setReconnectingEdge(null);
  }, []);

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();
    setSelectedEdge(edge);
    setSelectedNode(null);
    setReconnectingEdge(null);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
    setReconnectingEdge(null);
  }, []);

  // Custom mouse event handler for more precise control (removed - React Flow handles this internally)

  const onPropertiesPanelClose = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
    setEditingNodeId(null);
    setReconnectingEdge(null);
  }, []);

  const startEdgeReconnection = useCallback((edge: Edge, mode: 'source' | 'target') => {
    setReconnectingEdge({ edge, mode });
    setSelectedEdge(null);
  }, []);

  const handleEdgeReconnection = useCallback((targetNodeId: string) => {
    if (!reconnectingEdge) return;

    const { edge, mode } = reconnectingEdge;
    
    // Prevent self-connection
    if (mode === 'source' && targetNodeId === edge.target) return;
    if (mode === 'target' && targetNodeId === edge.source) return;
    
    // Check for duplicate connections
    const isDuplicate = edges.some(e => 
      e.id !== edge.id && 
      e.source === (mode === 'source' ? targetNodeId : edge.source) &&
      e.target === (mode === 'target' ? targetNodeId : edge.target)
    );
    
    if (isDuplicate) {
      alert(t('edge.duplicateConnection'));
      return;
    }

    const updatedEdge = {
      ...edge,
      [mode]: targetNodeId,
    };

    setEdges(eds => eds.map(e => e.id === edge.id ? updatedEdge : e));
    setReconnectingEdge(null);
  }, [reconnectingEdge, edges, setEdges, t]);

  const cancelEdgeReconnection = useCallback(() => {
    setReconnectingEdge(null);
  }, []);


  const onEdgeDelete = useCallback((edgeId: string) => {
    setEdges(eds => eds.filter(edge => edge.id !== edgeId));
  }, [setEdges]);

  const onNodeUpdate = useCallback(
    (nodeId: string, data: any) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return { ...node, data };
          }
          return node;
        })
      );
    },
    [setNodes]
  );

  const onNodeTypeChange = useCallback(
    (nodeId: string, newType: string) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return { ...node, type: newType };
          }
          return node;
        })
      );
      // Update selectedNode if it's the same node
      if (selectedNode && selectedNode.id === nodeId) {
        setSelectedNode(prev => prev ? { ...prev, type: newType } : prev);
      }
    },
    [setNodes, selectedNode]
  );

  const handleSave = useCallback(
    async (name: string, description?: string) => {
      try {
        await savePipeline(nodes, edges, name, description);
        alert(t('alerts.saveSuccess'));
      } catch (error) {
        console.error('Save error:', error);
        alert(`Save failed: ${error}`);
      }
    },
    [nodes, edges, savePipeline, t]
  );

  const handleLoad = useCallback(
    async (pipeline: any) => {
      if (pipeline && pipeline.nodes && pipeline.edges) {
        setNodes(pipeline.nodes);
        setEdges(pipeline.edges);
      }
    },
    [setNodes, setEdges]
  );

  const handleNew = useCallback(() => {
    // Always show confirmation dialog before clearing data
    const hasData = nodes.length > 0 || edges.length > 0;
    
    if (hasData) {
      // Use a more explicit confirmation dialog
      const confirmed = window.confirm(
        t('alerts.confirmNew') || 
        'Are you sure you want to create a new diagram? This will delete all current nodes and edges.'
      );
      
      if (!confirmed) {
        return;
      }
    }
    
    // Clear all data after confirmation
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
    setSelectedEdge(null);
    setSelectedGroupIds(new Set());
    setLineageMode('none');
    setShowOnlyRelated(false);
    
    // Clear localStorage as well
    localStorage.removeItem('dataflow_editor_nodes');
    localStorage.removeItem('dataflow_editor_edges');
  }, [nodes, edges, setNodes, setEdges, t]);

  // Export functions
  const handleExportPNG = useCallback(async () => {
    if (!reactFlowInstance || !nodes.length) return;
    
    try {
      const { exportToPNG } = await import('../utils/imageExport');
      await exportToPNG(nodes, edges, reactFlowInstance);
    } catch (error) {
      console.error('Error exporting PNG:', error);
      alert('Failed to export PNG. Please try again.');
    }
  }, [reactFlowInstance, nodes, edges]);

  const handleExportSVG = useCallback(async () => {
    if (!reactFlowInstance || !nodes.length) return;
    
    try {
      const { exportToSVG } = await import('../utils/imageExport');
      await exportToSVG(nodes, edges, reactFlowInstance);
    } catch (error) {
      console.error('Error exporting SVG:', error);
      alert('Failed to export SVG. Please try again.');
    }
  }, [reactFlowInstance, nodes, edges]);

  // JSON Export function
  const handleExportJSON = useCallback(() => {
    if (!nodes.length) return;
    
    const exportData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      nodes: nodes,
      edges: edges,
      groups: groupManager.getAllGroups(),
      metadata: {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        groupCount: groupManager.getAllGroups().length,
      }
    };
    
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `dataflow-${new Date().toISOString().split('T')[0]}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges]);

  // Excel Export function
  const handleExportExcel = useCallback(async () => {
    if (!nodes.length) return;
    
    try {
      // Convert groups to Map format for export with actual node associations
      const groupsMap = new Map();
      const allGroups = groupManager.getAllGroups();
      
      allGroups.forEach(group => {
        // Find nodes that belong to this group (support multiple groups per node)
        const groupNodes = nodes.filter(node => {
          const nodeGroupIds = groupManager.getNodeGroupIds(node.data);
          return nodeGroupIds.includes(group.id);
        });
        const nodeIds = new Set(groupNodes.map(node => node.id));
        
        if (nodeIds.size > 0) { // Only include groups that have nodes
          groupsMap.set(group.id, {
            name: group.name,
            color: group.color,
            nodes: nodeIds,
          });
        }
      });
      
      await exportToExcel({
        nodes: nodes,
        edges: edges,
        groups: groupsMap,
      });
    } catch (error) {
      console.error('Excel export failed:', error);
      alert('Excel export failed. Please try again.');
    }
  }, [nodes, edges]);

  // JSON Import function
  const handleImportJSON = useCallback((jsonData: any) => {
    try {
      if (!jsonData || !jsonData.nodes || !jsonData.edges) {
        alert('Invalid JSON format: Missing nodes or edges data');
        return;
      }
      
      // Clear current state
      setNodes([]);
      setEdges([]);
      setSelectedNode(null);
      setSelectedGroupIds(new Set());
      
      // Import nodes and edges
      setNodes(jsonData.nodes);
      setEdges(jsonData.edges);
      
      // Import groups if present
      if (jsonData.groups && Array.isArray(jsonData.groups)) {
        // Clear existing groups and import new ones with original IDs
        const allGroups = groupManager.getAllGroups();
        allGroups.forEach(group => groupManager.deleteGroup(group.id));
        
        jsonData.groups.forEach((groupData: any) => {
          if (groupData.id && groupData.name && groupData.color) {
            groupManager.restoreGroup(groupData);
          }
        });
      }
      
      alert(`Successfully imported ${jsonData.nodes.length} nodes, ${jsonData.edges.length} edges${jsonData.groups ? `, and ${jsonData.groups.length} groups` : ''}`);
    } catch (error) {
      console.error('Import error:', error);
      alert('Error importing JSON data. Please check the file format.');
    }
  }, [setNodes, setEdges]);

  // Enhanced Auto-layout function with multiple algorithms
  const handleAutoLayout = useCallback(async (layoutType: 'hierarchical' | 'force' | 'circular' | 'grid' = 'hierarchical') => {
    if (nodes.length === 0) return;

    const { enhancedAutoLayout, animateLayout } = await import('../utils/layoutAlgorithms');
    
    const newNodes = enhancedAutoLayout(nodes, edges, layoutType, {
      nodeWidth: 200,
      nodeHeight: 80,
      horizontalSpacing: 100,
      verticalSpacing: 150,
      padding: 80,
    });
    
    // Apply smooth animation
    animateLayout(nodes, newNodes, setNodes, 700);
  }, [nodes, edges, setNodes]);

  // Get related nodes for a given node with lineage options
  const getRelatedNodes = useCallback((nodeId: string, currentNodes: Node[], currentEdges: Edge[], includeUpstream: boolean, includeDownstream: boolean) => {
    const relatedNodeIds = new Set<string>();
    relatedNodeIds.add(nodeId);
    
    // Find upstream nodes (only follow input connections)
    if (includeUpstream) {
      const findUpstreamNodes = (targetNodeId: string, visited: Set<string>) => {
        if (visited.has(targetNodeId)) return;
        visited.add(targetNodeId);
        
        currentEdges.forEach(edge => {
          // Only follow edges where current node is the target (receiving data)
          if (edge.target === targetNodeId && !visited.has(edge.source)) {
            relatedNodeIds.add(edge.source);
            // Recursively find upstream nodes of this source node
            findUpstreamNodes(edge.source, visited);
          }
        });
      };
      findUpstreamNodes(nodeId, new Set());
    }
    
    // Find downstream nodes (only follow output connections)
    if (includeDownstream) {
      const findDownstreamNodes = (sourceNodeId: string, visited: Set<string>) => {
        if (visited.has(sourceNodeId)) return;
        visited.add(sourceNodeId);
        
        currentEdges.forEach(edge => {
          // Only follow edges where current node is the source (sending data)
          if (edge.source === sourceNodeId && !visited.has(edge.target)) {
            relatedNodeIds.add(edge.target);
            // Recursively find downstream nodes of this target node
            findDownstreamNodes(edge.target, visited);
          }
        });
      };
      findDownstreamNodes(nodeId, new Set());
    }
    
    return relatedNodeIds;
  }, []);

  // Enhanced lineage analysis with practical use cases
  const getLineageNodes = useCallback((nodeId: string, mode: 'none' | 'impact' | 'dependency' | 'path' | 'critical') => {
    if (mode === 'none') return new Set<string>();
    const lineageNodeIds = new Set<string>();
    lineageNodeIds.add(nodeId);
    
    if (mode === 'impact') {
      // Impact Analysis: Show all nodes that would be affected if this node fails
      const findImpactedNodes = (sourceNodeId: string, visited: Set<string>) => {
        if (visited.has(sourceNodeId)) return;
        visited.add(sourceNodeId);
        
        edges.forEach(edge => {
          if (edge.source === sourceNodeId && !visited.has(edge.target)) {
            lineageNodeIds.add(edge.target);
            findImpactedNodes(edge.target, visited);
          }
        });
      };
      findImpactedNodes(nodeId, new Set());
    }
    
    else if (mode === 'dependency') {
      // Dependency Analysis: Show all nodes this node depends on
      const findDependencies = (targetNodeId: string, visited: Set<string>) => {
        if (visited.has(targetNodeId)) return;
        visited.add(targetNodeId);
        
        edges.forEach(edge => {
          if (edge.target === targetNodeId && !visited.has(edge.source)) {
            lineageNodeIds.add(edge.source);
            findDependencies(edge.source, visited);
          }
        });
      };
      findDependencies(nodeId, new Set());
    }
    
    else if (mode === 'path') {
      // End-to-End Path: Show complete data flow paths through this node
      // Find all paths that pass through the selected node
      const pathNodes = new Set<string>();
      
      // First, check if selected node is a source or sink itself
      const isSource = !edges.some(edge => edge.target === nodeId);
      const isSink = !edges.some(edge => edge.source === nodeId);
      
      if (isSource) {
        // If it's a source, find all downstream nodes
        const findDownstream = (current: string, visited: Set<string>) => {
          if (visited.has(current)) return;
          visited.add(current);
          pathNodes.add(current);
          
          edges.forEach(edge => {
            if (edge.source === current) {
              findDownstream(edge.target, visited);
            }
          });
        };
        findDownstream(nodeId, new Set());
      } else if (isSink) {
        // If it's a sink, find all upstream nodes
        const findUpstream = (current: string, visited: Set<string>) => {
          if (visited.has(current)) return;
          visited.add(current);
          pathNodes.add(current);
          
          edges.forEach(edge => {
            if (edge.target === current) {
              findUpstream(edge.source, visited);
            }
          });
        };
        findUpstream(nodeId, new Set());
      } else {
        // For intermediate nodes, find all paths passing through it
        // First find all upstream sources that can reach this node
        const upstreamSources = new Set<string>();
        const findUpstreamSources = (current: string, visited: Set<string>) => {
          if (visited.has(current)) return;
          visited.add(current);
          
          const incoming = edges.filter(e => e.target === current);
          if (incoming.length === 0) {
            // This is a source node
            upstreamSources.add(current);
          } else {
            incoming.forEach(edge => {
              findUpstreamSources(edge.source, visited);
            });
          }
        };
        findUpstreamSources(nodeId, new Set());
        
        // Then find all downstream sinks reachable from this node
        const downstreamSinks = new Set<string>();
        const findDownstreamSinks = (current: string, visited: Set<string>) => {
          if (visited.has(current)) return;
          visited.add(current);
          
          const outgoing = edges.filter(e => e.source === current);
          if (outgoing.length === 0) {
            // This is a sink node
            downstreamSinks.add(current);
          } else {
            outgoing.forEach(edge => {
              findDownstreamSinks(edge.target, visited);
            });
          }
        };
        findDownstreamSinks(nodeId, new Set());
        
        // Now find paths from sources to sinks that pass through the selected node
        upstreamSources.forEach(sourceId => {
          downstreamSinks.forEach(sinkId => {
            // Check if there's a path from source to selected node and from selected node to sink
            const pathFromSource = new Set<string>();
            const canReachFromSource = (current: string, target: string, visited: Set<string>): boolean => {
              if (current === target) {
                pathFromSource.add(current);
                return true;
              }
              if (visited.has(current)) return false;
              visited.add(current);
              
              const outgoing = edges.filter(e => e.source === current);
              for (const edge of outgoing) {
                if (canReachFromSource(edge.target, target, visited)) {
                  pathFromSource.add(current);
                  return true;
                }
              }
              return false;
            };
            
            const pathToSink = new Set<string>();
            const canReachToSink = (current: string, target: string, visited: Set<string>): boolean => {
              if (current === target) {
                pathToSink.add(current);
                return true;
              }
              if (visited.has(current)) return false;
              visited.add(current);
              
              const outgoing = edges.filter(e => e.source === current);
              for (const edge of outgoing) {
                if (canReachToSink(edge.target, target, visited)) {
                  pathToSink.add(current);
                  return true;
                }
              }
              return false;
            };
            
            if (canReachFromSource(sourceId, nodeId, new Set()) && 
                canReachToSink(nodeId, sinkId, new Set())) {
              // Add all nodes in the complete path
              pathFromSource.forEach(node => pathNodes.add(node));
              pathToSink.forEach(node => pathNodes.add(node));
            }
          });
        });
      }
      
      // Add all found path nodes to lineageNodeIds
      pathNodes.forEach(node => lineageNodeIds.add(node));
    }
    
    else if (mode === 'critical') {
      // Critical Path Analysis: Show critical nodes in the data flow connected to selected node
      // First, find all nodes connected to the selected node (upstream and downstream)
      const connectedNodes = new Set<string>();
      connectedNodes.add(nodeId);
      
      // Find all upstream nodes
      const findUpstream = (targetId: string, visited: Set<string>) => {
        if (visited.has(targetId)) return;
        visited.add(targetId);
        
        edges.forEach(edge => {
          if (edge.target === targetId && !visited.has(edge.source)) {
            connectedNodes.add(edge.source);
            findUpstream(edge.source, visited);
          }
        });
      };
      findUpstream(nodeId, new Set());
      
      // Find all downstream nodes
      const findDownstream = (sourceId: string, visited: Set<string>) => {
        if (visited.has(sourceId)) return;
        visited.add(sourceId);
        
        edges.forEach(edge => {
          if (edge.source === sourceId && !visited.has(edge.target)) {
            connectedNodes.add(edge.target);
            findDownstream(edge.target, visited);
          }
        });
      };
      findDownstream(nodeId, new Set());
      
      // Now identify critical nodes within the connected subgraph
      connectedNodes.forEach(nodeId => {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) return;
        
        // Count connections only within the connected subgraph
        const incomingCount = edges.filter(e => 
          e.target === node.id && connectedNodes.has(e.source)
        ).length;
        const outgoingCount = edges.filter(e => 
          e.source === node.id && connectedNodes.has(e.target)
        ).length;
        
        // Consider nodes with high connectivity as critical
        if (incomingCount >= 2 || outgoingCount >= 2) {
          lineageNodeIds.add(node.id);
        }
        
        // ML/AI nodes are often critical
        if (['model_train', 'model_predict', 'model_evaluate'].includes(node.type)) {
          lineageNodeIds.add(node.id);
        }
        
        // Central processing nodes with connections
        if (['join', 'aggregate', 'transform'].includes(node.type) && 
            (incomingCount > 0 || outgoingCount > 0)) {
          lineageNodeIds.add(node.id);
        }
        
        // Add bottleneck nodes (single connection point between subgraphs)
        if (incomingCount === 1 && outgoingCount >= 1) {
          // Check if removing this node would disconnect the graph
          const upstreamNodes = edges
            .filter(e => e.target === node.id && connectedNodes.has(e.source))
            .map(e => e.source);
          const downstreamNodes = edges
            .filter(e => e.source === node.id && connectedNodes.has(e.target))
            .map(e => e.target);
          
          // If this is the only connection between upstream and downstream, it's critical
          const alternativePaths = edges.filter(e => 
            upstreamNodes.includes(e.source) && 
            downstreamNodes.includes(e.target) && 
            e.source !== node.id && 
            e.target !== node.id
          ).length;
          
          if (alternativePaths === 0) {
            lineageNodeIds.add(node.id);
          }
        }
      });
    }
    
    return lineageNodeIds;
  }, [nodes, edges]);

  // Safe filter for nodes and edges with related nodes functionality
  const { displayNodes, displayEdges } = useMemo(() => {
    // Basic node processing with search highlighting
    const processedNodes = nodes.map(node => {
      const isSearchMatch = searchResults.has(node.id);
      const isSelected = node.selected;
      const isReconnectTarget = reconnectingEdge && 
        ((reconnectingEdge.mode === 'source' && node.id !== reconnectingEdge.edge.target) ||
         (reconnectingEdge.mode === 'target' && node.id !== reconnectingEdge.edge.source));
      
      return {
        ...node,
        data: {
          ...node.data,
          isEditing: editingNodeId === node.id,
          isReconnectTarget,
          onReconnect: isReconnectTarget ? () => handleEdgeReconnection(node.id) : undefined,
        },
        style: {
          ...node.style,
          ...(isSearchMatch && {
            boxShadow: `0 0 12px ${theme.colors.warning}60`,
            border: `2px solid ${theme.colors.warning}`,
            zIndex: 99995,
          }),
          ...(isSelected && {
            opacity: 1,
            zIndex: 1000,
          }),
          ...(isReconnectTarget && {
            border: `3px dashed ${theme.colors.accent}`,
            boxShadow: `0 0 15px ${theme.colors.accent}50`,
            cursor: 'pointer',
            zIndex: 99994,
          }),
        }
      };
    });

    // Enhanced edge processing with sophisticated visual effects
    const processedEdges = edges.map(edge => {
      const transferType = edge.data?.transferType || 'batch';
      const selectedNodes = processedNodes.filter(node => node.selected);
      const selectedNodeIds = new Set(selectedNodes.map(node => node.id));
      const isConnectedToSelected = selectedNodeIds.has(edge.source) || selectedNodeIds.has(edge.target);
      const isEdgeSelected = edge.selected || (selectedEdge && selectedEdge.id === edge.id);
      const isReconnectingThisEdge = reconnectingEdge && reconnectingEdge.edge.id === edge.id;
      
      let strokeColor = '#64748b'; // Darker slate gray for better visibility
      let strokeWidth = 2;
      let strokeOpacity = 0.8;
      let strokeDasharray = undefined;
      let animated = false;
      let style = {};
      
      if (isReconnectingThisEdge) {
        // Edge being reconnected gets special styling
        strokeColor = '#f59e0b'; // Orange for reconnection mode
        strokeWidth = 6;
        strokeOpacity = 1;
        strokeDasharray = '15,5';
        animated = true;
        style = {
          filter: `drop-shadow(0 0 12px ${strokeColor}60)`,
        };
      } else if (isEdgeSelected) {
        // Selected edge gets maximum emphasis
        strokeColor = transferType === 'realtime' ? '#10b981' : '#3b82f6';
        strokeWidth = 5;
        strokeOpacity = 1;
        animated = true;
        style = {
          filter: `drop-shadow(0 0 8px ${strokeColor}40)`,
        };
      } else if (isConnectedToSelected) {
        const isOutgoingFromSelected = selectedNodeIds.has(edge.source);
        strokeWidth = 4;
        strokeOpacity = 0.9;
        
        if (isOutgoingFromSelected) {
          // Outgoing edges (data flowing out) - warm gradient colors
          if (transferType === 'realtime') {
            strokeColor = '#10b981'; // Emerald green
            animated = true;
          } else {
            strokeColor = '#f97316'; // Orange
            strokeDasharray = '8,4';
          }
        } else {
          // Incoming edges (data flowing in) - cool gradient colors  
          if (transferType === 'realtime') {
            strokeColor = '#3b82f6'; // Blue
            animated = true;
          } else {
            strokeColor = '#8b5cf6'; // Purple
            strokeDasharray = '8,4';
          }
        }
        
        style = {
          filter: `drop-shadow(0 0 6px ${strokeColor}30)`,
        };
      } else {
        // Normal state with better visibility
        strokeOpacity = 0.6;
        if (transferType === 'realtime') {
          strokeColor = '#059669'; // Subtle green for realtime
          strokeDasharray = '3,2';
        } else {
          strokeColor = '#2563eb'; // Subtle blue for batch
          strokeDasharray = '5,3';
        }
      }
      
      return {
        ...edge,
        style: {
          ...edge.style,
          stroke: strokeColor,
          strokeWidth: strokeWidth,
          strokeOpacity: strokeOpacity,
          strokeDasharray: strokeDasharray,
          ...style,
        },
        animated: animated,
      };
    });

    // Group filter takes priority
    if (selectedGroupIds.size > 0) {
      const groupFilteredNodes = processedNodes.filter(node => {
        const nodeGroupIds = groupManager.getNodeGroupIds(node.data);
        return nodeGroupIds.some(groupId => selectedGroupIds.has(groupId));
      });
      const groupFilteredEdges = processedEdges.filter(edge => 
        groupFilteredNodes.some(node => node.id === edge.source) && 
        groupFilteredNodes.some(node => node.id === edge.target)
      );
      return { displayNodes: groupFilteredNodes, displayEdges: groupFilteredEdges };
    }
    
    // Related nodes and analysis filter
    const selectedNodes = processedNodes.filter(node => node.selected);
    const hasSelection = selectedNodes.length > 0;
    const hasAnalysisMode = lineageMode !== 'none';
    
    if (showOnlyRelated || hasAnalysisMode) {
      if (!hasSelection) {
        return { displayNodes: processedNodes, displayEdges: processedEdges };
      }
      
      const allRelatedNodeIds = new Set<string>();
      
      // Add related nodes if showOnlyRelated is enabled
      if (showOnlyRelated) {
        selectedNodes.forEach(selectedNode => {
          const relatedIds = getRelatedNodes(selectedNode.id, processedNodes, processedEdges, showUpstream, showDownstream);
          relatedIds.forEach(id => allRelatedNodeIds.add(id));
        });
      }
      
      // Add lineage nodes if analysis mode is active
      if (hasAnalysisMode) {
        selectedNodes.forEach(selectedNode => {
          try {
            const lineageIds = getLineageNodes(selectedNode.id, lineageMode as 'impact' | 'dependency' | 'path' | 'critical');
            lineageIds.forEach(id => allRelatedNodeIds.add(id));
          } catch (error) {
            console.error('Error calculating lineage for node:', selectedNode.id, error);
          }
        });
      }
      
      // If no filters found any nodes, show selected nodes at minimum
      if (allRelatedNodeIds.size === 0) {
        selectedNodes.forEach(node => allRelatedNodeIds.add(node.id));
      }
      
      const filteredNodes = processedNodes.filter(node => allRelatedNodeIds.has(node.id)).map(node => {
        const isSelected = selectedNodes.some(selected => selected.id === node.id);
        const isInAnalysis = hasAnalysisMode;
        
        if (isSelected) {
          return node; // Already styled above
        } else if (isInAnalysis) {
          // Simple analysis styling
          const analysisStyles = {
            impact: {
              border: '2px solid #ef4444',
              boxShadow: '0 0 6px rgba(239, 68, 68, 0.3)',
            },
            dependency: {
              border: '2px solid #22c55e',
              boxShadow: '0 0 6px rgba(34, 197, 94, 0.3)',
            },
            path: {
              border: '2px solid #a855f7',
              boxShadow: '0 0 6px rgba(168, 85, 247, 0.3)',
            },
            critical: {
              border: '2px solid #f59e0b',
              boxShadow: '0 0 6px rgba(245, 158, 11, 0.3)',
            },
          };
          
          const currentStyle = analysisStyles[lineageMode as keyof typeof analysisStyles];
          
          return {
            ...node,
            style: {
              ...node.style,
              ...currentStyle,
              opacity: 0.95,
              zIndex: 500,
            }
          };
        }
        
        // Add subtle styling for non-selected, non-analysis nodes
        return {
          ...node,
          style: {
            ...node.style,
            opacity: hasAnalysisMode || showOnlyRelated ? 0.6 : 1,
          }
        };
      });
      
      const filteredEdges = processedEdges.filter(edge => 
        allRelatedNodeIds.has(edge.source) && allRelatedNodeIds.has(edge.target)
      ).map(edge => {
        // Add analysis-specific edge styling
        if (hasAnalysisMode) {
          const analysisEdgeStyles = {
            impact: {
              stroke: '#ef4444',
              strokeWidth: 4,
              strokeOpacity: 0.8,
              filter: 'drop-shadow(0 0 8px #ef444440)',
              strokeDasharray: '10,3',
            },
            dependency: {
              stroke: '#22c55e',
              strokeWidth: 4,
              strokeOpacity: 0.8,
              filter: 'drop-shadow(0 0 8px #22c55e40)',
              strokeDasharray: '10,3',
            },
            path: {
              stroke: '#a855f7',
              strokeWidth: 4,
              strokeOpacity: 0.8,
              filter: 'drop-shadow(0 0 8px #a855f740)',
              strokeDasharray: '15,5',
            },
            critical: {
              stroke: '#f59e0b',
              strokeWidth: 5,
              strokeOpacity: 0.9,
              filter: 'drop-shadow(0 0 10px #f59e0b50)',
              strokeDasharray: '8,4,2,4',
            },
          };
          
          const analysisStyle = analysisEdgeStyles[lineageMode as keyof typeof analysisEdgeStyles];
          
          return {
            ...edge,
            style: {
              ...edge.style,
              ...analysisStyle,
            },
            animated: lineageMode === 'path' || lineageMode === 'critical',
          };
        }
        
        return edge;
      });
      
      return { displayNodes: filteredNodes, displayEdges: filteredEdges };
    }
    
    // Return all nodes and edges
    return { displayNodes: processedNodes, displayEdges: processedEdges };
  }, [nodes, edges, selectedGroupIds, editingNodeId, searchResults, theme, showOnlyRelated, showUpstream, showDownstream, lineageMode, selectedEdge, reconnectingEdge, handleEdgeReconnection, getRelatedNodes, getLineageNodes]);

  // Toggle show only related nodes
  const toggleShowOnlyRelated = useCallback(() => {
    setShowOnlyRelated(prev => !prev);
  }, []);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Check if the active element is an input field
      const activeElement = document.activeElement;
      const isInputField = activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.getAttribute('contenteditable') === 'true'
      );
      
      // Delete selected nodes and edges with Delete key (only when not in input field)
      if ((event.key === 'Delete' || event.key === 'Backspace') && !isInputField) {
        const selectedNodes = nodes.filter(node => node.selected);
        const selectedEdgesFromFlow = edges.filter(edge => edge.selected);
        
        // Also include the selected edge from the properties panel
        const allSelectedEdges = selectedEdgesFromFlow.slice();
        if (selectedEdge && !allSelectedEdges.some(e => e.id === selectedEdge.id)) {
          allSelectedEdges.push(selectedEdge);
        }
        
        if (selectedNodes.length > 0 || allSelectedEdges.length > 0) {
          // Prevent default to avoid any browser back navigation
          event.preventDefault();
          
          // Remove selected nodes
          if (selectedNodes.length > 0) {
            const selectedNodeIds = selectedNodes.map(node => node.id);
            setNodes(nds => nds.filter(node => !selectedNodeIds.includes(node.id)));
            
            // Remove edges connected to deleted nodes
            setEdges(eds => eds.filter(edge => 
              !selectedNodeIds.includes(edge.source) && 
              !selectedNodeIds.includes(edge.target)
            ));
            
            // Clear selected node in properties panel if it was deleted
            if (selectedNode && selectedNodeIds.includes(selectedNode.id)) {
              setSelectedNode(null);
            }
          }
          
          // Remove selected edges
          if (allSelectedEdges.length > 0) {
            const selectedEdgeIds = allSelectedEdges.map(edge => edge.id);
            setEdges(eds => eds.filter(edge => !selectedEdgeIds.includes(edge.id)));
            
            // Clear selected edge in properties panel if it was deleted
            if (selectedEdge && selectedEdgeIds.includes(selectedEdge.id)) {
              setSelectedEdge(null);
            }
          }
        }
      }
      
      // Toggle show only related nodes with 'F' key (only when not in input field)
      if ((event.key === 'f' || event.key === 'F') && !isInputField) {
        if (!event.ctrlKey && !event.metaKey && !event.altKey) {
          event.preventDefault();
          toggleShowOnlyRelated();
        }
      }
    },
    [nodes, edges, selectedNode, selectedEdge, setNodes, setEdges, toggleShowOnlyRelated]
  );

  // Add keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);


  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      width: '100%', 
      height: isTauri() ? 'calc(100vh - 32px)' : '100vh',
      backgroundColor: theme.colors.background,
      color: theme.colors.textPrimary,
    }}>
      <MenuBar
        nodes={nodes}
        edges={edges}
        onSave={handleSave}
        onLoad={handleLoad}
        onNew={handleNew}
        onExportPNG={handleExportPNG}
        onExportSVG={handleExportSVG}
        onExportJSON={handleExportJSON}
        onExportExcel={handleExportExcel}
        onImportJSON={handleImportJSON}
        isLoading={isLoading}
      />
      <div style={{ display: 'flex', flexGrow: 1 }}>
        <Sidebar />
        <div style={{ flexGrow: 1, marginLeft: '280px', position: 'relative' }} ref={reactFlowWrapper}>
        {/* Filter Controls */}
        <div style={{
          position: 'absolute',
          top: isTauri() ? '42px' : '10px', // 32px title bar + 10px margin
          left: '10px',
          zIndex: 99995,
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          flexWrap: 'wrap',
          maxWidth: 'calc(100vw - 320px)',
          background: `${theme.colors.surface}f0`,
          padding: '8px 12px',
          borderRadius: theme.borderRadius.md,
          boxShadow: `0 2px 8px ${theme.colors.shadowMedium}`,
          border: `1px solid ${theme.colors.border}`,
        }}>
          {/* Search Bar */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              type="text"
              placeholder={t('search.placeholder')}
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              style={{
                padding: '4px 8px',
                paddingRight: searchTerm ? '24px' : '8px',
                fontSize: theme.typography.fontSize.sm,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.sm,
                backgroundColor: theme.colors.background,
                color: theme.colors.textPrimary,
                minWidth: '150px',
                outline: 'none',
              }}
            />
            {searchTerm && (
              <button
                onClick={clearSearch}
                style={{
                  position: 'absolute',
                  right: '4px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: theme.colors.textSecondary,
                  fontSize: '14px',
                  padding: '0',
                  width: '16px',
                  height: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title={t('search.clear')}
              >
                ×
              </button>
            )}
            {searchResults.size > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: '0',
                marginTop: '2px',
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.textSecondary,
                whiteSpace: 'nowrap',
              }}>
                {t('search.results', { count: searchResults.size })}
              </div>
            )}
          </div>
          
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: theme.typography.fontSize.md,
            fontWeight: theme.typography.fontWeight.medium,
            color: theme.colors.textPrimary,
            cursor: 'pointer',
          }}>
            <input
              type="checkbox"
              checked={showOnlyRelated}
              onChange={toggleShowOnlyRelated}
              style={{ cursor: 'pointer' }}
            />
            {t('filter.showRelated')}
          </label>
          
          {showOnlyRelated && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              paddingLeft: '8px',
              borderLeft: `2px solid ${theme.colors.border}`,
            }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.textSecondary,
                cursor: 'pointer',
              }}>
                <input
                  type="checkbox"
                  checked={showUpstream}
                  onChange={(e) => setShowUpstream(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                {t('filter.showUpstream')}
              </label>
              
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.textSecondary,
                cursor: 'pointer',
              }}>
                <input
                  type="checkbox"
                  checked={showDownstream}
                  onChange={(e) => setShowDownstream(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                {t('filter.showDownstream')}
              </label>
            </div>
          )}
          
          <button
            onClick={() => handleAutoLayout()}
            style={{
              padding: '6px 12px',
              backgroundColor: theme.colors.accent,
              color: theme.colors.surface,
              border: 'none',
              borderRadius: theme.borderRadius.sm,
              fontSize: theme.typography.fontSize.sm,
              cursor: 'pointer',
              fontWeight: theme.typography.fontWeight.medium,
              transition: theme.transitions.fast,
              minWidth: '100px',
              whiteSpace: 'nowrap' as const,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title="Auto-arrange nodes in hierarchical layout"
          >
            {t('menu.autoLayout')}
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <label style={{ 
              fontSize: theme.typography.fontSize.sm, 
              color: theme.colors.textSecondary 
            }}>{t('filter.analysis')}:</label>
            <select
              value={lineageMode}
              onChange={(e) => {
                const newMode = e.target.value as any;
                setLineageMode(newMode);
              }}
              style={{
                padding: '4px 8px',
                fontSize: theme.typography.fontSize.sm,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.sm,
                backgroundColor: theme.colors.surface,
                color: theme.colors.textPrimary,
              }}
              title="Analyze data flow patterns for selected nodes"
            >
              <option value="none">{t('filter.none')}</option>
              <option value="impact">{t('filter.impact')}</option>
              <option value="dependency">{t('filter.dependency')}</option>
              <option value="path">{t('filter.dataPath')}</option>
              <option value="critical">{t('filter.critical')}</option>
            </select>
          </div>

          <button
            onClick={() => setShowGroupManager(!showGroupManager)}
            style={{
              padding: '6px 12px',
              backgroundColor: showGroupManager ? theme.colors.warning : theme.colors.accent,
              color: theme.colors.surface,
              border: 'none',
              borderRadius: theme.borderRadius.sm,
              fontSize: theme.typography.fontSize.sm,
              cursor: 'pointer',
              fontWeight: theme.typography.fontWeight.medium,
              transition: theme.transitions.fast,
              minWidth: '120px',
              whiteSpace: 'nowrap' as const,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title="Manage node groups"
          >
            {showGroupManager ? t('filter.closeGroups') : t('filter.groups')}
          </button>

          <button
            onClick={() => setShowLayoutSelector(true)}
            style={{
              padding: '6px 12px',
              backgroundColor: theme.colors.accent,
              color: theme.colors.surface,
              border: 'none',
              borderRadius: theme.borderRadius.sm,
              fontSize: theme.typography.fontSize.sm,
              cursor: 'pointer',
              fontWeight: theme.typography.fontWeight.medium,
              transition: theme.transitions.fast,
              minWidth: '100px',
              whiteSpace: 'nowrap' as const,
            }}
            title="Auto layout with different algorithms"
          >
            {t('layout.autoLayout', 'Auto Layout')}
          </button>

          {(showOnlyRelated || lineageMode !== 'none' || selectedGroupIds.size > 0) && (
            <div style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
              padding: '2px 8px',
              background: theme.colors.surfaceHover,
              borderRadius: theme.borderRadius.sm,
            }}>
              {t('filter.nodesShown', { shown: displayNodes.length, total: nodes.length })}
              {nodes.filter(node => node.selected).length > 0 && (
                <span style={{ marginLeft: '8px', color: theme.colors.accent }}>
                  ({nodes.filter(node => node.selected).length} {t('filter.selected')})
                </span>
              )}
            </div>
          )}
        </div>
        
        <ReactFlow
          nodes={displayNodes}
          edges={displayEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          onWheel={handleWheel}
          nodeTypes={nodeTypes}
          fitView
          connectionMode={'strict' as any}
          panOnDrag={[1, 2]} // Enable panning on middle click (button 1) and right click (button 2)
          selectionOnDrag={true} // Enable selection box on left click drag
          panOnScroll={false} // Disable panning on scroll to prioritize zoom
          zoomOnScroll={false} // Disable default zoom to use custom handler
          zoomOnPinch={true} // Enable zoom on touchpad pinch
          zoomOnDoubleClick={true} // Enable zoom on double click
          preventScrolling={true} // Prevent default scroll behavior
          selectionMode={'partial' as any} // Partial selection mode - nodes partially in selection box are selected
          multiSelectionKeyCode={['Meta', 'Ctrl']} // Enable multi-selection with Ctrl/Cmd key
          proOptions={{ hideAttribution: true }} // Hide React Flow logo
        >
          <Controls />
          <MiniMap />
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        </ReactFlow>
        <PropertiesPanel 
          selectedNode={selectedNode} 
          onNodeUpdate={onNodeUpdate} 
          onNodeTypeChange={onNodeTypeChange}
          onClose={onPropertiesPanelClose}
          onEditingChange={(isEditing) => {
            setEditingNodeId(isEditing && selectedNode ? selectedNode.id : null);
          }}
        />
        
        <EdgePropertiesPanel
          selectedEdge={selectedEdge}
          nodes={nodes}
          onClose={onPropertiesPanelClose}
          onStartReconnection={startEdgeReconnection}
          onEdgeDelete={onEdgeDelete}
          reconnectingEdge={reconnectingEdge}
          onCancelReconnection={cancelEdgeReconnection}
        />
        
        {/* Group Manager Panel */}
        {showGroupManager && (
          <GroupManagerPanel
            selectedGroupIds={selectedGroupIds}
            onGroupSelectionChange={setSelectedGroupIds}
            onClose={() => setShowGroupManager(false)}
          />
        )}

        <LayoutSelector
          isVisible={showLayoutSelector}
          onLayoutChange={handleAutoLayout}
          onClose={() => setShowLayoutSelector(false)}
        />
        </div>
      </div>
    </div>
  );
}

function DataFlowEditor() {
  return (
    <ReactFlowProvider>
      <DataFlowEditorInner />
    </ReactFlowProvider>
  );
}

export default DataFlowEditor;