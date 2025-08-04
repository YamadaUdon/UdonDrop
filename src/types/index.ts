export type NodeType = 
  | 'csv_input' | 'json_input' | 'parquet_input' | 'database_input' | 'api_input'
  | 'process' | 'transform' | 'filter' | 'aggregate' | 'join' | 'split'
  | 'csv_output' | 'json_output' | 'parquet_output' | 'database_output' | 'api_output'
  | 'model_train' | 'model_predict' | 'model_evaluate'
  | 'data_lake' | 'data_warehouse' | 'data_mart' | 'bi_tool';

export type NodeStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface NodeGroup {
  id: string;
  name: string;
  description?: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DataNode {
  id: string;
  type: NodeType;
  data: {
    label: string;
    description?: string;
    inputs?: string[];
    outputs?: string[];
    parameters?: Record<string, any>;
    dataset?: string; // Reference to data catalog entry
    function?: string; // Python function to execute
    tags?: string[];
    // Data architecture specific metadata
    updateFrequency?: 'realtime' | 'hourly' | 'daily' | 'weekly' | 'monthly';
    dataVolume?: string;
    lastUpdated?: Date;
    owner?: string;
    department?: string;
    // Group information
    groupId?: string; // Deprecated: use groupIds instead
    groupIds?: string[]; // New: support multiple groups
  };
  position: {
    x: number;
    y: number;
  };
  status?: NodeStatus;
  executionTime?: number;
  lastRun?: Date;
}

export interface DataEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  data?: {
    label?: string;
    type?: string;
    dataset?: string; // Data passed between nodes
    transferType?: 'realtime' | 'batch';
    dataVolume?: string;
    frequency?: string;
  };
}

export interface Pipeline {
  id: string;
  name: string;
  description?: string;
  nodes: DataNode[];
  edges: DataEdge[];
  createdAt: Date;
  updatedAt: Date;
  parameters?: Record<string, any>;
  environment?: string;
  tags?: string[];
}

export interface DataCatalogEntry {
  id: string;
  name: string;
  type: 'csv' | 'json' | 'parquet' | 'database' | 'api' | 'memory';
  filepath?: string;
  connection?: string;
  schema?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface PipelineExecution {
  id: string;
  pipelineId: string;
  status: 'running' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  nodes: {
    nodeId: string;
    status: NodeStatus;
    startTime?: Date;
    endTime?: Date;
    error?: string;
    metrics?: Record<string, any>;
  }[];
  parameters?: Record<string, any>;
  runner?: string;
  error?: string;
}

export interface NodeTemplate {
  id: string;
  name: string;
  type: NodeType;
  description: string;
  parameters: {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    required: boolean;
    default?: any;
    description?: string;
  }[];
  code?: string;
  category: 'data' | 'processing' | 'ml' | 'output';
}

export interface NodeExecution {
  nodeId: string;
  status: NodeStatus;
  startTime?: Date;
  endTime?: Date;
  error?: string;
  metrics?: Record<string, any>;
  outputs?: Record<string, any>;
}