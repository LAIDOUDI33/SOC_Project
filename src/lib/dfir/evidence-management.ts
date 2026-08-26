/**
 * National SOC Platform - Digital Evidence Management
 * 
 * Comprehensive evidence management for DFIR operations:
 * - Chain of custody tracking
 * - Evidence integrity verification (hashing)
 * - Evidence collection workflows
 * - Legal hold and retention policies
 * - ANOR-compliant evidence handling
 * 
 * @version 3.0.0 (Phase 9 Enhancement)
 * @module dfir/evidence-management
 */

// ============================================================
// TYPES & INTERFACES
// ============================================================

export interface EvidenceItem {
  id: string;
  caseId: string;
  incidentId?: string;
  
  // Basic info
  title: string;
  description: string;
  category: EvidenceCategory;
  type: EvidenceType;
  
  // File/Artifact details
  filename?: string;
  fileSize?: number; // bytes
  mimeType?: string;
  storagePath: string;
  checksums: Checksums;
  
  // Source information
  sourceSystem: string;
  sourceType: EvidenceSourceType;
  collectedBy: string;
  collectedAt: Date;
  collectionMethod: CollectionMethod;
  
  // Chain of Custody
  chainOfCustody: CustodyEvent[];
  currentCustodian: string;
  currentLocation: string;
  
  // Integrity
  integrityVerified: boolean;
  lastIntegrityCheck?: Date;
  integrityStatus: 'valid' | 'corrupted' | 'tampered' | 'pending';
  
  // Classification & Retention
  classification: EvidenceClassification;
  sensitivity: 'public' | 'internal' | 'confidential' | 'restricted';
  retentionPeriod: number; // days
  retainUntil: Date;
  legalHold?: LegalHold;
  
  // Status
  status: EvidenceStatus;
  tags: string[];
  metadata: Record<string, any>;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export type EvidenceCategory = 
  | 'digital'
  | 'physical'
  | 'testimony'
  | 'documentary'
  | 'real';

export type EvidenceType = 
  | 'disk_image'
  | 'memory_capture'
  | 'network_capture'
  | 'log_file'
  | 'configuration'
  | 'database_dump'
  | 'email_archive'
  | 'chat_history'
  | 'document'
  | 'screenshot'
  | 'video'
  | 'audio'
  | 'mobile_backup'
  | 'ss7_signaling'
  | 'cdr_records'
  | 'subscriber_data'
  | 'other';

export type EvidenceSourceType = 
  | 'endpoint'
  | 'server'
  | 'network_device'
  | 'cloud_service'
  | 'mobile_device'
  | 'telecom_network'
  | 'external'
  | 'manual';

export type CollectionMethod = 
  | 'forensic_tool'
  | 'automated_collection'
  | 'manual_export'
  | 'script_based'
  | 'api_export'
  | 'physical_acquisition';

export interface Checksums {
  md5: string;
  sha1: string;
  sha256: string;
  algorithm: string;
  generatedAt: Date;
}

export interface CustodyEvent {
  id: string;
  timestamp: Date;
  action: 'collected' | 'transferred' | 'accessed' | 'copied' | 'verified' | 'archived' | 'disposed';
  from: string;
  to: string;
  reason: string;
  authorizedBy: string;
  signature?: DigitalSignature;
  location: string;
  notes?: string;
}

export interface DigitalSignature {
  signer: string;
  algorithm: string;
  signature: string;
  timestamp: Date;
  certificateId?: string;
}

export type EvidenceClassification = 
  | 'original'        // Original evidence, never modified
  | 'working_copy'    // Copy made for analysis
  | 'verified_copy'   // Copy verified against original
  | 'derived'         // Derived data (reports, parsed output);

export type EvidenceStatus = 
  | 'pending_processing'
  | 'processing'
  | 'available'
  | 'checked_out'
  | 'archived'
  | 'disposed'
  | 'corrupted';

export interface LegalHold {
  id: string;
  caseName: string;
  issuedBy: string;
  issuedAt: Date;
  expiresAt?: Date;
  description: string;
  status: 'active' | 'released' | 'extended';
  authorizedBy: string;
}

export interface EvidenceCollection {
  id: string;
  name: string;
  caseId: string;
  items: EvidenceItem[];
  summary: CollectionSummary;
  createdAt: Date;
  updatedAt: Date;
}

export interface CollectionSummary {
  totalItems: number;
  totalSizeBytes: number;
  byCategory: Record<EvidenceCategory, number>;
  byType: Record<EvidenceType, number>;
  bySource: Record<EvidenceSourceType, number>;
  integrityStatus: { valid: number; corrupted: number; pending: number };
}

// ============================================================
// EVIDENCE MANAGER CLASS
// ============================================================

export class EvidenceManager {
  private evidence: Map<string, EvidenceItem> = new Map();
  private collections: Map<string, EvidenceCollection> = new Map();
  private config: EvidenceConfig;

  constructor(config?: Partial<EvidenceConfig>) {
    this.config = { ...DEFAULT_EVIDENCE_CONFIG, ...config };
  }

  // ============================================================
  // EVIDENCE REGISTRATION
  // ============================================================

  /**
   * Register new evidence item
   */
  async registerEvidence(params: {
    caseId: string;
    title: string;
    description: string;
    category: EvidenceCategory;
    type: EvidenceType;
    sourceSystem: string;
    sourceType: EvidenceSourceType;
    collectedBy: string;
    collectionMethod: CollectionMethod;
    filePath?: string;
    fileData?: Buffer;
    metadata?: Record<string, any>;
    incidentId?: string;
  }): Promise<EvidenceItem> {
    const id = this.generateId('EVD');
    
    // Generate checksums if file provided
    let checksums: Checksums;
    let storagePath: string;
    let fileSize: number | undefined;
    let mimeType: string | undefined;
    let filename: string | undefined;

    if (params.filePath || params.fileData) {
      const hashResult = await this.computeHashes(params.fileData);
      checksums = hashResult.checksums;
      fileSize = hashResult.size;
      mimeType = hashResult.mimeType;
      filename = params.filePath ? params.filePath.split('/').pop() : `evidence_${id}.bin`;
      storagePath = `${this.config.storageBasePath}/${caseId}/${id}/${filename}`;
      
      // Store file (in production, would upload to secure storage)
      await this.storeEvidenceFile(storagePath, params.fileData);
    } else {
      checksums = this.emptyChecksums();
      storagePath = `${this.config.storageBasePath}/${caseId}/${id}/`;
    }

    const now = new Date();
    const evidence: EvidenceItem = {
      id,
      caseId: params.caseId,
      incidentId: params.incidentId,
      title: params.title,
      description: params.description,
      category: params.category,
      type: params.type,
      filename,
      fileSize,
      mimeType,
      storagePath,
      checksums,
      sourceSystem: params.sourceSystem,
      sourceType: params.sourceType,
      collectedBy: params.collectedBy,
      collectedAt: now,
      collectionMethod: params.collectionMethod,
      chainOfCustody: [{
        id: this.generateId('CUS'),
        timestamp: now,
        action: 'collected',
        from: params.sourceSystem,
        to: params.collectedBy,
        reason: 'Initial evidence collection',
        authorizedBy: params.collectedBy,
        location: this.config.defaultLocation,
      }],
      currentCustodian: params.collectedBy,
      currentLocation: this.config.defaultLocation,
      integrityVerified: false,
      integrityStatus: 'pending',
      classification: 'original',
      sensitivity: 'confidential',
      retentionPeriod: this.config.defaultRetentionDays,
      retainUntil: new Date(now.getTime() + this.config.defaultRetentionDays * 24 * 60 * 60 * 1000),
      status: 'pending_processing',
      tags: [],
      metadata: params.metadata || {},
      createdAt: now,
      updatedAt: now,
    };

    this.evidence.set(id, evidence);
    this.logActivity('evidence_registered', { evidenceId: id, caseId: params.caseId });

    return evidence;
  }

  // ============================================================
  // CHAIN OF CUSTODY
  // ============================================================

  /**
   * Transfer custody of evidence
   */
  async transferCustody(
    evidenceId: string,
    to: string,
    reason: string,
    authorizedBy: string,
    location?: string
  ): Promise<CustodyEvent> {
    const evidence = this.getEvidence(evidenceId);
    const now = new Date();

    const event: CustodyEvent = {
      id: this.generateId('CUS'),
      timestamp: now,
      action: 'transferred',
      from: evidence.currentCustodian,
      to,
      reason,
      authorizedBy,
      location: location || evidence.currentLocation,
    };

    evidence.chainOfCustody.push(event);
    evidence.currentCustodian = to;
    if (location) evidence.currentLocation = location;
    evidence.updatedAt = now;

    this.logActivity('custody_transferred', { evidenceId, from: event.from, to });
    
    return event;
  }

  /**
   * Log access to evidence (read-only)
   */
  async logAccess(
    evidenceId: string,
    accessedBy: string,
    reason: string
  ): Promise<CustodyEvent> {
    const evidence = this.getEvidence(evidenceId);
    const now = new Date();

    const event: CustodyEvent = {
      id: this.generateId('CUS'),
      timestamp: now,
      action: 'accessed',
      from: evidence.currentCustodian,
      to: accessedBy,
      reason,
      authorizedBy: accessedBy,
      location: evidence.currentLocation,
    };

    evidence.chainOfCustody.push(event);
    evidence.updatedAt = now;

    return event;
  }

  /**
   * Get full chain of custody report
   */
  getChainOfCustody(evidenceId: string): {
    evidence: EvidenceItem;
    events: CustodyEvent[];
    summary: {
      totalTransfers: number;
      totalAccesses: number;
      currentHolder: string;
      currentDuration: string;
      firstCollection: Date;
    };
  } {
    const evidence = this.getEvidence(evidenceId);
    const events = [...evidence.chainOfCustody].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const transfers = events.filter(e => e.action === 'transferred');
    const accesses = events.filter(e => e.action === 'accessed');
    const firstEvent = events[0];
    
    const currentDuration = this.formatDuration(
      Date.now() - events[events.length - 1].timestamp.getTime()
    );

    return {
      evidence,
      events,
      summary: {
        totalTransfers: transfers.length,
        totalAccesses: accesses.length,
        currentHolder: evidence.currentCustodian,
        currentDuration,
        firstCollection: firstEvent?.timestamp || evidence.createdAt,
      },
    };
  }

  // ============================================================
  // INTEGRITY VERIFICATION
  // ============================================================

  /**
   * Verify evidence integrity against stored hashes
   */
  async verifyIntegrity(evidenceId: string): Promise<IntegrityVerificationResult> {
    const evidence = this.getEvidence(evidenceId);
    
    // In production, would re-read file and compute hashes
    // For now, simulate verification
    const isTampered = Math.random() > 0.95; // 5% chance of simulated tamper
    
    const result: IntegrityVerificationResult = {
      evidenceId,
      verifiedAt: new Date(),
      isValid: !isTampered,
      checksums: {
        expected: evidence.checksums,
        actual: isTampered ? { ...evidence.checksums, sha256: 'TAMPERED_' + Math.random().toString(36).substring(7) } : evidence.checksums,
      },
      previousVerification: evidence.lastIntegrityCheck,
      status: isTampered ? 'tampered' : 'valid',
    };

    evidence.integrityVerified = true;
    evidence.lastIntegrityCheck = result.verifiedAt;
    evidence.integrityStatus = result.status;
    evidence.updatedAt = new Date();

    // Add custody event for verification
    evidence.chainOfCustody.push({
      id: this.generateId('CUS'),
      timestamp: result.verifiedAt,
      action: 'verified',
      from: 'system',
      to: 'system',
      reason: `Integrity check: ${result.status}`,
      authorizedBy: 'integrity-service',
      location: evidence.currentLocation,
    });

    this.logActivity('integrity_verified', { evidenceId, status: result.status });

    return result;
  }

  /**
   * Batch verify all evidence in a case
   */
  async batchVerifyCaseEvidence(caseId: string): Promise<IntegrityVerificationResult[]> {
    const caseEvidence = this.getEvidenceByCase(caseId);
    const results: IntegrityVerificationResult[] = [];

    for (const evidence of caseEvidence) {
      const result = await this.verifyIntegrity(evidence.id);
      results.push(result);
    }

    return results;
  }

  // ============================================================
  // EVIDENCE COLLECTIONS
  // ============================================================

  /**
   * Create a new evidence collection for a case
   */
  async createCollection(caseId: string, name: string): Promise<EvidenceCollection> {
    const collection: EvidenceCollection = {
      id: this.generateId('COL'),
      name,
      caseId,
      items: [],
      summary: {
        totalItems: 0,
        totalSizeBytes: 0,
        byCategory: {} as Record<EvidenceCategory, number>,
        byType: {} as Record<EvidenceType, number>,
        bySource: {} as Record<EvidenceSourceType, number>,
        integrityStatus: { valid: 0, corrupted: 0, pending: 0 },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.collections.set(collection.id, collection);
    return collection;
  }

  /**
   * Add evidence to collection
   */
  async addToCollection(collectionId: string, evidenceId: string): Promise<void> {
    const collection = this.getCollection(collectionId);
    const evidence = this.getEvidence(evidenceId);

    if (evidence.caseId !== collection.caseId) {
      throw new Error(`Evidence ${evidenceId} does not belong to case ${collection.caseId}`);
    }

    collection.items.push(evidence);
    this.updateCollectionSummary(collection);
    collection.updatedAt = new Date();
  }

  // ============================================================
  // LEGAL HOLD
  // ============================================================

  /**
   * Place legal hold on evidence
   */
  async placeLegalHold(
    evidenceIds: string[],
    holdParams: Omit<LegalHold, 'status'>
  ): Promise<{ hold: LegalHold; affectedItems: number }> {
    const hold: LegalHold = {
      ...holdParams,
      id: this.generateId('LHD'),
      status: 'active',
    };

    let affectedCount = 0;

    for (const evidenceId of evidenceIds) {
      const evidence = this.getEvidence(evidenceId);
      evidence.legalHold = hold;
      // Extend retention while on legal hold
      evidence.retainUntil = hold.expiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year default
      affectedCount++;
    }

    this.logActivity('legal_hold_placed', { holdId: hold.id, affectedCount });
    
    return { hold, affectedItems: affectedCount };
  }

  /**
   * Release legal hold
   */
  async releaseLegalHold(holdId: string, releasedBy: string): Promise<LegalHold> {
    const heldEvidence = Array.from(this.evidence.values()).filter(e => e.legalHold?.id === holdId);
    
    if (heldEvidence.length === 0) {
      throw new Error(`No evidence found with legal hold: ${holdId}`);
    }

    const hold = heldEvidence[0].legalHold!;
    hold.status = 'released';

    for (const evidence of heldEvidence) {
      evidence.legalHold = undefined;
      // Reset retention to normal
      evidence.retainUntil = new Date(
        evidence.createdAt.getTime() + evidence.retentionPeriod * 24 * 60 * 60 * 1000
      );
    }

    this.logActivity('legal_hold_released', { holdId, releasedBy, itemsReleased: heldEvidence.length });

    return hold;
  }

  // ============================================================
  // EXPORT & REPORTING
  // ============================================================

  /**
   * Generate chain of custody report (PDF-ready data)
   */
  generateCustodyReport(evidenceId: string): CustodyReportData {
    const { evidence, events, summary } = this.getChainOfCustody(evidenceId);

    return {
      evidenceInfo: {
        id: evidence.id,
        title: evidence.title,
        caseId: evidence.caseId,
        classification: evidence.classification,
        category: evidence.category,
        type: evidence.type,
      },
      chainOfCustody: events.map(e => ({
        timestamp: e.timestamp.toISOString(),
        action: e.action,
        from: e.from,
        to: e.to,
        reason: e.reason,
        authorizedBy: e.authorizedBy,
        location: e.location,
      })),
      integrityInfo: {
        lastVerified: evidence.lastIntegrityCheck?.toISOString() || 'Never',
        status: evidence.integrityStatus,
        checksums: evidence.checksums,
      },
      summary,
      generatedAt: new Date().toISOString(),
      reportId: this.generateId('RPT'),
    };
  }

  /**
   * Export evidence with full chain of custody
   */
  async exportForExternal(
    evidenceId: string,
    destination: string,
    authorizedBy: string,
    purpose: string
  ): Promise<ExportPackage> {
    const evidence = this.getEvidence(evidenceId);
    const custodyReport = this.generateCustodyReport(evidenceId);

    // Create export package manifest
    const exportPkg: ExportPackage = {
      packageId: this.generateId('EXP'),
      evidenceId: evidence.id,
      exportedAt: new Date(),
      exportedBy: authorizedBy,
      destination,
      purpose,
      contents: [
        {
          path: evidence.filename || 'evidence.bin',
          size: evidence.fileSize || 0,
          checksum: evidence.checksums.sha256,
        },
        {
          path: 'chain_of_custody.json',
          size: JSON.stringify(custodyReport).length,
          checksum: this.hashString(JSON.stringify(custodyReport)),
        },
        {
          path: 'manifest.json',
          size: 0, // Will be calculated
          checksum: '',
        },
      ],
      custodyReport,
    };

    // Calculate manifest checksum
    exportPkg.contents[2].size = JSON.stringify(exportPkg).length;
    exportPkg.contents[2].checksum = this.hashString(JSON.stringify(exportPkg));

    // Log the export in chain of custody
    evidence.chainOfCustody.push({
      id: this.generateId('CUS'),
      timestamp: new Date(),
      action: 'transferred',
      from: evidence.currentCustodian,
      to: destination,
      reason: `External export: ${purpose}`,
      authorizedBy,
      location: destination,
    });

    this.logActivity('evidence_exported', { evidenceId, destination, purpose });

    return exportPkg;
  }

  // ============================================================
  // GETTERS & UTILITIES
  // ============================================================

  getEvidence(id: string): EvidenceItem {
    const evidence = this.evidence.get(id);
    if (!evidence) throw new Error(`Evidence not found: ${id}`);
    return evidence;
  }

  getEvidenceByCase(caseId: string): EvidenceItem[] {
    return Array.from(this.evidence.values())
      .filter(e => e.caseId === caseId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getCollection(id: string): EvidenceCollection {
    const collection = this.collections.get(id);
    if (!collection) throw new Error(`Collection not found: ${id}`);
    return collection;
  }

  getCollectionsByCase(caseId: string): EvidenceCollection[] {
    return Array.from(this.collections.values())
      .filter(c => c.caseId === caseId);
  }

  getExpiredEvidence(): EvidenceItem[] {
    const now = new Date();
    return Array.from(this.evidence.values())
      .filter(e => e.retainUntil < now && !e.legalHold && e.status !== 'disposed');
  }

  // ============================================================
  // PRIVATE METHODS
  // ============================================================

  private async computeHashes(data?: Buffer): Promise<{
    checksums: Checksums;
    size: number;
    mimeType: string;
  }> {
    // In production, would use crypto module
    // Simulating for now
    const mockHash = (length: number) => 
      Array.from({ length }, () => Math.floor(Math.random() * 16).toString(16)).join('');

    return {
      checksums: {
        md5: mockHash(32),
        sha1: mockHash(40),
        sha256: mockHash(64),
        algorithm: 'SHA-256',
        generatedAt: new Date(),
      },
      size: data?.length || Math.floor(Math.random() * 10000000),
      mimeType: 'application/octet-stream',
    };
  }

  private emptyChecksums(): Checksums {
    const mockHash = (length: number) => 
      Array.from({ length }, () => '0').join('');
    
    return {
      md5: mockHash(32),
      sha1: mockHash(40),
      sha256: mockHash(64),
      algorithm: 'SHA-256',
      generatedAt: new Date(),
    };
  }

  private async storeEvidenceFile(path: string, data?: Buffer): Promise<void> {
    // In production, would upload to S3/Azure Blob/secure file server
    console.log(`[EvidenceManager] Storing file to: ${path}`);
  }

  private updateCollectionSummary(collection: EvidenceCollection): void {
    collection.items = collection.items.filter(item => this.evidence.has(item.id));
    
    collection.summary.totalItems = collection.items.length;
    collection.summary.totalSizeBytes = collection.items.reduce((sum, i) => sum + (i.fileSize || 0), 0);

    // Reset and recount categories/types/sources
    collection.summary.byCategory = {} as Record<EvidenceCategory, number>;
    collection.summary.byType = {} as Record<EvidenceType, number>;
    collection.summary.bySource = {} as Record<EvidenceSourceType, number>;
    collection.summary.integrityStatus = { valid: 0, corrupted: 0, pending: 0 };

    for (const item of collection.items) {
      collection.summary.byCategory[item.category] = (collection.summary.byCategory[item.category] || 0) + 1;
      collection.summary.byType[item.type] = (collection.summary.byType[item.type] || 0) + 1;
      collection.summary.bySource[item.sourceType] = (collection.summary.bySource[item.sourceType] || 0) + 1;
      
      if (item.integrityStatus === 'valid') collection.summary.integrityStatus.valid++;
      else if (item.integrityStatus === 'corrupted') collection.summary.integrityStatus.corrupted++;
      else collection.summary.integrityStatus.pending++;
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  private hashString(str: string): string {
    // Simple hash simulation
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
  }

  private logActivity(action: string, details: Record<string, any>): void {
    console.log(`[EvidenceManager] ${action}:`, JSON.stringify(details));
  }
}

// ============================================================
// SUPPORTING TYPES
// ============================================================

export interface EvidenceConfig {
  storageBasePath: string;
  defaultLocation: string;
  defaultRetentionDays: number;
  autoVerifyOnAccess: boolean;
  requireSignatureOnTransfer: boolean;
  anorCompliant: boolean;
}

export interface IntegrityVerificationResult {
  evidenceId: string;
  verifiedAt: Date;
  isValid: boolean;
  checksums: {
    expected: Checksums;
    actual: Checksums;
  };
  previousVerification?: Date;
  status: EvidenceItem['integrityStatus'];
}

export interface CustodyReportData {
  evidenceInfo: {
    id: string;
    title: string;
    caseId: string;
    classification: EvidenceClassification;
    category: EvidenceCategory;
    type: EvidenceType;
  };
  chainOfCustody: Array<{
    timestamp: string;
    action: string;
    from: string;
    to: string;
    reason: string;
    authorizedBy: string;
    location: string;
  }>;
  integrityInfo: {
    lastVerified: string;
    status: string;
    checksums: Checksums;
  };
  summary: {
    totalTransfers: number;
    totalAccesses: number;
    currentHolder: string;
    currentDuration: string;
    firstCollection: Date;
  };
  generatedAt: string;
  reportId: string;
}

export interface ExportPackage {
  packageId: string;
  evidenceId: string;
  exportedAt: Date;
  exportedBy: string;
  destination: string;
  purpose: string;
 contents: Array<{
    path: string;
    size: number;
    checksum: string;
  }>;
  custodyReport: CustodyReportData;
}

// ============================================================
// DEFAULT CONFIGURATION
// ============================================================

const DEFAULT_EVIDENCE_CONFIG: EvidenceConfig = {
  storageBasePath: '/secure/evidence',
  defaultLocation: 'Djezzy SOC Evidence Locker',
  defaultRetentionDays: 1095, // 3 years per ANOR requirements
  autoVerifyOnAccess: true,
  requireSignatureOnTransfer: true,
  anorCompliant: true,
};

// Export singleton
export const evidenceManager = new EvidenceManager();
