import { Node, Edge } from 'reactflow';

interface ParsedTable {
  name: string;
  alias?: string;
  type: 'table' | 'cte' | 'subquery';
}

interface ParsedQuery {
  tables: ParsedTable[];
  dependencies: Array<{ from: string; to: string; type: 'select' | 'join' | 'union' }>;
  operations: Array<{ type: string; description: string }>;
}

export class SQLParser {
  // Simple SQL parsing - can be enhanced with proper SQL parsing library
  parseSQL(sql: string): ParsedQuery {
    const normalizedSQL = sql.toLowerCase().replace(/\s+/g, ' ').trim();
    
    const tables: ParsedTable[] = [];
    const dependencies: Array<{ from: string; to: string; type: 'select' | 'join' | 'union' }> = [];
    const operations: Array<{ type: string; description: string }> = [];

    // Extract tables from FROM clause
    this.extractFromTables(normalizedSQL, tables, dependencies);
    
    // Extract tables from JOIN clauses
    this.extractJoinTables(normalizedSQL, tables, dependencies);
    
    // Extract CTEs (Common Table Expressions)
    this.extractCTEs(normalizedSQL, tables, dependencies);
    
    // Extract operations
    this.extractOperations(normalizedSQL, operations);

    return { tables, dependencies, operations };
  }

  private extractFromTables(sql: string, tables: ParsedTable[], dependencies: Array<{ from: string; to: string; type: 'select' | 'join' | 'union' }>) {
    const fromMatches = sql.match(/from\s+([^where^group^order^having^limit^union^join^,\s]+)/gi);
    
    if (fromMatches) {
      fromMatches.forEach(fromClause => {
        const tableMatch = fromClause.replace(/from\s+/i, '').trim();
        const parts = tableMatch.split(/\s+as\s+|\s+/);
        
        if (parts.length >= 1) {
          const tableName = parts[0].replace(/["`]/g, '');
          const alias = parts.length > 1 ? parts[parts.length - 1] : undefined;
          
          if (!tables.find(t => t.name === tableName)) {
            tables.push({ name: tableName, alias, type: 'table' });
          }
        }
      });
    }
  }

  private extractJoinTables(sql: string, tables: ParsedTable[], dependencies: Array<{ from: string; to: string; type: 'select' | 'join' | 'union' }>) {
    const joinMatches = sql.match(/(inner|left|right|full|cross)?\s*join\s+([^on^where^group^order^having^limit^union^join]+)/gi);
    
    if (joinMatches) {
      joinMatches.forEach(joinClause => {
        const tableMatch = joinClause.replace(/(inner|left|right|full|cross)?\s*join\s+/i, '').trim();
        const parts = tableMatch.split(/\s+as\s+|\s+/);
        
        if (parts.length >= 1) {
          const tableName = parts[0].replace(/["`]/g, '');
          const alias = parts.length > 1 ? parts[parts.length - 1] : undefined;
          
          if (!tables.find(t => t.name === tableName)) {
            tables.push({ name: tableName, alias, type: 'table' });
          }
          
          // Add join dependency
          if (tables.length > 1) {
            dependencies.push({
              from: tables[0].name,
              to: tableName,
              type: 'join'
            });
          }
        }
      });
    }
  }

  private extractCTEs(sql: string, tables: ParsedTable[], dependencies: Array<{ from: string; to: string; type: 'select' | 'join' | 'union' }>) {
    const cteMatches = sql.match(/with\s+(\w+)\s+as\s*\([^)]+\)/gi);
    
    if (cteMatches) {
      cteMatches.forEach(cteClause => {
        const nameMatch = cteClause.match(/with\s+(\w+)\s+as/i);
        if (nameMatch) {
          const cteName = nameMatch[1];
          tables.push({ name: cteName, type: 'cte' });
        }
      });
    }
  }

  private extractOperations(sql: string, operations: Array<{ type: string; description: string }>) {
    if (sql.includes('select')) {
      operations.push({ type: 'select', description: 'Data Selection' });
    }
    if (sql.includes('join')) {
      operations.push({ type: 'join', description: 'Table Join' });
    }
    if (sql.includes('union')) {
      operations.push({ type: 'union', description: 'Union Operation' });
    }
    if (sql.includes('group by')) {
      operations.push({ type: 'aggregate', description: 'Data Aggregation' });
    }
    if (sql.includes('where')) {
      operations.push({ type: 'filter', description: 'Data Filtering' });
    }
    if (sql.includes('order by')) {
      operations.push({ type: 'sort', description: 'Data Sorting' });
    }
  }

  generateNodesAndEdges(parsedQuery: ParsedQuery): { nodes: Node[], edges: Edge[] } {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    let currentY = 50; // Start position
    const nodeSpacing = 120; // Vertical spacing between layers
    const nodeWidth = 200; // Horizontal spacing
    
    // Generate table nodes (top layer)
    const tableNodes: Node[] = [];
    parsedQuery.tables.forEach((table, index) => {
      const nodeId = `table-${table.name}-${Date.now()}-${index}`;
      
      let nodeType = 'database_input';
      if (table.type === 'cte') {
        nodeType = 'process';
      }
      
      const tableNode = {
        id: nodeId,
        type: nodeType,
        position: { x: 100 + index * nodeWidth, y: currentY },
        data: {
          label: table.alias || table.name,
          description: `${table.type}: ${table.name}`,
          tableType: table.type,
          originalName: table.name
        }
      };
      
      tableNodes.push(tableNode);
      nodes.push(tableNode);
    });

    currentY += nodeSpacing;

    // Generate operation nodes (middle layers)
    const operationNodes: Node[] = [];
    parsedQuery.operations.forEach((operation, index) => {
      const operationNodeId = `op-${operation.type}-${Date.now()}-${index}`;
      
      let nodeType = 'process';
      if (operation.type === 'join') nodeType = 'join';
      if (operation.type === 'aggregate') nodeType = 'aggregate';
      if (operation.type === 'filter') nodeType = 'filter';

      const operationNode = {
        id: operationNodeId,
        type: nodeType,
        position: { x: 100 + (index * nodeWidth / 2), y: currentY + (index * nodeSpacing) },
        data: {
          label: operation.description,
          description: `SQL ${operation.type.toUpperCase()} operation`,
          operationType: operation.type
        }
      };

      operationNodes.push(operationNode);
      nodes.push(operationNode);
    });

    // Connect table nodes to first operation node (if exists)
    if (tableNodes.length > 0 && operationNodes.length > 0) {
      const firstOperationNode = operationNodes[0];
      tableNodes.forEach((tableNode, index) => {
        edges.push({
          id: `table-to-op-${tableNode.id}-${firstOperationNode.id}`,
          source: tableNode.id,
          target: firstOperationNode.id,
          sourceHandle: 'bottom',
          targetHandle: 'top',
          data: { transferType: 'batch', label: 'Data Input' }
        });
      });
    }

    // Connect operation nodes in sequence (top to bottom)
    for (let i = 0; i < operationNodes.length - 1; i++) {
      edges.push({
        id: `op-sequence-${operationNodes[i].id}-${operationNodes[i + 1].id}`,
        source: operationNodes[i].id,
        target: operationNodes[i + 1].id,
        sourceHandle: 'bottom',
        targetHandle: 'top',
        data: { transferType: 'batch', label: 'Processing' }
      });
    }

    // Generate edges based on dependencies (for complex relationships)
    parsedQuery.dependencies.forEach((dep, index) => {
      const sourceNode = nodes.find(n => n.data.originalName === dep.from || n.data.label === dep.from);
      const targetNode = nodes.find(n => n.data.originalName === dep.to || n.data.label === dep.to);
      
      if (sourceNode && targetNode && sourceNode.id !== targetNode.id) {
        // Only add if not already connected by the main flow
        const existingEdge = edges.find(e => e.source === sourceNode.id && e.target === targetNode.id);
        if (!existingEdge) {
          edges.push({
            id: `dep-edge-${Date.now()}-${index}`,
            source: sourceNode.id,
            target: targetNode.id,
            sourceHandle: 'bottom',
            targetHandle: 'top',
            data: { transferType: 'batch', label: dep.type }
          });
        }
      }
    });

    // Add output node (bottom layer)
    if (nodes.length > 0) {
      const outputY = currentY + (operationNodes.length * nodeSpacing) + nodeSpacing;
      const outputNodeId = `output-result-${Date.now()}`;
      const outputNode = {
        id: outputNodeId,
        type: 'database_output',
        position: { x: 200, y: outputY },
        data: {
          label: 'Query Result',
          description: 'SQL query output'
        }
      };
      
      nodes.push(outputNode);

      // Connect last operation or table to output
      const lastNode = operationNodes.length > 0 ? operationNodes[operationNodes.length - 1] : tableNodes[0];
      if (lastNode) {
        edges.push({
          id: `final-edge-${Date.now()}`,
          source: lastNode.id,
          target: outputNodeId,
          sourceHandle: 'bottom',
          targetHandle: 'top',
          data: { transferType: 'batch', label: 'Result' }
        });
      }
    }

    return { nodes, edges };
  }
}

export const sqlParser = new SQLParser();