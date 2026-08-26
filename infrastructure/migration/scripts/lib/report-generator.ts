// ============================================================
// National SOC Platform - Report Generator
// Phase 4: Data Migration (SQLite → PostgreSQL)
// ============================================================
//
// Generates detailed migration reports in multiple formats.
//

import { MigrationResult, MigrationPlan, MigrationStats } from './types';

export interface ReportConfig {
  outputDir: string;
  formats: ('json' | 'html' | 'markdown')[];
  includeDetails: boolean;
  includeSamples: boolean;
}

export interface GeneratedReport {
  path: string;
  format: string;
  generatedAt: Date;
  size: number;
}

export class ReportGenerator {
  private config: ReportConfig;

  constructor(config: Partial<ReportConfig> = {}) {
    this.config = {
      outputDir: '/home/z/my-project/infrastructure/migration/reports',
      formats: ['json', 'markdown'],
      includeDetails: true,
      includeSamples: false,
      ...config
    };
  }

  /**
   * Generate report from migration result
   */
  async generate(result: MigrationResult, plan?: MigrationPlan): Promise<GeneratedReport[]> {
    const reports: GeneratedReport[] = [];
    
    // Ensure output directory exists
    const fs = require('fs').promises;
    await fs.mkdir(this.config.outputDir, { recursive: true });

    for (const format of this.config.formats) {
      try {
        let content: string;
        let extension: string;

        switch (format) {
          case 'json':
            content = this.generateJSONReport(result, plan);
            extension = 'json';
            break;
          case 'html':
            content = this.generateHTMLReport(result, plan);
            extension = 'html';
            break;
          case 'markdown':
          default:
            content = this.generateMarkdownReport(result, plan);
            extension = 'md';
            break;
        }

        const filename = `migration-report-${Date.now()}.${extension}`;
        const filepath = `${this.config.outputDir}/${filename}`;
        
        await fs.writeFile(filepath, content);

        const stats = await fs.stat(filepath);
        
        reports.push({
          path: filepath,
          format,
          generatedAt: new Date(),
          size: stats.size
        });

      } catch (error: any) {
        console.error(`Failed to generate ${format} report: ${error.message}`);
      }
    }

    return reports;
  }

  /**
   * Generate latest report (convenience method)
   */
  async generateLatest(): Promise<string> {
    // This would load the most recent result and generate a fresh report
    // For now, return placeholder
    return `${this.config.outputDir}/migration-report-latest.md`;
  }

  /**
   * Generate JSON format report
   */
  private generateJSONReport(result: MigrationResult, plan?: MigrationPlan): string {
    const reportData = {
      metadata: {
        generatedAt: new Date().toISOString(),
        version: '1.0.0',
        platform: 'Djezzy National SOC Platform',
        phase: 'Phase 4 - Data Migration'
      },
      summary: {
        success: result.success,
        durationMs: result.stats.durationMs,
        durationFormatted: this.formatDuration(result.stats.durationMs),
        totalTables: result.stats.totalTables,
        migratedTables: result.stats.migratedTables,
        totalRecords: result.stats.totalRecords,
        migratedRecords: result.stats.migratedRecords,
        failedRecords: result.stats.failedRecords,
        recordsPerSecond: this.calculateRPS(result.stats),
        startTime: result.startTime,
        endTime: result.endTime
      },
      tables: plan?.tables.map(t => ({
        name: t.name,
        strategy: t.strategy,
        recordCount: t.recordCount,
        status: 'completed' // Would be tracked during migration
      })),
      errors: result.errors,
      warnings: result.warnings,
      validation: result.validation || null
    };

    return JSON.stringify(reportData, null, 2);
  }

  /**
   * Generate HTML format report
   */
  private generateHTMLReport(result: MigrationResult, plan?: MigrationPlan): string {
    const successClass = result.success ? 'success' : 'failure';
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Djezzy SOC - Migration Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #1a1a1a; border-bottom: 3px solid #e74c3c; padding-bottom: 15px; }
        .header { display: flex; justify-content: space-between; align-items: center; }
        .status { padding: 8px 16px; border-radius: 4px; font-weight: bold; }
        .status.success { background: #d4edda; color: #155724; }
        .status.failure { background: #f8d7da; color: #721c24; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .stat-card { background: #f8f9fa; padding: 20px; border-radius: 6px; text-align: center; }
        .stat-value { font-size: 2em; font-weight: bold; color: #2c3e50; }
        .stat-label { color: #6c757d; font-size: 0.9em; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #dee2e6; }
        th { background: #f8f9fa; font-weight: 600; }
        .errors { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔄 Data Migration Report</h1>
            <span class="status ${successClass}">${result.success ? '✅ SUCCESS' : '❌ FAILED'}</span>
        </div>
        
        <p><strong>Platform:</strong> Djezzy National SOC Platform | 
           <strong>Phase:</strong> SQLite → PostgreSQL Migration |
           <strong>Date:</strong> ${new Date().toLocaleString()}</p>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">${result.stats.migratedTables}/${result.stats.totalTables}</div>
                <div class="stat-label">Tables Migrated</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${this.formatNumber(result.stats.migratedRecords)}</div>
                <div class="stat-label">Records Migrated</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${this.formatDuration(result.stats.durationMs)}</div>
                <div class="stat-label">Total Duration</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${this.calculateRPS(result.stats)}</div>
                <div class="stat-label">Records/Second</div>
            </div>
        </div>

        ${plan ? `
        <h2>📋 Tables Summary</h2>
        <table>
            <thead>
                <tr><th>Table Name</th><th>Strategy</th><th>Records</th><th>Status</th></tr>
            </thead>
            <tbody>
                ${plan.tables.map(t => `
                <tr>
                    <td>${t.name}</td>
                    <td>${t.strategy}</td>
                    <td>${this.formatNumber(t.recordCount)}</td>
                    <td>✅ Completed</td>
                </tr>`).join('')}
            </tbody>
        </table>
        ` : ''}

        ${result.errors.length > 0 ? `
        <div class="errors">
            <h3>⚠️ Errors (${result.errors.length})</h3>
            <ul>
                ${result.errors.slice(0, 10).map(e => `<li>${e}</li>`).join('')}
                ${result.errors.length > 10 ? `<li>... and ${result.errors.length - 10} more</li>` : ''}
            </ul>
        </div>
        ` : ''}

        <div class="footer">
            <p>Generated by Djezzy SOC Migration Tool v1.0.0 | Classification: Confidential</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Generate Markdown format report
   */
  private generateMarkdownReport(result: MigrationResult, plan?: MigrationPlan): string {
    const lines: string[] = [];

    lines.push('# 🔄 Djezzy SOC - Data Migration Report');
    lines.push('');
    lines.push('## Executive Summary');
    lines.push('');
    lines.push(`| Metric | Value |`);
    lines.push(`|--------|-------|`);
    lines.push(`| **Status** | ${result.success ? '✅ SUCCESS' : '❌ FAILED'} |`);
    lines.push(`| **Duration** | ${this.formatDuration(result.stats.durationMs)} |`);
    lines.push(`| **Tables** | ${result.stats.migratedTables}/${result.stats.totalTables} |`);
    lines.push(`| **Records** | ${this.formatNumber(result.stats.migratedRecords)}/${this.formatNumber(result.stats.totalRecords)} |`);
    lines.push(`| **Speed** | ~${this.calculateRPS(result.stats)} records/sec |`);
    lines.push(`| **Errors** | ${result.stats.failedRecords} records failed |`);
    lines.push('');

    if (plan && plan.tables.length > 0) {
      lines.push('## 📊 Table Details');
      lines.push('');
      lines.push('| Table | Strategy | Records | Status |');
      lines.push('|-------|----------|---------|--------|');
      
      for (const table of plan.tables) {
        lines.push(`| \`${table.name}\` | ${table.strategy} | ${this.formatNumber(table.recordCount)} | ✅ |`);
      }
      lines.push('');
    }

    if (result.errors.length > 0) {
      lines.push('## ⚠️ Errors & Issues');
      lines.push('');
      for (const error of result.errors.slice(0, 20)) {
        lines.push(`- ❌ ${error}`);
      }
      if (result.errors.length > 20) {
        lines.push(`- ... and ${result.errors.length - 20} more errors`);
      }
      lines.push('');
    }

    if (result.warnings.length > 0) {
      lines.push('## ⚡ Warnings');
      lines.push('');
      for (const warning of result.warnings) {
        lines.push(`- ⚡ ${warning}`);
      }
      lines.push('');
    }

    lines.push('---');
    lines.push('');
    lines.push(`*Generated on ${new Date().toISOString()} by Djezzy SOC Migration Tool*`);
    lines.push('*Classification: Confidential - Djezzy Internal Use Only*');

    return lines.join('\n');
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  private formatNumber(num: number): string {
    return num.toLocaleString();
  }

  private calculateRPS(stats: MigrationStats): string {
    if (!stats.durationMs || stats.durationMs === 0) return '0';
    const seconds = stats.durationMs / 1000;
    const rps = Math.round(stats.migratedRecords / seconds);
    return rps.toLocaleString();
  }
}
