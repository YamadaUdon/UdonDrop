import { DataNode, Pipeline, PipelineExecution } from '../types';

export type HookStage = 
  | 'before_pipeline_creation'
  | 'after_pipeline_creation'
  | 'before_node_run'
  | 'after_node_run'
  | 'on_node_error'
  | 'before_pipeline_run'
  | 'after_pipeline_run'
  | 'on_pipeline_error'
  | 'before_catalog_save'
  | 'after_catalog_save'
  | 'before_catalog_load'
  | 'after_catalog_load';

export interface HookContext {
  stage: HookStage;
  pipeline?: Pipeline;
  node?: DataNode;
  execution?: PipelineExecution;
  error?: Error;
  data?: any;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface HookResult {
  continue: boolean;
  data?: any;
  error?: Error;
  metadata?: Record<string, any>;
}

export type HookFunction = (context: HookContext) => Promise<HookResult> | HookResult;

export interface HookDefinition {
  id: string;
  name: string;
  description?: string;
  stage: HookStage;
  priority: number; // Lower numbers run first
  enabled: boolean;
  hook: HookFunction;
  createdAt: Date;
  author?: string;
  tags?: string[];
}

export interface HookExecutionResult {
  hookId: string;
  success: boolean;
  result?: HookResult;
  error?: Error;
  executionTime: number;
  timestamp: Date;
}

export class HooksSystem {
  private hooks: Map<string, HookDefinition> = new Map();
  private executionHistory: HookExecutionResult[] = [];
  private globallyEnabled: boolean = true;

  // Hook registration
  registerHook(definition: Omit<HookDefinition, 'id' | 'createdAt'>): string {
    const id = `hook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const hookDefinition: HookDefinition = {
      ...definition,
      id,
      createdAt: new Date(),
    };

    this.hooks.set(id, hookDefinition);
    return id;
  }

  unregisterHook(hookId: string): boolean {
    return this.hooks.delete(hookId);
  }

  getHook(hookId: string): HookDefinition | undefined {
    return this.hooks.get(hookId);
  }

  getAllHooks(): HookDefinition[] {
    return Array.from(this.hooks.values());
  }

  getHooksByStage(stage: HookStage): HookDefinition[] {
    return Array.from(this.hooks.values())
      .filter(hook => hook.stage === stage && hook.enabled)
      .sort((a, b) => a.priority - b.priority);
  }

  enableHook(hookId: string): boolean {
    const hook = this.hooks.get(hookId);
    if (!hook) return false;

    hook.enabled = true;
    this.hooks.set(hookId, hook);
    return true;
  }

  disableHook(hookId: string): boolean {
    const hook = this.hooks.get(hookId);
    if (!hook) return false;

    hook.enabled = false;
    this.hooks.set(hookId, hook);
    return true;
  }

  setGloballyEnabled(enabled: boolean): void {
    this.globallyEnabled = enabled;
  }

  isGloballyEnabled(): boolean {
    return this.globallyEnabled;
  }

  // Hook execution
  async executeHooks(context: HookContext): Promise<HookResult[]> {
    if (!this.globallyEnabled) {
      return [];
    }

    const hooks = this.getHooksByStage(context.stage);
    const results: HookResult[] = [];

    for (const hookDef of hooks) {
      const startTime = Date.now();
      let result: HookExecutionResult;

      try {
        const hookResult = await hookDef.hook(context);
        
        result = {
          hookId: hookDef.id,
          success: true,
          result: hookResult,
          executionTime: Date.now() - startTime,
          timestamp: new Date(),
        };

        results.push(hookResult);

        // If hook returns continue: false, stop executing further hooks
        if (!hookResult.continue) {
          this.executionHistory.push(result);
          break;
        }
      } catch (error) {
        result = {
          hookId: hookDef.id,
          success: false,
          error: error as Error,
          executionTime: Date.now() - startTime,
          timestamp: new Date(),
        };

        results.push({
          continue: false,
          error: error as Error,
        });
      }

      this.executionHistory.push(result);
    }

    return results;
  }

  // Convenience methods for common hook stages
  async beforePipelineCreation(pipeline: Pipeline): Promise<HookResult[]> {
    return this.executeHooks({
      stage: 'before_pipeline_creation',
      pipeline,
      timestamp: new Date(),
    });
  }

  async afterPipelineCreation(pipeline: Pipeline): Promise<HookResult[]> {
    return this.executeHooks({
      stage: 'after_pipeline_creation',
      pipeline,
      timestamp: new Date(),
    });
  }

  async beforeNodeRun(node: DataNode, execution: PipelineExecution): Promise<HookResult[]> {
    return this.executeHooks({
      stage: 'before_node_run',
      node,
      execution,
      timestamp: new Date(),
    });
  }

  async afterNodeRun(node: DataNode, execution: PipelineExecution, data?: any): Promise<HookResult[]> {
    return this.executeHooks({
      stage: 'after_node_run',
      node,
      execution,
      data,
      timestamp: new Date(),
    });
  }

  async onNodeError(node: DataNode, execution: PipelineExecution, error: Error): Promise<HookResult[]> {
    return this.executeHooks({
      stage: 'on_node_error',
      node,
      execution,
      error,
      timestamp: new Date(),
    });
  }

  async beforePipelineRun(pipeline: Pipeline, execution: PipelineExecution): Promise<HookResult[]> {
    return this.executeHooks({
      stage: 'before_pipeline_run',
      pipeline,
      execution,
      timestamp: new Date(),
    });
  }

  async afterPipelineRun(pipeline: Pipeline, execution: PipelineExecution): Promise<HookResult[]> {
    return this.executeHooks({
      stage: 'after_pipeline_run',
      pipeline,
      execution,
      timestamp: new Date(),
    });
  }

  async onPipelineError(pipeline: Pipeline, execution: PipelineExecution, error: Error): Promise<HookResult[]> {
    return this.executeHooks({
      stage: 'on_pipeline_error',
      pipeline,
      execution,
      error,
      timestamp: new Date(),
    });
  }

  // Execution history
  getExecutionHistory(limit?: number): HookExecutionResult[] {
    const history = this.executionHistory.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return limit ? history.slice(0, limit) : history;
  }

  getExecutionHistoryByHook(hookId: string): HookExecutionResult[] {
    return this.executionHistory.filter(result => result.hookId === hookId);
  }

  clearExecutionHistory(): void {
    this.executionHistory = [];
  }

  // Statistics
  getHookStats(): {
    totalHooks: number;
    enabledHooks: number;
    hooksByStage: Record<HookStage, number>;
    recentExecutions: number;
    averageExecutionTime: number;
    successRate: number;
  } {
    const hooks = Array.from(this.hooks.values());
    const recentExecutions = this.executionHistory.filter(
      result => Date.now() - result.timestamp.getTime() < 3600000 // Last hour
    );

    const hooksByStage = hooks.reduce((acc, hook) => {
      acc[hook.stage] = (acc[hook.stage] || 0) + 1;
      return acc;
    }, {} as Record<HookStage, number>);

    const totalExecutions = this.executionHistory.length;
    const successfulExecutions = this.executionHistory.filter(result => result.success).length;
    const totalExecutionTime = this.executionHistory.reduce((sum, result) => sum + result.executionTime, 0);

    return {
      totalHooks: hooks.length,
      enabledHooks: hooks.filter(hook => hook.enabled).length,
      hooksByStage,
      recentExecutions: recentExecutions.length,
      averageExecutionTime: totalExecutions > 0 ? totalExecutionTime / totalExecutions : 0,
      successRate: totalExecutions > 0 ? successfulExecutions / totalExecutions : 0,
    };
  }

  // Built-in hooks
  registerBuiltInHooks(): void {
    // Logging hook
    this.registerHook({
      name: 'Pipeline Logger',
      description: 'Log pipeline execution events',
      stage: 'before_pipeline_run',
      priority: 1,
      enabled: true,
      hook: async (context) => {
        console.log(`[${context.timestamp.toISOString()}] Starting pipeline: ${context.pipeline?.name}`);
        return { continue: true };
      },
      author: 'system',
      tags: ['logging', 'built-in'],
    });

    this.registerHook({
      name: 'Node Execution Logger',
      description: 'Log node execution start',
      stage: 'before_node_run',
      priority: 1,
      enabled: true,
      hook: async (context) => {
        console.log(`[${context.timestamp.toISOString()}] Executing node: ${context.node?.data.label}`);
        return { continue: true };
      },
      author: 'system',
      tags: ['logging', 'built-in'],
    });

    // Validation hook
    this.registerHook({
      name: 'Pipeline Validator',
      description: 'Validate pipeline before execution',
      stage: 'before_pipeline_run',
      priority: 10,
      enabled: true,
      hook: async (context) => {
        if (!context.pipeline) {
          return { continue: false, error: new Error('Pipeline is required') };
        }

        if (context.pipeline.nodes.length === 0) {
          return { continue: false, error: new Error('Pipeline must contain at least one node') };
        }

        return { continue: true };
      },
      author: 'system',
      tags: ['validation', 'built-in'],
    });

    // Performance monitoring hook
    this.registerHook({
      name: 'Performance Monitor',
      description: 'Monitor node execution performance',
      stage: 'after_node_run',
      priority: 1,
      enabled: true,
      hook: async (context) => {
        const nodeExecution = context.execution?.nodes.find(n => n.nodeId === context.node?.id);
        if (nodeExecution?.metrics?.executionTime) {
          const executionTime = nodeExecution.metrics.executionTime;
          if (executionTime > 5000) { // 5 seconds threshold
            console.warn(`[PERFORMANCE] Node ${context.node?.data.label} took ${executionTime}ms to execute`);
          }
        }
        return { continue: true };
      },
      author: 'system',
      tags: ['performance', 'monitoring', 'built-in'],
    });

    // Error handling hook
    this.registerHook({
      name: 'Error Handler',
      description: 'Handle and log pipeline errors',
      stage: 'on_pipeline_error',
      priority: 1,
      enabled: true,
      hook: async (context) => {
        console.error(`[ERROR] Pipeline ${context.pipeline?.name} failed:`, context.error);
        
        // Could integrate with error tracking services here
        // await sendErrorToTrackingService(context.error, context.pipeline);
        
        return { continue: true };
      },
      author: 'system',
      tags: ['error-handling', 'built-in'],
    });

    // Data quality hook
    this.registerHook({
      name: 'Data Quality Check',
      description: 'Perform basic data quality checks',
      stage: 'after_node_run',
      priority: 5,
      enabled: true,
      hook: async (context) => {
        if (context.node?.type.includes('input')) {
          // Mock data quality check
          const dataQuality = Math.random();
          if (dataQuality < 0.7) {
            console.warn(`[DATA QUALITY] Low data quality detected for node ${context.node.data.label}`);
          }
        }
        return { continue: true };
      },
      author: 'system',
      tags: ['data-quality', 'built-in'],
    });
  }

  // Export/Import hooks
  exportHooks(): HookDefinition[] {
    return Array.from(this.hooks.values());
  }

  importHooks(hooks: HookDefinition[]): void {
    hooks.forEach(hook => {
      this.hooks.set(hook.id, hook);
    });
  }

  // Hook templates
  getHookTemplates(): Partial<HookDefinition>[] {
    return [
      {
        name: 'Custom Logger',
        description: 'Log custom messages during pipeline execution',
        stage: 'before_node_run',
        priority: 1,
        enabled: true,
        hook: async (context) => {
          console.log(`Custom log: ${context.node?.data.label}`);
          return { continue: true };
        },
        tags: ['logging', 'custom'],
      },
      {
        name: 'Data Validator',
        description: 'Validate data before processing',
        stage: 'after_node_run',
        priority: 10,
        enabled: true,
        hook: async (context) => {
          // Add your validation logic here
          return { continue: true };
        },
        tags: ['validation', 'custom'],
      },
      {
        name: 'Notification Sender',
        description: 'Send notifications when pipeline completes',
        stage: 'after_pipeline_run',
        priority: 1,
        enabled: true,
        hook: async (context) => {
          // Add notification logic here
          console.log(`Pipeline ${context.pipeline?.name} completed`);
          return { continue: true };
        },
        tags: ['notification', 'custom'],
      },
    ];
  }
}

// Singleton instance
export const hooksSystem = new HooksSystem();