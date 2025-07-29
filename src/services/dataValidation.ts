import { DataCatalogEntry } from '../types';

export interface ValidationRule {
  id: string;
  name: string;
  description?: string;
  type: 'schema' | 'data_quality' | 'business_rule' | 'completeness' | 'uniqueness' | 'range' | 'format';
  severity: 'error' | 'warning' | 'info';
  enabled: boolean;
  datasetId: string;
  column?: string;
  rule: {
    condition: string;
    value?: any;
    parameters?: Record<string, any>;
  };
  createdAt: Date;
  updatedAt: Date;
  author: string;
  tags?: string[];
}

export interface ValidationResult {
  ruleId: string;
  ruleName: string;
  severity: 'error' | 'warning' | 'info';
  passed: boolean;
  message: string;
  details?: {
    column?: string;
    rowCount?: number;
    failedRows?: number;
    failedValues?: any[];
    statistics?: Record<string, any>;
  };
  executionTime: number;
  timestamp: Date;
}

export interface DataQualityReport {
  id: string;
  datasetId: string;
  datasetName: string;
  executionTime: Date;
  totalRules: number;
  passedRules: number;
  failedRules: number;
  warningRules: number;
  overallStatus: 'passed' | 'failed' | 'warning';
  results: ValidationResult[];
  summary: {
    completeness: number;
    uniqueness: number;
    validity: number;
    consistency: number;
    accuracy: number;
  };
  recommendations: string[];
}

export interface DataProfile {
  datasetId: string;
  columnProfiles: {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'date' | 'unknown';
    nullable: boolean;
    uniqueValues: number;
    nullCount: number;
    totalCount: number;
    completeness: number;
    statistics?: {
      min?: any;
      max?: any;
      mean?: number;
      median?: number;
      stdDev?: number;
      distinctValues?: any[];
    };
  }[];
  relationships?: {
    primaryKeys: string[];
    foreignKeys: { column: string; referencedTable: string; referencedColumn: string }[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export class DataValidationService {
  private validationRules: Map<string, ValidationRule> = new Map();
  private validationHistory: DataQualityReport[] = [];
  private dataProfiles: Map<string, DataProfile> = new Map();

  // Validation Rules Management
  addValidationRule(rule: Omit<ValidationRule, 'id' | 'createdAt' | 'updatedAt'>): string {
    const id = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const validationRule: ValidationRule = {
      ...rule,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.validationRules.set(id, validationRule);
    return id;
  }

  updateValidationRule(id: string, updates: Partial<ValidationRule>): boolean {
    const rule = this.validationRules.get(id);
    if (!rule) return false;

    const updatedRule = {
      ...rule,
      ...updates,
      updatedAt: new Date(),
    };

    this.validationRules.set(id, updatedRule);
    return true;
  }

  deleteValidationRule(id: string): boolean {
    return this.validationRules.delete(id);
  }

  getValidationRule(id: string): ValidationRule | undefined {
    return this.validationRules.get(id);
  }

  getValidationRulesByDataset(datasetId: string): ValidationRule[] {
    return Array.from(this.validationRules.values()).filter(
      rule => rule.datasetId === datasetId && rule.enabled
    );
  }

  getAllValidationRules(): ValidationRule[] {
    return Array.from(this.validationRules.values());
  }

  // Data Validation Execution
  async validateDataset(datasetId: string, data?: any[]): Promise<DataQualityReport> {
    const rules = this.getValidationRulesByDataset(datasetId);
    const results: ValidationResult[] = [];
    const executionStartTime = Date.now();

    // Mock data if not provided
    if (!data) {
      data = this.generateMockData(datasetId);
    }

    for (const rule of rules) {
      const result = await this.executeValidationRule(rule, data);
      results.push(result);
    }

    const passedRules = results.filter(r => r.passed).length;
    const failedRules = results.filter(r => !r.passed && r.severity === 'error').length;
    const warningRules = results.filter(r => !r.passed && r.severity === 'warning').length;

    const overallStatus = failedRules > 0 ? 'failed' : warningRules > 0 ? 'warning' : 'passed';

    const report: DataQualityReport = {
      id: `report_${Date.now()}`,
      datasetId,
      datasetName: datasetId, // In real implementation, get from catalog
      executionTime: new Date(),
      totalRules: rules.length,
      passedRules,
      failedRules,
      warningRules,
      overallStatus,
      results,
      summary: this.calculateQualityMetrics(results, data),
      recommendations: this.generateRecommendations(results),
    };

    this.validationHistory.push(report);
    return report;
  }

  private async executeValidationRule(rule: ValidationRule, data: any[]): Promise<ValidationResult> {
    const startTime = Date.now();
    let passed = true;
    let message = '';
    let details: ValidationResult['details'] = {};

    try {
      switch (rule.type) {
        case 'completeness':
          const nullCount = data.filter(row => 
            !row[rule.column!] || row[rule.column!] === null || row[rule.column!] === undefined
          ).length;
          const completeness = (data.length - nullCount) / data.length;
          const threshold = rule.rule.value || 0.95;
          passed = completeness >= threshold;
          message = passed 
            ? `Completeness check passed: ${(completeness * 100).toFixed(1)}%`
            : `Completeness check failed: ${(completeness * 100).toFixed(1)}% (threshold: ${(threshold * 100).toFixed(1)}%)`;
          details = {
            column: rule.column,
            rowCount: data.length,
            failedRows: nullCount,
            statistics: { completeness },
          };
          break;

        case 'uniqueness':
          const values = data.map(row => row[rule.column!]);
          const uniqueValues = new Set(values);
          const uniqueness = uniqueValues.size / values.length;
          const uniquenessThreshold = rule.rule.value || 1.0;
          passed = uniqueness >= uniquenessThreshold;
          message = passed
            ? `Uniqueness check passed: ${(uniqueness * 100).toFixed(1)}%`
            : `Uniqueness check failed: ${(uniqueness * 100).toFixed(1)}% (threshold: ${(uniquenessThreshold * 100).toFixed(1)}%)`;
          details = {
            column: rule.column,
            rowCount: data.length,
            statistics: { uniqueness, duplicates: values.length - uniqueValues.size },
          };
          break;

        case 'range':
          const columnValues = data.map(row => row[rule.column!]).filter(v => v !== null && v !== undefined);
          const min = rule.rule.parameters?.min;
          const max = rule.rule.parameters?.max;
          const outOfRange = columnValues.filter(v => 
            (min !== undefined && v < min) || (max !== undefined && v > max)
          );
          passed = outOfRange.length === 0;
          message = passed
            ? 'Range check passed'
            : `Range check failed: ${outOfRange.length} values out of range`;
          details = {
            column: rule.column,
            rowCount: data.length,
            failedRows: outOfRange.length,
            failedValues: outOfRange.slice(0, 10), // First 10 failed values
          };
          break;

        case 'format':
          const pattern = new RegExp(rule.rule.value);
          const formatValues = data.map(row => row[rule.column!]).filter(v => v !== null && v !== undefined);
          const invalidFormat = formatValues.filter(v => !pattern.test(String(v)));
          passed = invalidFormat.length === 0;
          message = passed
            ? 'Format check passed'
            : `Format check failed: ${invalidFormat.length} values with invalid format`;
          details = {
            column: rule.column,
            rowCount: data.length,
            failedRows: invalidFormat.length,
            failedValues: invalidFormat.slice(0, 10),
          };
          break;

        case 'business_rule':
          // Mock business rule validation
          const businessRulePassed = Math.random() > 0.2; // 80% pass rate
          passed = businessRulePassed;
          message = passed
            ? `Business rule '${rule.name}' passed`
            : `Business rule '${rule.name}' failed`;
          break;

        default:
          passed = true;
          message = 'Rule type not implemented';
      }
    } catch (error) {
      passed = false;
      message = `Error executing rule: ${error}`;
    }

    return {
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      passed,
      message,
      details,
      executionTime: Date.now() - startTime,
      timestamp: new Date(),
    };
  }

  private calculateQualityMetrics(results: ValidationResult[], data: any[]): DataQualityReport['summary'] {
    const completenessResults = results.filter(r => r.ruleId.includes('completeness'));
    const uniquenessResults = results.filter(r => r.ruleId.includes('uniqueness'));
    const validityResults = results.filter(r => r.ruleId.includes('format') || r.ruleId.includes('range'));
    
    return {
      completeness: completenessResults.length > 0 ? 
        completenessResults.filter(r => r.passed).length / completenessResults.length : 1,
      uniqueness: uniquenessResults.length > 0 ? 
        uniquenessResults.filter(r => r.passed).length / uniquenessResults.length : 1,
      validity: validityResults.length > 0 ? 
        validityResults.filter(r => r.passed).length / validityResults.length : 1,
      consistency: Math.random() * 0.2 + 0.8, // Mock consistency score
      accuracy: Math.random() * 0.2 + 0.8, // Mock accuracy score
    };
  }

  private generateRecommendations(results: ValidationResult[]): string[] {
    const recommendations: string[] = [];
    
    const failedResults = results.filter(r => !r.passed);
    
    if (failedResults.some(r => r.ruleId.includes('completeness'))) {
      recommendations.push('Consider data imputation strategies for missing values');
    }
    
    if (failedResults.some(r => r.ruleId.includes('uniqueness'))) {
      recommendations.push('Implement deduplication process for duplicate records');
    }
    
    if (failedResults.some(r => r.ruleId.includes('format'))) {
      recommendations.push('Add data cleansing step to standardize formats');
    }
    
    if (failedResults.some(r => r.ruleId.includes('range'))) {
      recommendations.push('Review data collection process for outlier values');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Data quality looks good! Consider adding more validation rules for comprehensive coverage.');
    }
    
    return recommendations;
  }

  // Data Profiling
  async profileDataset(datasetId: string, data?: any[]): Promise<DataProfile> {
    if (!data) {
      data = this.generateMockData(datasetId);
    }

    const columns = data.length > 0 ? Object.keys(data[0]) : [];
    const columnProfiles = columns.map(columnName => {
      const values = data!.map(row => row[columnName]);
      const nonNullValues = values.filter(v => v !== null && v !== undefined);
      const uniqueValues = new Set(nonNullValues);
      
      const type = this.inferColumnType(nonNullValues);
      
      return {
        name: columnName,
        type,
        nullable: values.length > nonNullValues.length,
        uniqueValues: uniqueValues.size,
        nullCount: values.length - nonNullValues.length,
        totalCount: values.length,
        completeness: nonNullValues.length / values.length,
        statistics: this.calculateColumnStatistics(nonNullValues, type),
      };
    });

    const profile: DataProfile = {
      datasetId,
      columnProfiles,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.dataProfiles.set(datasetId, profile);
    return profile;
  }

  private inferColumnType(values: any[]): 'string' | 'number' | 'boolean' | 'date' | 'unknown' {
    if (values.length === 0) return 'unknown';
    
    const sample = values.slice(0, 100); // Sample first 100 values
    
    if (sample.every(v => typeof v === 'boolean')) return 'boolean';
    if (sample.every(v => typeof v === 'number')) return 'number';
    if (sample.every(v => v instanceof Date || !isNaN(Date.parse(v)))) return 'date';
    if (sample.every(v => typeof v === 'string')) return 'string';
    
    return 'unknown';
  }

  private calculateColumnStatistics(values: any[], type: string): any {
    if (type === 'number') {
      const numbers = values.filter(v => typeof v === 'number').sort((a, b) => a - b);
      const sum = numbers.reduce((acc, val) => acc + val, 0);
      const mean = sum / numbers.length;
      const median = numbers[Math.floor(numbers.length / 2)];
      const variance = numbers.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / numbers.length;
      
      return {
        min: Math.min(...numbers),
        max: Math.max(...numbers),
        mean,
        median,
        stdDev: Math.sqrt(variance),
      };
    }
    
    if (type === 'string') {
      const distinctValues = Array.from(new Set(values)).slice(0, 10);
      return {
        distinctValues,
        avgLength: values.reduce((acc, val) => acc + String(val).length, 0) / values.length,
      };
    }
    
    return {};
  }

  // Mock data generation
  private generateMockData(datasetId: string): any[] {
    const mockData = [];
    const rowCount = Math.floor(Math.random() * 1000) + 100;
    
    for (let i = 0; i < rowCount; i++) {
      mockData.push({
        id: i,
        name: `Name_${i}`,
        email: `user${i}@example.com`,
        age: Math.floor(Math.random() * 80) + 18,
        score: Math.random() * 100,
        active: Math.random() > 0.5,
        created_at: new Date(Date.now() - Math.random() * 31536000000), // Random date within last year
      });
    }
    
    return mockData;
  }

  // Validation History
  getValidationHistory(datasetId?: string): DataQualityReport[] {
    const history = this.validationHistory.sort((a, b) => b.executionTime.getTime() - a.executionTime.getTime());
    return datasetId ? history.filter(report => report.datasetId === datasetId) : history;
  }

  getDataProfile(datasetId: string): DataProfile | undefined {
    return this.dataProfiles.get(datasetId);
  }

  // Predefined validation rules
  generateStandardValidationRules(datasetId: string): void {
    const rules = [
      {
        name: 'ID Completeness',
        description: 'Ensure ID field is always populated',
        type: 'completeness' as const,
        severity: 'error' as const,
        enabled: true,
        datasetId,
        column: 'id',
        rule: { condition: 'not_null', value: 1.0 },
        author: 'system',
        tags: ['standard', 'completeness'],
      },
      {
        name: 'ID Uniqueness',
        description: 'Ensure ID field values are unique',
        type: 'uniqueness' as const,
        severity: 'error' as const,
        enabled: true,
        datasetId,
        column: 'id',
        rule: { condition: 'unique', value: 1.0 },
        author: 'system',
        tags: ['standard', 'uniqueness'],
      },
      {
        name: 'Email Format',
        description: 'Validate email format',
        type: 'format' as const,
        severity: 'warning' as const,
        enabled: true,
        datasetId,
        column: 'email',
        rule: { condition: 'regex', value: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' },
        author: 'system',
        tags: ['standard', 'format'],
      },
      {
        name: 'Age Range',
        description: 'Validate age is within reasonable range',
        type: 'range' as const,
        severity: 'warning' as const,
        enabled: true,
        datasetId,
        column: 'age',
        rule: { condition: 'between', parameters: { min: 0, max: 150 } },
        author: 'system',
        tags: ['standard', 'range'],
      },
    ];

    rules.forEach(rule => this.addValidationRule(rule));
  }

  // Statistics
  getValidationStats(): {
    totalRules: number;
    rulesByType: Record<string, number>;
    rulesByDataset: Record<string, number>;
    recentReports: number;
    averageQualityScore: number;
  } {
    const rules = Array.from(this.validationRules.values());
    const reports = this.validationHistory.filter(
      report => Date.now() - report.executionTime.getTime() < 86400000 // Last 24 hours
    );

    const rulesByType = rules.reduce((acc, rule) => {
      acc[rule.type] = (acc[rule.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const rulesByDataset = rules.reduce((acc, rule) => {
      acc[rule.datasetId] = (acc[rule.datasetId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalQualityScore = reports.reduce((sum, report) => {
      const { completeness, uniqueness, validity, consistency, accuracy } = report.summary;
      return sum + (completeness + uniqueness + validity + consistency + accuracy) / 5;
    }, 0);

    return {
      totalRules: rules.length,
      rulesByType,
      rulesByDataset,
      recentReports: reports.length,
      averageQualityScore: reports.length > 0 ? totalQualityScore / reports.length : 0,
    };
  }
}

// Singleton instance
export const dataValidationService = new DataValidationService();