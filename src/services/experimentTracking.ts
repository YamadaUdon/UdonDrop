import { PipelineExecution, Pipeline, DataNode } from '../types';

export interface Experiment {
  id: string;
  name: string;
  description?: string;
  pipelineId: string;
  parameters: Record<string, any>;
  tags: string[];
  status: 'active' | 'completed' | 'failed' | 'cancelled';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  execution?: PipelineExecution;
  metrics?: Record<string, any>;
  artifacts?: ExperimentArtifact[];
  notes?: string;
}

export interface ExperimentArtifact {
  id: string;
  name: string;
  type: 'model' | 'data' | 'plot' | 'report' | 'code' | 'config';
  filepath: string;
  size: number;
  mimeType: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface ExperimentMetric {
  experimentId: string;
  name: string;
  value: number | string | boolean;
  step?: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ExperimentComparison {
  experiments: Experiment[];
  metrics: {
    name: string;
    values: { experimentId: string; value: any }[];
  }[];
  parameters: {
    name: string;
    values: { experimentId: string; value: any }[];
  }[];
}

export class ExperimentTracker {
  private experiments: Map<string, Experiment> = new Map();
  private metrics: Map<string, ExperimentMetric[]> = new Map();
  private artifacts: Map<string, ExperimentArtifact[]> = new Map();

  // Create a new experiment
  createExperiment(config: {
    name: string;
    description?: string;
    pipelineId: string;
    parameters?: Record<string, any>;
    tags?: string[];
  }): Experiment {
    const experiment: Experiment = {
      id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: config.name,
      description: config.description,
      pipelineId: config.pipelineId,
      parameters: config.parameters || {},
      tags: config.tags || [],
      status: 'active',
      createdAt: new Date(),
    };

    this.experiments.set(experiment.id, experiment);
    return experiment;
  }

  // Get experiment by ID
  getExperiment(id: string): Experiment | undefined {
    return this.experiments.get(id);
  }

  // Get all experiments
  getAllExperiments(): Experiment[] {
    return Array.from(this.experiments.values());
  }

  // Get experiments by pipeline
  getExperimentsByPipeline(pipelineId: string): Experiment[] {
    return Array.from(this.experiments.values()).filter(
      exp => exp.pipelineId === pipelineId
    );
  }

  // Get experiments by tag
  getExperimentsByTag(tag: string): Experiment[] {
    return Array.from(this.experiments.values()).filter(
      exp => exp.tags.includes(tag)
    );
  }

  // Update experiment
  updateExperiment(id: string, updates: Partial<Experiment>): boolean {
    const experiment = this.experiments.get(id);
    if (!experiment) return false;

    const updatedExperiment = { ...experiment, ...updates };
    this.experiments.set(id, updatedExperiment);
    return true;
  }

  // Start experiment
  startExperiment(id: string): boolean {
    const experiment = this.experiments.get(id);
    if (!experiment) return false;

    experiment.status = 'active';
    experiment.startedAt = new Date();
    this.experiments.set(id, experiment);
    return true;
  }

  // Complete experiment
  completeExperiment(id: string, execution?: PipelineExecution): boolean {
    const experiment = this.experiments.get(id);
    if (!experiment) return false;

    experiment.status = 'completed';
    experiment.completedAt = new Date();
    if (execution) {
      experiment.execution = execution;
    }
    this.experiments.set(id, experiment);
    return true;
  }

  // Fail experiment
  failExperiment(id: string, error: string): boolean {
    const experiment = this.experiments.get(id);
    if (!experiment) return false;

    experiment.status = 'failed';
    experiment.completedAt = new Date();
    experiment.notes = error;
    this.experiments.set(id, experiment);
    return true;
  }

  // Log metric
  logMetric(experimentId: string, name: string, value: number | string | boolean, step?: number): void {
    const metric: ExperimentMetric = {
      experimentId,
      name,
      value,
      step,
      timestamp: new Date(),
    };

    const existingMetrics = this.metrics.get(experimentId) || [];
    existingMetrics.push(metric);
    this.metrics.set(experimentId, existingMetrics);

    // Update experiment with latest metrics
    const experiment = this.experiments.get(experimentId);
    if (experiment) {
      experiment.metrics = experiment.metrics || {};
      experiment.metrics[name] = value;
      this.experiments.set(experimentId, experiment);
    }
  }

  // Log multiple metrics
  logMetrics(experimentId: string, metrics: Record<string, number | string | boolean>, step?: number): void {
    Object.entries(metrics).forEach(([name, value]) => {
      this.logMetric(experimentId, name, value, step);
    });
  }

  // Get metrics for experiment
  getMetrics(experimentId: string): ExperimentMetric[] {
    return this.metrics.get(experimentId) || [];
  }

  // Get metric history for experiment
  getMetricHistory(experimentId: string, metricName: string): ExperimentMetric[] {
    const metrics = this.metrics.get(experimentId) || [];
    return metrics.filter(metric => metric.name === metricName);
  }

  // Log artifact
  logArtifact(experimentId: string, artifact: Omit<ExperimentArtifact, 'id' | 'createdAt'>): ExperimentArtifact {
    const fullArtifact: ExperimentArtifact = {
      ...artifact,
      id: `artifact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
    };

    const existingArtifacts = this.artifacts.get(experimentId) || [];
    existingArtifacts.push(fullArtifact);
    this.artifacts.set(experimentId, existingArtifacts);

    // Update experiment with artifacts
    const experiment = this.experiments.get(experimentId);
    if (experiment) {
      experiment.artifacts = existingArtifacts;
      this.experiments.set(experimentId, experiment);
    }

    return fullArtifact;
  }

  // Get artifacts for experiment
  getArtifacts(experimentId: string): ExperimentArtifact[] {
    return this.artifacts.get(experimentId) || [];
  }

  // Delete experiment
  deleteExperiment(id: string): boolean {
    const deleted = this.experiments.delete(id);
    if (deleted) {
      this.metrics.delete(id);
      this.artifacts.delete(id);
    }
    return deleted;
  }

  // Compare experiments
  compareExperiments(experimentIds: string[]): ExperimentComparison {
    const experiments = experimentIds
      .map(id => this.experiments.get(id))
      .filter(exp => exp !== undefined) as Experiment[];

    if (experiments.length === 0) {
      return { experiments: [], metrics: [], parameters: [] };
    }

    // Collect all unique metric names
    const allMetricNames = new Set<string>();
    experiments.forEach(exp => {
      if (exp.metrics) {
        Object.keys(exp.metrics).forEach(name => allMetricNames.add(name));
      }
    });

    // Collect all unique parameter names
    const allParameterNames = new Set<string>();
    experiments.forEach(exp => {
      Object.keys(exp.parameters).forEach(name => allParameterNames.add(name));
    });

    // Build comparison structure
    const metrics = Array.from(allMetricNames).map(name => ({
      name,
      values: experiments.map(exp => ({
        experimentId: exp.id,
        value: exp.metrics?.[name] || null,
      })),
    }));

    const parameters = Array.from(allParameterNames).map(name => ({
      name,
      values: experiments.map(exp => ({
        experimentId: exp.id,
        value: exp.parameters[name] || null,
      })),
    }));

    return { experiments, metrics, parameters };
  }

  // Get experiment statistics
  getExperimentStats(): {
    total: number;
    byStatus: Record<string, number>;
    byPipeline: Record<string, number>;
    byTag: Record<string, number>;
  } {
    const experiments = Array.from(this.experiments.values());
    
    const byStatus: Record<string, number> = {};
    const byPipeline: Record<string, number> = {};
    const byTag: Record<string, number> = {};

    experiments.forEach(exp => {
      // Count by status
      byStatus[exp.status] = (byStatus[exp.status] || 0) + 1;
      
      // Count by pipeline
      byPipeline[exp.pipelineId] = (byPipeline[exp.pipelineId] || 0) + 1;
      
      // Count by tags
      exp.tags.forEach(tag => {
        byTag[tag] = (byTag[tag] || 0) + 1;
      });
    });

    return {
      total: experiments.length,
      byStatus,
      byPipeline,
      byTag,
    };
  }

  // Auto-track pipeline execution
  trackPipelineExecution(pipelineId: string, execution: PipelineExecution): Experiment {
    const experiment = this.createExperiment({
      name: `Auto-tracked execution ${execution.id}`,
      description: `Automatically tracked execution of pipeline ${pipelineId}`,
      pipelineId,
      parameters: execution.parameters || {},
      tags: ['auto-tracked'],
    });

    this.startExperiment(experiment.id);

    // Log execution metrics
    if (execution.endTime && execution.startTime) {
      const duration = execution.endTime.getTime() - execution.startTime.getTime();
      this.logMetric(experiment.id, 'execution_duration_ms', duration);
    }

    this.logMetric(experiment.id, 'execution_status', execution.status);
    this.logMetric(experiment.id, 'nodes_executed', execution.nodes.length);
    
    const completedNodes = execution.nodes.filter(node => node.status === 'completed').length;
    this.logMetric(experiment.id, 'nodes_completed', completedNodes);
    
    const failedNodes = execution.nodes.filter(node => node.status === 'failed').length;
    this.logMetric(experiment.id, 'nodes_failed', failedNodes);

    // Complete or fail experiment based on execution status
    if (execution.status === 'completed') {
      this.completeExperiment(experiment.id, execution);
    } else if (execution.status === 'failed') {
      this.failExperiment(experiment.id, 'Pipeline execution failed');
    }

    return experiment;
  }

  // Generate sample experiments for testing
  generateSampleExperiments(): void {
    const sampleExperiments = [
      {
        name: 'Customer Segmentation v1',
        description: 'Initial customer segmentation model',
        pipelineId: 'customer_segmentation',
        parameters: { model_type: 'kmeans', n_clusters: 5 },
        tags: ['segmentation', 'kmeans'],
      },
      {
        name: 'Customer Segmentation v2',
        description: 'Improved customer segmentation with feature engineering',
        pipelineId: 'customer_segmentation',
        parameters: { model_type: 'hierarchical', n_clusters: 7 },
        tags: ['segmentation', 'hierarchical'],
      },
      {
        name: 'Churn Prediction Model',
        description: 'Predict customer churn using random forest',
        pipelineId: 'churn_prediction',
        parameters: { model_type: 'random_forest', n_estimators: 100 },
        tags: ['churn', 'classification'],
      },
    ];

    sampleExperiments.forEach(config => {
      const experiment = this.createExperiment(config);
      this.startExperiment(experiment.id);
      
      // Add sample metrics
      this.logMetrics(experiment.id, {
        accuracy: 0.85 + Math.random() * 0.1,
        precision: 0.80 + Math.random() * 0.1,
        recall: 0.75 + Math.random() * 0.1,
        f1_score: 0.78 + Math.random() * 0.1,
        training_time: Math.random() * 300 + 60,
      });
      
      this.completeExperiment(experiment.id);
    });
  }
}

// Singleton instance
export const experimentTracker = new ExperimentTracker();