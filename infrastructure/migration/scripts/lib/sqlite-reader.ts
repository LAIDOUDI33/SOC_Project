// ============================================================
// National SOC Platform - SQLite Reader Module
// Phase 4: Data Migration
// ============================================================

import Database from 'better-sqlite3';
import * as path from 'path';

export interface SQLiteConfig {
  path: string;
  readonly?: boolean;
}

export interface TableInfo {
  name: string;
  columns: ColumnInfo[];
  recordCount: number;
  sizeBytes: number;
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  defaultValue: any;
}

export interface DatabaseInfo {
  path: string;
  sizeBytes: number;
  tableCount: number;
  totalRecords: number;
  version: string;
}

export class SQLiteReader {
  private db: Database.Instance | null = null;
  private config: SQLiteConfig;

  constructor(config: SQLiteConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    try {
      const fs = require('fs').promises;
      
      // Check if file exists
      await fs.access(this.config.path);
      
      // Open database
      this.db = new Database(this.config.path, {
        readonly: this.config.readonly ?? true,
        fileMustExist: true
      });

      // Enable WAL mode for better read performance
      this.db.pragma('journal_mode = WAL');
      
      // Set busy timeout for concurrent access
      this.db.pragma('busy_timeout = 5000');

      console.log(`✅ Connected to SQLite: ${this.config.path}`);
    } catch (error) {
      throw new Error(`Failed to connect to SQLite database: ${error.message}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('🔌 Disconnected from SQLite');
    }
  }

  /**
   * Get database information
   */
  async getInfo(): Promise<DatabaseInfo> {
    this.ensureConnected();
    
    const fs = require('fs').promises;
    const stats = await fs.stat(this.config.path);
    
    const tableResult = this.db!.prepare(`
      SELECT COUNT(*) as count FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `).get() as { count: number };

    const recordsResult = this.db!.prepare(`
      SELECT SUM(cnt) as total FROM (
        SELECT COUNT(*) as cnt FROM users UNION ALL
        SELECT COUNT(*) FROM alerts UNION ALL
        SELECT COUNT(*) FROM incidents UNION ALL
        SELECT COUNT(*) FROM roles
      )
    `).get() as { total: number | null };

    return {
      path: this.config.path,
      sizeBytes: stats.size,
      tableCount: tableResult.count,
      totalRecords: recordsResult?.total || 0,
      version: this.db!.prepare('SELECT sqlite_version()').get().sqlite_version
    };
  }

  /**
   * Get complete schema information
   */
  async getSchema(): Promise<{
    tables: Record<string, TableInfo>;
    foreignKeys: any[];
    indexes: any[];
  }> {
    this.ensureConnected();

    const tables: Record<string, TableInfo> = {};
    
    // Get all tables
    const tableNames = this.db!.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all() as { name: string }[];

    for (const { name } of tableNames) {
      const columns = this.getTableColumns(name);
      const recordCount = this.getRecordCount(name);
      const sizeBytes = this.estimateTableSize(name);

      tables[name] = {
        name,
        columns,
        recordCount,
        sizeBytes
      };
    }

    // Get foreign keys
    const foreignKeys = this.db!.prepare(`
      SELECT m.name as table_name, *
      FROM pragma_foreign_key_list(m.name), sqlite_master m 
      WHERE m.type='table' AND m.name NOT LIKE 'sqlite_%'
    `).all();

    // Get indexes
    const indexes = this.db!.prepare(`
      SELECT name, tbl_name, sql FROM sqlite_master 
      WHERE type='index' AND name NOT LIKE 'sqlite_%'
      AND sql IS NOT NULL
    `).all();

    return { tables, foreignKeys, indexes };
  }

  /**
   * Get statistics for all tables
   */
  async getTableStats(): Promise<{
    name: string;
    records: number;
    sizeBytes: number;
  }[]> {
    this.ensureConnected();

    const result = this.db!.prepare(`
      SELECT 
        m.name,
        (SELECT COUNT(*) FROM pragma_table_info(m.name)) as column_count,
        CASE WHEN m.name IN (
          SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ) THEN (
          SELECT COALESCE(
            (SELECT cnt FROM (
              SELECT COUNT(*) as cnt FROM pragma_table_info(m.name)
              LIMIT 1
            )),
            0
          )
        ) ELSE 0 END as records
      FROM sqlite_master m
      WHERE m.type='table' AND m.name NOT LIKE 'sqlite_%'
      ORDER BY m.name
    `).all();

    return result.map((row: any) => ({
      name: row.name,
      records: row.records || this.getRecordCount(row.name),
      sizeBytes: this.estimateTableSize(row.name)
    }));
  }

  /**
   * Read a batch of records from a table
   */
  async readBatch(
    tableName: string,
    offset: number,
    limit: number
  ): Promise<any[]> {
    this.ensureConnected();

    try {
      const query = `SELECT * FROM ${this.escapeIdentifier(tableName)} LIMIT ? OFFSET ?`;
      const stmt = this.db!.prepare(query);
      return stmt.all(limit, offset) as any[];
    } catch (error) {
      throw new Error(`Failed to read batch from ${tableName}: ${error.message}`);
    }
  }

  /**
   * Read all records from a table (for small tables)
   */
  async readAll(tableName: string): Promise<any[]> {
    this.ensureConnected();

    try {
      const query = `SELECT * FROM ${this.escapeIdentifier(tableName)}`;
      return this.db!.prepare(query).all() as any[];
    } catch (error) {
      throw new Error(`Failed to read from ${tableName}: ${error.message}`);
    }
  }

  /**
   * Execute custom query
   */
  async query(sql: string, params: any[] = []): Promise<any[]> {
    this.ensureConnected();
    
    try {
      const stmt = this.db!.prepare(sql);
      return stmt.all(...params) as any[];
    } catch (error) {
      throw new Error(`Query failed: ${error.message}`);
    }
  }

  /**
   * Get column information for a table
   */
  private getTableColumns(tableName: string): ColumnInfo[] {
    const rows = this.db!.pragma(`table_info(${tableName})`) as Array<{
      name: string;
      type: string;
      notnull: number;
      pk: number;
      dflt_value: any;
    }>;

    return rows.map(row => ({
      name: row.name,
      type: row.type,
      nullable: !row.notnull,
      primaryKey: row.pk > 0,
      defaultValue: row.dflt_value
    }));
  }

  /**
   * Get record count for a table
   */
  private getRecordCount(tableName: string): number {
    try {
      const result = this.db!.prepare(`SELECT COUNT(*) as count FROM ${this.escapeIdentifier(tableName)}`).get() as { count: number };
      return result.count;
    } catch {
      return 0;
    }
  }

  /**
   * Estimate table size in bytes
   */
  private estimateTableSize(tableName: string): number {
    try {
      const result = this.db!.prepare(`
        SELECT SUM(pgsize) as size 
        FROM dbstat 
        WHERE name = ?
      `).get(tableName) as { size: number | null };
      return result?.size || 0;
    } catch {
      // Fallback: estimate based on record count and average row size
      const count = this.getRecordCount(tableName);
      return count * 500; // Assume ~500 bytes per row average
    }
  }

  /**
   * Escape identifier to prevent SQL injection
   */
  private escapeIdentifier(name: string): string {
    // Only allow alphanumeric characters and underscores
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      throw new Error(`Invalid table name: ${name}`);
    }
    return `"${name}"`;
  }

  /**
   * Ensure database connection is active
   */
  private ensureConnected(): void {
    if (!this.db) {
      throw new Error('SQLite database is not connected');
    }
  }
}
