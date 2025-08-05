import { Node, Edge } from 'reactflow';

export interface LayoutConfig {
  nodeWidth: number;
  nodeHeight: number;
  horizontalSpacing: number;
  verticalSpacing: number;
  padding: number;
}

export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  nodeWidth: 200,
  nodeHeight: 80,
  horizontalSpacing: 60,
  verticalSpacing: 120,
  padding: 50,
};

// Force-directed layout algorithm
export const forceDirectedLayout = (
  nodes: Node[],
  edges: Edge[],
  config: LayoutConfig = DEFAULT_LAYOUT_CONFIG,
  iterations: number = 100
): Node[] => {
  const { nodeWidth, nodeHeight, horizontalSpacing, verticalSpacing } = config;
  
  // Initialize positions if not set
  const workingNodes = nodes.map((node, index) => ({
    ...node,
    position: node.position || {
      x: Math.random() * 800 + 100,
      y: Math.random() * 600 + 100,
    },
    velocity: { x: 0, y: 0 },
  }));

  const k = Math.sqrt((800 * 600) / nodes.length); // Optimal distance
  const temperature = Math.sqrt(800 * 600) / 10;

  for (let iteration = 0; iteration < iterations; iteration++) {
    // Calculate repulsive forces between all nodes
    workingNodes.forEach((nodeA, i) => {
      nodeA.velocity = { x: 0, y: 0 };
      
      workingNodes.forEach((nodeB, j) => {
        if (i !== j) {
          const dx = nodeA.position.x - nodeB.position.x;
          const dy = nodeA.position.y - nodeB.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          
          // Repulsive force
          const force = (k * k) / distance;
          nodeA.velocity.x += (dx / distance) * force;
          nodeA.velocity.y += (dy / distance) * force;
        }
      });
    });

    // Calculate attractive forces for connected nodes
    edges.forEach(edge => {
      const sourceNode = workingNodes.find(n => n.id === edge.source);
      const targetNode = workingNodes.find(n => n.id === edge.target);
      
      if (sourceNode && targetNode) {
        const dx = targetNode.position.x - sourceNode.position.x;
        const dy = targetNode.position.y - sourceNode.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        
        // Attractive force
        const force = (distance * distance) / k;
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;
        
        sourceNode.velocity.x += fx;
        sourceNode.velocity.y += fy;
        targetNode.velocity.x -= fx;
        targetNode.velocity.y -= fy;
      }
    });

    // Apply velocities with cooling
    const coolingFactor = 1 - (iteration / iterations);
    workingNodes.forEach(node => {
      const velocity = Math.sqrt(node.velocity.x * node.velocity.x + node.velocity.y * node.velocity.y);
      if (velocity > 0) {
        const limitedVelocity = Math.min(velocity, temperature * coolingFactor);
        node.position.x += (node.velocity.x / velocity) * limitedVelocity;
        node.position.y += (node.velocity.y / velocity) * limitedVelocity;
      }
    });
  }

  return workingNodes.map(node => ({
    ...node,
    velocity: undefined,
  }));
};

// Hierarchical layout (improved version)
export const hierarchicalLayout = (
  nodes: Node[],
  edges: Edge[],
  config: LayoutConfig = DEFAULT_LAYOUT_CONFIG
): Node[] => {
  const { nodeWidth, nodeHeight, horizontalSpacing, verticalSpacing, padding } = config;

  // Node type priorities for better organization
  const nodeTypePriorities = {
    'data_lake': 1,
    'data_warehouse': 1,
    'csv_input': 2,
    'json_input': 2,
    'parquet_input': 2,
    'database_input': 2,
    'api_input': 2,
    'process': 5,
    'transform': 5,
    'filter': 5,
    'aggregate': 6,
    'join': 6,
    'split': 6,
    'model_train': 7,
    'model_predict': 8,
    'model_evaluate': 8,
    'data_mart': 9,
    'csv_output': 10,
    'json_output': 10,
    'parquet_output': 10,
    'database_output': 10,
    'api_output': 10,
    'bi_tool': 11,
  };

  // Calculate node depths using topological sort
  const calculateNodeDepths = () => {
    const depths = new Map<string, number>();
    const inDegree = new Map<string, number>();
    const adjList = new Map<string, string[]>();
    
    // Initialize
    nodes.forEach(node => {
      inDegree.set(node.id, 0);
      adjList.set(node.id, []);
      depths.set(node.id, 0);
    });
    
    // Build adjacency list and calculate in-degrees
    edges.forEach(edge => {
      adjList.get(edge.source)?.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    });
    
    // Topological sort with depth calculation
    const queue: string[] = [];
    nodes.forEach(node => {
      if (inDegree.get(node.id) === 0) {
        queue.push(node.id);
        depths.set(node.id, 0);
      }
    });
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentDepth = depths.get(current) || 0;
      
      adjList.get(current)?.forEach(neighbor => {
        const newInDegree = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newInDegree);
        
        // Update depth to be maximum of current paths
        const newDepth = Math.max(depths.get(neighbor) || 0, currentDepth + 1);
        depths.set(neighbor, newDepth);
        
        if (newInDegree === 0) {
          queue.push(neighbor);
        }
      });
    }
    
    return depths;
  };

  const nodeDepths = calculateNodeDepths();
  
  // Group nodes by depth (layer)
  const layers = new Map<number, Node[]>();
  nodes.forEach(node => {
    const depth = nodeDepths.get(node.id) || 0;
    if (!layers.has(depth)) {
      layers.set(depth, []);
    }
    layers.get(depth)!.push(node);
  });
  
  // Sort nodes within each layer
  layers.forEach((layerNodes) => {
    layerNodes.sort((a, b) => {
      // First by type priority
      const aPriority = nodeTypePriorities[a.type as keyof typeof nodeTypePriorities] || 5;
      const bPriority = nodeTypePriorities[b.type as keyof typeof nodeTypePriorities] || 5;
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // Then by number of connections
      const aConnections = edges.filter(e => e.source === a.id || e.target === a.id).length;
      const bConnections = edges.filter(e => e.source === b.id || e.target === b.id).length;
      return bConnections - aConnections;
    });
  });

  // Position nodes with improved spacing
  const maxLayerSize = Math.max(...Array.from(layers.values()).map(layer => layer.length));
  const canvasWidth = Math.max(1200, maxLayerSize * (nodeWidth + horizontalSpacing));
  
  return nodes.map(node => {
    const depth = nodeDepths.get(node.id) || 0;
    const layer = layers.get(depth) || [];
    const nodeIndex = layer.findIndex(n => n.id === node.id);
    const layerSize = layer.length;
    
    // Vertical position
    const y = padding + depth * (nodeHeight + verticalSpacing);
    
    // Horizontal position with centering
    const totalLayerWidth = (layerSize - 1) * horizontalSpacing + layerSize * nodeWidth;
    const startX = (canvasWidth - totalLayerWidth) / 2;
    const x = startX + nodeIndex * (nodeWidth + horizontalSpacing);
    
    return {
      ...node,
      position: { x: Math.max(padding, x), y },
    };
  });
};

// Circular layout
export const circularLayout = (
  nodes: Node[],
  edges: Edge[],
  config: LayoutConfig = DEFAULT_LAYOUT_CONFIG
): Node[] => {
  const { padding } = config;
  const centerX = 600;
  const centerY = 400;
  const radius = Math.min(centerX, centerY) - padding - 100;
  
  return nodes.map((node, index) => {
    const angle = (2 * Math.PI * index) / nodes.length;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    
    return {
      ...node,
      position: { x, y },
    };
  });
};

// Grid layout
export const gridLayout = (
  nodes: Node[],
  edges: Edge[],
  config: LayoutConfig = DEFAULT_LAYOUT_CONFIG
): Node[] => {
  const { nodeWidth, nodeHeight, horizontalSpacing, verticalSpacing, padding } = config;
  
  const cols = Math.ceil(Math.sqrt(nodes.length));
  
  return nodes.map((node, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    
    const x = padding + col * (nodeWidth + horizontalSpacing);
    const y = padding + row * (nodeHeight + verticalSpacing);
    
    return {
      ...node,
      position: { x, y },
    };
  });
};

// Enhanced auto layout with multiple algorithms
export const enhancedAutoLayout = (
  nodes: Node[],
  edges: Edge[],
  layoutType: 'hierarchical' | 'force' | 'circular' | 'grid' = 'hierarchical',
  config: LayoutConfig = DEFAULT_LAYOUT_CONFIG
): Node[] => {
  switch (layoutType) {
    case 'force':
      return forceDirectedLayout(nodes, edges, config);
    case 'circular':
      return circularLayout(nodes, edges, config);
    case 'grid':
      return gridLayout(nodes, edges, config);
    case 'hierarchical':
    default:
      return hierarchicalLayout(nodes, edges, config);
  }
};

// Animate layout changes
export const animateLayout = (
  currentNodes: Node[],
  targetNodes: Node[],
  setNodes: (nodes: Node[]) => void,
  duration: number = 500
) => {
  const startTime = Date.now();
  const initialPositions = currentNodes.map(node => ({ ...node.position }));
  
  const animate = () => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Easing function (ease-out cubic)
    const easeOut = 1 - Math.pow(1 - progress, 3);
    
    const animatedNodes = currentNodes.map((node, index) => {
      const target = targetNodes.find(n => n.id === node.id);
      const initial = initialPositions[index];
      
      if (!target) return node;
      
      return {
        ...node,
        position: {
          x: initial.x + (target.position.x - initial.x) * easeOut,
          y: initial.y + (target.position.y - initial.y) * easeOut,
        },
      };
    });
    
    setNodes(animatedNodes);
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  };
  
  requestAnimationFrame(animate);
};