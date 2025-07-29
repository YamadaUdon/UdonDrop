import { Pipeline, DataNode, DataEdge } from '../types';
import { pipelineRegistry } from './pipelineRegistry';
import { pipelineExecutionEngine } from './pipelineExecution';
import { dataCatalog } from './dataCatalog';
import { configurationManager } from './configurationManager';
import { experimentTracker } from './experimentTracking';
import { dataValidationService } from './dataValidation';
import { hooksSystem } from './hooksSystem';

export interface CLICommand {
  name: string;
  description: string;
  usage: string;
  options: {
    name: string;
    alias?: string;
    description: string;
    type: 'string' | 'boolean' | 'number';
    required?: boolean;
    default?: any;
  }[];
  examples: string[];
  category: 'pipeline' | 'data' | 'config' | 'experiment' | 'validation' | 'hooks';
  execute: (args: string[], options: Record<string, any>) => Promise<CLIResult>;
}

export interface CLIResult {
  success: boolean;
  output: string;
  error?: string;
  data?: any;
}

export class CLICommandsService {
  private commands: Map<string, CLICommand> = new Map();
  private commandHistory: { command: string; timestamp: Date; result: CLIResult }[] = [];

  constructor() {
    this.initializeCommands();
  }

  private initializeCommands(): void {
    // Pipeline commands
    this.registerCommand({
      name: 'pipeline:list',
      description: 'List all registered pipelines',
      usage: 'pipeline:list [options]',
      options: [
        { name: 'tag', alias: 't', description: 'Filter by tag', type: 'string' },
        { name: 'owner', alias: 'o', description: 'Filter by owner', type: 'string' },
        { name: 'format', alias: 'f', description: 'Output format (table|json)', type: 'string', default: 'table' },
      ],
      examples: [
        'pipeline:list',
        'pipeline:list --tag=ml',
        'pipeline:list --owner=data_team --format=json',
      ],
      category: 'pipeline',
      execute: async (args, options) => {
        let pipelines = pipelineRegistry.getAllPipelines();
        
        if (options.tag) {
          pipelines = pipelineRegistry.getPipelinesByTag(options.tag);
        }
        
        if (options.owner) {
          pipelines = pipelineRegistry.getPipelinesByOwner(options.owner);
        }
        
        if (options.format === 'json') {
          return {
            success: true,
            output: JSON.stringify(pipelines, null, 2),
            data: pipelines,
          };
        }
        
        const table = this.formatPipelineTable(pipelines);
        return {
          success: true,
          output: table,
          data: pipelines,
        };
      },
    });

    this.registerCommand({
      name: 'pipeline:run',
      description: 'Run a pipeline',
      usage: 'pipeline:run <pipeline-id> [options]',
      options: [
        { name: 'version', alias: 'v', description: 'Pipeline version', type: 'string' },
        { name: 'environment', alias: 'e', description: 'Environment', type: 'string' },
        { name: 'params', alias: 'p', description: 'Parameters (JSON)', type: 'string' },
        { name: 'tags', alias: 't', description: 'Filter nodes by tags', type: 'string' },
        { name: 'from-nodes', description: 'Start from specific nodes', type: 'string' },
        { name: 'to-nodes', description: 'Run up to specific nodes', type: 'string' },
        { name: 'dry-run', description: 'Simulate execution', type: 'boolean', default: false },
      ],
      examples: [
        'pipeline:run customer_analytics',
        'pipeline:run customer_analytics --version=1.1.0',
        'pipeline:run customer_analytics --params=\'{"test_size": 0.3}\' --dry-run',
      ],
      category: 'pipeline',
      execute: async (args, options) => {
        if (args.length === 0) {
          return {
            success: false,
            output: 'Error: Pipeline ID is required',
            error: 'Missing pipeline ID',
          };
        }

        const pipelineId = args[0];
        const pipeline = pipelineRegistry.getPipeline(pipelineId, options.version);
        
        if (!pipeline) {
          return {
            success: false,
            output: `Error: Pipeline '${pipelineId}' not found`,
            error: 'Pipeline not found',
          };
        }

        let parameters = {};
        if (options.params) {
          try {
            parameters = JSON.parse(options.params);
          } catch (e) {
            return {
              success: false,
              output: 'Error: Invalid JSON in parameters',
              error: 'Invalid parameters',
            };
          }
        }

        if (options.environment) {
          configurationManager.setCurrentEnvironment(options.environment);
        }

        if (options['dry-run']) {
          return {
            success: true,
            output: `Dry run: Would execute pipeline '${pipeline.name}' with ${pipeline.nodes.length} nodes`,
            data: { pipeline, parameters },
          };
        }

        try {
          const execution = await pipelineExecutionEngine.executePipeline(
            pipelineId,
            pipeline.nodes,
            pipeline.edges,
            parameters
          );
          
          return {
            success: true,
            output: `Pipeline '${pipeline.name}' executed successfully\
Execution ID: ${execution.id}\
Status: ${execution.status}`,
            data: execution,
          };
        } catch (error) {
          return {
            success: false,
            output: `Error executing pipeline: ${error}`,
            error: String(error),
          };
        }
      },
    });

    this.registerCommand({
      name: 'pipeline:describe',
      description: 'Show pipeline details',
      usage: 'pipeline:describe <pipeline-id> [options]',
      options: [
        { name: 'version', alias: 'v', description: 'Pipeline version', type: 'string' },
        { name: 'format', alias: 'f', description: 'Output format (table|json)', type: 'string', default: 'table' },
      ],
      examples: [
        'pipeline:describe customer_analytics',
        'pipeline:describe customer_analytics --version=1.0.0',
      ],
      category: 'pipeline',
      execute: async (args, options) => {
        if (args.length === 0) {
          return {
            success: false,
            output: 'Error: Pipeline ID is required',
            error: 'Missing pipeline ID',
          };
        }

        const pipelineId = args[0];
        const entry = pipelineRegistry.getPipelineEntry(pipelineId);
        
        if (!entry) {
          return {
            success: false,
            output: `Error: Pipeline '${pipelineId}' not found`,
            error: 'Pipeline not found',
          };
        }

        const pipeline = pipelineRegistry.getPipeline(pipelineId, options.version);
        
        if (options.format === 'json') {
          return {
            success: true,
            output: JSON.stringify({ entry, pipeline }, null, 2),
            data: { entry, pipeline },
          };
        }

        const output = this.formatPipelineDescription(entry, pipeline!);
        return {
          success: true,
          output,
          data: { entry, pipeline },
        };
      },
    });

    // Data catalog commands
    this.registerCommand({
      name: 'catalog:list',
      description: 'List data catalog entries',
      usage: 'catalog:list [options]',
      options: [
        { name: 'type', alias: 't', description: 'Filter by type', type: 'string' },
        { name: 'format', alias: 'f', description: 'Output format (table|json)', type: 'string', default: 'table' },
      ],
      examples: [
        'catalog:list',
        'catalog:list --type=csv',
      ],
      category: 'data',
      execute: async (args, options) => {
        let entries = dataCatalog.getAllEntries();
        
        if (options.type) {
          entries = dataCatalog.getEntriesByType(options.type);
        }
        
        if (options.format === 'json') {
          return {
            success: true,
            output: JSON.stringify(entries, null, 2),
            data: entries,
          };
        }
        
        const table = this.formatCatalogTable(entries);
        return {
          success: true,
          output: table,
          data: entries,
        };
      },
    });

    // Experiment commands
    this.registerCommand({
      name: 'experiment:list',
      description: 'List experiments',
      usage: 'experiment:list [options]',
      options: [
        { name: 'pipeline', alias: 'p', description: 'Filter by pipeline', type: 'string' },
        { name: 'status', alias: 's', description: 'Filter by status', type: 'string' },
        { name: 'limit', alias: 'l', description: 'Limit results', type: 'number', default: 10 },
      ],
      examples: [
        'experiment:list',
        'experiment:list --pipeline=customer_analytics',
        'experiment:list --status=completed --limit=5',
      ],
      category: 'experiment',
      execute: async (args, options) => {
        let experiments = experimentTracker.getAllExperiments();
        
        if (options.pipeline) {
          experiments = experimentTracker.getExperimentsByPipeline(options.pipeline);
        }
        
        if (options.status) {
          experiments = experiments.filter(exp => exp.status === options.status);
        }
        
        experiments = experiments.slice(0, options.limit);
        
        const table = this.formatExperimentTable(experiments);
        return {
          success: true,
          output: table,
          data: experiments,
        };
      },
    });

    // Data validation commands
    this.registerCommand({
      name: 'data:validate',
      description: 'Validate dataset',
      usage: 'data:validate <dataset-id> [options]',
      options: [
        { name: 'rules', alias: 'r', description: 'Specific rules to run', type: 'string' },
        { name: 'format', alias: 'f', description: 'Output format (table|json)', type: 'string', default: 'table' },
      ],
      examples: [
        'data:validate raw_data',
        'data:validate raw_data --rules=completeness,uniqueness',
      ],
      category: 'validation',
      execute: async (args, options) => {
        if (args.length === 0) {
          return {
            success: false,
            output: 'Error: Dataset ID is required',
            error: 'Missing dataset ID',
          };
        }

        const datasetId = args[0];
        
        try {
          const report = await dataValidationService.validateDataset(datasetId);
          
          if (options.format === 'json') {
            return {
              success: true,
              output: JSON.stringify(report, null, 2),
              data: report,
            };
          }
          
          const output = this.formatValidationReport(report);
          return {
            success: true,
            output,
            data: report,
          };
        } catch (error) {
          return {
            success: false,
            output: `Error validating dataset: ${error}`,
            error: String(error),
          };
        }
      },
    });

    // Configuration commands
    this.registerCommand({
      name: 'config:show',
      description: 'Show configuration',
      usage: 'config:show [options]',
      options: [
        { name: 'environment', alias: 'e', description: 'Environment', type: 'string' },
        { name: 'format', alias: 'f', description: 'Output format (table|json)', type: 'string', default: 'table' },
      ],
      examples: [
        'config:show',
        'config:show --environment=production',
      ],
      category: 'config',
      execute: async (args, options) => {
        const environment = options.environment || configurationManager.getCurrentEnvironment();
        const config = configurationManager.getEnvironmentConfig(environment);
        const parameters = configurationManager.resolveParameters();
        
        if (options.format === 'json') {
          return {
            success: true,
            output: JSON.stringify({ environment, config, parameters }, null, 2),
            data: { environment, config, parameters },
          };
        }
        
        const output = this.formatConfigOutput(environment, config, parameters);
        return {
          success: true,
          output,
          data: { environment, config, parameters },
        };
      },
    });

    // Hooks commands
    this.registerCommand({
      name: 'hooks:list',
      description: 'List registered hooks',
      usage: 'hooks:list [options]',
      options: [
        { name: 'stage', alias: 's', description: 'Filter by stage', type: 'string' },
        { name: 'enabled', alias: 'e', description: 'Filter by enabled status', type: 'boolean' },
      ],
      examples: [
        'hooks:list',
        'hooks:list --stage=before_node_run',
        'hooks:list --enabled=true',
      ],
      category: 'hooks',
      execute: async (args, options) => {
        let hooks = hooksSystem.getAllHooks();
        
        if (options.stage) {
          hooks = hooksSystem.getHooksByStage(options.stage);
        }
        
        if (options.enabled !== undefined) {
          hooks = hooks.filter(hook => hook.enabled === options.enabled);
        }
        
        const table = this.formatHooksTable(hooks);
        return {
          success: true,
          output: table,
          data: hooks,
        };
      },
    });
  }

  registerCommand(command: CLICommand): void {
    this.commands.set(command.name, command);
  }

  getCommand(name: string): CLICommand | undefined {
    return this.commands.get(name);
  }

  getAllCommands(): CLICommand[] {
    return Array.from(this.commands.values());
  }

  getCommandsByCategory(category: string): CLICommand[] {
    return Array.from(this.commands.values()).filter(cmd => cmd.category === category);
  }

  async executeCommand(commandLine: string): Promise<CLIResult> {
    const parts = this.parseCommandLine(commandLine);
    const commandName = parts.command;
    const args = parts.args;
    const options = parts.options;

    const command = this.commands.get(commandName);
    if (!command) {
      return {
        success: false,
        output: `Error: Unknown command '${commandName}'`,
        error: 'Unknown command',
      };
    }

    try {
      const result = await command.execute(args, options);
      
      // Add to history
      this.commandHistory.push({
        command: commandLine,
        timestamp: new Date(),
        result,
      });
      
      return result;
    } catch (error) {
      return {
        success: false,
        output: `Error executing command: ${error}`,
        error: String(error),
      };
    }
  }

  private parseCommandLine(commandLine: string): {
    command: string;
    args: string[];
    options: Record<string, any>;
  } {
    const parts = commandLine.trim().split(/\\s+/);
    const command = parts[0];
    const remaining = parts.slice(1);
    
    const args: string[] = [];
    const options: Record<string, any> = {};
    
    for (let i = 0; i < remaining.length; i++) {
      const part = remaining[i];
      
      if (part.startsWith('--')) {
        const [key, value] = part.substring(2).split('=');
        if (value !== undefined) {
          options[key] = this.parseValue(value);
        } else if (i + 1 < remaining.length && !remaining[i + 1].startsWith('-')) {
          options[key] = this.parseValue(remaining[i + 1]);
          i++;
        } else {
          options[key] = true;
        }
      } else if (part.startsWith('-')) {
        const key = part.substring(1);
        if (i + 1 < remaining.length && !remaining[i + 1].startsWith('-')) {
          options[key] = this.parseValue(remaining[i + 1]);
          i++;
        } else {
          options[key] = true;
        }
      } else {
        args.push(part);
      }
    }
    
    return { command, args, options };
  }

  private parseValue(value: string): any {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (/^\\d+$/.test(value)) return parseInt(value, 10);
    if (/^\\d+\\.\\d+$/.test(value)) return parseFloat(value);
    return value;
  }

  // Formatting methods
  private formatPipelineTable(pipelines: any[]): string {
    if (pipelines.length === 0) return 'No pipelines found';
    
    const header = 'ID'.padEnd(20) + 'Name'.padEnd(30) + 'Version'.padEnd(10) + 'Owner'.padEnd(15) + 'Updated';
    const separator = '-'.repeat(header.length);
    
    const rows = pipelines.map(p => 
      p.id.padEnd(20) + 
      p.name.padEnd(30) + 
      p.currentVersion.padEnd(10) + 
      p.owner.padEnd(15) + 
      p.updatedAt.toLocaleDateString()
    );
    
    return [header, separator, ...rows].join('\
');
  }

  private formatCatalogTable(entries: any[]): string {
    if (entries.length === 0) return 'No catalog entries found';
    
    const header = 'ID'.padEnd(20) + 'Name'.padEnd(30) + 'Type'.padEnd(15) + 'Path';
    const separator = '-'.repeat(header.length);
    
    const rows = entries.map(e => 
      e.id.padEnd(20) + 
      e.name.padEnd(30) + 
      e.type.padEnd(15) + 
      (e.filepath || e.connection || 'N/A')
    );
    
    return [header, separator, ...rows].join('\
');
  }

  private formatExperimentTable(experiments: any[]): string {
    if (experiments.length === 0) return 'No experiments found';
    
    const header = 'ID'.padEnd(30) + 'Name'.padEnd(40) + 'Status'.padEnd(12) + 'Created';
    const separator = '-'.repeat(header.length);
    
    const rows = experiments.map(e => 
      e.id.padEnd(30) + 
      e.name.padEnd(40) + 
      e.status.padEnd(12) + 
      e.createdAt.toLocaleDateString()
    );
    
    return [header, separator, ...rows].join('\
');
  }

  private formatValidationReport(report: any): string {
    const lines = [
      `Validation Report for ${report.datasetName}`,
      `Executed: ${report.executionTime.toLocaleString()}`,
      `Overall Status: ${report.overallStatus.toUpperCase()}`,
      '',
      `Rules: ${report.totalRules} total, ${report.passedRules} passed, ${report.failedRules} failed, ${report.warningRules} warnings`,
      '',
      'Quality Metrics:',
      `  Completeness: ${(report.summary.completeness * 100).toFixed(1)}%`,
      `  Uniqueness: ${(report.summary.uniqueness * 100).toFixed(1)}%`,
      `  Validity: ${(report.summary.validity * 100).toFixed(1)}%`,
      '',
    ];
    
    if (report.recommendations.length > 0) {
      lines.push('Recommendations:');
      report.recommendations.forEach((rec: string) => {
        lines.push(`  • ${rec}`);
      });
    }
    
    return lines.join('\
');
  }

  private formatConfigOutput(environment: string, config: any, parameters: any): string {
    const lines = [
      `Configuration for environment: ${environment}`,
      '',
      'Settings:',
      `  Logging Level: ${config.logging?.level || 'info'}`,
      `  Parallelism: ${config.execution?.parallelism || 1}`,
      `  Timeout: ${config.execution?.timeout || 300000}ms`,
      '',
      'Parameters:',
    ];
    
    Object.entries(parameters).forEach(([key, value]) => {
      lines.push(`  ${key}: ${value}`);
    });
    
    return lines.join('\
');
  }

  private formatHooksTable(hooks: any[]): string {
    if (hooks.length === 0) return 'No hooks found';
    
    const header = 'Name'.padEnd(30) + 'Stage'.padEnd(20) + 'Priority'.padEnd(10) + 'Enabled';
    const separator = '-'.repeat(header.length);
    
    const rows = hooks.map(h => 
      h.name.padEnd(30) + 
      h.stage.padEnd(20) + 
      h.priority.toString().padEnd(10) + 
      (h.enabled ? 'Yes' : 'No')
    );
    
    return [header, separator, ...rows].join('\
');
  }

  private formatPipelineDescription(entry: any, pipeline: any): string {
    const lines = [
      `Pipeline: ${entry.name}`,
      `ID: ${entry.id}`,
      `Description: ${entry.description || 'N/A'}`,
      `Owner: ${entry.owner}`,
      `Current Version: ${entry.currentVersion}`,
      `Created: ${entry.createdAt.toLocaleDateString()}`,
      `Updated: ${entry.updatedAt.toLocaleDateString()}`,
      `Tags: ${entry.tags.join(', ') || 'None'}`,
      '',
      `Nodes: ${pipeline.nodes.length}`,
      `Edges: ${pipeline.edges.length}`,
      '',
      'Versions:',
    ];
    
    entry.versions.forEach((version: any) => {
      lines.push(`  ${version.version} - ${version.createdAt.toLocaleDateString()} (${version.createdBy})`);
      if (version.changelog) {
        lines.push(`    ${version.changelog}`);
      }
    });
    
    return lines.join('\
');
  }

  // Command history
  getCommandHistory(): { command: string; timestamp: Date; result: CLIResult }[] {
    return this.commandHistory.slice(-50); // Last 50 commands
  }

  clearCommandHistory(): void {
    this.commandHistory = [];
  }

  // Help system
  getHelp(commandName?: string): string {
    if (commandName) {
      const command = this.commands.get(commandName);
      if (!command) {
        return `Unknown command: ${commandName}`;
      }
      
      const lines = [
        `Command: ${command.name}`,
        `Description: ${command.description}`,
        `Usage: ${command.usage}`,
        '',
        'Options:',
      ];
      
      command.options.forEach(option => {
        const optionLine = `  --${option.name}` + (option.alias ? `, -${option.alias}` : '');
        lines.push(`${optionLine.padEnd(20)} ${option.description}`);
      });
      
      if (command.examples.length > 0) {
        lines.push('', 'Examples:');
        command.examples.forEach(example => {
          lines.push(`  ${example}`);
        });
      }
      
      return lines.join('\
');
    }
    
    // General help
    const categories = ['pipeline', 'data', 'config', 'experiment', 'validation', 'hooks'];
    const lines = ['Available commands:', ''];
    
    categories.forEach(category => {
      const categoryCommands = this.getCommandsByCategory(category);
      if (categoryCommands.length > 0) {
        lines.push(`${category.toUpperCase()} COMMANDS:`);
        categoryCommands.forEach(cmd => {
          lines.push(`  ${cmd.name.padEnd(25)} ${cmd.description}`);
        });
        lines.push('');
      }
    });
    
    lines.push('Use "help <command>" for detailed information about a specific command.');
    
    return lines.join('\
');
  }
}

// Singleton instance
export const cliCommandsService = new CLICommandsService();