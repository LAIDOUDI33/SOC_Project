// ============================================================
// National SOC Platform - Data Transformer Module
// Phase 4: Data Migration (SQLite → PostgreSQL)
// ============================================================
//
// Handles data type conversions, field mappings,
// and transformations between SQLite and PostgreSQL schemas.
//

export interface TransformationRule {
  sourceField: string;
  targetField: string;
  transform?: (value: any) => any;
  defaultValue?: any;
  required?: boolean;
}

export interface TableTransformation {
  tableName: string;
  rules: TransformationRule[];
  preProcess?: (records: any[]) => Promise<any[]>;
  postProcess?: (records: any[]) => Promise<any[]>;
}

export class DataTransformer {
  private transformations: Map<string, TableTransformation> = new Map();
  private defaultTransformations: Map<string, (value: any) => any>;

  constructor(customRules: TableTransformation[] = []) {
    // Initialize default type transformers
    this.defaultTransformations = new Map([
      ['sqlite_to_pg_boolean', this.transformBoolean.bind(this)],
      ['sqlite_to_pg_json', this.transformJSON.bind(this)],
      ['sqlite_to_pg_timestamp', this.transformTimestamp.bind(this)],
      ['sqlite_to_pg_array', this.transformArray.bind(this)],
      ['sqlite_to_pg_uuid', this.transformUUID.bind(this)]
    ]);

    // Register custom rules
    for (const rule of customRules) {
      this.transformations.set(rule.tableName, rule);
    }

    // Register default SOC platform transformations
    this.registerSOCPlatformTransformations();
  }

  /**
   * Transform records from SQLite format to PostgreSQL format
   */
  async transform(tableName: string, records: any[]): Promise<any[]> {
    if (!records || records.length === 0) return [];

    let transformed = [...records];

    // Get transformation rules for this table
    const tableTransform = this.transformations.get(tableName);

    if (tableTransform?.preProcess) {
      transformed = await tableTransform.preProcess(transformed);
    }

    // Apply field-level transformations
    if (tableTransform?.rules) {
      transformed = transformed.map(record => 
        this.applyTransformationRules(record, tableTransform.rules)
      );
    } else {
      // Apply default transformations based on value types
      transformed = transformed.map(record =>
        this.applyDefaultTransformations(record)
      );
    }

    if (tableTransform?.postProcess) {
      transformed = await tableTransform.postProcess(transformed);
    }

    return transformed;
  }

  /**
   * Get transformation rules for a specific table
   */
  getTransformations(tableName: string): TransformationRule[] {
    return this.transformations.get(tableName)?.rules || [];
  }

  /**
   * Register new transformation rule
   */
  registerTransformation(tableTransform: TableTransformation): void {
    this.transformations.set(tableTransform.tableName, tableTransform);
  }

  /**
   * Apply transformation rules to a single record
   */
  private applyTransformationRules(
    record: any,
    rules: TransformationRule[]
  ): any {
    const result: any = {};

    for (const rule of rules) {
      const sourceValue = record[rule.sourceField];
      
      try {
        if (rule.transform) {
          result[rule.targetField] = rule.transform(sourceValue);
        } else if (sourceValue !== undefined && sourceValue !== null) {
          result[rule.targetField] = this.autoTransform(sourceValue);
        } else if (rule.defaultValue !== undefined) {
          result[rule.targetField] = rule.defaultValue;
        } else if (rule.required) {
          throw new Error(`Required field ${rule.sourceField} is missing`);
        }
        // If not required and no value, skip (let DB handle default)
      } catch (error: any) {
        console.warn(`     ⚠️ Transform error [${tableName}.${rule.sourceField}]: ${error.message}`);
        result[rule.targetField] = rule.defaultValue || null;
      }
    }

    // Copy any fields not in rules but present in record
    const ruleSourceFields = new Set(rules.map(r => r.sourceField));
    for (const [key, value] of Object.entries(record)) {
      if (!ruleSourceFields.has(key) && !result.hasOwnProperty(key)) {
        result[key] = this.autoTransform(value);
      }
    }

    return result;
  }

  /**
   * Apply default type-based transformations
   */
  private applyDefaultTransformations(record: any): any {
    const result: any = {};

    for (const [key, value] of Object.entries(record)) {
      result[key] = this.autoTransform(value);
    }

    return result;
  }

  /**
   * Auto-detect and apply appropriate transformation
   */
  private autoTransform(value: any): any {
    if (value === null || value === undefined) return null;

    // Handle different SQLite types
    if (typeof value === 'string') {
      // Check for JSON strings
      if ((value.startsWith('{') && value.endsWith('}')) ||
          (value.startsWith('[') && value.endsWith(']'))) {
        return this.transformJSON(value);
      }
      
      // Check for timestamp strings
      if (this.looksLikeTimestamp(value)) {
        return this.transformTimestamp(value);
      }
      
      // Check for boolean strings
      if (value === '1' || value === '0' || value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
        return this.transformBoolean(value);
      }
      
      // Check for array strings (comma-separated)
      if (value.includes(',') && !value.includes(' ')) {
        return this.transformArray(value);
      }
    }

    // Handle SQLite integer booleans (0/1)
    if (typeof value === 'number' && (value === 0 || value === 1)) {
      // Could be boolean or regular number - keep as is for now
      // PostgreSQL will handle casting based on column type
    }

    return value;
  }

  /**
   * Transform SQLite boolean to PostgreSQL boolean
   */
  private transformBoolean(value: any): boolean | null {
    if (value === null || value === undefined) return null;
    
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true' || value === '1';
    }
    
    return Boolean(value);
  }

  /**
   * Transform JSON string to PostgreSQL JSON/JSONB
   */
  private transformJSON(value: any): any {
    if (value === null || value === undefined) return null;
    
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        // Not valid JSON, return as string
        return value;
      }
    }
    
    if (typeof value === 'object') return value;
    
    return value;
  }

  /**
   * Transform timestamp to PostgreSQL TIMESTAMP/TIMESTAMPTZ
   */
  private transformTimestamp(value: any): Date | string | null {
    if (value === null || value === undefined) return null;
    
    if (value instanceof Date) return value;
    
    if (typeof value === 'string') {
      // Handle various SQLite date formats
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().replace('T', ' ').replace('Z', '');
      }
    }
    
    if (typeof value === 'number') {
      // Unix timestamp (seconds or milliseconds)
      const date = new Date(value > 1e12 ? value : value * 1000);
      return date.toISOString().replace('T', ' ').replace('Z', '');
    }
    
    return value;
  }

  /**
   * Transform comma-separated string to PostgreSQL array
   */
  private transformArray(value: any): string[] | null {
    if (value === null || value === undefined) return null;
    
    if (Array.isArray(value)) return value;
    
    if (typeof value === 'string') {
      // Handle JSON array string
      if (value.startsWith('[')) {
        try {
          return JSON.parse(value);
        } catch {
          // Fall through to comma-separated parsing
        }
      }
      
      // Comma-separated values
      return value.split(',').map(s => s.trim()).filter(s => s.length > 0);
    }
    
    return [value];
  }

  /**
   * Generate UUID from existing ID or create new one
   */
  private transformUUID(value: any): string {
    if (!value) return crypto.randomUUID();
    
    // If already looks like UUID/CUID, keep it
    if (typeof value === 'string' && /^[a-z0-9-]{20,}$/.test(value)) {
      return value;
    }
    
    // Convert numeric IDs to UUID-like format
    return `migration-${value}-${Date.now()}`;
  }

  /**
   * Check if string looks like a timestamp
   */
  private looksLikeTimestamp(value: string): boolean {
    // Match common date formats
    const patterns = [
      /^\d{4}-\d{2}-\d{2}/,                    // ISO: 2024-01-15
      /^\d{2}\/\d{2}\/\d{4}/,                  // US: 01/15/2024
      /^\d{2}-\d{2}-\d{4}/,                    // EU: 15-01-2024
      /^\d{10}$/,                               // Unix timestamp (seconds)
      /^\d{13}$/                                // Unix timestamp (milliseconds)
    ];
    
    return patterns.some(p => p.test(value));
  }

  /**
   * Register default SOC Platform transformations
   */
  private registerSOCPlatformTransformations(): void {
    // Users table
    this.registerTransformation({
      tableName: 'users',
      rules: [
        { sourceField: 'id', targetField: 'id' },
        { sourceField: 'email', targetField: 'email' },
        { sourceField: 'username', targetField: 'username' },
        { sourceField: 'passwordHash', targetField: 'passwordHash' },
        { sourceField: 'name', targetField: 'name' },
        { sourceField: 'avatarUrl', targetField: 'avatarUrl' },
        { sourceField: 'isActive', targetField: 'isActive', transform: v => this.transformBoolean(v), defaultValue: true },
        { sourceField: 'isMfaEnabled', targetField: 'isMfaEnabled', transform: v => this.transformBoolean(v), defaultValue: false },
        { sourceField: 'mfaSecret', targetField: 'mfaSecret' },
        { sourceField: 'lastLoginAt', targetField: 'lastLoginAt', transform: v => this.transformTimestamp(v) },
        { sourceField: 'passwordChangedAt', targetField: 'passwordChangedAt', transform: v => this.transformTimestamp(v) },
        { sourceField: 'roleId', targetField: 'roleId' },
        { sourceField: 'createdAt', targetField: 'createdAt', transform: v => this.transformTimestamp(v) },
        { sourceField: 'updatedAt', targetField: 'updatedAt', transform: v => this.transformTimestamp(v) },
        { sourceField: 'ldapDN', targetField: 'ldap_dn' },
        { sourceField: 'ldapGUID', targetField: 'ldap_guid' },
        { sourceField: 'ldapSID', targetField: 'ldap_sid' },
        { sourceField: 'employeeId', targetField: 'employee_id' },
        { sourceField: 'department', targetField: 'department' }
      ]
    });

    // Alerts table
    this.registerTransformation({
      tableName: 'alerts',
      rules: [
        { sourceField: 'id', targetField: 'id' },
        { sourceField: 'title', targetField: 'title' },
        { sourceField: 'description', targetField: 'description' },
        { sourceField: 'severity', targetField: 'severity', defaultValue: 'MEDIUM' },
        { sourceField: 'status', targetField: 'status', defaultValue: 'ACTIVE' },
        { sourceField: 'source', targetField: 'source' },
        { sourceField: 'category', targetField: 'category' },
        { sourceField: 'rawEvent', targetField: 'rawEvent', transform: v => this.transformJSON(v) },
        { sourceField: 'assignedTo', targetField: 'assignedTo' },
        { sourceField: 'assignedTeam', targetField: 'assignedTeam' },
        { sourceField: 'firstSeen', targetField: 'firstSeen', transform: v => this.transformTimestamp(v) },
        { sourceField: 'lastSeen', targetField: 'lastSeen', transform: v => this.transformTimestamp(v) },
        { sourceField: 'count', targetField: 'count', defaultValue: 1 },
        { sourceField: 'tags', targetField: 'tags', transform: v => this.transformArray(v), defaultValue: [] },
        { sourceField: 'iocIds', targetField: 'iocIds', transform: v => this.transformArray(v), defaultValue: [] },
        { sourceField: 'incidentId', targetField: 'incidentId' },
        { sourceField: 'falsePositive', targetField: 'falsePositive', transform: v => this.transformBoolean(v), defaultValue: false },
        { sourceField: 'suppressionRule', targetField: 'suppressionRule' },
        { sourceField: 'context', targetField: 'context', transform: v => this.transformJSON(v) },
        { sourceField: 'mitreTechnique', targetField: 'mitreTechnique' },
        { sourceField: 'mitreTactic', targetField: 'mitreTactic' },
        { sourceField: 'playbookTriggered', targetField: 'playbookTriggered', transform: v => this.transformBoolean(v), defaultValue: false },
        { sourceField: 'createdAt', targetField: 'createdAt', transform: v => this.transformTimestamp(v) },
        { sourceField: 'updatedAt', targetField: 'updatedAt', transform: v => this.transformTimestamp(v) }
      ]
    });

    // Incidents table
    this.registerTransformation({
      tableName: 'incidents',
      rules: [
        { sourceField: 'id', targetField: 'id' },
        { sourceField: 'title', targetField: 'title' },
        { sourceField: 'description', targetField: 'description' },
        { sourceField: 'status', targetField: 'status', defaultValue: 'OPEN' },
        { sourceField: 'severity', targetField: 'severity', defaultValue: 'HIGH' },
        { sourceField: 'type', targetField: 'type' },
        { sourceField: 'phase', targetField: 'phase', defaultValue: 'DETECTION' },
        { sourceField: 'assignedTo', targetField: 'assignedTo' },
        { sourceField: 'assignedTeam', targetField: 'assignedTeam' },
        { sourceField: 'ownerId', targetField: 'ownerId' },
        { sourceField: 'detectedAt', targetField: 'detectedAt', transform: v => this.transformTimestamp(v) },
        { sourceField: 'resolvedAt', targetField: 'resolvedAt', transform: v => this.transformTimestamp(v) },
        { sourceField: 'tags', targetField: 'tags', transform: v => this.transformArray(v), defaultValue: [] },
        { sourceField: 'iocs', targetField: 'iocs', transform: v => this.transformArray(v), defaultValue: [] },
        { sourceField: 'artifacts', targetField: 'artifacts', transform: v => this.transformJSON(v) },
        { sourceField: 'rootCause', targetField: 'rootCause' },
        { sourceField: 'impact', targetField: 'impact' },
        { sourceField: 'containmentStrategy', targetField: 'containmentStrategy' },
        { sourceField: 'lessonsLearned', targetField: 'lessonsLearned' },
        { sourceField: 'createdAt', targetField: 'createdAt', transform: v => this.transformTimestamp(v) },
        { sourceField: 'updatedAt', targetField: 'updatedAt', transform: v => this.transformTimestamp(v) }
      ]
    });

    // Roles table
    this.registerTransformation({
      tableName: 'roles',
      rules: [
        { sourceField: 'id', targetField: 'id' },
        { sourceField: 'name', targetField: 'name' },
        { sourceField: 'description', targetField: 'description' },
        { sourceField: 'permissions', targetField: 'permissions', transform: v => this.transformJSON(v), defaultValue: '[]' },
        { sourceField: 'isSystemRole', targetField: 'isSystemRole', transform: v => this.transformBoolean(v), defaultValue: false },
        { sourceField: 'createdAt', targetField: 'createdAt', transform: v => this.transformTimestamp(v) },
        { sourceField: 'updatedAt', targetField: 'updatedAt', transform: v => this.transformTimestamp(v) }
      ]
    });

    // Sessions table
    this.registerTransformation({
      tableName: 'sessions',
      rules: [
        { sourceField: 'id', targetField: 'id' },
        { sourceField: 'userId', targetField: 'userId' },
        { sourceField: 'token', targetField: 'token' },
        { sourceField: 'refreshToken', targetField: 'refreshToken' },
        { sourceField: 'userAgent', targetField: 'userAgent' },
        { sourceField: 'ipAddress', targetField: 'ipAddress' },
        { sourceField: 'expiresAt', targetField: 'expiresAt', transform: v => this.transformTimestamp(v) },
        { sourceField: 'revokedAt', targetField: 'revokedAt', transform: v => this.transformTimestamp(v) },
        { sourceField: 'lastActivityAt', targetField: 'lastActivityAt', transform: v => this.transformTimestamp(v) },
        { sourceField: 'createdAt', targetField: 'createdAt', transform: v => this.transformTimestamp(v) }
      ],
      postProcess: async (records) => {
        // Hash tokens for security before storing in PostgreSQL
        return records.map(r => ({
          ...r,
          token: r.token ? this.hashToken(r.token) : null,
          refreshToken: r.refreshToken ? this.hashToken(r.refreshToken) : null
        }));
      }
    });
  }

  /**
   * Simple hash function for tokens (use proper hashing in production)
   */
  private hashToken(token: string): string {
    // In production, use bcrypt/argon2 - this is just for migration
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
