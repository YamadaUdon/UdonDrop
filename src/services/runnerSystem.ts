import { DataNode, DataEdge, Pipeline, PipelineExecution, NodeExecution } from '../types';
import { pipelineExecutionEngine } from './pipelineExecution';
import { hooksSystem } from './hooksSystem';

export interface RunnerConfiguration {
  type: 'sequential' | 'parallel' | 'distributed' | 'spark' | 'dask' | 'kubernetes';
  maxConcurrency?: number;
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
  resources?: {
    memory?: string;
    cpu?: string;
    gpu?: boolean;
  };
  environment?: Record<string, string>;
  secrets?: Record<string, string>;
  volumes?: Array<{
    name: string;
    source: string;
    target: string;
  }>;
}

export interface RunnerCapabilities {
  supportsParallelExecution: boolean;
  supportsDistributedExecution: boolean;
  supportsResourceManagement: boolean;
  supportsAutoScaling: boolean;
  supportsGPU: boolean;
  supportedNodeTypes: string[];
  maxConcurrency?: number;
}

export interface RunnerMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  resourceUtilization: {
    cpu: number;
    memory: number;
    gpu?: number;
  };
  queuedJobs: number;
  activeJobs: number;
}

export interface RunnerStatus {
  id: string;
  name: string;
  status: 'available' | 'busy' | 'error' | 'maintenance';
  activeExecutions: number;
  queuedExecutions: number;
  capabilities: RunnerCapabilities;
  metrics: RunnerMetrics;
  lastHeartbeat: Date;
  version: string;
}

export abstract class BaseRunner {
  protected id: string;
  protected name: string;
  protected configuration: RunnerConfiguration;
  protected capabilities: RunnerCapabilities;
  protected metrics: RunnerMetrics;
  protected status: RunnerStatus['status'] = 'available';
  
  constructor(id: string, name: string, configuration: RunnerConfiguration) {
    this.id = id;
    this.name = name;
    this.configuration = configuration;
    this.capabilities = this.getCapabilities();
    this.metrics = this.initializeMetrics();
  }
  
  abstract getCapabilities(): RunnerCapabilities;
  abstract initializeMetrics(): RunnerMetrics;
  abstract executePipeline(
    pipeline: Pipeline,
    nodes: DataNode[],
    edges: DataEdge[],
    parameters?: Record<string, any>
  ): Promise<PipelineExecution>;
  
  // Common methods
  getId(): string {
    return this.id;
  }
  
  getName(): string {
    return this.name;
  }
  
  getConfiguration(): RunnerConfiguration {
    return this.configuration;
  }
  
  getCapabilitiesInfo(): RunnerCapabilities {
    return this.capabilities;
  }
  
  getMetrics(): RunnerMetrics {
    return this.metrics;
  }
  
  getStatus(): RunnerStatus {
    return {
      id: this.id,
      name: this.name,
      status: this.status,
      activeExecutions: this.metrics.activeJobs,
      queuedExecutions: this.metrics.queuedJobs,
      capabilities: this.capabilities,
      metrics: this.metrics,
      lastHeartbeat: new Date(),
      version: '1.0.0',
    };
  }
  
  updateConfiguration(config: Partial<RunnerConfiguration>): void {
    this.configuration = { ...this.configuration, ...config };
  }
  
  protected updateMetrics(execution: PipelineExecution): void {
    this.metrics.totalExecutions++;
    if (execution.status === 'completed') {
      this.metrics.successfulExecutions++;
    } else if (execution.status === 'failed') {
      this.metrics.failedExecutions++;
    }
    
    if (execution.endTime && execution.startTime) {
      const executionTime = execution.endTime.getTime() - execution.startTime.getTime();
      this.metrics.averageExecutionTime = 
        (this.metrics.averageExecutionTime + executionTime) / 2;
    }
  }
  
  protected async executeWithHooks(
    pipeline: Pipeline,
    nodes: DataNode[],
    edges: DataEdge[],
    parameters?: Record<string, any>
  ): Promise<PipelineExecution> {
    const execution: PipelineExecution = {
      id: `execution_${Date.now()}`,
      pipelineId: pipeline.id,
      status: 'running',
      startTime: new Date(),
      nodes: [],
      parameters: parameters || {},
      runner: this.id,
    };
    
    try {
      // Execute before_pipeline_run hooks
      await hooksSystem.beforePipelineRun(pipeline, execution);
      
      // Execute pipeline
      const result = await this.runPipeline(pipeline, nodes, edges, execution);
      
      // Execute after_pipeline_run hooks
      await hooksSystem.afterPipelineRun(pipeline, result);
      
      this.updateMetrics(result);
      return result;
    } catch (error) {
      execution.status = 'failed';
      execution.error = String(error);
      execution.endTime = new Date();
      
      // Execute on_pipeline_error hooks
      await hooksSystem.onPipelineError(pipeline, execution, error as Error);
      
      this.updateMetrics(execution);
      throw error;
    }
  }
  
  protected abstract runPipeline(
    pipeline: Pipeline,
    nodes: DataNode[],
    edges: DataEdge[],
    execution: PipelineExecution
  ): Promise<PipelineExecution>;
}

export class SequentialRunner extends BaseRunner {
  getCapabilities(): RunnerCapabilities {
    return {
      supportsParallelExecution: false,
      supportsDistributedExecution: false,
      supportsResourceManagement: false,
      supportsAutoScaling: false,
      supportsGPU: false,
      supportedNodeTypes: ['*'],
      maxConcurrency: 1,
    };
  }
  
  initializeMetrics(): RunnerMetrics {
    return {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      resourceUtilization: { cpu: 0, memory: 0 },
      queuedJobs: 0,
      activeJobs: 0,
    };
  }
  
  async executePipeline(
    pipeline: Pipeline,
    nodes: DataNode[],
    edges: DataEdge[],
    parameters?: Record<string, any>
  ): Promise<PipelineExecution> {
    return this.executeWithHooks(pipeline, nodes, edges, parameters);
  }
  
  protected async runPipeline(
    pipeline: Pipeline,
    nodes: DataNode[],
    edges: DataEdge[],
    execution: PipelineExecution
  ): Promise<PipelineExecution> {
    this.status = 'busy';
    this.metrics.activeJobs++;
    
    try {
      // Use existing pipeline execution engine for sequential execution
      const result = await pipelineExecutionEngine.executePipeline(
        pipeline.id,
        nodes,
        edges,
        execution.parameters
      );
      
      this.status = 'available';
      this.metrics.activeJobs--;
      
      return result;
    } catch (error) {
      this.status = 'available';
      this.metrics.activeJobs--;
      throw error;
    }
  }
}

export class ParallelRunner extends BaseRunner {
  private executionQueue: Array<{
    pipeline: Pipeline;
    nodes: DataNode[];
    edges: DataEdge[];
    execution: PipelineExecution;
  }> = [];
  
  getCapabilities(): RunnerCapabilities {
    return {
      supportsParallelExecution: true,
      supportsDistributedExecution: false,
      supportsResourceManagement: true,
      supportsAutoScaling: false,
      supportsGPU: false,
      supportedNodeTypes: ['*'],
      maxConcurrency: this.configuration.maxConcurrency || 4,
    };
  }
  
  initializeMetrics(): RunnerMetrics {
    return {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      resourceUtilization: { cpu: 0, memory: 0 },
      queuedJobs: 0,
      activeJobs: 0,
    };
  }
  
  async executePipeline(
    pipeline: Pipeline,
    nodes: DataNode[],
    edges: DataEdge[],
    parameters?: Record<string, any>
  ): Promise<PipelineExecution> {
    return this.executeWithHooks(pipeline, nodes, edges, parameters);
  }
  
  protected async runPipeline(
    pipeline: Pipeline,
    nodes: DataNode[],
    edges: DataEdge[],
    execution: PipelineExecution
  ): Promise<PipelineExecution> {
    const maxConcurrency = this.configuration.maxConcurrency || 4;
    
    if (this.metrics.activeJobs >= maxConcurrency) {
      this.executionQueue.push({ pipeline, nodes, edges, execution });
      this.metrics.queuedJobs++;
      this.status = 'busy';
      
      // Wait for available slot
      await this.waitForAvailableSlot();
    }
    
    this.metrics.activeJobs++;
    this.status = 'busy';
    
    try {
      // Execute nodes in parallel based on dependency graph
      const result = await this.executeNodesInParallel(pipeline, nodes, edges, execution);
      
      this.metrics.activeJobs--;
      this.processQueue();
      
      return result;
    } catch (error) {
      this.metrics.activeJobs--;
      this.processQueue();
      throw error;
    }
  }
  
  private async executeNodesInParallel(
    pipeline: Pipeline,
    nodes: DataNode[],
    edges: DataEdge[],
    execution: PipelineExecution
  ): Promise<PipelineExecution> {
    const nodeMap = new Map(nodes.map(node => [node.id, node]));
    const dependencies = this.buildDependencyGraph(nodes, edges);
    const completed = new Set<string>();
    const running = new Set<string>();
    const results = new Map<string, any>();
    
    execution.startTime = new Date();
    execution.status = 'running';
    
    while (completed.size < nodes.length) {
      const readyNodes = nodes.filter(node => 
        !completed.has(node.id) && 
        !running.has(node.id) &&
        dependencies.get(node.id)?.every(dep => completed.has(dep)) === true
      );
      
      if (readyNodes.length === 0 && running.size === 0) {
        throw new Error('Pipeline execution deadlock detected');
      }
      
      // Execute ready nodes in parallel
      const executions = readyNodes.slice(0, this.configuration.maxConcurrency || 4)
        .map(node => this.executeNode(node, execution, results));
      
      if (executions.length > 0) {
        readyNodes.slice(0, executions.length).forEach(node => {
          running.add(node.id);
        });
        
        const nodeResults = await Promise.allSettled(executions);
        
        nodeResults.forEach((result, index) => {
          const node = readyNodes[index];
          running.delete(node.id);
          completed.add(node.id);
          
          if (result.status === 'fulfilled') {
            results.set(node.id, result.value);
          } else {
            execution.status = 'failed';
            execution.error = `Node ${node.id} failed: ${result.reason}`;
            throw new Error(execution.error);
          }
        });
      }
    }
    
    execution.status = 'completed';
    execution.endTime = new Date();
    
    return execution;
  }
  
  private buildDependencyGraph(nodes: DataNode[], edges: DataEdge[]): Map<string, string[]> {
    const dependencies = new Map<string, string[]>();
    
    nodes.forEach(node => {
      dependencies.set(node.id, []);
    });
    
    edges.forEach(edge => {
      const deps = dependencies.get(edge.target) || [];
      deps.push(edge.source);
      dependencies.set(edge.target, deps);
    });
    
    return dependencies;
  }
  
  private async executeNode(
    node: DataNode,
    execution: PipelineExecution,
    results: Map<string, any>
  ): Promise<any> {
    const nodeExecution: NodeExecution = {
      nodeId: node.id,
      status: 'running',
      startTime: new Date(),
      outputs: {},
      metrics: {
        executionTime: 0,
        memoryUsage: 0,
        cpuUsage: 0,
      },
    };
    
    execution.nodes.push(nodeExecution);
    
    try {
      // Execute before_node_run hooks
      await hooksSystem.beforeNodeRun(node, execution);
      
      // Simulate node execution
      const result = await this.simulateNodeExecution(node, results);
      
      nodeExecution.status = 'completed';
      nodeExecution.endTime = new Date();
      nodeExecution.outputs = result;
      nodeExecution.metrics!.executionTime = 
        nodeExecution.endTime.getTime() - nodeExecution.startTime.getTime();
      
      // Execute after_node_run hooks
      await hooksSystem.afterNodeRun(node, execution, result);
      
      return result;
    } catch (error) {
      nodeExecution.status = 'failed';
      nodeExecution.error = String(error);
      nodeExecution.endTime = new Date();
      
      // Execute on_node_error hooks
      await hooksSystem.onNodeError(node, execution, error as Error);
      
      throw error;
    }
  }
  
  private async simulateNodeExecution(
    node: DataNode,
    results: Map<string, any>
  ): Promise<any> {
    // Simulate processing time
    const processingTime = Math.random() * 2000 + 500; // 0.5-2.5 seconds
    await new Promise(resolve => setTimeout(resolve, processingTime));
    
    // Return mock result
    return {
      nodeId: node.id,
      type: node.type,
      timestamp: new Date(),
      data: `Output from ${node.data.label}`,
    };
  }
  
  private async waitForAvailableSlot(): Promise<void> {
    return new Promise(resolve => {
      const checkSlot = () => {
        if (this.metrics.activeJobs < (this.configuration.maxConcurrency || 4)) {
          resolve();
        } else {
          setTimeout(checkSlot, 100);
        }
      };
      checkSlot();
    });
  }
  
  private processQueue(): void {
    if (this.executionQueue.length === 0) {
      this.status = 'available';
      return;
    }
    
    const nextExecution = this.executionQueue.shift();
    if (nextExecution) {
      this.metrics.queuedJobs--;
      this.runPipeline(
        nextExecution.pipeline,
        nextExecution.nodes,
        nextExecution.edges,
        nextExecution.execution
      );
    }
  }
}

export class DistributedRunner extends BaseRunner {
  private workerNodes: Map<string, any> = new Map();
  
  getCapabilities(): RunnerCapabilities {
    return {
      supportsParallelExecution: true,
      supportsDistributedExecution: true,
      supportsResourceManagement: true,
      supportsAutoScaling: true,
      supportsGPU: true,
      supportedNodeTypes: ['*'],
      maxConcurrency: 50,
    };
  }
  
  initializeMetrics(): RunnerMetrics {
    return {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      resourceUtilization: { cpu: 0, memory: 0, gpu: 0 },
      queuedJobs: 0,
      activeJobs: 0,
    };
  }
  
  async executePipeline(
    pipeline: Pipeline,
    nodes: DataNode[],
    edges: DataEdge[],
    parameters?: Record<string, any>
  ): Promise<PipelineExecution> {
    return this.executeWithHooks(pipeline, nodes, edges, parameters);
  }
  
  protected async runPipeline(
    pipeline: Pipeline,
    nodes: DataNode[],
    edges: DataEdge[],
    execution: PipelineExecution
  ): Promise<PipelineExecution> {
    this.status = 'busy';
    this.metrics.activeJobs++;
    
    try {
      // Distribute nodes across worker nodes
      const result = await this.distributeExecution(pipeline, nodes, edges, execution);
      
      this.status = 'available';
      this.metrics.activeJobs--;
      
      return result;
    } catch (error) {
      this.status = 'available';
      this.metrics.activeJobs--;
      throw error;
    }
  }
  
  private async distributeExecution(
    pipeline: Pipeline,
    nodes: DataNode[],
    edges: DataEdge[],
    execution: PipelineExecution
  ): Promise<PipelineExecution> {
    execution.startTime = new Date();
    execution.status = 'running';
    
    // Mock distributed execution
    console.log(`Distributing pipeline ${pipeline.name} across ${this.workerNodes.size} worker nodes`);
    
    // Simulate distributed processing
    const processingTime = Math.random() * 3000 + 1000; // 1-4 seconds
    await new Promise(resolve => setTimeout(resolve, processingTime));
    
    execution.status = 'completed';
    execution.endTime = new Date();
    
    return execution;
  }
}

export class RunnerRegistry {
  private runners: Map<string, BaseRunner> = new Map();
  private defaultRunner: string = 'sequential';
  
  registerRunner(runner: BaseRunner): void {
    this.runners.set(runner.getId(), runner);
  }
  
  unregisterRunner(runnerId: string): boolean {
    return this.runners.delete(runnerId);
  }
  
  getRunner(runnerId: string): BaseRunner | undefined {
    return this.runners.get(runnerId);
  }
  
  getAllRunners(): BaseRunner[] {
    return Array.from(this.runners.values());
  }
  
  getAvailableRunners(): BaseRunner[] {
    return Array.from(this.runners.values()).filter(
      runner => runner.getStatus().status === 'available'
    );
  }
  
  getRunnersByCapability(capability: keyof RunnerCapabilities): BaseRunner[] {
    return Array.from(this.runners.values()).filter(
      runner => runner.getCapabilities()[capability] === true
    );
  }
  
  setDefaultRunner(runnerId: string): boolean {
    if (this.runners.has(runnerId)) {
      this.defaultRunner = runnerId;
      return true;
    }
    return false;
  }
  
  getDefaultRunner(): BaseRunner | undefined {
    return this.runners.get(this.defaultRunner);
  }
  
  selectOptimalRunner(
    requirements: Partial<RunnerCapabilities> = {}
  ): BaseRunner | undefined {
    const availableRunners = this.getAvailableRunners();
    
    if (availableRunners.length === 0) {
      return undefined;
    }
    
    // Filter by requirements
    const suitableRunners = availableRunners.filter(runner => {
      const capabilities = runner.getCapabilities();
      
      if (requirements.supportsParallelExecution && !capabilities.supportsParallelExecution) {
        return false;
      }
      if (requirements.supportsDistributedExecution && !capabilities.supportsDistributedExecution) {
        return false;
      }
      if (requirements.supportsGPU && !capabilities.supportsGPU) {
        return false;
      }
      
      return true;
    });
    
    if (suitableRunners.length === 0) {
      return availableRunners[0]; // Fallback to any available runner
    }
    
    // Select runner with best metrics
    return suitableRunners.reduce((best, current) => {
      const bestMetrics = best.getMetrics();
      const currentMetrics = current.getMetrics();
      
      const bestScore = bestMetrics.successfulExecutions / Math.max(1, bestMetrics.totalExecutions);
      const currentScore = currentMetrics.successfulExecutions / Math.max(1, currentMetrics.totalExecutions);
      
      return currentScore > bestScore ? current : best;
    });
  }
  
  getRunnerStats(): {
    totalRunners: number;
    availableRunners: number;
    runnersByType: Record<string, number>;
    totalExecutions: number;
    averageSuccessRate: number;
  } {
    const runners = Array.from(this.runners.values());
    const runnersByType = runners.reduce((acc, runner) => {
      const type = runner.getConfiguration().type;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const totalExecutions = runners.reduce((sum, runner) => 
      sum + runner.getMetrics().totalExecutions, 0
    );
    
    const totalSuccessful = runners.reduce((sum, runner) => 
      sum + runner.getMetrics().successfulExecutions, 0
    );
    
    return {
      totalRunners: runners.length,
      availableRunners: this.getAvailableRunners().length,
      runnersByType,
      totalExecutions,
      averageSuccessRate: totalExecutions > 0 ? totalSuccessful / totalExecutions : 0,
    };
  }
}

// Initialize runner registry with default runners
export const runnerRegistry = new RunnerRegistry();

// Register default runners
runnerRegistry.registerRunner(new SequentialRunner(
  'sequential',
  'Sequential Runner',
  { type: 'sequential' }
));

runnerRegistry.registerRunner(new ParallelRunner(
  'parallel',
  'Parallel Runner',
  { type: 'parallel', maxConcurrency: 4 }
));

runnerRegistry.registerRunner(new DistributedRunner(
  'distributed',
  'Distributed Runner',
  { type: 'distributed', maxConcurrency: 50 }
));

console.log('Runner system initialized with default runners');