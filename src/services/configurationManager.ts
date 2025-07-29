import { DataCatalogEntry, Pipeline, NodeTemplate } from '../types';

export interface PipelineConfig {
  name: string;
  description?: string;
  parameters?: Record<string, any>;
  environment?: string;
  tags?: string[];
  dataCatalog?: Record<string, DataCatalogEntry>;
  nodeTemplates?: Record<string, NodeTemplate>;
}

export interface EnvironmentConfig {
  name: string;
  description?: string;
  parameters?: Record<string, any>;
  dataCatalog?: Record<string, DataCatalogEntry>;
  logging?: {
    level: 'debug' | 'info' | 'warning' | 'error';
    handlers: string[];
  };
  execution?: {
    parallelism?: number;
    timeout?: number;
    retryCount?: number;
  };
}

export interface GlobalConfig {
  version: string;
  defaultEnvironment: string;
  environments: Record<string, EnvironmentConfig>;
  globalParameters?: Record<string, any>;
  plugins?: string[];
}

export class ConfigurationManager {
  private globalConfig: GlobalConfig;
  private currentEnvironment: string;
  private pipelineConfigs: Map<string, PipelineConfig> = new Map();

  constructor() {
    this.globalConfig = this.getDefaultGlobalConfig();
    this.currentEnvironment = this.globalConfig.defaultEnvironment;
  }

  // Default global configuration
  private getDefaultGlobalConfig(): GlobalConfig {
    return {
      version: '1.0.0',
      defaultEnvironment: 'development',
      environments: {
        development: {
          name: 'Development',
          description: 'Development environment configuration',
          parameters: {
            debug: true,
            verbose: true,
          },
          logging: {
            level: 'debug',
            handlers: ['console'],
          },
          execution: {
            parallelism: 1,
            timeout: 300000, // 5 minutes
            retryCount: 3,
          },
        },
        staging: {
          name: 'Staging',
          description: 'Staging environment configuration',
          parameters: {
            debug: false,
            verbose: false,
          },
          logging: {
            level: 'info',
            handlers: ['console', 'file'],
          },
          execution: {
            parallelism: 2,
            timeout: 600000, // 10 minutes
            retryCount: 2,
          },
        },
        production: {
          name: 'Production',
          description: 'Production environment configuration',
          parameters: {
            debug: false,
            verbose: false,
          },
          logging: {
            level: 'warning',
            handlers: ['file'],
          },
          execution: {
            parallelism: 4,
            timeout: 1800000, // 30 minutes
            retryCount: 1,
          },
        },
      },
      globalParameters: {
        projectName: 'DataFlow Manager',
        version: '1.0.0',
        timezone: 'UTC',
      },
      plugins: ['data-catalog', 'pipeline-execution', 'experiment-tracking'],
    };
  }

  // Global configuration methods
  getGlobalConfig(): GlobalConfig {
    return this.globalConfig;
  }

  updateGlobalConfig(config: Partial<GlobalConfig>): void {
    this.globalConfig = { ...this.globalConfig, ...config };
  }

  // Environment methods
  getCurrentEnvironment(): string {
    return this.currentEnvironment;
  }

  setCurrentEnvironment(environment: string): void {
    if (!this.globalConfig.environments[environment]) {
      throw new Error(`Environment '${environment}' not found`);
    }
    this.currentEnvironment = environment;
  }

  getEnvironmentConfig(environment?: string): EnvironmentConfig {
    const env = environment || this.currentEnvironment;
    const config = this.globalConfig.environments[env];
    if (!config) {
      throw new Error(`Environment '${env}' not found`);
    }
    return config;
  }

  addEnvironment(name: string, config: EnvironmentConfig): void {
    this.globalConfig.environments[name] = config;
  }

  removeEnvironment(name: string): boolean {
    if (name === this.globalConfig.defaultEnvironment) {
      throw new Error('Cannot remove default environment');
    }
    return delete this.globalConfig.environments[name];
  }

  // Pipeline configuration methods
  getPipelineConfig(pipelineId: string): PipelineConfig | undefined {
    return this.pipelineConfigs.get(pipelineId);
  }

  setPipelineConfig(pipelineId: string, config: PipelineConfig): void {
    this.pipelineConfigs.set(pipelineId, config);
  }

  // Parameter resolution with environment and global fallback
  resolveParameters(pipelineId?: string): Record<string, any> {
    const globalParams = this.globalConfig.globalParameters || {};
    const envConfig = this.getEnvironmentConfig();
    const envParams = envConfig.parameters || {};
    const pipelineConfig = pipelineId ? this.getPipelineConfig(pipelineId) : undefined;
    const pipelineParams = pipelineConfig?.parameters || {};

    // Merge parameters with precedence: pipeline > environment > global
    return {
      ...globalParams,
      ...envParams,
      ...pipelineParams,
    };
  }

  // Data catalog resolution
  resolveDataCatalog(pipelineId?: string): Record<string, DataCatalogEntry> {
    const envConfig = this.getEnvironmentConfig();
    const envCatalog = envConfig.dataCatalog || {};
    const pipelineConfig = pipelineId ? this.getPipelineConfig(pipelineId) : undefined;
    const pipelineCatalog = pipelineConfig?.dataCatalog || {};

    // Merge catalogs with precedence: pipeline > environment
    return {
      ...envCatalog,
      ...pipelineCatalog,
    };
  }

  // Template resolution
  resolveNodeTemplates(pipelineId?: string): Record<string, NodeTemplate> {
    const pipelineConfig = pipelineId ? this.getPipelineConfig(pipelineId) : undefined;
    return pipelineConfig?.nodeTemplates || {};
  }

  // Configuration validation
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate global config
    if (!this.globalConfig.version) {
      errors.push('Global config version is required');
    }

    if (!this.globalConfig.defaultEnvironment) {
      errors.push('Default environment is required');
    }

    // Validate environments
    Object.entries(this.globalConfig.environments).forEach(([name, config]) => {
      if (!config.name) {
        errors.push(`Environment '${name}' is missing name`);
      }

      if (config.logging?.level && !['debug', 'info', 'warning', 'error'].includes(config.logging.level)) {
        errors.push(`Environment '${name}' has invalid logging level`);
      }

      if (config.execution?.parallelism && config.execution.parallelism < 1) {
        errors.push(`Environment '${name}' has invalid parallelism setting`);
      }
    });

    // Validate default environment exists
    if (!this.globalConfig.environments[this.globalConfig.defaultEnvironment]) {
      errors.push(`Default environment '${this.globalConfig.defaultEnvironment}' does not exist`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // Export configuration to JSON
  exportConfig(): {
    global: GlobalConfig;
    pipelines: Record<string, PipelineConfig>;
  } {
    const pipelines: Record<string, PipelineConfig> = {};
    this.pipelineConfigs.forEach((config, id) => {
      pipelines[id] = config;
    });

    return {
      global: this.globalConfig,
      pipelines,
    };
  }

  // Import configuration from JSON
  importConfig(config: {
    global?: GlobalConfig;
    pipelines?: Record<string, PipelineConfig>;
  }): void {
    if (config.global) {
      this.globalConfig = config.global;
      this.currentEnvironment = this.globalConfig.defaultEnvironment;
    }

    if (config.pipelines) {
      Object.entries(config.pipelines).forEach(([id, pipelineConfig]) => {
        this.pipelineConfigs.set(id, pipelineConfig);
      });
    }
  }

  // Dynamic parameter resolution (similar to OmegaConf resolvers)
  resolveDynamicValue(value: string, context: Record<string, any> = {}): any {
    // Simple resolver for common patterns
    if (typeof value !== 'string') return value;

    // Environment variable resolver: ${env:VAR_NAME}
    value = value.replace(/\\$\\{env:([^}]+)\\}/g, (match, varName) => {
      return process.env[varName] || '';
    });

    // Parameter resolver: ${params:param_name}
    value = value.replace(/\\$\\{params:([^}]+)\\}/g, (match, paramName) => {
      const params = this.resolveParameters();
      return params[paramName] || '';
    });

    // Date resolver: ${date:format}
    value = value.replace(/\\$\\{date:([^}]+)\\}/g, (match, format) => {
      const now = new Date();
      if (format === 'iso') return now.toISOString();
      if (format === 'timestamp') return now.getTime().toString();
      return now.toLocaleDateString();
    });

    // Context resolver: ${context:key}
    value = value.replace(/\\$\\{context:([^}]+)\\}/g, (match, key) => {
      return context[key] || '';
    });

    return value;
  }

  // Get execution settings for current environment
  getExecutionSettings(): {
    parallelism: number;
    timeout: number;
    retryCount: number;
  } {
    const envConfig = this.getEnvironmentConfig();
    return {
      parallelism: envConfig.execution?.parallelism || 1,
      timeout: envConfig.execution?.timeout || 300000,
      retryCount: envConfig.execution?.retryCount || 3,
    };
  }

  // Get logging settings for current environment
  getLoggingSettings(): {
    level: 'debug' | 'info' | 'warning' | 'error';
    handlers: string[];
  } {
    const envConfig = this.getEnvironmentConfig();
    return {
      level: envConfig.logging?.level || 'info',
      handlers: envConfig.logging?.handlers || ['console'],
    };
  }
}

// Singleton instance
export const configurationManager = new ConfigurationManager();