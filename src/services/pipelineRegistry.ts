import { Pipeline } from '../types';

export interface PipelineVersion {
  version: string;
  pipeline: Pipeline;
  createdAt: Date;
  createdBy: string;
  changelog?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface PipelineRegistryEntry {
  id: string;
  name: string;
  description?: string;
  versions: PipelineVersion[];
  currentVersion: string;
  createdAt: Date;
  updatedAt: Date;
  owner: string;
  tags: string[];
  metadata?: Record<string, any>;
}

export interface PipelineTemplate {
  id: string;
  name: string;
  description: string;
  category: 'data-processing' | 'ml-training' | 'data-validation' | 'etl' | 'custom';
  pipeline: Pipeline;
  parameters: {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'array';
    default?: any;
    description?: string;
  }[];
  createdAt: Date;
  author: string;
  downloads: number;
  rating: number;
}

export class PipelineRegistry {
  private entries: Map<string, PipelineRegistryEntry> = new Map();
  private templates: Map<string, PipelineTemplate> = new Map();

  // Registry management
  registerPipeline(pipeline: Pipeline, version: string = '1.0.0', owner: string = 'system'): PipelineRegistryEntry {
    const existing = this.entries.get(pipeline.id);
    
    if (existing) {
      return this.addVersion(pipeline.id, pipeline, version);
    }

    const entry: PipelineRegistryEntry = {
      id: pipeline.id,
      name: pipeline.name,
      description: pipeline.description,
      versions: [{
        version,
        pipeline,
        createdAt: new Date(),
        createdBy: owner,
      }],
      currentVersion: version,
      createdAt: new Date(),
      updatedAt: new Date(),
      owner,
      tags: pipeline.tags || [],
      metadata: {},
    };

    this.entries.set(pipeline.id, entry);
    return entry;
  }

  addVersion(pipelineId: string, pipeline: Pipeline, version: string, changelog?: string): PipelineRegistryEntry {
    const entry = this.entries.get(pipelineId);
    if (!entry) {
      throw new Error(`Pipeline ${pipelineId} not found in registry`);
    }

    // Check if version already exists
    if (entry.versions.some(v => v.version === version)) {
      throw new Error(`Version ${version} already exists for pipeline ${pipelineId}`);
    }

    const newVersion: PipelineVersion = {
      version,
      pipeline,
      createdAt: new Date(),
      createdBy: entry.owner,
      changelog,
    };

    entry.versions.push(newVersion);
    entry.currentVersion = version;
    entry.updatedAt = new Date();
    entry.name = pipeline.name;
    entry.description = pipeline.description;
    entry.tags = pipeline.tags || [];

    this.entries.set(pipelineId, entry);
    return entry;
  }

  getPipeline(pipelineId: string, version?: string): Pipeline | null {
    const entry = this.entries.get(pipelineId);
    if (!entry) return null;

    const targetVersion = version || entry.currentVersion;
    const versionEntry = entry.versions.find(v => v.version === targetVersion);
    return versionEntry?.pipeline || null;
  }

  getPipelineEntry(pipelineId: string): PipelineRegistryEntry | null {
    return this.entries.get(pipelineId) || null;
  }

  getAllPipelines(): PipelineRegistryEntry[] {
    return Array.from(this.entries.values());
  }

  getPipelinesByTag(tag: string): PipelineRegistryEntry[] {
    return Array.from(this.entries.values()).filter(entry => 
      entry.tags.includes(tag)
    );
  }

  getPipelinesByOwner(owner: string): PipelineRegistryEntry[] {
    return Array.from(this.entries.values()).filter(entry => 
      entry.owner === owner
    );
  }

  searchPipelines(query: string): PipelineRegistryEntry[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.entries.values()).filter(entry => 
      entry.name.toLowerCase().includes(lowerQuery) ||
      entry.description?.toLowerCase().includes(lowerQuery) ||
      entry.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  deletePipeline(pipelineId: string): boolean {
    return this.entries.delete(pipelineId);
  }

  deleteVersion(pipelineId: string, version: string): boolean {
    const entry = this.entries.get(pipelineId);
    if (!entry) return false;

    const versionIndex = entry.versions.findIndex(v => v.version === version);
    if (versionIndex === -1) return false;

    entry.versions.splice(versionIndex, 1);
    
    // If we deleted the current version, set to the latest remaining version
    if (entry.currentVersion === version && entry.versions.length > 0) {
      entry.currentVersion = entry.versions[entry.versions.length - 1].version;
    }
    
    // If no versions left, delete the entire entry
    if (entry.versions.length === 0) {
      this.entries.delete(pipelineId);
      return true;
    }

    entry.updatedAt = new Date();
    this.entries.set(pipelineId, entry);
    return true;
  }

  // Version comparison
  compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;
      
      if (v1Part > v2Part) return 1;
      if (v1Part < v2Part) return -1;
    }
    
    return 0;
  }

  getLatestVersion(pipelineId: string): string | null {
    const entry = this.entries.get(pipelineId);
    if (!entry) return null;

    return entry.versions
      .map(v => v.version)
      .sort((a, b) => this.compareVersions(b, a))[0];
  }

  // Pipeline templates
  addTemplate(template: PipelineTemplate): void {
    this.templates.set(template.id, template);
  }

  getTemplate(templateId: string): PipelineTemplate | null {
    return this.templates.get(templateId) || null;
  }

  getAllTemplates(): PipelineTemplate[] {
    return Array.from(this.templates.values());
  }

  getTemplatesByCategory(category: PipelineTemplate['category']): PipelineTemplate[] {
    return Array.from(this.templates.values()).filter(template => 
      template.category === category
    );
  }

  createPipelineFromTemplate(templateId: string, parameters: Record<string, any>): Pipeline | null {
    const template = this.templates.get(templateId);
    if (!template) return null;

    // Clone the template pipeline
    const pipeline: Pipeline = {
      ...template.pipeline,
      id: `pipeline_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      parameters: { ...template.pipeline.parameters, ...parameters },
    };

    // Apply parameters to nodes
    pipeline.nodes = pipeline.nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        parameters: { ...node.data.parameters, ...parameters },
      },
    }));

    return pipeline;
  }

  // Statistics
  getRegistryStats(): {
    totalPipelines: number;
    totalVersions: number;
    totalTemplates: number;
    pipelinesByTag: Record<string, number>;
    pipelinesByOwner: Record<string, number>;
    recentActivity: { date: Date; action: string; pipeline: string }[];
  } {
    const entries = Array.from(this.entries.values());
    const templates = Array.from(this.templates.values());
    
    const pipelinesByTag: Record<string, number> = {};
    const pipelinesByOwner: Record<string, number> = {};
    
    entries.forEach(entry => {
      entry.tags.forEach(tag => {
        pipelinesByTag[tag] = (pipelinesByTag[tag] || 0) + 1;
      });
      
      pipelinesByOwner[entry.owner] = (pipelinesByOwner[entry.owner] || 0) + 1;
    });

    // Mock recent activity
    const recentActivity = entries
      .slice(0, 10)
      .map(entry => ({
        date: entry.updatedAt,
        action: 'Updated',
        pipeline: entry.name,
      }));

    return {
      totalPipelines: entries.length,
      totalVersions: entries.reduce((sum, entry) => sum + entry.versions.length, 0),
      totalTemplates: templates.length,
      pipelinesByTag,
      pipelinesByOwner,
      recentActivity,
    };
  }

  // Export/Import
  exportRegistry(): {
    pipelines: PipelineRegistryEntry[];
    templates: PipelineTemplate[];
    exportedAt: Date;
  } {
    return {
      pipelines: Array.from(this.entries.values()),
      templates: Array.from(this.templates.values()),
      exportedAt: new Date(),
    };
  }

  importRegistry(data: {
    pipelines: PipelineRegistryEntry[];
    templates: PipelineTemplate[];
  }): void {
    // Clear existing data
    this.entries.clear();
    this.templates.clear();

    // Import pipelines
    data.pipelines.forEach(entry => {
      this.entries.set(entry.id, entry);
    });

    // Import templates
    data.templates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  // Generate sample data
  generateSampleData(): void {
    // Sample templates
    const sampleTemplates: PipelineTemplate[] = [
      {
        id: 'etl_basic',
        name: 'Basic ETL Pipeline',
        description: 'Extract, Transform, Load pipeline template',
        category: 'etl',
        pipeline: {
          id: 'etl_template',
          name: 'ETL Template',
          description: 'Basic ETL pipeline',
          nodes: [
            { id: 'extract', type: 'csv_input', data: { label: 'Extract Data' }, position: { x: 0, y: 0 } },
            { id: 'transform', type: 'transform', data: { label: 'Transform' }, position: { x: 200, y: 0 } },
            { id: 'load', type: 'database_output', data: { label: 'Load Data' }, position: { x: 400, y: 0 } },
          ],
          edges: [
            { id: 'e1', source: 'extract', target: 'transform' },
            { id: 'e2', source: 'transform', target: 'load' },
          ],
          createdAt: new Date(),
          updatedAt: new Date(),
          tags: ['etl', 'basic'],
        },
        parameters: [
          { name: 'source_path', type: 'string', default: '/data/input.csv', description: 'Input data path' },
          { name: 'target_table', type: 'string', default: 'processed_data', description: 'Target table name' },
        ],
        createdAt: new Date(),
        author: 'system',
        downloads: 150,
        rating: 4.5,
      },
      {
        id: 'ml_training',
        name: 'ML Training Pipeline',
        description: 'Machine learning model training pipeline',
        category: 'ml-training',
        pipeline: {
          id: 'ml_template',
          name: 'ML Training Template',
          description: 'Train and evaluate ML models',
          nodes: [
            { id: 'load_data', type: 'csv_input', data: { label: 'Load Training Data' }, position: { x: 0, y: 0 } },
            { id: 'preprocess', type: 'transform', data: { label: 'Preprocess' }, position: { x: 200, y: 0 } },
            { id: 'split', type: 'split', data: { label: 'Train/Test Split' }, position: { x: 400, y: 0 } },
            { id: 'train', type: 'model_train', data: { label: 'Train Model' }, position: { x: 600, y: 0 } },
            { id: 'evaluate', type: 'model_evaluate', data: { label: 'Evaluate' }, position: { x: 800, y: 0 } },
          ],
          edges: [
            { id: 'e1', source: 'load_data', target: 'preprocess' },
            { id: 'e2', source: 'preprocess', target: 'split' },
            { id: 'e3', source: 'split', target: 'train' },
            { id: 'e4', source: 'train', target: 'evaluate' },
          ],
          createdAt: new Date(),
          updatedAt: new Date(),
          tags: ['ml', 'training'],
        },
        parameters: [
          { name: 'model_type', type: 'string', default: 'random_forest', description: 'Model type' },
          { name: 'test_size', type: 'number', default: 0.2, description: 'Test set size' },
        ],
        createdAt: new Date(),
        author: 'system',
        downloads: 89,
        rating: 4.2,
      },
    ];

    sampleTemplates.forEach(template => this.addTemplate(template));

    // Sample pipelines
    const samplePipeline: Pipeline = {
      id: 'customer_analytics',
      name: 'Customer Analytics Pipeline',
      description: 'Analyze customer behavior and segmentation',
      nodes: [
        { id: 'load_customers', type: 'database_input', data: { label: 'Load Customer Data' }, position: { x: 0, y: 0 } },
        { id: 'load_transactions', type: 'database_input', data: { label: 'Load Transactions' }, position: { x: 0, y: 100 } },
        { id: 'join_data', type: 'join', data: { label: 'Join Customer & Transactions' }, position: { x: 200, y: 50 } },
        { id: 'feature_engineering', type: 'transform', data: { label: 'Feature Engineering' }, position: { x: 400, y: 50 } },
        { id: 'segmentation', type: 'model_train', data: { label: 'Customer Segmentation' }, position: { x: 600, y: 50 } },
        { id: 'export_results', type: 'csv_output', data: { label: 'Export Results' }, position: { x: 800, y: 50 } },
      ],
      edges: [
        { id: 'e1', source: 'load_customers', target: 'join_data' },
        { id: 'e2', source: 'load_transactions', target: 'join_data' },
        { id: 'e3', source: 'join_data', target: 'feature_engineering' },
        { id: 'e4', source: 'feature_engineering', target: 'segmentation' },
        { id: 'e5', source: 'segmentation', target: 'export_results' },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['analytics', 'customer', 'segmentation'],
    };

    this.registerPipeline(samplePipeline, '1.0.0', 'data_team');
    this.addVersion('customer_analytics', {
      ...samplePipeline,
      name: 'Customer Analytics Pipeline v1.1',
      description: 'Enhanced customer analytics with churn prediction',
    }, '1.1.0', 'Added churn prediction model');
  }
}

// Singleton instance
export const pipelineRegistry = new PipelineRegistry();