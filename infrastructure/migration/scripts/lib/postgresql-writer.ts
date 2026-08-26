// ============================================================
// National SOC Platform - PostgreSQL Writer Module
// Phase 4: Data Migration
// ============================================================

import { Pool, PoolClient, QueryResult } from 'pg';

export interface PostgreSQLConfig {
  connectionString: string;
  poolSize?: number;
  schema?: string;
}

export interface DatabaseInfo {
  host: string;
  port: number;
  database: string;
  user: string;
  tableCount: number;
  totalRecords?: number;
}

export interface WriteResult {
  insertedCount: number;
  updatedCount: number;
  skippedCount: number;
  errors: Array<{ row: number; error: string }>;
}

export class PostgreSQLWriter {
  private pool: Pool | null = null;
  private config: PostgreSQLConfig;

  constructor(config: PostgreSQLConfig) {
    this.config = {
      ...config,
      poolSize: config.poolSize || 10,
      schema: config.schema || 'public'
    };
  }

  async connect(): Promise<void> {
    try {
      this.pool = new Pool({
        connectionString: this.config.connectionString,
        max: this.config.poolSize,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000
      });

      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      console.log(`✅ Connected to PostgreSQL`);
    } catch (error) {
      throw new Error(`Failed to connect to PostgreSQL: ${error.message}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      console.log('🔌 Disconnected from PostgreSQL');
    }
  }

  /**
   * Get database information
   */
  async getInfo(): Promise<DatabaseInfo> {
    this.ensureConnected();

    // Parse connection string for basic info
    const connStr = this.config.connectionString;
    const match = connStr.match(/@([^:]+):(\d+)\/(\w+)/);
    
    const result = await this.pool!.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = $1
    `, [this.config.schema]);

    const countResult = await this.pool!.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) + 
        (SELECT COUNT(*) FROM alerts) + 
        (SELECT COUNT(*) FROM incidents) as total
    `);

    return {
      host: match?.[1] || 'unknown',
      port: parseInt(match?.[2] || '5432'),
      database: match?.[3] || 'unknown',
      user: 'soc_admin',
      tableCount: parseInt(result.rows[0].count),
      totalRecords: parseInt(countResult.rows[0]?.total || '0')
    };
  }

  /**
   * Get target schema information
   */
  async getSchema(): Promise<{
    tables: Record<string, any>;
    foreignKeys: any[];
    indexes: any[];
  }> {
    this.ensureConnected();

    const tables: Record<string, any> = {};

    // Get all tables in schema
    const tableResult = await this.pool!.query(`
      SELECT table_name, ordinal_position
      FROM information_schema.tables
      WHERE table_schema = $1
      ORDER BY table_name
    `, [this.config.schema]);

    for (const row of tableResult.rows) {
      const columns = await this.getTableColumns(row.table_name);
      
      tables[row.table_name] = {
        name: row.table_name,
        columns,
        recordCount: await this.getRecordCount(row.table_name)
      };
    }

    // Get foreign keys
    const fkResult = await this.pool!.query(`
      SELECT
        tc.table_name, kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.constraint_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      JOIN information_schema.referential_constraints AS rc
        ON rc.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = $1
    `, [this.config.schema]);

    // Get indexes
    const idxResult = await this.pool!.query(`
      SELECT
        i.relname as index_name,
        t.relname as table_name,
        a.attname as column_name,
        ix.indisunique as is_unique
      FROM pg_class t
      JOIN pg_index ix ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
      WHERE t.relkind = 'r'
        AND nspname = $1
      ORDER BY t.relname, i.relname
    `, [this.config.schema]);

    return {
      tables,
      foreignKeys: fkResult.rows,
      indexes: idxResult.rows
    };
  }

  /**
   * Prepare schema - create/modify tables as needed
   */
  async prepareSchema(schemaChanges: any[]): Promise<void> {
    this.ensureConnected();
    const client = await this.pool!.connect();

    try {
      await client.query('BEGIN');

      for (const change of schemaChanges) {
        if (change.type === 'create_table') {
          await client.query(change.sql);
          console.log(`   Created table: ${change.tableName}`);
        } else if (change.type === 'alter_table') {
          await client.query(change.sql);
          console.log(`   Altered table: ${change.tableName}`);
        }
      }

      await client.query('COMMIT');
      console.log('✅ Schema preparation completed');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Write batch of records to a table
   */
  async writeBatch(tableName: string, records: any[]): Promise<WriteResult> {
    this.ensureConnected();

    const result: WriteResult = {
      insertedCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      errors: []
    };

    if (records.length === 0) return result;

    const client = await this.pool!.connect();

    try {
      // Build INSERT statement with conflict handling
      const columns = Object.keys(records[0]);
      const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');
      
      const insertSQL = `
        INSERT INTO ${this.escapeIdentifier(tableName)} (${columns.map(c => this.escapeIdentifier(c)).join(', ')})
        VALUES (${placeholders})
        ON CONFLICT (id) DO UPDATE SET ${columns.filter(c => c !== 'id').map(c => `${this.escapeIdentifier(c)} = EXCLUDED.${this.escapeIdentifier(c)}`).join(', ')}
      `;

      await client.query('BEGIN');

      for (let i = 0; i < records.length; i++) {
        const values = columns.map(col => records[i][col]);
        
        try {
          const queryResult = await client.query(insertSQL, values);
          
          if (queryResult.rowCount > 0) {
            // Check if it was insert or update
            // PostgreSQL doesn't easily tell us, so we assume based on context
            result.insertedCount++;
          }
        } catch (error: any) {
          if (error.code === '23505') { // Unique violation
            result.skippedCount++;
          } else {
            result.errors.push({ row: i, error: error.message });
            
            // Log every 100 errors
            if (result.errors.length % 100 === 0) {
              console.warn(`     ⚠️ ${result.errors.length} errors so far in ${tableName}`);
            }
          }
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return result;
  }

  /**
   * Create indexes after data migration
   */
  async createIndexes(indexPlan: any[]): Promise<void> {
    this.ensureConnected();
    const client = await this.pool!.connect();

    try {
      console.log('\n   Creating indexes...');
      
      for (const indexDef of indexPlan) {
        try {
          await client.query(indexDef.sql);
          console.log(`   ✅ Created index: ${indexDef.name}`);
        } catch (error: any) {
          if (error.code === '42P07') {
            console.log(`   ⏭️ Index already exists: ${indexDef.name}`);
          } else {
            console.warn(`   ⚠️ Failed to create index ${indexDef.name}: ${error.message}`);
          }
        }
      }
    } finally {
      client.release();
    }
  }

  /**
   * Truncate a table (for rollback or re-migration)
   */
  async truncateTable(tableName: string): Promise<void> {
    this.ensureConnected();
    await this.pool!.query(`TRUNCATE TABLE ${this.escapeIdentifier(tableName)} CASCADE`);
  }

  /**
   * Execute raw SQL query
   */
  async query(sql: string, params: any[] = []): Promise<QueryResult<any>> {
    this.ensureConnected();
    return this.pool!.query(sql, params);
  }

  /**
   * Run operation within transaction
   */
  async withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    this.ensureConnected();
    const client = await this.pool!.connect();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get column information for a table
   */
  private async getTableColumns(tableName: string): Promise<Array<{
    name: string;
    type: string;
    nullable: boolean;
    defaultValue: any;
  }>> {
    const result = await this.pool!.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2
      ORDER BY ordinal_position
    `, [this.config.schema, tableName]);

    return result.rows.map(row => ({
      name: row.column_name,
      type: row.data_type,
      nullable: row.is_nullable === 'YES',
      defaultValue: row.column_default
    }));
  }

  /**
   * Get record count for a table
   */
  private async getRecordCount(tableName: string): Promise<number> {
    try {
      const result = await this.pool!.query(
        `SELECT COUNT(*) as count FROM ${this.escapeIdentifier(tableName)}`
      );
      return parseInt(result.rows[0].count);
    } catch {
      return 0;
    }
  }

  /**
   * Escape identifier to prevent SQL injection
   */
  private escapeIdentifier(name: string): string {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      throw new Error(`Invalid identifier: ${name}`);
    }
    return `"${name}"`;
  }

  /**
   * Ensure database pool is active
   */
  private ensureConnected(): void {
    if (!this.pool) {
      throw new Error('PostgreSQL is not connected');
    }
  }
}
