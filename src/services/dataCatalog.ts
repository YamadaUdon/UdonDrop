import { DataCatalogEntry } from '../types';

export class DataCatalog {
  private entries: Map<string, DataCatalogEntry> = new Map();

  // Add a new data catalog entry
  addEntry(entry: DataCatalogEntry): void {
    this.entries.set(entry.id, entry);
  }

  // Get a data catalog entry by ID
  getEntry(id: string): DataCatalogEntry | undefined {
    return this.entries.get(id);
  }

  // Get all entries
  getAllEntries(): DataCatalogEntry[] {
    return Array.from(this.entries.values());
  }

  // Get entries by type
  getEntriesByType(type: DataCatalogEntry['type']): DataCatalogEntry[] {
    return Array.from(this.entries.values()).filter(entry => entry.type === type);
  }

  // Remove an entry
  removeEntry(id: string): boolean {
    return this.entries.delete(id);
  }

  // Update an entry
  updateEntry(id: string, updates: Partial<DataCatalogEntry>): boolean {
    const entry = this.entries.get(id);
    if (!entry) return false;

    const updatedEntry = { ...entry, ...updates };
    this.entries.set(id, updatedEntry);
    return true;
  }

  // Load from configuration
  loadFromConfig(config: { [key: string]: any }): void {
    Object.entries(config).forEach(([name, entryConfig]) => {
      const entry: DataCatalogEntry = {
        id: name,
        name,
        type: entryConfig.type,
        filepath: entryConfig.filepath,
        connection: entryConfig.connection,
        schema: entryConfig.schema,
        metadata: entryConfig.metadata,
      };
      this.addEntry(entry);
    });
  }

  // Export to configuration format
  exportToConfig(): { [key: string]: any } {
    const config: { [key: string]: any } = {};
    
    this.entries.forEach((entry, key) => {
      config[key] = {
        type: entry.type,
        filepath: entry.filepath,
        connection: entry.connection,
        schema: entry.schema,
        metadata: entry.metadata,
      };
    });

    return config;
  }

  // Validate entry configuration
  validateEntry(entry: DataCatalogEntry): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!entry.id || entry.id.trim() === '') {
      errors.push('ID is required');
    }

    if (!entry.name || entry.name.trim() === '') {
      errors.push('Name is required');
    }

    if (!entry.type) {
      errors.push('Type is required');
    }

    // Type-specific validation
    switch (entry.type) {
      case 'csv':
      case 'json':
      case 'parquet':
        if (!entry.filepath) {
          errors.push('Filepath is required for file-based datasets');
        }
        break;
      case 'database':
        if (!entry.connection) {
          errors.push('Connection string is required for database datasets');
        }
        break;
      case 'api':
        if (!entry.connection) {
          errors.push('API endpoint is required for API datasets');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // Generate sample data for testing
  generateSampleEntries(): void {
    const sampleEntries: DataCatalogEntry[] = [
      {
        id: 'raw_data',
        name: 'Raw Customer Data',
        type: 'csv',
        filepath: '/data/raw/customers.csv',
        schema: {
          id: 'integer',
          name: 'string',
          email: 'string',
          created_at: 'datetime',
        },
        metadata: {
          description: 'Raw customer data from CRM system',
          source: 'CRM Database',
          refresh_rate: 'daily',
        },
      },
      {
        id: 'processed_data',
        name: 'Processed Customer Data',
        type: 'parquet',
        filepath: '/data/processed/customers_processed.parquet',
        schema: {
          customer_id: 'integer',
          customer_name: 'string',
          email_domain: 'string',
          days_since_signup: 'integer',
          customer_segment: 'string',
        },
        metadata: {
          description: 'Processed and enriched customer data',
          source: 'Data Pipeline',
          refresh_rate: 'daily',
        },
      },
      {
        id: 'api_data',
        name: 'External API Data',
        type: 'api',
        connection: 'https://api.example.com/data',
        schema: {
          id: 'string',
          value: 'number',
          timestamp: 'datetime',
        },
        metadata: {
          description: 'Data from external API service',
          source: 'External API',
          refresh_rate: 'hourly',
        },
      },
      {
        id: 'database_table',
        name: 'User Analytics',
        type: 'database',
        connection: 'postgresql://user:pass@localhost:5432/analytics',
        schema: {
          user_id: 'integer',
          event_type: 'string',
          timestamp: 'datetime',
          properties: 'json',
        },
        metadata: {
          description: 'User analytics events',
          source: 'Analytics Database',
          refresh_rate: 'real-time',
        },
      },
    ];

    sampleEntries.forEach(entry => this.addEntry(entry));
  }
}

// Singleton instance
export const dataCatalog = new DataCatalog();