import { DataNode, DataEdge, PipelineExecution, NodeStatus } from '../types';

export interface ExecutionContext {
  datasets: Map<string, any>;
  parameters: Record<string, any>;
  nodeResults: Map<string, any>;
}

export class PipelineExecutionEngine {
  private executions: Map<string, PipelineExecution> = new Map();

  // Build dependency graph from nodes and edges
  private buildDependencyGraph(nodes: DataNode[], edges: DataEdge[]): Map<string, string[]> {
    const dependencies = new Map<string, string[]>();
    
    // Initialize all nodes with empty dependencies
    nodes.forEach(node => {
      dependencies.set(node.id, []);
    });

    // Add dependencies based on edges
    edges.forEach(edge => {
      const targetDeps = dependencies.get(edge.target) || [];
      targetDeps.push(edge.source);
      dependencies.set(edge.target, targetDeps);
    });

    return dependencies;
  }

  // Topological sort to determine execution order
  private topologicalSort(nodes: DataNode[], dependencies: Map<string, string[]>): string[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const result: string[] = [];

    const visit = (nodeId: string): void => {
      if (visiting.has(nodeId)) {
        throw new Error(`Circular dependency detected involving node: ${nodeId}`);
      }
      if (visited.has(nodeId)) {
        return;
      }

      visiting.add(nodeId);
      
      const deps = dependencies.get(nodeId) || [];
      deps.forEach(depId => visit(depId));
      
      visiting.delete(nodeId);
      visited.add(nodeId);
      result.push(nodeId);
    };

    nodes.forEach(node => {
      if (!visited.has(node.id)) {
        visit(node.id);
      }
    });

    return result;
  }

  // Execute a single node
  private async executeNode(
    node: DataNode,
    context: ExecutionContext
  ): Promise<{ success: boolean; result?: any; error?: string; metrics?: Record<string, any> }> {
    const startTime = Date.now();
    
    try {
      // Simulate node execution based on type
      const result = await this.simulateNodeExecution(node, context);
      
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // Store result in context
      context.nodeResults.set(node.id, result);

      // Generate metrics
      const metrics = {
        executionTime,
        memoryUsage: Math.random() * 100, // Simulated
        cpuUsage: Math.random() * 100,     // Simulated
        recordsProcessed: result?.recordCount || 0,
      };

      return { success: true, result, metrics };
    } catch (error) {
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metrics: { executionTime },
      };
    }
  }

  // Simulate node execution (replace with actual implementation)
  private async simulateNodeExecution(node: DataNode, context: ExecutionContext): Promise<any> {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));

    const baseResult = {
      nodeId: node.id,
      nodeType: node.type,
      timestamp: new Date(),
      recordCount: Math.floor(Math.random() * 1000) + 100,
    };

    switch (node.type) {
      case 'csv_input':
      case 'json_input':
      case 'parquet_input':
        return {
          ...baseResult,
          dataType: 'dataframe',
          columns: ['id', 'name', 'value', 'timestamp'],
          shape: [baseResult.recordCount, 4],
        };

      case 'database_input':
        return {
          ...baseResult,
          dataType: 'dataframe',
          query: node.data.parameters?.query || 'SELECT * FROM table',
          rows: baseResult.recordCount,
        };

      case 'api_input':
        return {
          ...baseResult,
          dataType: 'json',
          endpoint: node.data.parameters?.endpoint || 'https://api.example.com/data',
          statusCode: 200,
        };

      case 'filter':
        const inputData = this.getInputData(node, context);
        const filteredCount = Math.floor(inputData?.recordCount * 0.7) || 70;
        return {
          ...baseResult,
          dataType: 'dataframe',
          recordCount: filteredCount,
          filterCondition: node.data.parameters?.condition || 'value > 0',
        };

      case 'transform':
        const transformInputData = this.getInputData(node, context);
        return {
          ...baseResult,
          dataType: 'dataframe',
          recordCount: transformInputData?.recordCount || 100,
          transformations: node.data.parameters?.transformations || ['normalize', 'encode'],
        };

      case 'aggregate':
        const aggInputData = this.getInputData(node, context);
        const aggregatedCount = Math.floor((aggInputData?.recordCount || 100) * 0.1);
        return {
          ...baseResult,
          dataType: 'dataframe',
          recordCount: aggregatedCount,
          aggregations: node.data.parameters?.aggregations || ['sum', 'mean', 'count'],
        };

      case 'join':
        const joinInputs = this.getInputData(node, context);
        return {
          ...baseResult,
          dataType: 'dataframe',
          recordCount: baseResult.recordCount,
          joinType: node.data.parameters?.joinType || 'inner',
          joinKeys: node.data.parameters?.joinKeys || ['id'],
        };

      case 'split':
        const splitInputData = this.getInputData(node, context);
        return {
          ...baseResult,
          dataType: 'multiple_dataframes',
          splits: [
            { name: 'train', recordCount: Math.floor(baseResult.recordCount * 0.8) },
            { name: 'test', recordCount: Math.floor(baseResult.recordCount * 0.2) },
          ],
        };

      case 'model_train':
        return {
          ...baseResult,
          dataType: 'model',
          modelType: node.data.parameters?.modelType || 'linear_regression',
          accuracy: Math.random() * 0.3 + 0.7, // 70-100%
          trainingTime: Math.random() * 300 + 60, // 1-5 minutes
        };

      case 'model_predict':
        return {
          ...baseResult,
          dataType: 'predictions',
          predictionCount: baseResult.recordCount,
          confidenceScore: Math.random() * 0.3 + 0.7,
        };

      case 'model_evaluate':
        return {
          ...baseResult,
          dataType: 'metrics',
          accuracy: Math.random() * 0.3 + 0.7,
          precision: Math.random() * 0.3 + 0.7,
          recall: Math.random() * 0.3 + 0.7,
          f1Score: Math.random() * 0.3 + 0.7,
        };

      case 'csv_output':
      case 'json_output':
      case 'parquet_output':
        const outputInputData = this.getInputData(node, context);
        return {
          ...baseResult,
          dataType: 'file',
          filepath: node.data.parameters?.filepath || '/data/output/result.csv',
          recordsWritten: outputInputData?.recordCount || 100,
        };

      case 'database_output':
        const dbOutputInputData = this.getInputData(node, context);
        return {
          ...baseResult,
          dataType: 'database',
          table: node.data.parameters?.table || 'results',
          recordsInserted: dbOutputInputData?.recordCount || 100,
        };

      case 'api_output':
        const apiOutputInputData = this.getInputData(node, context);
        return {
          ...baseResult,
          dataType: 'api',
          endpoint: node.data.parameters?.endpoint || 'https://api.example.com/results',
          statusCode: 200,
          recordsSent: apiOutputInputData?.recordCount || 100,
        };

      default:
        return {
          ...baseResult,
          dataType: 'unknown',
          message: `Executed ${node.type} node`,
        };
    }
  }

  // Get input data for a node from context
  private getInputData(node: DataNode, context: ExecutionContext): any {
    // In a real implementation, this would look up the actual input data
    // For now, return a default structure
    return {
      recordCount: 100,
      columns: ['id', 'name', 'value'],
    };
  }

  // Execute pipeline
  async executePipeline(
    pipelineId: string,
    nodes: DataNode[],
    edges: DataEdge[],
    parameters: Record<string, any> = {}
  ): Promise<PipelineExecution> {
    const execution: PipelineExecution = {
      id: `execution_${Date.now()}`,
      pipelineId,
      status: 'running',
      startTime: new Date(),
      nodes: nodes.map(node => ({
        nodeId: node.id,
        status: 'pending',
      })),
      parameters,
    };

    this.executions.set(execution.id, execution);

    try {
      // Build dependency graph
      const dependencies = this.buildDependencyGraph(nodes, edges);
      
      // Get execution order
      const executionOrder = this.topologicalSort(nodes, dependencies);
      
      // Create execution context
      const context: ExecutionContext = {
        datasets: new Map(),
        parameters,
        nodeResults: new Map(),
      };

      // Execute nodes in order
      for (const nodeId of executionOrder) {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) continue;

        // Update node status to running
        const nodeExecution = execution.nodes.find(n => n.nodeId === nodeId);
        if (nodeExecution) {
          nodeExecution.status = 'running';
          nodeExecution.startTime = new Date();
        }

        // Execute node
        const result = await this.executeNode(node, context);

        // Update node status
        if (nodeExecution) {
          nodeExecution.status = result.success ? 'completed' : 'failed';
          nodeExecution.endTime = new Date();
          nodeExecution.error = result.error;
          nodeExecution.metrics = result.metrics;
        }

        // If node failed, stop execution
        if (!result.success) {
          execution.status = 'failed';
          execution.endTime = new Date();
          this.executions.set(execution.id, execution);
          return execution;
        }
      }

      // Pipeline completed successfully
      execution.status = 'completed';
      execution.endTime = new Date();
      this.executions.set(execution.id, execution);
      return execution;

    } catch (error) {
      execution.status = 'failed';
      execution.endTime = new Date();
      this.executions.set(execution.id, execution);
      throw error;
    }
  }

  // Get execution by ID
  getExecution(id: string): PipelineExecution | undefined {
    return this.executions.get(id);
  }

  // Get all executions
  getAllExecutions(): PipelineExecution[] {
    return Array.from(this.executions.values());
  }

  // Get executions for a specific pipeline
  getExecutionsForPipeline(pipelineId: string): PipelineExecution[] {
    return Array.from(this.executions.values()).filter(
      execution => execution.pipelineId === pipelineId
    );
  }

  // Get pipeline slice (subset of nodes to execute)
  getPipelineSlice(
    nodes: DataNode[],
    edges: DataEdge[],
    targetNodes: string[]
  ): { nodes: DataNode[]; edges: DataEdge[] } {
    const dependencies = this.buildDependencyGraph(nodes, edges);
    const requiredNodes = new Set<string>();

    // Add target nodes and their dependencies
    const addNodeAndDependencies = (nodeId: string) => {
      if (requiredNodes.has(nodeId)) return;
      requiredNodes.add(nodeId);
      
      const deps = dependencies.get(nodeId) || [];
      deps.forEach(depId => addNodeAndDependencies(depId));
    };

    targetNodes.forEach(nodeId => addNodeAndDependencies(nodeId));

    // Filter nodes and edges
    const slicedNodes = nodes.filter(node => requiredNodes.has(node.id));
    const slicedEdges = edges.filter(edge => 
      requiredNodes.has(edge.source) && requiredNodes.has(edge.target)
    );

    return { nodes: slicedNodes, edges: slicedEdges };
  }
}

// Singleton instance
export const pipelineExecutionEngine = new PipelineExecutionEngine();