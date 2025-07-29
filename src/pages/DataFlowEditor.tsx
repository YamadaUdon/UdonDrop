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
import html2canvas from 'html2canvas';

import { useTheme } from '../contexts/ThemeContext';
import { getTheme } from '../utils/theme';
import { isTauri } from '../utils/platform';

import Sidebar from '../components/Sidebar';
import CustomNode from '../components/CustomNode';
import PropertiesPanel from '../components/PropertiesPanel';
import MenuBar from '../components/MenuBar';
import GroupManagerPanel from '../components/GroupManagerPanel';
import { usePipeline } from '../hooks/usePipeline';
import { groupManager } from '../services/groupManager';

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
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [showOnlyRelated, setShowOnlyRelated] = useState(false);
  const [showUpstream, setShowUpstream] = useState(true);
  const [showDownstream, setShowDownstream] = useState(true);
  const [lineageMode, setLineageMode] = useState<'none' | 'upstream' | 'downstream' | 'both'>('none');
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [showGroupManager, setShowGroupManager] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Set<string>>(new Set());
  const { savePipeline, loadPipeline, isLoading } = usePipeline();
  const { isDark } = useTheme();
  const theme = getTheme(isDark);

  // Apply theme CSS variables for React Flow selection box
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--rf-selection-bg', theme.colors.accent + '20'); // Semi-transparent accent color
    root.style.setProperty('--rf-selection-border', theme.colors.accent);
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
          stroke: '#b1b1b7',
          strokeWidth: 2,
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
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Custom mouse event handler for more precise control (removed - React Flow handles this internally)

  const onPropertiesPanelClose = useCallback(() => {
    setSelectedNode(null);
    setEditingNodeId(null);
  }, []);

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
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
    setShowOnlyRelated(false);
    setShowUpstream(true);
    setShowDownstream(true);
    // Clear localStorage as well
    localStorage.removeItem('dataflow_editor_nodes');
    localStorage.removeItem('dataflow_editor_edges');
  }, [setNodes, setEdges]);

  // Export functions
  const handleExportPNG = useCallback(async () => {
    if (!reactFlowInstance) return;
    
    try {
      // Get the React Flow wrapper element (contains the entire flow)
      const flowElement = document.querySelector('.react-flow') as HTMLElement;
      if (!flowElement) {
        alert('Unable to find flow element for export');
        return;
      }

      // Hide UI elements and make background transparent for export
      const controlsElement = flowElement.querySelector('.react-flow__controls') as HTMLElement;
      const minimapElement = flowElement.querySelector('.react-flow__minimap') as HTMLElement;
      const attributionElement = flowElement.querySelector('.react-flow__attribution') as HTMLElement;
      const backgroundElement = flowElement.querySelector('.react-flow__background') as HTMLElement;
      
      const originalStyles: { element: HTMLElement; property: string; value: string }[] = [];
      
      // Hide UI elements
      [controlsElement, minimapElement, attributionElement].forEach((el) => {
        if (el) {
          originalStyles.push({ element: el, property: 'display', value: el.style.display });
          el.style.display = 'none';
        }
      });
      
      // Make background transparent
      if (backgroundElement) {
        originalStyles.push({ element: backgroundElement, property: 'opacity', value: backgroundElement.style.opacity });
        backgroundElement.style.opacity = '0';
      }
      
      // Make the main flow element background transparent
      originalStyles.push({ element: flowElement, property: 'backgroundColor', value: flowElement.style.backgroundColor });
      flowElement.style.backgroundColor = 'transparent';

      // Configure html2canvas options for transparent background
      const canvas = await html2canvas(flowElement, {
        useCORS: true,
        allowTaint: true
        // Note: html2canvas will capture with transparent background when elements have transparent backgrounds
      });

      // Restore all original styles
      originalStyles.forEach(({ element, property, value }) => {
        (element.style as any)[property] = value || '';
      });

      // Convert canvas to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = `dataflow-diagram-${new Date().toISOString().split('T')[0]}.png`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
        }
      }, 'image/png');
      
    } catch (error) {
      console.error('Error exporting PNG:', error);
      alert('Failed to export PNG. Please try again.');
    }
  }, [reactFlowInstance, theme.colors.background]);

  const handleExportSVG = useCallback(() => {
    if (!nodes.length) return;
    
    const svgWidth = 1024;
    const svgHeight = 768;
    
    let svgContent = `
      <svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#666"/>
          </marker>
        </defs>
        <rect width="100%" height="100%" fill="white"/>
    `;
    
    // Add edges
    edges.forEach(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      
      if (sourceNode && targetNode) {
        const x1 = sourceNode.position.x + 80;
        const y1 = sourceNode.position.y + 30;
        const x2 = targetNode.position.x + 80;
        const y2 = targetNode.position.y + 30;
        
        svgContent += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#666" stroke-width="2" marker-end="url(#arrowhead)"/>`;
      }
    });
    
    // Add nodes
    nodes.forEach(node => {
      const x = node.position.x;
      const y = node.position.y;
      
      svgContent += `
        <rect x="${x}" y="${y}" width="160" height="60" rx="8" fill="#fff" stroke="#ccc" stroke-width="1"/>
        <text x="${x + 10}" y="${y + 25}" font-family="Arial, sans-serif" font-size="14" fill="#333">${node.data.label}</text>
        <text x="${x + 10}" y="${y + 45}" font-family="Arial, sans-serif" font-size="12" fill="#666">${node.type}</text>
      `;
    });
    
    svgContent += '</svg>';
    
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = 'dataflow-diagram.svg';
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges]);

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
      setShowOnlyRelated(false);
      setShowUpstream(true);
      setShowDownstream(true);
      setLineageMode('none');
      setSelectedGroupIds(new Set());
      
      // With UUID-based IDs, no need to adjust counters - each ID is globally unique
      
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

  // Auto-layout function
  const handleAutoLayout = useCallback(() => {
    if (nodes.length === 0) return;

    // Organize nodes by layers based on connections
    const layers: Node[][] = [];
    const visited = new Set<string>();
    const nodeMap = new Map(nodes.map(node => [node.id, node]));

    // Find input nodes (nodes with no incoming edges)
    const inputNodes = nodes.filter(node => 
      !edges.some(edge => edge.target === node.id)
    );

    if (inputNodes.length === 0) {
      // If no clear input nodes, start with data architecture nodes
      const architectureNodes = nodes.filter(node => 
        ['data_lake', 'data_warehouse', 'data_mart', 'bi_tool'].includes(node.type)
      );
      if (architectureNodes.length > 0) {
        inputNodes.push(...architectureNodes);
      } else {
        inputNodes.push(nodes[0]); // Fallback to first node
      }
    }

    let currentLayer = inputNodes;
    
    while (currentLayer.length > 0) {
      layers.push([...currentLayer]);
      currentLayer.forEach(node => visited.add(node.id));
      
      // Find next layer nodes
      const nextLayer = new Set<Node>();
      currentLayer.forEach(node => {
        edges
          .filter(edge => edge.source === node.id)
          .forEach(edge => {
            const targetNode = nodeMap.get(edge.target);
            if (targetNode && !visited.has(targetNode.id)) {
              // Check if all dependencies are satisfied
              const dependencies = edges
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

    // Add any remaining unvisited nodes to the last layer
    const unvisitedNodes = nodes.filter(node => !visited.has(node.id));
    if (unvisitedNodes.length > 0) {
      layers.push(unvisitedNodes);
    }

    // Calculate positions (vertical layout: top to bottom)
    const layerHeight = 120; // Vertical spacing between layers
    const nodeWidth = 180; // Horizontal spacing between nodes in same layer
    const nodeSpacing = 30; // Spacing between nodes in same layer
    
    const newNodes = nodes.map(node => {
      const layerIndex = layers.findIndex(layer => layer.some(n => n.id === node.id));
      const layer = layers[layerIndex];
      const nodeIndex = layer.findIndex(n => n.id === node.id);
      const totalInLayer = layer.length;
      
      // Calculate Y position (vertical layers)
      const y = layerIndex * layerHeight + 50;
      
      // Calculate X position (horizontal distribution within layer)
      const totalWidth = totalInLayer * nodeWidth + (totalInLayer - 1) * nodeSpacing;
      const startX = Math.max(50, (window.innerWidth - totalWidth) / 2);
      const x = startX + nodeIndex * (nodeWidth + nodeSpacing);
      
      return {
        ...node,
        position: { x, y },
      };
    });

    setNodes(newNodes);
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

  // Get lineage nodes (upstream/downstream)
  const getLineageNodes = useCallback((nodeId: string, mode: 'upstream' | 'downstream' | 'both') => {
    const lineageNodeIds = new Set<string>();
    lineageNodeIds.add(nodeId);

    if (mode === 'upstream' || mode === 'both') {
      // Find upstream nodes (data sources)
      const findUpstream = (targetNodeId: string, visited: Set<string>) => {
        if (visited.has(targetNodeId)) return;
        visited.add(targetNodeId);
        
        edges.forEach(edge => {
          if (edge.target === targetNodeId && !visited.has(edge.source)) {
            lineageNodeIds.add(edge.source);
            findUpstream(edge.source, visited);
          }
        });
      };
      findUpstream(nodeId, new Set());
    }

    if (mode === 'downstream' || mode === 'both') {
      // Find downstream nodes (data consumers)
      const findDownstream = (sourceNodeId: string, visited: Set<string>) => {
        if (visited.has(sourceNodeId)) return;
        visited.add(sourceNodeId);
        
        edges.forEach(edge => {
          if (edge.source === sourceNodeId && !visited.has(edge.target)) {
            lineageNodeIds.add(edge.target);
            findDownstream(edge.target, visited);
          }
        });
      };
      findDownstream(nodeId, new Set());
    }

    return lineageNodeIds;
  }, [edges]);

  // Filter nodes and edges based on showOnlyRelated, group filter, and lineage modes
  const { displayNodes, displayEdges } = useMemo(() => {
    let processedNodes = nodes;
    let processedEdges = edges;
    
    // Add editing state information and search highlighting to all nodes
    processedNodes = nodes.map(node => {
      const isSearchMatch = searchResults.has(node.id);
      return {
        ...node,
        data: {
          ...node.data,
          isEditing: editingNodeId === node.id,
        },
        style: {
          ...node.style,
          ...(isSearchMatch && {
            boxShadow: `0 0 15px ${theme.colors.warning}`,
            border: `2px solid ${theme.colors.warning}`,
            zIndex: 99995,
          })
        }
      };
    });

    // Get selected nodes for edge styling
    const selectedNodes = processedNodes.filter(node => node.selected);
    const selectedNodeIds = new Set(selectedNodes.map(node => node.id));

    // Process edges to add transfer type styles and selection highlighting
    processedEdges = edges.map(edge => {
      const transferType = edge.data?.transferType || 'batch';
      const isConnectedToSelected = selectedNodeIds.has(edge.source) || selectedNodeIds.has(edge.target);
      const isEdgeSelected = edge.selected || false; // Check if edge itself is selected
      
      // Check if this edge is outgoing or incoming from selected node
      const isOutgoingFromSelected = selectedNodeIds.has(edge.source);
      const isIncomingToSelected = selectedNodeIds.has(edge.target);
      
      // Determine edge color based on selection and transfer type
      // Color scheme:
      // - Outgoing (data flowing out): Orange/Green
      // - Incoming (data flowing in): Purple/Blue
      let strokeColor = '#b1b1b7'; // Default gray
      let strokeWidth = 2; // Default width
      
      if (isEdgeSelected) {
        // Edge itself is selected - use darker/more saturated colors
        strokeColor = transferType === 'realtime' ? '#2E7D32' : '#D32F2F'; // Dark green for realtime, dark red for batch
        strokeWidth = 4; // Thickest for selected edge
      } else if (isConnectedToSelected) {
        // Connected to selected node - differentiate by direction
        if (isOutgoingFromSelected) {
          // Outgoing from selected node (data flowing out) - warm colors
          strokeColor = transferType === 'realtime' ? '#4CAF50' : '#FF6B35'; // Orange for batch, green for realtime
        } else if (isIncomingToSelected) {
          // Incoming to selected node (data flowing in) - cool colors
          strokeColor = transferType === 'realtime' ? '#2196F3' : '#9C27B0'; // Purple for batch, blue for realtime
        }
        strokeWidth = 3;
      } else {
        // Normal state
        strokeColor = transferType === 'realtime' ? '#4CAF50' : '#2196F3'; // Blue for normal batch, green for realtime
        strokeWidth = 2;
      }
      
      return {
        ...edge,
        style: {
          ...edge.style,
          stroke: strokeColor,
          strokeWidth: strokeWidth,
          strokeDasharray: transferType === 'realtime' ? undefined : '5,5',
        },
        animated: transferType === 'realtime',
      };
    });

    // If group filter is active, return only group filtered nodes - ignore selection
    if (selectedGroupIds.size > 0) {
      const groupFilteredNodes = processedNodes.filter(node => {
        // Only show nodes that belong to selected groups (hide ungrouped nodes)
        return node.data.groupId && selectedGroupIds.has(node.data.groupId);
      });
      
      const groupFilteredEdges = processedEdges.filter(edge => 
        groupFilteredNodes.some(node => node.id === edge.source) && 
        groupFilteredNodes.some(node => node.id === edge.target)
      );
      
      return { displayNodes: groupFilteredNodes, displayEdges: groupFilteredEdges };
    }
    
    // If no group filter and no other filters, return all nodes
    if (!showOnlyRelated && lineageMode === 'none') {
      return { displayNodes: processedNodes, displayEdges: processedEdges };
    }
    
    const selectedNodesForFiltering = processedNodes.filter(node => node.selected);
    if (selectedNodesForFiltering.length === 0 && lineageMode === 'none') {
      return { displayNodes: processedNodes, displayEdges: processedEdges };
    }
    
    // Get all related nodes for all selected nodes
    const allRelatedNodeIds = new Set<string>();
    
    if (showOnlyRelated) {
      selectedNodesForFiltering.forEach(selectedNode => {
        const relatedIds = getRelatedNodes(selectedNode.id, processedNodes, processedEdges, showUpstream, showDownstream);
        relatedIds.forEach(id => allRelatedNodeIds.add(id));
      });
    }
    
    // Add lineage nodes if lineage mode is active
    if (lineageMode !== 'none' && selectedNodesForFiltering.length > 0) {
      selectedNodesForFiltering.forEach(selectedNode => {
        const lineageIds = getLineageNodes(selectedNode.id, lineageMode);
        lineageIds.forEach(id => allRelatedNodeIds.add(id));
      });
    }
    
    // If no filters are active, show all nodes
    if (allRelatedNodeIds.size === 0) {
      selectedNodesForFiltering.forEach(node => allRelatedNodeIds.add(node.id));
    }
    
    // Filter nodes and edges with visual emphasis
    const filteredNodes = processedNodes.filter(node => allRelatedNodeIds.has(node.id)).map(node => {
      const isSelected = selectedNodesForFiltering.some(selected => selected.id === node.id);
      return {
        ...node,
        style: {
          ...node.style,
          opacity: isSelected ? 1 : 0.8,
          filter: isSelected ? 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.5))' : 'none',
        }
      };
    });
    
    const filteredEdges = processedEdges.filter(edge => 
      allRelatedNodeIds.has(edge.source) && allRelatedNodeIds.has(edge.target)
    ).map(edge => {
      const selectedNodeIdsForFiltering = new Set(selectedNodesForFiltering.map(node => node.id));
      const isConnectedToSelected = selectedNodeIdsForFiltering.has(edge.source) || selectedNodeIdsForFiltering.has(edge.target);
      const isEdgeSelected = edge.selected || false; // Check if edge itself is selected
      const transferType = edge.data?.transferType || 'batch';
      
      // Check if this edge is outgoing or incoming from selected node
      const isOutgoingFromSelected = selectedNodeIdsForFiltering.has(edge.source);
      const isIncomingToSelected = selectedNodeIdsForFiltering.has(edge.target);
      
      // Determine edge color based on selection and transfer type
      let strokeColor = '#b1b1b7'; // Default gray
      let strokeWidth = 2; // Default width
      
      if (isEdgeSelected) {
        // Edge itself is selected - use darker/more saturated colors
        strokeColor = transferType === 'realtime' ? '#2E7D32' : '#D32F2F'; // Dark green for realtime, dark red for batch
        strokeWidth = 4; // Thickest for selected edge
      } else if (isConnectedToSelected) {
        // Connected to selected node - differentiate by direction
        if (isOutgoingFromSelected) {
          // Outgoing from selected node (data flowing out)
          strokeColor = transferType === 'realtime' ? '#4CAF50' : '#FF6B35'; // Orange for batch, green for realtime
        } else if (isIncomingToSelected) {
          // Incoming to selected node (data flowing in)
          strokeColor = transferType === 'realtime' ? '#2196F3' : '#9C27B0'; // Purple for batch, blue for realtime
        }
        strokeWidth = 3;
      } else {
        // Normal state
        strokeColor = transferType === 'realtime' ? '#4CAF50' : '#2196F3'; // Blue for normal batch, green for realtime
        strokeWidth = 2;
      }
      
      return {
        ...edge,
        style: {
          ...edge.style,
          stroke: strokeColor,
          strokeWidth: strokeWidth,
        }
      };
    });
    
    return { displayNodes: filteredNodes, displayEdges: filteredEdges };
  }, [nodes, edges, showOnlyRelated, showUpstream, showDownstream, lineageMode, selectedGroupIds, editingNodeId, searchResults, theme, getRelatedNodes, getLineageNodes]);

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
        const selectedEdges = edges.filter(edge => edge.selected);
        
        if (selectedNodes.length > 0 || selectedEdges.length > 0) {
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
          if (selectedEdges.length > 0) {
            const selectedEdgeIds = selectedEdges.map(edge => edge.id);
            setEdges(eds => eds.filter(edge => !selectedEdgeIds.includes(edge.id)));
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
    [nodes, edges, selectedNode, setNodes, setEdges, toggleShowOnlyRelated]
  );

  // Add keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // SQL Generator function (kept for backward compatibility with any remaining references)
  const handleSQLGenerate = useCallback((generatedNodes: Node[], generatedEdges: Edge[]) => {
    // Apply auto-layout to generated nodes
    const layoutNodes = generatedNodes.map((node, index) => ({
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
      alert(`Successfully generated ${generatedNodes.length} nodes and ${generatedEdges.length} edges from SQL query!`);
    }, 100);
  }, [setNodes, setEdges]);

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
            onClick={handleAutoLayout}
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
            }}>{t('filter.lineage')}:</label>
            <select
              value={lineageMode}
              onChange={(e) => setLineageMode(e.target.value as any)}
              style={{
                padding: '4px 8px',
                fontSize: theme.typography.fontSize.sm,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.sm,
                backgroundColor: theme.colors.surface,
                color: theme.colors.textPrimary,
              }}
              title="Show data lineage for selected nodes"
            >
              <option value="none">{t('filter.none')}</option>
              <option value="upstream">{t('filter.upstream')}</option>
              <option value="downstream">{t('filter.downstream')}</option>
              <option value="both">{t('filter.both')}</option>
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
            onClick={() => navigate('/sql-generator')}
            style={{
              padding: '6px 12px',
              backgroundColor: theme.colors.info,
              color: theme.colors.surface,
              border: 'none',
              borderRadius: theme.borderRadius.sm,
              fontSize: theme.typography.fontSize.sm,
              cursor: 'pointer',
              fontWeight: theme.typography.fontWeight.medium,
              transition: theme.transitions.fast,
              minWidth: '140px',
              whiteSpace: 'nowrap' as const,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title="Generate nodes from SQL query"
          >
            {t('menu.sqlGenerator')}
          </button>

          {(showOnlyRelated || selectedGroupIds.size > 0) && (
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
        
        {/* Group Manager Panel */}
        {showGroupManager && (
          <GroupManagerPanel
            selectedGroupIds={selectedGroupIds}
            onGroupSelectionChange={setSelectedGroupIds}
            onClose={() => setShowGroupManager(false)}
          />
        )}
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