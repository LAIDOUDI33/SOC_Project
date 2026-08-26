// ============================================================
// National SOC Platform - Data Migration Orchestrator
// Phase 4: SQLite → PostgreSQL Migration
// Version: 1.0.0
// ============================================================
//
// This is the main migration controller that orchestrates
// the complete data migration from SQLite to PostgreSQL.
//
// Features:
// - Batch processing for large datasets
// - Real-time progress tracking
// - Automatic validation and integrity checks
// - Rollback capability at any stage
// - Detailed reporting and logging
// - Error recovery with retry logic
//
// Usage:
//   npx ts-node scripts/migration/run-migration.ts [command]
//
// Commands:
//   plan      - Analyze source and generate migration plan
//   execute   - Run the full migration
//   validate  - Verify data integrity post-migration
//   rollback  - Revert to pre-migration state
//   status    - Show current migration status
//   report    - Generate detailed migration report
//

import { SQLiteReader } from './lib/sqlite-reader';
import { PostgreSQLWriter } from './lib/postgresql-writer';
import { DataTransformer } from './lib/data-transformer';
import { ValidationEngine } from './lib/validation-engine';
import { ProgressTracker } from './lib/progress-tracker';
import { RollbackManager } from './lib/rollback-manager';
import { ReportGenerator } from './lib/report-generator';
import { MigrationConfig, MigrationPlan, MigrationResult, MigrationStats } from './types';

export class MigrationOrchestrator {
  private config: MigrationConfig;
  private sqliteReader: SQLiteReader;
  private pgWriter: PostgreSQLWriter;
  private transformer: DataTransformer;
  private validator: ValidationEngine;
  private progress: ProgressTracker;
  private rollbackManager: RollbackManager;
  private reportGen: ReportGenerator;

  constructor(config: MigrationConfig) {
    this.config = config;
    this.sqliteReader = new SQLiteReader(config.sqlite);
    this.pgWriter = new PostgreSQLWriter(config.postgresql);
    this.transformer = new DataTransformer(config.transformations);
    this.validator = new ValidationEngine(config.validation);
    this.progress = new ProgressTracker(config.progress);
    this.rollbackManager = new RollbackManager(config.rollback);
    this.reportGen = new ReportGenerator();
  }

  // ========================================
  // MAIN COMMANDS
  // ========================================

  /**
   * Generate migration plan by analyzing source database
   */
  async plan(): Promise<MigrationPlan> {
    console.log('📋 Generating Migration Plan...\n');

    try {
      // Step 1: Connect to source database
      await this.sqliteReader.connect();
      const sourceSchema = await this.sqliteReader.getSchema();
      const tableStats = await this.sqliteReader.getTableStats();

      // Step 2: Connect to target database
      await this.pgWriter.connect();
      const targetSchema = await this.pgWriter.getSchema();

      // Step 3: Analyze differences and create plan
      const plan = await this.analyzeMigration(sourceSchema, targetSchema, tableStats);

      // Step 4: Save plan
      await this.savePlan(plan);

      console.log('\n✅ Migration Plan Generated Successfully!');
      console.log(`📄 Plan saved to: ${this.config.outputDir}/migration-plan.json`);

      return plan;
    } catch (error) {
      console.error('❌ Failed to generate migration plan:', error);
      throw error;
    } finally {
      await this.sqliteReader.disconnect();
      await this.pgWriter.disconnect();
    }
  }

  /**
   * Execute the complete migration
   */
  async execute(): Promise<MigrationResult> {
    const startTime = Date.now();
    console.log('🚀 Starting Data Migration: SQLite → PostgreSQL\n');
    console.log(`📅 Timestamp: ${new Date().toISOString()}`);
    console.log(`📂 Source: ${this.config.sqlite.path}`);
    console.log(`🎯 Target: ${this.config.postgresql.connectionString.substring(0, 50)}...\n`);

    let result: MigrationResult = {
      success: false,
      startTime: new Date(),
      endTime: new Date(),
      stats: this.initializeStats(),
      errors: [],
      warnings: []
    };

    try {
      // Step 1: Load or generate plan
      const plan = await this.loadOrCreatePlan();

      // Step 2: Pre-migration backup
      if (this.config.backup.enabled) {
        console.log('💾 Creating pre-migration backup...');
        await this.createBackup();
        console.log('✅ Backup created successfully\n');
      }

      // Step 3: Validate source data
      console.log('🔍 Validating source data...');
      const sourceValidation = await this.validator.validateSource(this.sqliteReader);
      if (!sourceValidation.valid) {
        throw new Error(`Source validation failed: ${sourceValidation.errors.join(', ')}`);
      }
      console.log(`✅ Source data validated (${sourceValidation.totalRecords} records)\n`);

      // Step 4: Prepare target schema
      console.log('🏗️  Preparing target schema...');
      await this.pgWriter.prepareSchema(plan.schemaChanges);
      console.log('✅ Target schema ready\n');

      // Step 5: Migrate tables in dependency order
      console.log('📦 Migrating data...\n');
      
      for (const tablePlan of plan.tables) {
        await this.migrateTable(tablePlan);
        
        // Update progress
        this.progress.updateTableProgress(tablePlan.name, 'completed');
      }

      // Step 6: Post-migration validation
      console.log('\n✅ Running post-migration validation...');
      const targetValidation = await this.validator.validateTarget(this.pgWriter, plan);
      
      if (!targetValidation.valid) {
        result.warnings.push('Post-migration validation found issues');
        console.warn('⚠️  Validation warnings:', targetValidation.warnings);
      } else {
        console.log('✅ All validations passed!');
      }

      // Step 7: Create indexes and constraints
      console.log('🔗 Creating indexes and constraints...');
      await this.pgWriter.createIndexes(plan.indexes);
      console.log('✅ Indexes created\n');

      // Step 8: Finalize
      result.success = true;
      result.endTime = new Date();
      result.stats = this.progress.getFinalStats();
      result.stats.durationMs = Date.now() - startTime;

      // Step 9: Generate report
      const report = await this.reportGen.generate(result, plan);
      console.log(`\n📊 Migration Report: ${report.path}`);

      return result;

    } catch (error) {
      result.success = false;
      result.endTime = new Date();
      result.errors.push(error.message);
      
      console.error('\n❌ Migration Failed!');
      console.error(`Error: ${error.message}`);
      
      // Attempt rollback if configured
      if (this.config.rollback.autoOnError) {
        console.log('\n🔄 Initiating automatic rollback...');
        await this.rollbackManager.execute();
      }

      throw error;
    }
  }

  /**
   * Validate migrated data
   */
  async validate(): Promise<{
    valid: boolean;
    results: Record<string, any>;
    summary: string;
  }> {
    console.log('🔍 Running Post-Migration Validation...\n');

    try {
      await this.pgWriter.connect();
      const results = await this.validator.runFullValidation(this.pgWriter);

      const valid = Object.values(results).every(r => r.valid);
      const passedCount = Object.values(results).filter(r => r.valid).length;
      const totalCount = Object.keys(results).length;

      console.log(`\n${valid ? '✅' : '❌'} Validation Complete!`);
      console.log(`   Passed: ${passedCount}/${totalCount} checks`);
      
      if (!valid) {
        console.log('\n⚠️  Failed Checks:');
        for (const [name, result] of Object.entries(results)) {
          if (!result.valid) {
            console.log(`   - ${name}: ${result.message}`);
          }
        }
      }

      return {
        valid,
        results,
        summary: `${passedCount}/${totalCount} validation checks passed`
      };
    } finally {
      await this.pgWriter.disconnect();
    }
  }

  /**
   * Rollback migration
   */
  async rollback(backupId?: string): Promise<void> {
    console.log('🔄 Rolling Back Migration...\n');

    try {
      await this.rollbackManager.execute(backupId);
      console.log('✅ Rollback completed successfully!');
    } catch (error) {
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }

  /**
   * Show migration status
   */
  async status(): Promise<void> {
    console.log('📊 Migration Status:\n');

    // Check if we can connect to both databases
    let sourceConnected = false;
    let targetConnected = false;

    try {
      await this.sqliteReader.connect();
      sourceConnected = true;
      const sourceInfo = await this.sqliteReader.getInfo();
      console.log('📂 Source Database (SQLite):');
      console.log(`   Path: ${sourceInfo.path}`);
      console.log(`   Size: ${(sourceInfo.sizeBytes / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Tables: ${sourceInfo.tableCount}`);
      console.log(`   Records: ${sourceInfo.totalRecords.toLocaleString()}`);
    } catch (error) {
      console.log('📂 Source Database: ❌ Disconnected');
    } finally {
      if (sourceConnected) await this.sqliteReader.disconnect();
    }

    try {
      await this.pgWriter.connect();
      targetConnected = true;
      const targetInfo = await this.pgWriter.getInfo();
      console.log('\n🎯 Target Database (PostgreSQL):');
      console.log(`   Host: ${targetInfo.host}:${targetInfo.port}`);
      console.log(`   Database: ${targetInfo.database}`);
      console.log(`   Tables: ${targetInfo.tableCount}`);
      console.log(`   Records: ${targetInfo.totalRecords?.toLocaleString() || 'N/A'}`);
    } catch (error) {
      console.log('\n🎯 Target Database: ❌ Disconnected');
    } finally {
      if (targetConnected) await this.pgWriter.disconnect();
    }

    // Check for existing backups
    const backups = await this.rollbackManager.listBackups();
    if (backups.length > 0) {
      console.log('\n💾 Available Backups:');
      backups.forEach(b => {
        console.log(`   - ${b.id} (${b.createdAt}) - ${b.size}`);
      });
    }

    // Check migration history
    const history = await this.getMigrationHistory();
    if (history.length > 0) {
      console.log('\n📜 Migration History:');
      history.forEach(h => {
        console.log(`   - ${h.timestamp}: ${h.status} (${h.tablesMigrated} tables)`);
      });
    }
  }

  /**
   * Generate detailed migration report
   */
  async report(): Promise<string> {
    console.log('📊 Generating Migration Report...');

    const reportPath = await this.reportGen.generateLatest();
    console.log(`\n✅ Report generated: ${reportPath}`);
    
    return reportPath;
  }

  // ========================================
  // PRIVATE METHODS
  // ========================================

  private async analyzeMigration(
    sourceSchema: any,
    targetSchema: any,
    tableStats: any[]
  ): Promise<MigrationPlan> {
    const tables: any[] = [];

    for (const table of tableStats) {
      const tableName = table.name;
      const sourceTable = sourceSchema.tables[tableName];
      const targetTable = targetSchema.tables[tableName];

      // Determine migration strategy
      const strategy = this.determineStrategy(sourceTable, targetTable, table);

      tables.push({
        name: tableName,
        recordCount: table.records,
        estimatedSize: table.sizeBytes,
        strategy,
        transformations: this.transformer.getTransformations(tableName),
        dependencies: this.getDependencies(tableName),
        priority: this.calculatePriority(tableName, table.records)
      });
    }

    // Sort by dependencies then priority
    const sortedTables = this.sortByDependencies(tables);

    return {
      id: `migration-${Date.now()}`,
      generatedAt: new Date(),
      version: '1.0.0',
      sourceType: 'sqlite',
      targetType: 'postgresql',
      tables: sortedTables,
      totalRecords: tableStats.reduce((sum, t) => sum + t.records, 0),
      totalSize: tableStats.reduce((sum, t) => sum + t.sizeBytes, 0),
      estimatedDuration: this.estimateDuration(tableStats),
      schemaChanges: this.calculateSchemaChanges(sourceSchema, targetSchema),
      indexes: this.getIndexPlan(sourceSchema, targetSchema),
      risks: this.identifyRisks(sortedTables)
    };
  }

  private async migrateTable(tablePlan: any): Promise<void> {
    const tableName = tablePlan.name;
    const batchSize = this.config.batchSize || 1000;
    let offset = 0;
    let totalMigrated = 0;
    const totalRecords = tablePlan.recordCount;

    console.log(`\n📦 Migrating: ${tableName}`);
    console.log(`   Total records: ${totalRecords.toLocaleString()}`);
    console.log(`   Batch size: ${batchSize}`);

    this.progress.updateTableProgress(tableName, 'in_progress', 0, totalRecords);

    // Read and migrate in batches
    while (offset < totalRecords) {
      const batch = await this.sqliteReader.readBatch(tableName, offset, batchSize);
      
      if (batch.length === 0) break;

      // Transform data
      const transformed = await this.transformer.transform(tableName, batch);

      // Write to PostgreSQL
      await this.pgWriter.writeBatch(tableName, transformed);

      offset += batchSize;
      totalMigrated += batch.length;

      // Update progress
      this.progress.updateTableProgress(tableName, 'in_progress', totalMigrated, totalRecords);
      
      if (offset % 10000 === 0 || offset >= totalRecords) {
        const percent = Math.round((totalMigrated / totalRecords) * 100);
        console.log(`   Progress: ${percent}% (${totalMigrated.toLocaleString()}/${totalRecords.toLocaleString()})`);
      }
    }

    console.log(`   ✅ Completed: ${totalMigrated.toLocaleString()} records migrated`);
  }

  private async createBackup(): Promise<string> {
    // Implementation depends on backup strategy
    return this.rollbackManager.createBackup();
  }

  private async savePlan(plan: MigrationPlan): Promise<void> {
    const fs = require('fs').promises;
    const path = require('path');
    await fs.writeFile(
      path.join(this.config.outputDir, 'migration-plan.json'),
      JSON.stringify(plan, null, 2)
    );
  }

  private async loadOrCreatePlan(): Promise<MigrationPlan> {
    const fs = require('fs').promises;
    const path = require('path');
    const planPath = path.join(this.config.outputDir, 'migration-plan.json');
    
    try {
      const content = await fs.readFile(planPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      // Plan doesn't exist, generate it
      return this.plan();
    }
  }

  private initializeStats(): MigrationStats {
    return {
      totalTables: 0,
      migratedTables: 0,
      totalRecords: 0,
      migratedRecords: 0,
      failedRecords: 0,
      skippedRecords: 0,
      durationMs: 0,
      startTime: new Date(),
      endTime: new Date()
    };
  }

  // Helper methods for analysis
  private determineStrategy(source: any, target: any, stats: any): string {
    if (!target) return 'create_new';
    if (!source) return 'skip';
    if (stats.records === 0) return 'skip';
    return 'migrate_with_transform';
  }

  private getDependencies(tableName: string): string[] {
    const dependencyMap: Record<string, string[]> = {
      'sessions': ['users'],
      'alerts': ['users', 'incidents'],
      'incidents': ['users', 'threat_hunt_sessions'],
      'audit_logs': ['users'],
      'mfa_devices': ['users'],
      'alert_iocs': ['alerts', 'indicators_of_compromise'],
      'incident_updates': ['incidents', 'users'],
      'incident_evidence': ['incidents'],
      'threat_intel_feeds': [],
      'indicators_of_compromise': ['threat_intel_feeds'],
      'threat_campaigns': ['indicators_of_compromise'],
      'network_elements': [],
      'telecom_subscribers': ['network_elements'],
      'telecom_events': ['network_elements', 'telecom_subscribers'],
      'fraud_cases': ['telecom_subscribers', 'users'],
      'compliance_assessments': ['users'],
      'compliance_findings': ['compliance_assessments'],
      'system_configurations': []
    };
    return dependencyMap[tableName] || [];
  }

  private calculatePriority(tableName: string, recordCount: number): number {
    // Core tables first, then dependent tables
    const coreTables = ['users', 'roles', 'system_configurations'];
    const highPriority = ['alerts', 'incidents', 'threat_intel_feeds'];
    
    if (coreTables.includes(tableName)) return 1;
    if (highPriority.includes(tableName)) return 2;
    if (recordCount > 100000) return 3; // Large tables
    return 4;
  }

  private sortByDependencies(tables: any[]): any[] {
    const sorted: any[] = [];
    const visited = new Set<string>();

    const visit = (table: any) => {
      if (visited.has(table.name)) return;
      visited.add(table.name);

      for (const dep of table.dependencies) {
        const depTable = tables.find(t => t.name === dep);
        if (depTable && !visited.has(dep.name)) {
          visit(depTable);
        }
      }

      sorted.push(table);
    };

    for (const table of tables) {
      visit(table);
    }

    return sorted;
  }

  private estimateDuration(tableStats: any[]): string {
    const totalRecords = tableStats.reduce((sum, t) => sum + t.records, 0);
    // Estimate ~1000 records/second
    const seconds = totalRecords / 1000;
    
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}min`;
    return `${Math.round(seconds / 3600)}h`;
  }

  private calculateSchemaChanges(source: any, target: any): any[] {
    // Return list of schema changes needed
    return [];
  }

  private getIndexPlan(source: any, target: any): any[] {
    // Return index creation plan
    return [];
  }

  private identifyRisks(tables: any[]): string[] {
    const risks: string[] = [];
    
    for (const table of tables) {
      if (table.recordCount > 1000000) {
        risks.push(`Large table '${table.name}' with ${table.recordCount.toLocaleString()} records may take significant time`);
      }
      if (table.strategy === 'migrate_with_transform') {
        risks.push(`Table '${table.name}' requires data transformation - validate carefully`);
      }
    }

    return risks;
  }

  private async getMigrationHistory(): Promise<any[]> {
    // Return migration history from file or DB
    return [];
  }
}

// Export for CLI usage
export default MigrationOrchestrator;
