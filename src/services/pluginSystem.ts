import { DataNode, DataEdge, Pipeline } from '../types';
import { HookDefinition, HookStage } from './hooksSystem';

export interface PluginMetadata {
  name: string;
  version: string;
  description: string;
  author: string;
  website?: string;
  repository?: string;
  keywords?: string[];
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  license?: string;
  pipelineVersion?: string;
}

export interface PluginCapabilities {
  hooks?: HookStage[];
  nodes?: string[];
  datasets?: string[];
  runners?: string[];
  commands?: string[];
  ui?: string[];
}

export interface PluginConfiguration {
  enabled: boolean;
  settings?: Record<string, any>;
  environment?: Record<string, any>;
}

export interface PluginManifest {
  id: string;
  metadata: PluginMetadata;
  capabilities: PluginCapabilities;
  configuration: PluginConfiguration;
  entryPoint: string;
  assets?: {
    icons?: string[];
    stylesheets?: string[];
    scripts?: string[];
  };
  installationDate: Date;
  lastUpdateDate: Date;
  status: 'active' | 'inactive' | 'error' | 'updating';
}

export interface PluginNodeDefinition {
  type: string;
  name: string;
  description?: string;
  inputs?: {
    name: string;
    type: string;
    required?: boolean;
    description?: string;
  }[];
  outputs?: {
    name: string;
    type: string;
    description?: string;
  }[];
  parameters?: {
    name: string;
    type: string;
    default?: any;
    description?: string;
    validation?: any;
  }[];
  category?: string;
  tags?: string[];
  icon?: string;
  color?: string;
  component?: React.ComponentType<any>;
}

export interface PluginDatasetDefinition {
  type: string;
  name: string;
  description?: string;
  filePatterns?: string[];
  connectionTypes?: string[];
  capabilities?: ('read' | 'write' | 'stream' | 'batch')[];
  schema?: any;
  examples?: any[];
}

export interface PluginCommand {
  name: string;
  description: string;
  usage: string;
  options?: {
    name: string;
    type: string;
    description: string;
    required?: boolean;
  }[];
  handler: (args: any[], options: any) => Promise<any>;
}

export interface PluginAPI {
  // Core services
  getDataCatalog(): any;
  getPipelineRegistry(): any;
  getExperimentTracker(): any;
  getHooksSystem(): any;
  
  // Plugin utilities
  log(level: 'info' | 'warn' | 'error' | 'debug', message: string): void;
  getConfiguration(): PluginConfiguration;
  setConfiguration(config: Partial<PluginConfiguration>): void;
  
  // Event system
  emit(event: string, data?: any): void;
  on(event: string, handler: (data: any) => void): void;
  off(event: string, handler?: (data: any) => void): void;
  
  // UI integration
  registerPanel(id: string, component: React.ComponentType<any>): void;
  registerMenuItem(item: any): void;
  
  // Data access
  readDataset(id: string): Promise<any>;
  writeDataset(id: string, data: any): Promise<void>;
}

export interface Plugin {
  manifest: PluginManifest;
  
  // Lifecycle methods
  install?(api: PluginAPI): Promise<void>;
  uninstall?(api: PluginAPI): Promise<void>;
  activate?(api: PluginAPI): Promise<void>;
  deactivate?(api: PluginAPI): Promise<void>;
  
  // Feature providers
  getNodes?(): PluginNodeDefinition[];
  getDatasets?(): PluginDatasetDefinition[];
  getHooks?(): HookDefinition[];
  getCommands?(): PluginCommand[];
  
  // Event handlers
  onPipelineCreate?(pipeline: Pipeline): void;
  onPipelineUpdate?(pipeline: Pipeline): void;
  onPipelineDelete?(pipelineId: string): void;
  onNodeExecute?(node: DataNode, data: any): void;
  
  // Configuration
  getDefaultConfiguration?(): PluginConfiguration;
  validateConfiguration?(config: PluginConfiguration): boolean;
}

export class PluginSystem {
  private plugins: Map<string, Plugin> = new Map();
  private pluginManifests: Map<string, PluginManifest> = new Map();
  private pluginNodes: Map<string, PluginNodeDefinition> = new Map();
  private pluginDatasets: Map<string, PluginDatasetDefinition> = new Map();
  private pluginCommands: Map<string, PluginCommand> = new Map();
  private eventHandlers: Map<string, ((data: any) => void)[]> = new Map();
  
  // Plugin discovery and loading
  async discoverPlugins(): Promise<PluginManifest[]> {
    // In a real implementation, this would scan directories or registries
    const builtInPlugins = this.getBuiltInPlugins();
    return builtInPlugins;
  }
  
  async loadPlugin(pluginId: string): Promise<boolean> {
    try {
      const manifest = this.pluginManifests.get(pluginId);
      if (!manifest) {
        throw new Error(`Plugin manifest not found: ${pluginId}`);
      }
      
      // In a real implementation, this would dynamically import the plugin
      const plugin = await this.createPluginInstance(manifest);
      
      if (plugin.activate) {
        await plugin.activate(this.createPluginAPI(pluginId));
      }
      
      // Register plugin features
      this.registerPluginFeatures(pluginId, plugin);
      
      this.plugins.set(pluginId, plugin);
      manifest.status = 'active';
      
      this.emit('plugin:loaded', { pluginId, manifest });
      return true;
    } catch (error) {
      console.error(`Failed to load plugin ${pluginId}:`, error);
      const manifest = this.pluginManifests.get(pluginId);
      if (manifest) {
        manifest.status = 'error';
      }
      return false;
    }
  }
  
  async unloadPlugin(pluginId: string): Promise<boolean> {
    try {
      const plugin = this.plugins.get(pluginId);
      const manifest = this.pluginManifests.get(pluginId);
      
      if (plugin && plugin.deactivate) {
        await plugin.deactivate(this.createPluginAPI(pluginId));
      }
      
      // Unregister plugin features
      this.unregisterPluginFeatures(pluginId);
      
      this.plugins.delete(pluginId);
      if (manifest) {
        manifest.status = 'inactive';
      }
      
      this.emit('plugin:unloaded', { pluginId, manifest });
      return true;
    } catch (error) {
      console.error(`Failed to unload plugin ${pluginId}:`, error);
      return false;
    }
  }
  
  // Plugin installation
  async installPlugin(manifest: PluginManifest): Promise<boolean> {
    try {
      // Validate plugin manifest
      if (!this.validatePluginManifest(manifest)) {
        throw new Error('Invalid plugin manifest');
      }
      
      // Check dependencies
      if (!await this.checkDependencies(manifest)) {
        throw new Error('Plugin dependencies not met');
      }
      
      manifest.installationDate = new Date();
      manifest.lastUpdateDate = new Date();
      manifest.status = 'inactive';
      
      this.pluginManifests.set(manifest.id, manifest);
      
      // Auto-load if enabled
      if (manifest.configuration.enabled) {
        await this.loadPlugin(manifest.id);
      }
      
      this.emit('plugin:installed', { manifest });
      return true;
    } catch (error) {
      console.error(`Failed to install plugin ${manifest.id}:`, error);
      return false;
    }
  }
  
  async uninstallPlugin(pluginId: string): Promise<boolean> {
    try {
      const manifest = this.pluginManifests.get(pluginId);
      if (!manifest) {
        return false;
      }
      
      // Unload if active
      if (manifest.status === 'active') {
        await this.unloadPlugin(pluginId);
      }
      
      const plugin = this.plugins.get(pluginId);
      if (plugin && plugin.uninstall) {
        await plugin.uninstall(this.createPluginAPI(pluginId));
      }
      
      this.pluginManifests.delete(pluginId);
      this.plugins.delete(pluginId);
      
      this.emit('plugin:uninstalled', { pluginId, manifest });
      return true;
    } catch (error) {
      console.error(`Failed to uninstall plugin ${pluginId}:`, error);
      return false;
    }
  }
  
  // Plugin registry
  getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }
  
  getPluginManifest(pluginId: string): PluginManifest | undefined {
    return this.pluginManifests.get(pluginId);
  }
  
  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }
  
  getAllPluginManifests(): PluginManifest[] {
    return Array.from(this.pluginManifests.values());
  }
  
  getActivePlugins(): Plugin[] {
    return Array.from(this.plugins.entries())
      .filter(([id, plugin]) => this.pluginManifests.get(id)?.status === 'active')
      .map(([id, plugin]) => plugin);
  }
  
  // Feature access
  getPluginNodes(): PluginNodeDefinition[] {
    return Array.from(this.pluginNodes.values());
  }
  
  getPluginNode(type: string): PluginNodeDefinition | undefined {
    return this.pluginNodes.get(type);
  }
  
  getPluginDatasets(): PluginDatasetDefinition[] {
    return Array.from(this.pluginDatasets.values());
  }
  
  getPluginDataset(type: string): PluginDatasetDefinition | undefined {
    return this.pluginDatasets.get(type);
  }
  
  getPluginCommands(): PluginCommand[] {
    return Array.from(this.pluginCommands.values());
  }
  
  getPluginCommand(name: string): PluginCommand | undefined {
    return this.pluginCommands.get(name);
  }
  
  // Plugin configuration
  getPluginConfiguration(pluginId: string): PluginConfiguration | undefined {
    return this.pluginManifests.get(pluginId)?.configuration;
  }
  
  setPluginConfiguration(pluginId: string, config: Partial<PluginConfiguration>): boolean {
    const manifest = this.pluginManifests.get(pluginId);
    if (!manifest) return false;
    
    manifest.configuration = {
      ...manifest.configuration,
      ...config,
    };
    
    this.emit('plugin:configuration:changed', { pluginId, configuration: manifest.configuration });
    return true;
  }
  
  // Event system
  emit(event: string, data?: any): void {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    });
  }
  
  on(event: string, handler: (data: any) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }
  
  off(event: string, handler?: (data: any) => void): void {
    if (!handler) {
      this.eventHandlers.delete(event);
      return;
    }
    
    const handlers = this.eventHandlers.get(event) || [];
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
    }
  }
  
  // Private methods
  private createPluginAPI(pluginId: string): PluginAPI {
    return {
      getDataCatalog: () => {
        // Return data catalog service
        return {};
      },
      getPipelineRegistry: () => {
        // Return pipeline registry service
        return {};
      },
      getExperimentTracker: () => {
        // Return experiment tracker service
        return {};
      },
      getHooksSystem: () => {
        // Return hooks system service
        return {};
      },
      log: (level, message) => {
        console.log(`[${pluginId}] ${level.toUpperCase()}: ${message}`);
      },
      getConfiguration: () => {
        return this.getPluginConfiguration(pluginId) || { enabled: false };
      },
      setConfiguration: (config) => {
        this.setPluginConfiguration(pluginId, config);
      },
      emit: (event, data) => {
        this.emit(`plugin:${pluginId}:${event}`, data);
      },
      on: (event, handler) => {
        this.on(`plugin:${pluginId}:${event}`, handler);
      },
      off: (event, handler) => {
        this.off(`plugin:${pluginId}:${event}`, handler);
      },
      registerPanel: (id, component) => {
        // Register UI panel
        this.emit('ui:panel:register', { pluginId, id, component });
      },
      registerMenuItem: (item) => {
        // Register menu item
        this.emit('ui:menu:register', { pluginId, item });
      },
      readDataset: async (id) => {
        // Read dataset through data catalog
        return {};
      },
      writeDataset: async (id, data) => {
        // Write dataset through data catalog
      },
    };
  }
  
  private async createPluginInstance(manifest: PluginManifest): Promise<Plugin> {
    // In a real implementation, this would dynamically import the plugin
    // For now, return a mock plugin based on built-in plugins
    
    if (manifest.id === 'pipeline-datasets') {
      return this.createDatasetsPlugin(manifest);
    } else if (manifest.id === 'pipeline-mlflow') {
      return this.createMLflowPlugin(manifest);
    } else if (manifest.id === 'pipeline-viz') {
      return this.createVizPlugin(manifest);
    }
    
    // Default plugin implementation
    return {
      manifest,
      async activate(api) {
        api.log('info', 'Plugin activated');
      },
      async deactivate(api) {
        api.log('info', 'Plugin deactivated');
      },
    };
  }
  
  private registerPluginFeatures(pluginId: string, plugin: Plugin): void {
    // Register nodes
    if (plugin.getNodes) {
      const nodes = plugin.getNodes();
      nodes.forEach(node => {
        this.pluginNodes.set(node.type, node);
      });
    }
    
    // Register datasets
    if (plugin.getDatasets) {
      const datasets = plugin.getDatasets();
      datasets.forEach(dataset => {
        this.pluginDatasets.set(dataset.type, dataset);
      });
    }
    
    // Register commands
    if (plugin.getCommands) {
      const commands = plugin.getCommands();
      commands.forEach(command => {
        this.pluginCommands.set(command.name, command);
      });
    }
    
    // Register hooks
    if (plugin.getHooks) {
      const hooks = plugin.getHooks();
      // In a real implementation, register with hooks system
    }
  }
  
  private unregisterPluginFeatures(pluginId: string): void {
    // Remove plugin features from registry
    // This would need to track which features belong to which plugin
  }
  
  private validatePluginManifest(manifest: PluginManifest): boolean {
    return !!(
      manifest.id &&
      manifest.metadata.name &&
      manifest.metadata.version &&
      manifest.configuration
    );
  }
  
  private async checkDependencies(manifest: PluginManifest): Promise<boolean> {
    // Check if plugin dependencies are satisfied
    // This would verify against installed plugins and system requirements
    return true;
  }
  
  // Built-in plugins
  private getBuiltInPlugins(): PluginManifest[] {
    return [
      {
        id: 'pipeline-datasets',
        metadata: {
          name: 'Pipeline Datasets',
          version: '1.0.0',
          description: 'Additional dataset types for Pipeline',
          author: 'Pipeline Team',
          keywords: ['datasets', 'data', 'io'],
          license: 'MIT',
        },
        capabilities: {
          datasets: ['parquet', 'hdf5', 'json', 'yaml', 'pickle'],
          nodes: ['data_loader', 'data_saver'],
        },
        configuration: {
          enabled: true,
          settings: {
            defaultFormat: 'parquet',
          },
        },
        entryPoint: 'pipeline_datasets.main',
        installationDate: new Date(),
        lastUpdateDate: new Date(),
        status: 'active',
      },
      {
        id: 'pipeline-mlflow',
        metadata: {
          name: 'Pipeline MLflow',
          version: '0.11.0',
          description: 'MLflow integration for Pipeline',
          author: 'Pipeline Team',
          keywords: ['mlflow', 'mlops', 'tracking'],
          license: 'MIT',
        },
        capabilities: {
          hooks: ['before_node_run', 'after_node_run'],
          nodes: ['mlflow_logger', 'model_registry'],
        },
        configuration: {
          enabled: true,
          settings: {
            trackingUri: 'http://localhost:5000',
            experimentName: 'Default',
          },
        },
        entryPoint: 'pipeline_mlflow.main',
        installationDate: new Date(),
        lastUpdateDate: new Date(),
        status: 'active',
      },
      {
        id: 'pipeline-viz',
        metadata: {
          name: 'Pipeline Viz',
          version: '5.0.0',
          description: 'Interactive pipeline visualization',
          author: 'Pipeline Team',
          keywords: ['visualization', 'ui', 'pipeline'],
          license: 'MIT',
        },
        capabilities: {
          ui: ['pipeline_graph', 'experiment_tracking'],
          commands: ['viz'],
        },
        configuration: {
          enabled: true,
          settings: {
            host: '0.0.0.0',
            port: 4141,
          },
        },
        entryPoint: 'pipeline_viz.main',
        installationDate: new Date(),
        lastUpdateDate: new Date(),
        status: 'active',
      },
    ];
  }
  
  private createDatasetsPlugin(manifest: PluginManifest): Plugin {
    return {
      manifest,
      async activate(api) {
        api.log('info', 'Datasets plugin activated');
      },
      getDatasets: () => [
        {
          type: 'parquet',
          name: 'Parquet Dataset',
          description: 'Read and write Parquet files',
          filePatterns: ['*.parquet'],
          capabilities: ['read', 'write'],
        },
        {
          type: 'hdf5',
          name: 'HDF5 Dataset',
          description: 'Read and write HDF5 files',
          filePatterns: ['*.h5', '*.hdf5'],
          capabilities: ['read', 'write'],
        },
      ],
      getNodes: () => [
        {
          type: 'data_loader',
          name: 'Data Loader',
          description: 'Load data from various sources',
          category: 'data',
          inputs: [{ name: 'source', type: 'string', required: true }],
          outputs: [{ name: 'data', type: 'dataset' }],
        },
      ],
    };
  }
  
  private createMLflowPlugin(manifest: PluginManifest): Plugin {
    return {
      manifest,
      async activate(api) {
        api.log('info', 'MLflow plugin activated');
      },
      getNodes: () => [
        {
          type: 'mlflow_logger',
          name: 'MLflow Logger',
          description: 'Log metrics and artifacts to MLflow',
          category: 'mlops',
          inputs: [{ name: 'metrics', type: 'object' }],
          outputs: [{ name: 'run_id', type: 'string' }],
        },
      ],
      getCommands: () => [
        {
          name: 'mlflow:ui',
          description: 'Start MLflow UI',
          usage: 'mlflow:ui [options]',
          handler: async (args, options) => {
            return { success: true, message: 'MLflow UI started' };
          },
        },
      ],
    };
  }
  
  private createVizPlugin(manifest: PluginManifest): Plugin {
    return {
      manifest,
      async activate(api) {
        api.log('info', 'Viz plugin activated');
      },
      getCommands: () => [
        {
          name: 'viz',
          description: 'Start Pipeline Viz',
          usage: 'viz [options]',
          handler: async (args, options) => {
            return { success: true, message: 'Pipeline Viz started' };
          },
        },
      ],
    };
  }
  
  // Statistics
  getPluginStats(): {
    totalPlugins: number;
    activePlugins: number;
    pluginsByCategory: Record<string, number>;
    recentInstalls: number;
  } {
    const manifests = Array.from(this.pluginManifests.values());
    const recentInstalls = manifests.filter(
      manifest => Date.now() - manifest.installationDate.getTime() < 86400000 // Last 24 hours
    ).length;
    
    const pluginsByCategory = manifests.reduce((acc, manifest) => {
      const category = manifest.metadata.keywords?.[0] || 'other';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalPlugins: manifests.length,
      activePlugins: manifests.filter(m => m.status === 'active').length,
      pluginsByCategory,
      recentInstalls,
    };
  }
  
  // Initialization
  async initialize(): Promise<void> {
    // Load built-in plugins
    const builtInPlugins = this.getBuiltInPlugins();
    for (const manifest of builtInPlugins) {
      await this.installPlugin(manifest);
    }
    
    console.log('Plugin system initialized');
  }
}

// Singleton instance
export const pluginSystem = new PluginSystem();