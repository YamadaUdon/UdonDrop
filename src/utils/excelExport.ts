import { Node, Edge } from 'reactflow';

interface ExcelExportData {
  nodes: Node[];
  edges: Edge[];
  groups?: Map<string, { name: string; color: string; nodes: Set<string> }>;
}

export const exportToExcel = async (data: ExcelExportData) => {
  // 動的にXLSXをインポート（必要な時だけロード）
  const XLSX = await import('xlsx');
  const workbook = XLSX.utils.book_new();
  
  // Note: Debug logs are removed in production build
  
  // Create a map of node IDs to row numbers for hyperlinks
  const nodeRowMap = new Map<string, number>();
  data.nodes.forEach((node, index) => {
    nodeRowMap.set(node.id, index + 2); // +2 because Excel rows are 1-indexed and we have a header row
  });
  
  // Sheet 1: All Nodes Overview with connection summary and links to detail sheets
  const allNodesData = data.nodes.map((node, rowIndex) => {
    const incomingEdges = data.edges.filter(e => e.target === node.id);
    const outgoingEdges = data.edges.filter(e => e.source === node.id);
    
    // Create summary text with first connection highlighted
    const fromSummary = incomingEdges.length > 0
      ? incomingEdges.length === 1 
        ? `🔗${getNodeLabel(incomingEdges[0].source, data.nodes)}`
        : `🔗${getNodeLabel(incomingEdges[0].source, data.nodes)} (+${incomingEdges.length - 1} more)`
      : '-';
    
    const toSummary = outgoingEdges.length > 0
      ? outgoingEdges.length === 1
        ? `🔗${getNodeLabel(outgoingEdges[0].target, data.nodes)}`
        : `🔗${getNodeLabel(outgoingEdges[0].target, data.nodes)} (+${outgoingEdges.length - 1} more)`
      : '-';
    
    return {
      'Node ID': node.id,
      'Label': node.data?.label || '',
      'Type': node.type || 'default',
      'Position X': Math.round(node.position.x),
      'Position Y': Math.round(node.position.y),
      'Group': getNodeGroup(node.id, data.groups, data.nodes),
      'View Group': getNodeGroup(node.id, data.groups, data.nodes) !== 'None' ? '🔗 View Groups' : '-',
      'From (Sources)': fromSummary,
      'To (Targets)': toSummary,
      'Connections Detail': incomingEdges.length + outgoingEdges.length > 0 ? '📋 View Details' : '-',
      'Total Connections': incomingEdges.length + outgoingEdges.length,
      'Configuration': formatNodeConfiguration(node),
    };
  });
  
  const allNodesSheet = XLSX.utils.json_to_sheet(allNodesData);
  
  // Add hyperlinks to summary cells and detail links
  data.nodes.forEach((node, rowIndex) => {
    const excelRow = rowIndex + 2;
    const incomingEdges = data.edges.filter(e => e.target === node.id);
    const outgoingEdges = data.edges.filter(e => e.source === node.id);
    
    // Add hyperlink to first source in "From (Sources)" column (Column H - shifted by 1)
    if (incomingEdges.length > 0) {
      const cellAddress = `H${excelRow}`;
      const firstSourceRow = nodeRowMap.get(incomingEdges[0].source);
      if (firstSourceRow) {
        allNodesSheet[cellAddress] = {
          v: allNodesSheet[cellAddress]?.v || '',
          l: { 
            Target: `#'All Nodes'!A${firstSourceRow}`, 
            Tooltip: `🔍 Click to navigate to: ${getNodeLabel(incomingEdges[0].source, data.nodes)}${incomingEdges.length > 1 ? ` | ${incomingEdges.length} total sources` : ''}` 
          }
        };
      }
    }
    
    // Add hyperlink to first target in "To (Targets)" column (Column I - shifted by 1)
    if (outgoingEdges.length > 0) {
      const cellAddress = `I${excelRow}`;
      const firstTargetRow = nodeRowMap.get(outgoingEdges[0].target);
      if (firstTargetRow) {
        allNodesSheet[cellAddress] = {
          v: allNodesSheet[cellAddress]?.v || '',
          l: { 
            Target: `#'All Nodes'!A${firstTargetRow}`, 
            Tooltip: `🔍 Click to navigate to: ${getNodeLabel(outgoingEdges[0].target, data.nodes)}${outgoingEdges.length > 1 ? ` | ${outgoingEdges.length} total targets` : ''}` 
          }
        };
      }
    }
    
    // Add link to detailed connections sheet for nodes with multiple connections
    if (incomingEdges.length + outgoingEdges.length > 0) {
      const cellAddress = `J${excelRow}`; // Column J is "Connections Detail" (shifted by 1)
      allNodesSheet[cellAddress] = {
        v: '📋 View Details',
        l: { 
          Target: `#'Node Connections'!A${excelRow}`, 
          Tooltip: `🔍 Click to view all connections for ${node.data?.label || node.id} (${incomingEdges.length} sources, ${outgoingEdges.length} targets)` 
        }
      };
    }
    
    // Add link to Groups Overview sheet for nodes with groups
    const nodeGroups = getNodeGroup(node.id, data.groups, data.nodes);
    if (nodeGroups !== 'None') {
      const cellAddress = `G${excelRow}`; // Column G is "View Group"
      allNodesSheet[cellAddress] = {
        v: '🔗 View Groups',
        l: { 
          Target: `#'Groups Overview'!A1`, 
          Tooltip: `🔍 Click to view groups overview. This node belongs to: ${nodeGroups}` 
        }
      };
    }
  });
  
  // Set column widths for better readability
  allNodesSheet['!cols'] = [
    { wch: 20 }, // Node ID
    { wch: 25 }, // Label
    { wch: 15 }, // Type
    { wch: 10 }, // Position X
    { wch: 10 }, // Position Y
    { wch: 15 }, // Group
    { wch: 12 }, // View Group
    { wch: 25 }, // From (Sources)
    { wch: 25 }, // To (Targets)
    { wch: 15 }, // Connections Detail
    { wch: 12 }, // Total Connections
    { wch: 35 }, // Configuration
  ];
  
  XLSX.utils.book_append_sheet(workbook, allNodesSheet, 'All Nodes');
  
  // Sheet: Groups Overview
  if (data.groups && data.groups.size > 0) {
    const groupsOverviewData = Array.from(data.groups.entries()).map(([ groupId, group ]) => {
      const groupNodes = data.nodes.filter(node => group.nodes.has(node.id));
      const groupEdges = data.edges.filter(edge => 
        group.nodes.has(edge.source) || group.nodes.has(edge.target)
      );
      
      // Count internal and external connections
      let internalConnectionsCount = 0;
      let externalConnectionsCount = 0;
      
      groupEdges.forEach(edge => {
        if (group.nodes.has(edge.source) && group.nodes.has(edge.target)) {
          internalConnectionsCount++;
        } else {
          externalConnectionsCount++;
        }
      });
      
      return {
        'Group ID': groupId,
        'Group Name': group.name,
        'Color': group.color,
        'Total Nodes': groupNodes.length,
        'Internal Connections': internalConnectionsCount,
        'External Connections': externalConnectionsCount,
        'Total Connections': internalConnectionsCount + externalConnectionsCount,
        'View Details': groupNodes.length > 0 ? '📋 View Group' : '-',
      };
    });
    
    const groupsOverviewSheet = XLSX.utils.json_to_sheet(groupsOverviewData);
    
    // Add hyperlinks to group detail sheets
    Array.from(data.groups.entries()).forEach(([groupId, group], rowIndex) => {
      const excelRow = rowIndex + 2;
      const groupNodes = data.nodes.filter(node => group.nodes.has(node.id));
      
      if (groupNodes.length > 0) {
        // Add hyperlink to group detail sheet
        const cellAddress = `H${excelRow}`; // Column H is "View Details"
        const sheetName = sanitizeSheetName(`Group - ${group.name}`);
        groupsOverviewSheet[cellAddress] = {
          v: '📋 View Group',
          l: { 
            Target: `#'${sheetName}'!A1`, 
            Tooltip: `🔍 Click to view details for ${group.name} group (${groupNodes.length} nodes)` 
          }
        };
        
        // Add color cell styling hint
        const colorCellAddress = `C${excelRow}`; // Column C is "Color"
        if (groupsOverviewSheet[colorCellAddress]) {
          groupsOverviewSheet[colorCellAddress] = {
            v: group.color,
            s: {
              fill: { fgColor: { rgb: group.color.substring(1) } }, // Remove # from hex color
              font: { color: { rgb: "FFFFFF" } }
            }
          };
        }
      }
    });
    
    // Set column widths for groups overview sheet
    groupsOverviewSheet['!cols'] = [
      { wch: 20 }, // Group ID
      { wch: 25 }, // Group Name
      { wch: 15 }, // Color
      { wch: 12 }, // Total Nodes
      { wch: 20 }, // Internal Connections
      { wch: 20 }, // External Connections
      { wch: 18 }, // Total Connections
      { wch: 15 }, // View Details
    ];
    
    XLSX.utils.book_append_sheet(workbook, groupsOverviewSheet, 'Groups Overview');
  }
  
  // Sheet 2: Node Connections Detail - Individual connections for each node
  const nodeConnectionsData: any[] = [];
  
  data.nodes.forEach((node) => {
    const incomingEdges = data.edges.filter(e => e.target === node.id);
    const outgoingEdges = data.edges.filter(e => e.source === node.id);
    
    if (incomingEdges.length + outgoingEdges.length > 0) {
      // Add incoming connections
      incomingEdges.forEach((edge, index) => {
        nodeConnectionsData.push({
          'Node': node.data?.label || node.id,
          'Node ID': node.id,
          'Connection Type': '📥 Incoming',
          'Connected Node': getNodeLabel(edge.source, data.nodes),
          'Connected Node ID': edge.source,
          'Edge ID': edge.id,
          'Edge Label': edge.label || '-',
          'Order': index + 1,
        });
      });
      
      // Add outgoing connections
      outgoingEdges.forEach((edge, index) => {
        nodeConnectionsData.push({
          'Node': node.data?.label || node.id,
          'Node ID': node.id,
          'Connection Type': '📤 Outgoing',
          'Connected Node': getNodeLabel(edge.target, data.nodes),
          'Connected Node ID': edge.target,
          'Edge ID': edge.id,
          'Edge Label': edge.label || '-',
          'Order': index + 1,
        });
      });
    }
  });
  
  const nodeConnectionsSheet = XLSX.utils.json_to_sheet(nodeConnectionsData);
  
  // Add hyperlinks in Node Connections sheet
  nodeConnectionsData.forEach((row, rowIndex) => {
    const excelRow = rowIndex + 2;
    
    // Link to main node
    const nodeRow = nodeRowMap.get(row['Node ID']);
    if (nodeRow) {
      const nodeCellAddress = `B${excelRow}`; // Column B is "Node ID"
      nodeConnectionsSheet[nodeCellAddress] = {
        v: row['Node ID'],
        l: { 
          Target: `#'All Nodes'!A${nodeRow}`, 
          Tooltip: `🔍 Click to go back to ${row['Node']} in All Nodes sheet` 
        }
      };
    }
    
    // Link to connected node
    const connectedNodeRow = nodeRowMap.get(row['Connected Node ID']);
    if (connectedNodeRow) {
      const connectedCellAddress = `E${excelRow}`; // Column E is "Connected Node ID"
      nodeConnectionsSheet[connectedCellAddress] = {
        v: row['Connected Node ID'],
        l: { 
          Target: `#'All Nodes'!A${connectedNodeRow}`, 
          Tooltip: `🔍 Click to navigate to ${row['Connected Node']}` 
        }
      };
    }
  });
  
  // Set column widths for Node Connections sheet
  nodeConnectionsSheet['!cols'] = [
    { wch: 25 }, // Node
    { wch: 20 }, // Node ID
    { wch: 15 }, // Connection Type
    { wch: 25 }, // Connected Node
    { wch: 20 }, // Connected Node ID
    { wch: 20 }, // Edge ID
    { wch: 20 }, // Edge Label
    { wch: 8 },  // Order
  ];
  
  XLSX.utils.book_append_sheet(workbook, nodeConnectionsSheet, 'Node Connections');
  
  // Sheet 3: Edges/Relationships with clickable links
  const edgesData = data.edges.map((edge, index) => ({
    'Edge ID': edge.id,
    'Source Node': edge.source,
    'Source Label': getNodeLabel(edge.source, data.nodes),
    'Target Node': edge.target,
    'Target Label': getNodeLabel(edge.target, data.nodes),
    'Type': edge.type || 'default',
    'Label': edge.label || '',
    'Relationship': `${getNodeLabel(edge.source, data.nodes)} → ${getNodeLabel(edge.target, data.nodes)}`,
  }));
  
  const edgesSheet = XLSX.utils.json_to_sheet(edgesData);
  
  // Add hyperlinks to source and target nodes in Relationships sheet
  data.edges.forEach((edge, rowIndex) => {
    const excelRow = rowIndex + 2;
    const sourceRow = nodeRowMap.get(edge.source);
    const targetRow = nodeRowMap.get(edge.target);
    
    // Add hyperlink to source node
    if (sourceRow) {
      const sourceCellAddress = `B${excelRow}`; // Column B is "Source Node"
      edgesSheet[sourceCellAddress] = {
        v: `📤 ${edge.source}`,
        l: { 
          Target: `#'All Nodes'!A${sourceRow}`, 
          Tooltip: `🔍 Click to navigate to source node: ${getNodeLabel(edge.source, data.nodes)} (${edge.source})` 
        }
      };
    }
    
    // Add hyperlink to target node
    if (targetRow) {
      const targetCellAddress = `D${excelRow}`; // Column D is "Target Node"
      edgesSheet[targetCellAddress] = {
        v: `📥 ${edge.target}`,
        l: { 
          Target: `#'All Nodes'!A${targetRow}`, 
          Tooltip: `🔍 Click to navigate to target node: ${getNodeLabel(edge.target, data.nodes)} (${edge.target})` 
        }
      };
    }
  });
  
  XLSX.utils.book_append_sheet(workbook, edgesSheet, 'Relationships');
  
  // Sheet 3: Connection Matrix with hyperlinks
  const connectionMatrix = createConnectionMatrixWithLinks(data.nodes, data.edges, nodeRowMap);
  const matrixSheet = XLSX.utils.aoa_to_sheet(connectionMatrix);
  
  // Add hyperlinks to matrix cells for navigation between connected nodes
  data.nodes.forEach((sourceNode, sourceIndex) => {
    const sourceRow = sourceIndex + 1; // +1 for header row
    const sourceNodeRow = nodeRowMap.get(sourceNode.id);
    
    // Add hyperlink to row label
    const rowLabelCell = XLSX.utils.encode_cell({ r: sourceRow, c: 0 });
    if (sourceNodeRow && matrixSheet[rowLabelCell]) {
      matrixSheet[rowLabelCell] = {
        v: matrixSheet[rowLabelCell].v,
        l: { 
          Target: `#'All Nodes'!A${sourceNodeRow}`, 
          Tooltip: `Go to ${sourceNode.id}` 
        }
      };
    }
    
    // Add hyperlinks to column headers (only once)
    if (sourceIndex === 0) {
      data.nodes.forEach((targetNode, targetIndex) => {
        const headerCell = XLSX.utils.encode_cell({ r: 0, c: targetIndex + 1 });
        const targetNodeRow = nodeRowMap.get(targetNode.id);
        if (targetNodeRow && matrixSheet[headerCell]) {
          matrixSheet[headerCell] = {
            v: matrixSheet[headerCell].v,
            l: { 
              Target: `#'All Nodes'!A${targetNodeRow}`, 
              Tooltip: `Go to ${targetNode.id}` 
            }
          };
        }
      });
    }
    
    // Add hyperlinks to connection cells (→ symbols that link to target nodes)
    data.nodes.forEach((targetNode, targetIndex) => {
      const connection = data.edges.find(e => 
        e.source === sourceNode.id && e.target === targetNode.id
      );
      
      if (connection) {
        const cellAddress = XLSX.utils.encode_cell({ 
          r: sourceRow, 
          c: targetIndex + 1 
        });
        const targetNodeRow = nodeRowMap.get(targetNode.id);
        if (targetNodeRow) {
          matrixSheet[cellAddress] = {
            v: '🔗→',
            l: { 
              Target: `#'All Nodes'!A${targetNodeRow}`, 
              Tooltip: `🔍 Click to navigate: ${sourceNode.data?.label || sourceNode.id} → ${targetNode.data?.label || targetNode.id}` 
            }
          };
        }
      }
    });
  });
  
  XLSX.utils.book_append_sheet(workbook, matrixSheet, 'Connection Matrix');
  
  // Group-specific sheets with hyperlinks
  if (data.groups && data.groups.size > 0) {
    data.groups.forEach((group, groupId) => {
      const groupNodes = data.nodes.filter(node => group.nodes.has(node.id));
      const groupEdges = data.edges.filter(edge => 
        group.nodes.has(edge.source) || group.nodes.has(edge.target)
      );
      
      // Create row map for group nodes
      const groupNodeRowMap = new Map<string, number>();
      groupNodes.forEach((node, index) => {
        groupNodeRowMap.set(node.id, index + 2);
      });
      
      const groupData = groupNodes.map(node => {
        const internalEdges = groupEdges.filter(e => 
          (e.source === node.id && group.nodes.has(e.target)) ||
          (e.target === node.id && group.nodes.has(e.source))
        );
        const externalEdges = groupEdges.filter(e => 
          (e.source === node.id && !group.nodes.has(e.target)) ||
          (e.target === node.id && !group.nodes.has(e.source))
        );
        
        // Create summary for internal connections
        const internalSummary = internalEdges.length > 0
          ? internalEdges.length === 1
            ? `🔗${getNodeLabel(internalEdges[0].source === node.id ? internalEdges[0].target : internalEdges[0].source, data.nodes)}`
            : `🔗${getNodeLabel(internalEdges[0].source === node.id ? internalEdges[0].target : internalEdges[0].source, data.nodes)} (+${internalEdges.length - 1} more)`
          : '-';
        
        // Create summary for external connections
        const externalSummary = externalEdges.length > 0
          ? externalEdges.length === 1
            ? `🔗${getNodeLabel(externalEdges[0].source === node.id ? externalEdges[0].target : externalEdges[0].source, data.nodes)}`
            : `🔗${getNodeLabel(externalEdges[0].source === node.id ? externalEdges[0].target : externalEdges[0].source, data.nodes)} (+${externalEdges.length - 1} more)`
          : '-';
        
        return {
          'Node ID': node.id,
          'Label': node.data?.label || '',
          'Type': node.type || 'default',
          'Internal Links': internalSummary,
          'External Links': externalSummary,
          'Connections Detail': internalEdges.length + externalEdges.length > 0 ? '📋 View Details' : '-',
          'Configuration': formatNodeConfiguration(node),
        };
      });
      
      const groupSheet = XLSX.utils.json_to_sheet(groupData);
      
      // Add hyperlinks to node IDs and connection cells in group sheet
      groupNodes.forEach((node, rowIndex) => {
        const excelRow = rowIndex + 2;
        const mainSheetRow = nodeRowMap.get(node.id);
        
        // Link Node ID to main sheet
        if (mainSheetRow) {
          const cellAddress = `A${excelRow}`;
          groupSheet[cellAddress] = {
            v: `🔗 ${node.id}`,
            l: { 
              Target: `#'All Nodes'!A${mainSheetRow}`, 
              Tooltip: `🔍 Click to navigate to node details: ${getNodeLabel(node.id, data.nodes)} in All Nodes sheet` 
            }
          };
        }
        
        const internalEdges = groupEdges.filter(e => 
          (e.source === node.id && group.nodes.has(e.target)) ||
          (e.target === node.id && group.nodes.has(e.source))
        );
        const externalEdges = groupEdges.filter(e => 
          (e.source === node.id && !group.nodes.has(e.target)) ||
          (e.target === node.id && !group.nodes.has(e.source))
        );
        
        // Add hyperlink to first internal connection in "Internal Links" column (Column D)
        if (internalEdges.length > 0) {
          const cellAddress = `D${excelRow}`;
          const firstInternalNode = internalEdges[0].source === node.id ? internalEdges[0].target : internalEdges[0].source;
          const firstInternalRow = nodeRowMap.get(firstInternalNode);
          if (firstInternalRow) {
            groupSheet[cellAddress] = {
              v: groupSheet[cellAddress]?.v || '',
              l: { 
                Target: `#'All Nodes'!A${firstInternalRow}`, 
                Tooltip: `🔍 Click to navigate to: ${getNodeLabel(firstInternalNode, data.nodes)}${internalEdges.length > 1 ? ` | ${internalEdges.length} total internal connections` : ''}` 
              }
            };
          }
        }
        
        // Add hyperlink to first external connection in "External Links" column (Column E)
        if (externalEdges.length > 0) {
          const cellAddress = `E${excelRow}`;
          const firstExternalNode = externalEdges[0].source === node.id ? externalEdges[0].target : externalEdges[0].source;
          const firstExternalRow = nodeRowMap.get(firstExternalNode);
          if (firstExternalRow) {
            groupSheet[cellAddress] = {
              v: groupSheet[cellAddress]?.v || '',
              l: { 
                Target: `#'All Nodes'!A${firstExternalRow}`, 
                Tooltip: `🔍 Click to navigate to: ${getNodeLabel(firstExternalNode, data.nodes)}${externalEdges.length > 1 ? ` | ${externalEdges.length} total external connections` : ''}` 
              }
            };
          }
        }
        
        // Add link to detailed connections for this group node
        if (internalEdges.length + externalEdges.length > 0) {
          const cellAddress = `F${excelRow}`; // Column F is "Connections Detail"
          const groupDetailSheetName = sanitizeSheetName(`${group.name} Connections`);
          groupSheet[cellAddress] = {
            v: '📋 View Details',
            l: { 
              Target: `#'${groupDetailSheetName}'!A${excelRow}`, 
              Tooltip: `🔍 Click to view all connections for ${node.data?.label || node.id} in ${group.name} group (${internalEdges.length} internal, ${externalEdges.length} external)` 
            }
          };
        }
      });
      
      // Set column widths for group sheets
      groupSheet['!cols'] = [
        { wch: 20 }, // Node ID
        { wch: 25 }, // Label
        { wch: 15 }, // Type
        { wch: 25 }, // Internal Links
        { wch: 25 }, // External Links
        { wch: 15 }, // Connections Detail
        { wch: 35 }, // Configuration
      ];
      
      const sheetName = sanitizeSheetName(`Group - ${group.name}`);
      XLSX.utils.book_append_sheet(workbook, groupSheet, sheetName);
      
      // Create group connection detail sheet
      const groupConnectionsData: any[] = [];
      
      groupNodes.forEach((node) => {
        const nodeInternalEdges = groupEdges.filter(e => 
          (e.source === node.id && group.nodes.has(e.target)) ||
          (e.target === node.id && group.nodes.has(e.source))
        );
        const nodeExternalEdges = groupEdges.filter(e => 
          (e.source === node.id && !group.nodes.has(e.target)) ||
          (e.target === node.id && !group.nodes.has(e.source))
        );
        
        if (nodeInternalEdges.length + nodeExternalEdges.length > 0) {
          // Add internal connections
          nodeInternalEdges.forEach((edge, index) => {
            const connectedNodeId = edge.source === node.id ? edge.target : edge.source;
            groupConnectionsData.push({
              'Node': node.data?.label || node.id,
              'Node ID': node.id,
              'Connection Type': '🔗 Internal',
              'Connected Node': getNodeLabel(connectedNodeId, data.nodes),
              'Connected Node ID': connectedNodeId,
              'Edge ID': edge.id,
              'Edge Label': edge.label || '-',
              'Order': index + 1,
            });
          });
          
          // Add external connections
          nodeExternalEdges.forEach((edge, index) => {
            const connectedNodeId = edge.source === node.id ? edge.target : edge.source;
            groupConnectionsData.push({
              'Node': node.data?.label || node.id,
              'Node ID': node.id,
              'Connection Type': '🌐 External',
              'Connected Node': getNodeLabel(connectedNodeId, data.nodes),
              'Connected Node ID': connectedNodeId,
              'Edge ID': edge.id,
              'Edge Label': edge.label || '-',
              'Order': index + 1,
            });
          });
        }
      });
      
      if (groupConnectionsData.length > 0) {
        const groupConnectionsSheet = XLSX.utils.json_to_sheet(groupConnectionsData);
        
        // Add hyperlinks in group connections sheet
        groupConnectionsData.forEach((row, rowIndex) => {
          const excelRow = rowIndex + 2;
          
          // Link to main node in group sheet
          const groupNodeRow = groupNodeRowMap.get(row['Node ID']);
          if (groupNodeRow) {
            const nodeCellAddress = `B${excelRow}`; // Column B is "Node ID"
            groupConnectionsSheet[nodeCellAddress] = {
              v: row['Node ID'],
              l: { 
                Target: `#'${sheetName}'!A${groupNodeRow}`, 
                Tooltip: `🔍 Click to go back to ${row['Node']} in ${group.name} group sheet` 
              }
            };
          }
          
          // Link to connected node in All Nodes sheet
          const connectedNodeRow = nodeRowMap.get(row['Connected Node ID']);
          if (connectedNodeRow) {
            const connectedCellAddress = `E${excelRow}`; // Column E is "Connected Node ID"
            groupConnectionsSheet[connectedCellAddress] = {
              v: row['Connected Node ID'],
              l: { 
                Target: `#'All Nodes'!A${connectedNodeRow}`, 
                Tooltip: `🔍 Click to navigate to ${row['Connected Node']} in All Nodes sheet` 
              }
            };
          }
        });
        
        // Set column widths for group connections sheet
        groupConnectionsSheet['!cols'] = [
          { wch: 25 }, // Node
          { wch: 20 }, // Node ID
          { wch: 15 }, // Connection Type
          { wch: 25 }, // Connected Node
          { wch: 20 }, // Connected Node ID
          { wch: 20 }, // Edge ID
          { wch: 20 }, // Edge Label
          { wch: 8 },  // Order
        ];
        
        const groupDetailSheetName = sanitizeSheetName(`${group.name} Connections`);
        XLSX.utils.book_append_sheet(workbook, groupConnectionsSheet, groupDetailSheetName);
      }
      
      // Add group relationships with hyperlinks
      const groupRelationships = groupEdges.map((edge, index) => ({
        'Source': edge.source,
        'Source Label': getNodeLabel(edge.source, data.nodes),
        'Target': edge.target,
        'Target Label': getNodeLabel(edge.target, data.nodes),
        'Type': group.nodes.has(edge.source) && group.nodes.has(edge.target) ? 'Internal' : 'External',
        'Edge Label': edge.label || '',
      }));
      
      const groupRelSheet = XLSX.utils.json_to_sheet(groupRelationships);
      
      // Add hyperlinks in group relationships sheet
      groupEdges.forEach((edge, rowIndex) => {
        const excelRow = rowIndex + 2;
        const sourceMainRow = nodeRowMap.get(edge.source);
        const targetMainRow = nodeRowMap.get(edge.target);
        
        if (sourceMainRow) {
          const sourceCellAddress = `A${excelRow}`;
          groupRelSheet[sourceCellAddress] = {
            v: `📤 ${edge.source}`,
            l: { 
              Target: `#'All Nodes'!A${sourceMainRow}`, 
              Tooltip: `🔍 Click to navigate to source: ${getNodeLabel(edge.source, data.nodes)} (${edge.source})` 
            }
          };
        }
        
        if (targetMainRow) {
          const targetCellAddress = `C${excelRow}`;
          groupRelSheet[targetCellAddress] = {
            v: `📥 ${edge.target}`,
            l: { 
              Target: `#'All Nodes'!A${targetMainRow}`, 
              Tooltip: `🔍 Click to navigate to target: ${getNodeLabel(edge.target, data.nodes)} (${edge.target})` 
            }
          };
        }
      });
      
      // Set column widths for group relationships sheet
      groupRelSheet['!cols'] = [
        { wch: 20 }, // Source
        { wch: 25 }, // Source Label
        { wch: 20 }, // Target
        { wch: 25 }, // Target Label
        { wch: 10 }, // Type
        { wch: 20 }, // Edge Label
      ];
      
      const relSheetName = sanitizeSheetName(`${group.name} Links`);
      XLSX.utils.book_append_sheet(workbook, groupRelSheet, relSheetName);
    });
  }
  
  // Sheet: Statistics
  const stats = calculateStatistics(data.nodes, data.edges, data.groups);
  const statsSheet = XLSX.utils.json_to_sheet([stats]);
  XLSX.utils.book_append_sheet(workbook, statsSheet, 'Statistics');
  
  // Generate filename with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `dataflow_export_${timestamp}.xlsx`;
  
  // Write and download the file
  XLSX.writeFile(workbook, filename);
};

// Helper functions
const getNodeLabel = (nodeId: string, nodes: Node[]): string => {
  const node = nodes.find(n => n.id === nodeId);
  return node?.data?.label || nodeId;
};

const getNodeGroup = (nodeId: string, groups?: Map<string, any>, nodes?: Node[]): string => {
  if (!groups || !nodes) return 'None';
  
  const node = nodes.find(n => n.id === nodeId);
  if (!node) return 'None';
  
  // Support multiple groups - collect all group names
  const nodeGroupNames: string[] = [];
  
  // First try to find the group from the groups map
  for (const [groupId, group] of groups.entries()) {
    if (group.nodes.has(nodeId)) {
      nodeGroupNames.push(group.name);
    }
  }
  
  // Fallback: check the node's group properties (both old and new)
  if (nodeGroupNames.length === 0) {
    const groupIds = getNodeGroupIds(node.data);
    for (const groupId of groupIds) {
      for (const [mapGroupId, group] of groups.entries()) {
        if (mapGroupId === groupId && !nodeGroupNames.includes(group.name)) {
          nodeGroupNames.push(group.name);
        }
      }
    }
  }
  
  return nodeGroupNames.length > 0 ? nodeGroupNames.join(', ') : 'None';
};

// Helper function to get node group IDs (support both old and new format)
const getNodeGroupIds = (nodeData: any): string[] => {
  if (nodeData?.groupIds && Array.isArray(nodeData.groupIds)) {
    return nodeData.groupIds;
  }
  if (nodeData?.groupId) {
    return [nodeData.groupId];
  }
  return [];
};

const getIncomingConnections = (nodeId: string, edges: Edge[]): number => {
  return edges.filter(edge => edge.target === nodeId).length;
};

const getOutgoingConnections = (nodeId: string, edges: Edge[]): number => {
  return edges.filter(edge => edge.source === nodeId).length;
};

const getTotalConnections = (nodeId: string, edges: Edge[]): number => {
  return getIncomingConnections(nodeId, edges) + getOutgoingConnections(nodeId, edges);
};

const getInternalConnections = (nodeId: string, edges: Edge[], groupNodes: Set<string>): number => {
  return edges.filter(edge => 
    (edge.source === nodeId && groupNodes.has(edge.target)) ||
    (edge.target === nodeId && groupNodes.has(edge.source))
  ).length;
};

const getExternalConnections = (nodeId: string, edges: Edge[], groupNodes: Set<string>): number => {
  return edges.filter(edge => 
    (edge.source === nodeId && !groupNodes.has(edge.target)) ||
    (edge.target === nodeId && !groupNodes.has(edge.source))
  ).length;
};

const createConnectionMatrixWithLinks = (nodes: Node[], edges: Edge[], nodeRowMap: Map<string, number>): any[][] => {
  const nodeIds = nodes.map(n => n.id);
  const nodeLabels = nodes.map(n => n.data?.label || n.id);
  
  // Create header row
  const matrix: any[][] = [['From \\ To', ...nodeLabels]];
  
  // Create matrix rows
  nodeIds.forEach((sourceId, i) => {
    const row = [nodeLabels[i]];
    nodeIds.forEach(targetId => {
      const connection = edges.find(e => e.source === sourceId && e.target === targetId);
      if (connection) {
        // Use a special marker for connections that can be enhanced with styling
        row.push('→');
      } else {
        row.push('');
      }
    });
    matrix.push(row);
  });
  
  return matrix;
};

// Keep the old function for backward compatibility if needed
const createConnectionMatrix = (nodes: Node[], edges: Edge[]): any[][] => {
  const nodeIds = nodes.map(n => n.id);
  const nodeLabels = nodes.map(n => n.data?.label || n.id);
  
  // Create header row
  const matrix: any[][] = [['From \\ To', ...nodeLabels]];
  
  // Create matrix rows
  nodeIds.forEach((sourceId, i) => {
    const row = [nodeLabels[i]];
    nodeIds.forEach(targetId => {
      const connection = edges.find(e => e.source === sourceId && e.target === targetId);
      row.push(connection ? 1 : 0);
    });
    matrix.push(row);
  });
  
  return matrix;
};

const calculateStatistics = (nodes: Node[], edges: Edge[], groups?: Map<string, any>) => {
  const nodeTypes = new Map<string, number>();
  nodes.forEach(node => {
    const type = node.type || 'default';
    nodeTypes.set(type, (nodeTypes.get(type) || 0) + 1);
  });
  
  const isolatedNodes = nodes.filter(node => 
    !edges.some(edge => edge.source === node.id || edge.target === node.id)
  );
  
  const hubNodes = nodes.filter(node => 
    getTotalConnections(node.id, edges) > 5
  );
  
  return {
    'Total Nodes': nodes.length,
    'Total Edges': edges.length,
    'Total Groups': groups?.size || 0,
    'Isolated Nodes': isolatedNodes.length,
    'Hub Nodes (>5 connections)': hubNodes.length,
    'Average Connections per Node': edges.length > 0 ? (edges.length * 2 / nodes.length).toFixed(2) : 0,
    'Node Types': Array.from(nodeTypes.entries()).map(([type, count]) => `${type}: ${count}`).join(', '),
  };
};

const formatNodeConfiguration = (node: Node): string => {
  const config: string[] = [];
  
  if (node.data?.description) {
    config.push(`Description: ${node.data.description}`);
  }
  
  if (node.data?.parameters && Object.keys(node.data.parameters).length > 0) {
    config.push(`Parameters: ${JSON.stringify(node.data.parameters)}`);
  }
  
  if (node.data?.dataset) {
    config.push(`Dataset: ${node.data.dataset}`);
  }
  
  if (node.data?.function) {
    config.push(`Function: ${node.data.function}`);
  }
  
  if (node.data?.tags && node.data.tags.length > 0) {
    config.push(`Tags: [${node.data.tags.join(', ')}]`);
  }
  
  if (node.data?.updateFrequency) {
    config.push(`Update Freq: ${node.data.updateFrequency}`);
  }
  
  if (node.data?.dataVolume) {
    config.push(`Data Volume: ${node.data.dataVolume}`);
  }
  
  if (node.data?.owner) {
    config.push(`Owner: ${node.data.owner}`);
  }
  
  if (node.data?.department) {
    config.push(`Department: ${node.data.department}`);
  }
  
  if (node.data?.lastUpdated) {
    const date = node.data.lastUpdated instanceof Date 
      ? node.data.lastUpdated.toISOString().split('T')[0]
      : node.data.lastUpdated;
    config.push(`Last Updated: ${date}`);
  }
  
  return config.length > 0 ? config.join(' | ') : 'No configuration';
};

const sanitizeSheetName = (name: string): string => {
  // Excel sheet names have restrictions
  let sanitized = name.substring(0, 31); // Max 31 characters
  sanitized = sanitized.replace(/[\\\/\*\?\[\]:]/g, '_'); // Remove invalid characters
  return sanitized;
};