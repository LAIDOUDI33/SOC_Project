// ============================================================
// National SOC Platform - Rollback Manager
// Phase 4: Data Migration (SQLite → PostgreSQL)
// ============================================================
//
// Handles backup creation and restoration for migration rollback.
//

export interface RollbackConfig {
  enabled: boolean;
  autoOnError: boolean;
  backupLocation: string;
  maxBackups: number;
  compression: boolean;
}

export interface BackupInfo {
  id: string;
  createdAt: Date;
  size: string;
  tables: string[];
  recordCounts: Record<string, number>;
  checksum: string;
  description?: string;
}

export class RollbackManager {
  private config: RollbackConfig;

  constructor(config: Partial<RollbackConfig> = {}) {
    this.config = {
      enabled: true,
      autoOnError: true,
      backupLocation: '/tmp/soc-migration-backups',
      maxBackups: 5,
      compression: true,
      ...config
    };
  }

  /**
   * Create a full backup before migration
   */
  async createBackup(description?: string): Promise<string> {
    if (!this.config.enabled) {
      console.log('⏭️ Rollback disabled - skipping backup');
      return 'disabled';
    }

    console.log('💾 Creating pre-migration backup...');
    
    const backupId = `backup-${Date.now()}`;
    const backupPath = this.getBackupPath(backupId);

    try {
      const fs = require('fs').promises;
      const path = require('path');

      // Ensure backup directory exists
      await fs.mkdir(backupPath, { recursive: true });

      // Get PostgreSQL connection info from environment or config
      const pgConnectionString = process.env.DATABASE_URL || 
        'postgresql://soc_admin:soc_password@localhost:5432/soc_platform';

      // Use pg_dump for backup
      const { exec } = require('child_process');
      
      await new Promise<void>((resolve, reject) => {
        const dumpCommand = `pg_dump "${pgConnectionString}" \
          --format=directory \
          --file="${backupPath}/dump" \
          --jobs=4 \
          --verbose`;

        exec(dumpCommand, (error, stdout, stderr) => {
          if (error) {
            reject(new Error(`pg_dump failed: ${error.message}`));
            return;
          }
          
          // Save metadata
          this.saveBackupMetadata(backupId, description).then(resolve).catch(reject);
        });
      });

      // Clean up old backups
      await this.cleanupOldBackups();

      console.log(`✅ Backup created: ${backupId}`);
      return backupId;

    } catch (error) {
      console.error(`❌ Failed to create backup: ${error.message}`);
      throw error;
    }
  }

  /**
   * Execute rollback by restoring from backup
   */
  async execute(backupId?: string): Promise<void> {
    if (!this.config.enabled) {
      throw new Error('Rollback is not enabled');
    }

    const targetBackup = backupId || await this.getLatestBackupId();
    
    if (!targetBackup || targetBackup === 'disabled') {
      throw new Error('No backup available for rollback');
    }

    console.log(`🔄 Executing rollback using backup: ${targetBackup}`);

    const backupPath = this.getBackupPath(targetBackup);

    try {
      // Verify backup exists
      const fs = require('fs').promises;
      await fs.access(backupPath);

      // Get PostgreSQL connection info
      const pgConnectionString = process.env.DATABASE_URL || 
        'postgresql://soc_admin:soc_password@localhost:5432/soc_platform';

      // Drop existing data and restore
      const { exec } = require('child_process');

      await new Promise<void>((resolve, reject) => {
        // First, drop all tables in reverse dependency order
        const dropTables = `
          DROP TABLE IF EXISTS incident_evidence CASCADE;
          DROP TABLE IF EXISTS incident_updates CASCADE;
          DROP TABLE IF EXISTS alert_iocs CASCADE;
          DROP TABLE IF EXISTS fraud_cases CASCADE;
          DROP TABLE IF EXISTS telecom_events CASCADE;
          DROP TABLE IF EXISTS telecom_subscribers CASCADE;
          DROP TABLE IF EXISTS network_elements CASCADE;
          DROP TABLE IF EXISTS threat_campaigns CASCADE;
          DROP TABLE IF EXISTS indicators_of_compromise CASCADE;
          DROP TABLE IF EXISTS threat_intel_feeds CASCADE;
          DROP TABLE IF EXISTS compliance_findings CASCADE;
          DROP TABLE IF EXISTS compliance_assessments CASCADE;
          DROP TABLE IF EXISTS sessions CASCADE;
          DROP TABLE IF EXISTS mfa_devices CASCADE;
          DROP TABLE IF EXISTS incidents CASCADE;
          DROP TABLE IF EXISTS alerts CASCADE;
          DROP TABLE IF EXISTS users CASCADE;
          DROP TABLE IF EXISTS roles CASCADE;
          DROP TABLE IF EXISTS system_configurations CASCADE;
        `;

        const restoreCommand = `psql "${pgConnectionString}" <<EOF
${dropTables}
\\echo 'Tables dropped successfully'
EOF

pg_restore --dbname="${pgConnectionString}" \
  --clean \
  --if-exists \
  --jobs=4 \
  --verbose \
  "${backupPath}/dump"`;

        exec(restoreCommand, (error, stdout, stderr) => {
          if (error) {
            reject(new Error(`Rollback failed: ${error.message}`));
            return;
          }
          resolve();
        });
      });

      console.log(`✅ Rollback completed successfully from backup: ${targetBackup}`);

    } catch (error) {
      console.error(`❌ Rollback failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * List all available backups
   */
  async listBackups(): Promise<BackupInfo[]> {
    const fs = require('fs').promises;
    const path = require('path');

    try {
      const backupsDir = this.config.backupLocation;
      const entries = await fs.readdir(backupsDir, { withFileTypes: true });
      
      const backupDirs = entries
        .filter(e => e.isDirectory() && e.name.startsWith('backup-'))
        .map(e => e.name)
        .sort()
        .reverse(); // Most recent first

      const backups: BackupInfo[] = [];

      for (const dir of backupDirs) {
        const metadata = await this.loadBackupMetadata(dir);
        if (metadata) {
          backups.push(metadata);
        }
      }

      return backups;
    } catch {
      return [];
    }
  }

  /**
   * Delete old backups beyond retention limit
   */
  private async cleanupOldBackups(): Promise<void> {
    const backups = await this.listBackups();
    
    if (backups.length <= this.config.maxBackups) return;

    const fs = require('fs').promises;
    const toDelete = backups.slice(this.config.maxBackups);

    for (const backup of toDelete) {
      const backupPath = this.getBackupPath(backup.id);
      
      try {
        await fs.rm(backupPath, { recursive: true, force: true });
        console.log(`🗑️ Deleted old backup: ${backup.id}`);
      } catch (error) {
        console.warn(`⚠️ Could not delete backup ${backup.id}: ${error}`);
      }
    }
  }

  /**
   * Get the most recent backup ID
   */
  private async getLatestBackupId(): Promise<string | null> {
    const backups = await this.listBackups();
    return backups.length > 0 ? backups[0].id : null;
  }

  /**
   * Get filesystem path for a backup
   */
  private getBackupPath(backupId: string): string {
    const path = require('path');
    return path.join(this.config.backupLocation, backupId);
  }

  /**
   * Save backup metadata
   */
  private async saveBackupMetadata(backupId: string, description?: string): Promise<void> {
    const fs = require('fs').promises;
    const path = require('path');

    const metadata: BackupInfo = {
      id: backupId,
      createdAt: new Date(),
      size: 'Calculating...',
      tables: [],
      recordCounts: {},
      checksum: '',
      description
    };

    const metadataPath = path.join(this.getBackupPath(backupId), 'metadata.json');
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  }

  /**
   * Load backup metadata
   */
  private async loadBackupMetadata(backupId: string): Promise<BackupInfo | null> {
    const fs = require('fs').promises;
    const path = require('path');

    try {
      const metadataPath = path.join(this.getBackupPath(backupId), 'metadata.json');
      const content = await fs.readFile(metadataPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
}
