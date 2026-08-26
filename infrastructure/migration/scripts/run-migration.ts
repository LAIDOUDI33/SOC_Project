#!/usr/bin/env node
// ============================================================
// National SOC Platform - Migration CLI Entry Point
// Phase 4: Data Migration (SQLite → PostgreSQL)
// ============================================================
//
// Usage:
//   npx ts-node scripts/migration/run-migration.ts [command] [options]
//
// Commands:
//   plan      - Analyze databases and generate migration plan
//   execute   - Run full migration with validation
//   validate  - Validate migrated data integrity
//   rollback  - Restore from backup
//   status    - Show migration status
//   report    - Generate detailed report
//   help      - Show this help message
//

import { MigrationOrchestrator } from './migration-orchestrator';
import { MigrationConfig } from './lib/types';
import * as path from 'path';

// ========================================
// DEFAULT CONFIGURATION
// ========================================

const DEFAULT_CONFIG: MigrationConfig = {
  // SQLite source database
  sqlite: {
    path: path.resolve(__dirname, '../../../03_SOC_Dashboard/prisma/soc.db'),
    readonly: true
  },

  // PostgreSQL target database
  postgresql: {
    connectionString: process.env.DATABASE_URL || 
      'postgresql://soc_admin:soc_password@localhost:5432/soc_platform',
    poolSize: 10,
    schema: 'public'
  },

  // Transformation rules (empty = use defaults)
  transformations: [],

  // Validation settings
  validation: {
    strictMode: false,
    maxErrors: 1000,
    sampleSize: 1000,
    checkConstraints: true,
    checkForeignKeys: true
  },

  // Progress tracking
  progress: {
    updateInterval: 1000,
    logToFile: true,
    logFilePath: '/tmp/soc-migration-progress.log',
    enableProgressBar: true
  },

  // Rollback configuration
  rollback: {
    enabled: true,
    autoOnError: true,
    backupLocation: '/tmp/soc-migration-backups',
    maxBackups: 5,
    compression: true
  },

  // General settings
  batchSize: 1000,
  outputDir: path.resolve(__dirname, '../reports'),
  dryRun: false,
  continueOnError: false
};

// ========================================
// CLI PARSING
// ========================================

function parseArgs(): { command: string; options: string[] } {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
    showHelp();
    process.exit(0);
  }

  return {
    command: args[0],
    options: args.slice(1)
  };
}

function showHelp(): void {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║     Djezzy National SOC Platform - Data Migration Tool        ║
║                    Phase 4: SQLite → PostgreSQL                ║
╚══════════════════════════════════════════════════════════════╝

USAGE:
  npx ts-node run-migration.ts <command> [options]

COMMANDS:
  plan       Analyze source/target databases and generate migration plan
  execute    Execute complete data migration with all validations
  validate   Validate migrated data integrity and consistency
  rollback   Rollback to pre-migration state (requires backup)
  status     Show current database and migration status
  report     Generate detailed migration report in multiple formats
  help       Show this help message

OPTIONS:
  --dry-run           Simulate migration without writing to target
  --continue          Continue on errors instead of stopping
  --batch-size N      Set batch size for record processing (default: 1000)
  --strict            Enable strict validation mode
  --no-backup         Skip creating backup before migration
  --no-rollback       Disable automatic rollback on failure

EXAMPLES:
  # Generate migration plan
  npx ts-node run-migration.ts plan

  # Execute full migration
  npx ts-node run-migration.ts execute

  # Execute with dry-run first
  npx ts-node run-migration.ts execute --dry-run

  # Validate migrated data
  npx ts-node run-migration.ts validate

  # Show status
  npx ts-node run-migration.ts status

  # Rollback last migration
  npx ts-node run-migration.ts rollback

ENVIRONMENT VARIABLES:
  DATABASE_URL    PostgreSQL connection string (required for execute/validate)

CONFIGURATION:
  Configuration file: infrastructure/migration/config/migration.config.json
  
  You can override default settings by creating a config file or setting
  environment variables.

SUPPORT:
  Documentation: infrastructure/migration/docs/DATA_MIGRATION_GUIDE.md
  Issues: soc-ops@djezzy.dz

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
}

// ========================================
// MAIN EXECUTION
// ========================================

async function main(): Promise<void> {
  const { command, options } = parseArgs();

  // Parse command-line options into config overrides
  const configOverrides = parseOptions(options);

  // Merge with defaults
  const config: MigrationConfig = {
    ...DEFAULT_CONFIG,
    ...configOverrides
  };

  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║     Djezzy National SOC Platform - Data Migration             ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  try {
    const orchestrator = new MigrationOrchestrator(config);

    switch (command) {
      case 'plan':
        await handlePlan(orchestrator);
        break;

      case 'execute':
        await handleExecute(orchestrator, config);
        break;

      case 'validate':
        await handleValidate(orchestrator);
        break;

      case 'rollback':
        await handleRollback(orchestrator);
        break;

      case 'status':
        await handleStatus(orchestrator);
        break;

      case 'report':
        await handleReport(orchestrator);
        break;

      default:
        console.error(`❌ Unknown command: ${command}`);
        console.log('Run "help" for available commands');
        process.exit(1);
    }

  } catch (error: any) {
    console.error('\n❌ Fatal Error:');
    console.error(error.message);
    
    if (process.env.DEBUG) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    
    process.exit(1);
  }
}

// ========================================
// COMMAND HANDLERS
// ========================================

async function handlePlan(orchestrator: MigrationOrchestrator): Promise<void> {
  console.log('📋 Command: GENERATE MIGRATION PLAN\n');
  
  const plan = await orchestrator.plan();
  
  console.log('\n📊 Plan Summary:');
  console.log(`   Tables to migrate: ${plan.tables.length}`);
  console.log(`   Total records: ${plan.totalRecords.toLocaleString()}`);
  console.log(`   Estimated duration: ${plan.estimatedDuration}`);
  console.log(`   Risks identified: ${plan.risks.length}`);
  
  if (plan.risks.length > 0) {
    console.log('\n⚠️  Risks:');
    plan.risks.forEach(risk => console.log(`   - ${risk}`));
  }
}

async function handleExecute(orchestrator: MigrationOrchestrator, config: MigrationConfig): Promise<void> {
  console.log('🚀 Command: EXECUTE MIGRATION\n');
  
  if (config.dryRun) {
    console.log('⚠️  DRY-RUN MODE - No changes will be made\n');
  }
  
  const startTime = Date.now();
  
  const result = await orchestrator.execute();
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  
  console.log('\n' + '='.repeat(60));
  console.log(result.success ? '✅ MIGRATION COMPLETED SUCCESSFULLY' : '❌ MIGRATION FAILED');
  console.log('='.repeat(60));
  console.log(`⏱️  Duration: ${duration}s`);
  console.log(`📦 Tables: ${result.stats.migratedTables}/${result.stats.totalTables}`);
  console.log(`📄 Records: ${result.stats.migratedRecords.toLocaleString()} migrated`);
  
  if (result.errors.length > 0) {
    console.log(`❌ Errors: ${result.errors.length}`);
    result.errors.slice(0, 5).forEach(err => console.log(`   - ${err}`));
  }
  
  if (!result.success) {
    process.exit(1);
  }
}

async function handleValidate(orchestrator: MigrationOrchestrator): Promise<void> {
  console.log('🔍 Command: VALIDATE DATA\n');
  
  const validationResult = await orchestrator.validate();
  
  console.log(`\nResult: ${validationResult.valid ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Summary: ${validationResult.summary}`);
  
  if (!validationResult.valid) {
    console.log('\nFailed checks:');
    for (const [name, result] of Object.entries(validationResult.results)) {
      if (!result.valid) {
        console.log(`  ❌ ${name}: ${result.message}`);
      }
    }
    process.exit(1);
  }
}

async function handleRollback(orchestrator: MigrationOrchestrator): Promise<void> {
  console.log('🔄 Command: ROLLBACK MIGRATION\n');
  
  const backupId = process.argv.find(arg => arg.startsWith('--backup='))?.split('=')[1];
  
  await orchestrator.rollback(backupId);
}

async function handleStatus(orchestrator: MigrationOrchestrator): Promise<void> {
  console.log('📊 Command: SHOW STATUS\n');
  
  await orchestrator.status();
}

async function handleReport(orchestrator: MigrationOrchestrator): Promise<void> {
  console.log('📄 Command: GENERATE REPORT\n');
  
  const reportPath = await orchestrator.report();
  console.log(`\n📄 Report saved to: ${reportPath}`);
}

// ========================================
// OPTION PARSING
// ========================================

function parseOptions(options: string[]): Partial<MigrationConfig> {
  const overrides: Partial<MigrationConfig> = {};

  for (const option of options) {
    switch (option) {
      case '--dry-run':
        overrides.dryRun = true;
        break;
      
      case '--continue':
        overrides.continueOnError = true;
        break;
      
      case '--strict':
        overrides.validation = { ...DEFAULT_CONFIG.validation, strictMode: true };
        break;
      
      case '--no-backup':
        overrides.rollback = { ...DEFAULT_CONFIG.rollback, enabled: false };
        break;
      
      case '--no-rollback':
        overrides.rollback = { ...DEFAULT_CONFIG.rollback, autoOnError: false };
        break;
      
      default:
        if (option.startsWith('--batch-size=')) {
          overrides.batchSize = parseInt(option.split('=')[1]) || DEFAULT_CONFIG.batchSize;
        }
        break;
    }
  }

  return overrides;
}

// ========================================
// RUN
// ========================================

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
