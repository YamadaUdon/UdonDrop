import { Node, Edge, ReactFlowInstance } from 'reactflow';

export const exportToPNG = async (
  nodes: Node[], 
  edges: Edge[],
  reactFlowInstance?: ReactFlowInstance
): Promise<void> => {
  if (!reactFlowInstance) {
    throw new Error('React Flow instance is required');
  }

  // Get the React Flow wrapper element
  const reactFlowWrapper = document.querySelector('.react-flow') as HTMLElement;
  if (!reactFlowWrapper) {
    throw new Error('React Flow wrapper not found');
  }

  try {
    // Hide UI elements temporarily
    const controlsElement = reactFlowWrapper.querySelector('.react-flow__controls') as HTMLElement;
    const minimapElement = reactFlowWrapper.querySelector('.react-flow__minimap') as HTMLElement;
    const attributionElement = reactFlowWrapper.querySelector('.react-flow__attribution') as HTMLElement;
    
    const originalStyles: { element: HTMLElement; display: string }[] = [];
    
    if (controlsElement) {
      originalStyles.push({ element: controlsElement, display: controlsElement.style.display });
      controlsElement.style.display = 'none';
    }
    if (minimapElement) {
      originalStyles.push({ element: minimapElement, display: minimapElement.style.display });
      minimapElement.style.display = 'none';
    }
    if (attributionElement) {
      originalStyles.push({ element: attributionElement, display: attributionElement.style.display });
      attributionElement.style.display = 'none';
    }

    // Import html2canvas dynamically
    const html2canvas = (await import('html2canvas')).default;
    
    // Take screenshot
    const canvas = await html2canvas(reactFlowWrapper, {
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
      scale: 2, // Higher quality
    } as any);

    // Restore original styles
    originalStyles.forEach(({ element, display }) => {
      element.style.display = display;
    });

    // Convert to blob and download
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
    throw new Error('Failed to export PNG');
  }
};

export const exportToSVG = async (
  nodes: Node[], 
  edges: Edge[],
  reactFlowInstance?: ReactFlowInstance  
): Promise<void> => {
  if (!nodes.length) {
    throw new Error('No nodes to export');
  }

  // Calculate bounds
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  nodes.forEach(node => {
    const nodeWidth = node.width || 180;
    const nodeHeight = node.height || 60;
    
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + nodeWidth);
    maxY = Math.max(maxY, node.position.y + nodeHeight);
  });

  const padding = 50;
  const svgWidth = maxX - minX + padding * 2;
  const svgHeight = maxY - minY + padding * 2;

  // Create SVG content
  let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="#718096"/>
    </marker>
    <filter id="dropshadow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
      <feOffset dx="0" dy="1" result="offsetblur"/>
      <feComponentTransfer>
        <feFuncA type="linear" slope="0.1"/>
      </feComponentTransfer>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect width="100%" height="100%" fill="white"/>
  <g transform="translate(${padding - minX}, ${padding - minY})">`;

  // Add edges
  edges.forEach(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    if (sourceNode && targetNode) {
      const sourceWidth = sourceNode.width || 180;
      const sourceHeight = sourceNode.height || 60;
      const targetWidth = targetNode.width || 180;
      const targetHeight = targetNode.height || 60;
      
      const x1 = sourceNode.position.x + sourceWidth / 2;
      const y1 = sourceNode.position.y + sourceHeight / 2;
      const x2 = targetNode.position.x + targetWidth / 2;
      const y2 = targetNode.position.y + targetHeight / 2;
      
      svgContent += `
    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" 
          stroke="#718096" stroke-width="2" marker-end="url(#arrowhead)"/>`;
    }
  });

  // Add nodes
  nodes.forEach(node => {
    const x = node.position.x;
    const y = node.position.y;
    const width = node.width || 180;
    const height = node.height || 60;
    const label = node.data?.label || node.id;
    const type = node.type || 'default';
    
    // Node background color based on type
    let fillColor = '#ffffff';
    if (type.includes('input')) fillColor = '#e6f3ff';
    else if (type.includes('output')) fillColor = '#ffe6e6';
    else if (type.includes('process')) fillColor = '#f0f0f0';
    
    svgContent += `
    <g filter="url(#dropshadow)">
      <rect x="${x}" y="${y}" width="${width}" height="${height}" 
            rx="8" fill="${fillColor}" stroke="#cbd5e0" stroke-width="1"/>
      <text x="${x + width/2}" y="${y + height/2 - 5}" 
            text-anchor="middle" font-family="Arial, sans-serif" 
            font-size="14" fill="#2d3748">${escapeXml(label)}</text>
      <text x="${x + width/2}" y="${y + height/2 + 15}" 
            text-anchor="middle" font-family="Arial, sans-serif" 
            font-size="12" fill="#718096">${escapeXml(type)}</text>
    </g>`;
  });

  svgContent += `
  </g>
</svg>`;

  // Download SVG
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `dataflow-diagram-${new Date().toISOString().split('T')[0]}.svg`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
};

// Helper function to escape XML special characters
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}