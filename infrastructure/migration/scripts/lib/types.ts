// ============================================================
// National SOC Platform - Migration Types
// Phase 4: Data Migration (SQLite → PostgreSQL)
// ============================================================

// ========================================
// CONFIGURATION TYPES
// ========================================

export interface MigrationConfig {
  // Source database (SQLite)
  sqlite: {
    path: string;
    readonly?: boolean;
  };

  // Target database (PostgreSQL)
  postgresql: {
    connectionString: string;
    poolSize?: number;
    schema?: string;
  };

  // Transformation rules
  transformations: TableTransformation[];

  // Validation settings
  validation: {
    strictMode: boolean;
    maxErrors: number;
    sampleSize: number;
    checkConstraints: boolean;
    checkForeignKeys: boolean;
  };

  // Progress tracking
  progress: {
    updateInterval: number;
    logToFile: boolean;
    logFilePath: string;
    enableProgressBar: boolean;
  };

  // Rollback configuration
  rollback: {
    enabled: boolean;
    autoOnError: boolean;
    backupLocation: string;
    maxBackups: number;
    compression: boolean;
  };

  // General settings
  batchSize: number;
  outputDir: string;
  dryRun: boolean;
  continueOnError: boolean;
}

// ========================================
// MIGRATION PLAN TYPES
// ========================================

export interface MigrationPlan {
  id: string;
  generatedAt: Date;
  version: string;
  sourceType: 'sqlite';
  targetType: 'postgresql';
  
  tables: TablePlan[];
  totalRecords: number;
  totalSize: number;
  estimatedDuration: string;
  
  schemaChanges: SchemaChange[];
  indexes: IndexPlan[];
  risks: string[];
}

export interface TablePlan {
  name: string;
  recordCount: number;
  estimatedSize: number;
  strategy: MigrationStrategy;
  transformations: TransformationRule[];
  dependencies: string[];
  priority: number;
}

export type MigrationStrategy = 
  | 'create_new'        // Create new table in target
  | 'migrate_with_transform'  // Migrate with data transformation
  | 'skip'              // Skip this table
  | 'truncate_and_reload';   // Truncate and reload

export interface SchemaChange {
  type: 'create_table' | 'alter_table' | 'drop_table' | 'add_column' | 'drop_column';
  tableName: string;
  sql: string;
  description?: string;
}

export interface IndexPlan {
  name: string;
  tableName: string;
  columns: string[];
  unique: boolean;
  sql: string;
}

// ========================================
// TRANSFORMATION TYPES
// ========================================

export interface TableTransformation {
  tableName: string;
  rules: TransformationRule[];
  preProcess?: (records: any[]) => Promise<any[]>;
  postProcess?: (records: any[]) => Promise<any[]>;
}

export interface TransformationRule {
  sourceField: string;
  targetField: string;
  transform?: (value: any) => any;
  defaultValue?: any;
  required?: boolean;
  validation?: (value: any) => boolean;
  errorMessage?: string;
}

// ========================================
// RESULT TYPES
// ========================================

export interface MigrationResult {
  success: boolean;
  startTime: Date;
  endTime: Date;
  stats: MigrationStats;
  errors: string[];
  warnings: string[];
  validation?: ValidationResult;
}

export interface MigrationStats {
  totalTables: number;
  migratedTables: number;
  failedTables: number;
  skippedTables: number;
  totalRecords: number;
  migratedRecords: number;
  failedRecords: number;
  skippedRecords: number;
  durationMs: number;
  startTime: Date;
  endTime: Date;
}

export interface ValidationResult {
  sourceValidation?: SourceValidationResult;
  targetValidation?: TargetValidationResult;
  overallValid: boolean;
  score: number; // 0-100
}

export interface SourceValidationResult {
  valid: boolean;
  dataQualityScore: number;
  issues: DataQualityIssues;
  tableResults: Record<string, TableValidationResult>;
}

export interface TargetValidationResult {
  valid: boolean;
  recordCountMatch: boolean;
  integrityCheckPassed: boolean;
  sampleValidationRate: number;
  tableResults: Record<string, TableValidationResult>;
}

export interface DataQualityIssues {
  nullRequiredFields: number;
  invalidFormats: number;
  duplicates: number;
  orphanedRecords: number;
  outOfRangeValues: number;
  encodingErrors: number;
}

export interface TableValidationResult {
  tableName: string;
  valid: boolean;
  recordsChecked: number;
  errors: ValidationError[];
  warnings: string[];
}

export interface ValidationError {
  fieldName: string;
  recordId: string | number;
  value: any;
  expectedType: string;
  actualType: string;
  message: string;
  severity: 'error' | 'warning';
}

// ========================================
// BACKUP & ROLLBACK TYPES
// ========================================

export interface BackupMetadata {
  id: string;
  createdAt: Date;
  completedAt: Date;
  sizeBytes: number;
  tables: string[];
  recordCounts: Record<string, number>;
  checksum: string;
  migrationVersion: string;
  description?: string;
}

export interface RollbackResult {
  success: boolean;
  backupId: string;
  restoredAt: Date;
  durationMs: number;
  tablesRestored: number;
  recordsRestored: number;
  verificationPassed: boolean;
}

// ========================================
// REPORT TYPES
// ========================================

export interface MigrationReport {
  metadata: ReportMetadata;
  summary: ReportSummary;
  details: ReportDetails;
  recommendations: string[];
}

export interface ReportMetadata {
  generatedAt: Date;
  generatedBy: string;
  toolVersion: string;
  platform: string;
  phase: string;
  classification: string;
}

export interface ReportSummary {
  status: 'success' | 'failure' | 'partial';
  overallScore: number; // 0-100
  durationFormatted: string;
  tablesMigrated: number;
  recordsMigrated: number;
  errorCount: number;
  warningCount: number;
}

export interface ReportDetails {
  tables: TableReportDetail[];
  performanceMetrics: PerformanceMetrics;
  dataQualityMetrics: DataQualityMetrics;
}

export interface TableReportDetail {
  name: string;
  strategy: string;
  sourceCount: number;
  targetCount: number;
  mismatchedRecords: number;
  errors: number;
  durationMs: number;
  status: 'success' | 'failed' | 'partial';
}

export interface PerformanceMetrics {
  totalDurationMs: number;
  averageRecordsPerSecond: number;
  peakRecordsPerSecond: number;
  batchProcessingTime: number;
  transformationTime: number;
  writeTime: number;
  validationTime: number;
}

export interface DataQualityMetrics {
  preMigrationScore: number;
  postMigrationScore: number;
  dataLossPercentage: number;
  integrityScore: number;
  formatConversionSuccessRate: number;
}
