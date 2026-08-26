// ============================================================
// National SOC Platform - Progress Tracker
// Phase 4: Data Migration (SQLite → PostgreSQL)
// ============================================================

export interface ProgressConfig {
  updateInterval: number;
  logToFile: boolean;
  logFilePath: string;
  enableProgressBar: boolean;
}

export interface TableProgress {
  tableName: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  currentRecord: number;
  totalRecords: number;
  startTime: Date | null;
  endTime: Date | null;
  errors: number;
  warnings: number;
}

export interface MigrationProgress {
  overallStatus: 'not_started' | 'running' | 'paused' | 'completed' | 'failed' | 'rolled_back';
  startTime: Date | null;
  endTime: Date | null;
  currentPhase: string;
  phases: PhaseProgress[];
  tables: Record<string, TableProgress>;
  stats: ProgressStats;
}

export interface PhaseProgress {
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number; // 0-100
  message: string;
}

export interface ProgressStats {
  totalTables: number;
  completedTables: number;
  failedTables: number;
  totalRecords: number;
  migratedRecords: number;
  failedRecords: number;
  skippedRecords: number;
  recordsPerSecond: number;
  estimatedTimeRemaining: number; // seconds
}

export class ProgressTracker {
  private config: ProgressConfig;
  private progress: MigrationProgress;
  private intervalId: NodeJS.Timeout | null = null;
  private lastUpdateTime: number = 0;

  constructor(config: Partial<ProgressConfig> = {}) {
    this.config = {
      updateInterval: 1000, // 1 second
      logToFile: true,
      logFilePath: '/tmp/soc-migration-progress.log',
      enableProgressBar: true,
      ...config
    };

    this.progress = this.initializeProgress();
  }

  /**
   * Initialize fresh progress object
   */
  private initializeProgress(): MigrationProgress {
    return {
      overallStatus: 'not_started',
      startTime: null,
      endTime: null,
      currentPhase: 'initialization',
      phases: [
        { name: 'preparation', status: 'pending', progress: 0, message: 'Preparing migration...' },
        { name: 'schema_migration', status: 'pending', progress: 0, message: 'Migrating schema...' },
        { name: 'data_migration', status: 'pending', progress: 0, message: 'Migrating data...' },
        { name: 'validation', status: 'pending', progress: 0, message: 'Validating data...' },
        { name: 'indexing', status: 'pending', progress: 0, message: 'Creating indexes...' },
        { name: 'finalization', status: 'pending', progress: 0, message: 'Finalizing...' }
      ],
      tables: {},
      stats: {
        totalTables: 0,
        completedTables: 0,
        failedTables: 0,
        totalRecords: 0,
        migratedRecords: 0,
        failedRecords: 0,
        skippedRecords: 0,
        recordsPerSecond: 0,
        estimatedTimeRemaining: 0
      }
    };
  }

  /**
   * Start tracking
   */
  start(): void {
    this.progress.overallStatus = 'running';
    this.progress.startTime = new Date();
    
    if (this.config.enableProgressBar) {
      this.startPeriodicUpdates();
    }
    
    this.log('Migration started');
    this.updatePhase('preparation', 'in_progress', 10, 'Initializing...');
  }

  /**
   * Stop tracking
   */
  complete(success: boolean): void {
    this.progress.overallStatus = success ? 'completed' : 'failed';
    this.progress.endTime = new Date();
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    const status = success ? '✅ COMPLETED' : '❌ FAILED';
    this.log(`Migration ${status}`);
    this.printFinalSummary();
  }

  /**
   * Update phase progress
   */
  updatePhase(
    phaseName: string,
    status: PhaseProgress['status'],
    progress: number,
    message?: string
  ): void {
    const phase = this.progress.phases.find(p => p.name === phaseName);
    if (phase) {
      phase.status = status;
      phase.progress = Math.min(100, Math.max(0, progress));
      if (message) phase.message = message;
      
      // Update current phase
      if (status === 'in_progress') {
        this.progress.currentPhase = phaseName;
      }
    }
  }

  /**
   * Update table progress
   */
  updateTableProgress(
    tableName: string,
    status: TableProgress['status'],
    currentRecord?: number,
    totalRecords?: number
  ): void {
    if (!this.progress.tables[tableName]) {
      this.progress.tables[tableName] = {
        tableName,
        status: 'pending',
        currentRecord: 0,
        totalRecords: 0,
        startTime: null,
        endTime: null,
        errors: 0,
        warnings: 0
      };
      this.stats.totalTables++;
    }

    const table = this.progress.tables[tableName];
    
    if (table.status !== status || 
        (currentRecord !== undefined && table.currentRecord !== currentRecord)) {
      
      // If just starting
      if (status === 'in_progress' && table.status !== 'in_progress') {
        table.startTime = new Date();
      }
      
      // If completing or failing
      if ((status === 'completed' || status === 'failed' || status === 'skipped') && 
          table.status === 'in_progress') {
        table.endTime = new Date();
        
        if (status === 'completed') this.stats.completedTables++;
        if (status === 'failed') this.stats.failedTables++;
      }
      
      table.status = status;
      
      if (currentRecord !== undefined) {
        this.stats.migratedRecords += (currentRecord - table.currentRecord);
        table.currentRecord = currentRecord;
      }
      
      if (totalRecords !== undefined) {
        this.stats.totalRecords += (totalRecords - table.totalRecords);
        table.totalRecords = totalRecords;
      }

      // Throttled logging
      this.maybeLogTableProgress(tableName);
    }
  }

  /**
   * Increment error count for a table
   */
  incrementError(tableName: string): void {
    if (this.progress.tables[tableName]) {
      this.progress.tables[tableName].errors++;
      this.stats.failedRecords++;
    }
  }

  /**
   * Increment warning count for a table
   */
  incrementWarning(tableName: string): void {
    if (this.progress.tables[tableName]) {
      this.progress.tables[tableName].warnings++;
    }
  }

  /**
   * Get current progress snapshot
   */
  getProgress(): MigrationProgress {
    return { ...this.progress };
  }

  /**
   * Get final statistics
   */
  getFinalStats(): ProgressStats {
    // Calculate final stats
    const elapsed = this.getElapsedTime();
    this.stats.recordsPerSecond = elapsed > 0 ? Math.round(this.stats.migratedRecords / elapsed) : 0;
    this.stats.estimatedTimeRemaining = this.calculateEstimatedTimeRemaining();
    
    return { ...this.stats };
  }

  /**
   * Print progress to console
   */
  printProgress(): void {
    // Clear line and print progress bar
    const overallPercent = this.calculateOverallPercent();
    const bar = this.createProgressBar(overallPercent);
    
    process.stdout.write(`\r${bar} ${overallPercent}%`);
    
    // Print current table info
    const activeTable = Object.values(this.progress.tables)
      .find(t => t.status === 'in_progress');
    
    if (activeTable) {
      const percent = activeTable.totalRecords > 0 
        ? Math.round((activeTable.currentRecord / activeTable.totalRecords) * 100)
        : 0;
      process.stdout.write(` | ${activeTable.tableName}: ${percent}% (${this.formatNumber(activeTable.currentRecord)}/${this.formatNumber(activeTable.totalRecords)})`);
    }
  }

  /**
   * Create a backup of current progress state
   */
  async saveCheckpoint(checkpointName: string): Promise<void> {
    const fs = require('fs').promises;
    const path = require('path');
    
    const checkpointData = {
      checkpointName,
      timestamp: new Date().toISOString(),
      progress: this.progress
    };

    const checkpointPath = path.join(
      path.dirname(this.config.logFilePath),
      `checkpoint-${checkpointName}.json`
    );

    await fs.writeFile(checkpointPath, JSON.stringify(checkpointData, null, 2));
    this.log(`Checkpoint saved: ${checkpointName}`);
  }

  /**
   * Restore from checkpoint
   */
  async restoreCheckpoint(checkpointName: string): Promise<boolean> {
    const fs = require('fs').promises;
    const path = require('path');

    const checkpointPath = path.join(
      path.dirname(this.config.logFilePath),
      `checkpoint-${checkpointName}.json`
    );

    try {
      const data = JSON.parse(await fs.readFile(checkpointPath, 'utf-8'));
      this.progress = data.progress;
      this.log(`Checkpoint restored: ${checkpointName}`);
      return true;
    } catch (error) {
      console.error(`Failed to restore checkpoint: ${error}`);
      return false;
    }
  }

  // ========================================
  // PRIVATE METHODS
  // ========================================

  private startPeriodicUpdates(): void {
    this.intervalId = setInterval(() => {
      this.printProgress();
      this.updateCalculatedStats();
    }, this.config.updateInterval);
  }

  private maybeLogTableProgress(tableName: string): void {
    const now = Date.now();
    if (now - this.lastUpdateTime >= 5000) { // Log every 5 seconds
      const table = this.progress.tables[tableName];
      if (table) {
        this.log(`${tableName}: ${table.status} (${table.currentRecord}/${table.totalRecords})`);
      }
      this.lastUpdateTime = now;
    }
  }

  private updateCalculatedStats(): void {
    const elapsed = this.getElapsedTime();
    this.stats.recordsPerSecond = elapsed > 0 ? Math.round(this.stats.migratedRecords / elapsed) : 0;
    this.stats.estimatedTimeRemaining = this.calculateEstimatedTimeRemaining();
  }

  private calculateOverallPercent(): number {
    if (this.stats.totalRecords === 0) return 0;
    return Math.round((this.stats.migratedRecords / this.stats.totalRecords) * 100);
  }

  private createProgressBar(percent: number, width = 40): string {
    const filled = Math.round(width * percent / 100);
    const empty = width - filled;
    return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
  }

  private getElapsedTime(): number {
    if (!this.progress.startTime) return 0;
    return (Date.now() - this.progress.startTime.getTime()) / 1000;
  }

  private calculateEstimatedTimeRemaining(): number {
    if (this.stats.recordsPerSecond === 0) return 0;
    const remaining = this.stats.totalRecords - this.stats.migratedRecords;
    return Math.ceil(remaining / this.stats.recordsPerSecond);
  }

  private formatNumber(num: number): string {
    return num.toLocaleString();
  }

  private printFinalSummary(): void {
    const elapsed = this.getElapsedTime();
    const minutes = Math.floor(elapsed / 60);
    const seconds = Math.round(elapsed % 60);

    console.log('\n\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Status:       ${this.progress.overallStatus.toUpperCase()}`);
    console.log(`Duration:     ${minutes}m ${seconds}s`);
    console.log(`Tables:       ${this.stats.completedTables}/${this.stats.totalTables} completed`);
    console.log(`Records:      ${this.formatNumber(this.stats.migratedRecords)}/${this.formatNumber(this.stats.totalRecords)} migrated`);
    console.log(`Errors:       ${this.stats.failedRecords} records failed`);
    console.log(`Speed:        ${this.formatNumber(this.stats.recordsPerSecond)} records/sec`);
    console.log('='.repeat(60));

    // Per-table summary
    console.log('\n📋 Table Details:');
    for (const [name, table] of Object.entries(this.progress.tables)) {
      const icon = this.getStatusIcon(table.status);
      const duration = table.startTime && table.endTime 
        ? `${Math.round((table.endTime.getTime() - table.startTime.getTime()) / 1000)}s`
        : '-';
      console.log(`  ${icon} ${name}: ${table.status} (${table.currentRecord}/${table.totalRecords}) ${duration}`);
    }
  }

  private getStatusIcon(status: string): string {
    switch (status) {
      case 'completed': return '✅';
      case 'failed': return '❌';
      case 'skipped': return '⏭️';
      case 'in_progress': return '🔄';
      default: return '⏳';
    }
  }

  private get stats(): ProgressStats {
    return this.progress.stats;
  }

  private async log(message: string): Promise<void> {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message}`;
    
    console.log(logLine);

    if (this.config.logToFile) {
      try {
        const fs = require('fs').promises;
        await fs.appendFile(this.config.logFilePath, logLine + '\n');
      } catch {
        // Ignore file write errors
      }
    }
  }
}
