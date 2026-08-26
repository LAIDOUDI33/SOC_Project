/**
 * National SOC Platform - Forensic Analysis Toolkit
 * 
 * Comprehensive digital forensics capabilities:
 * - Timeline analysis (super timeline format)
 * - File system artifact parsing
 * - Registry analysis (Windows artifacts)
 * - Browser history forensics
 * - Network connection forensics
 * - Malware analysis workflow integration
 * 
 * @version 3.0.0 (Phase 9 Enhancement)
 * @module dfir/forensic-analysis
 */

// ============================================================
// TYPES & INTERFACES
// ============================================================

export interface ForensicCase {
  id: string;
  name: string;
  description: string;
  type: CaseType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  // Status
  status: CaseStatus;
  priority: number; // 1-10
  
  // Timeline
  timeline: TimelineEvent[];
  timeRange?: TimeRange;
  
  // Artifacts analyzed
  artifacts: AnalyzedArtifact[];
  
  // Findings
  findings: ForensicFinding[];
  iocs: ExtractedIOC[];
  
  // Analysts
  leadAnalyst: string;
  analysts: string[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  tags: string[];
}

export type CaseType = 
  | 'incident_response'
  | 'malware_analysis'
  | 'data_breach'
  | 'insider_threat'
  | 'fraud_investigation'
  | 'telecom_fraud'
  | 'ss7_attack'
  | 'compliance_audit';

export type CaseStatus = 
  | 'new'
  | 'in_progress'
  | 'pending_review'
  | 'on_hold'
  | 'completed'
  | 'archived';

export interface TimelineEvent {
  id: string;
  timestamp: Date;
  timestampPrecision: 'second' | 'minute' | 'hour' | 'estimated';
  
  // Event details
  eventType: EventType;
  source: ArtifactSource;
  description: string;
  shortDescription: string;
  
  // Classification
  category: EventCategory;
  severity: 'info' | 'suspicious' | 'malicious' | 'critical';
  confidence: number; // 0-100
  
  // Related data
  relatedEntities: Entity[];
  evidenceRef?: string;
  parentEventId?: string;
  childEventIds: string[];
  
  // Analysis notes
  analystNotes?: string;
  tags: string[];
}

export type EventType = 
  | 'file_created'
  | 'file_modified'
  | 'file_deleted'
  | 'file_accessed'
  | 'process_created'
  | 'process_terminated'
  | 'network_connection'
  | 'dns_query'
  | 'http_request'
  | 'registry_modified'
  | 'user_logon'
  | 'user_logoff'
  | 'service_change'
  | 'driver_loaded'
  | 'scheduled_task'
  | 'email_sent'
  | 'email_received'
  | 'usb_inserted'
  | 'ssh_session'
  | 'database_query'
  | 'ss7_message'
  | 'cdr_record'
  | 'authentication';

export type ArtifactSource = 
  | 'windows_event_log'
  | 'sysmon'
  | 'prefetch'
  | 'usn_journal'
  | 'ntfs_mft'
  | 'registry'
  | 'evtx'
  | 'browser_history'
  | 'browser_cache'
  | 'amcache'
  | 'srum'
  | 'jump_lists'
  | 'lnk_files'
  | 'recycle_bin'
  | 'memory'
  | 'pcap'
  | 'dns_logs'
  | 'proxy_logs'
  | 'firewall_logs'
  | 'ad_logs'
  | 'linux_auth'
  | 'linux_audit'
  | 'ss7_signaling'
  | 'diameter_messages'
  | 'sip_cdrs';

export type EventCategory = 
  | 'execution'
  | 'persistence'
  | 'privilege_escalation'
  | 'defense_evasion'
  | 'credential_access'
  | 'discovery'
  | 'lateral_movement'
  | 'collection'
  | 'exfiltration'
  | 'command_control'
  | 'impact'
  | 'unknown';

export interface Entity {
  type: EntityType;
  value: string;
  role: 'source' | 'destination' | 'related';
  context?: string;
  firstSeen?: Date;
  lastSeen?: Date;
  occurrenceCount?: number;
}

export type EntityType = 
  | 'file'
  | 'process'
  | 'registry_key'
  | 'ip_address'
  | 'domain'
  | 'url'
  | 'hash_md5'
  | 'hash_sha1'
  | 'hash_sha256'
  | 'user'
  | 'sid'
  | 'guid'
  | 'email'
  | 'msisdn'
  | 'imsi'
  | 'imei'
  | 'port'
  | 'mac_address'
  | 'service_name';

export interface TimeRange {
  start: Date;
  end: Date;
  durationMs: number;
}

export interface AnalyzedArtifact {
  id: string;
  sourceType: ArtifactSource;
  sourcePath: string;
  analyzedAt: Date;
  eventsExtracted: number;
  iocsExtracted: number;
  status: 'success' | 'partial' | 'error';
  error?: string;
  analyst: string;
  notes?: string;
}

export interface ForensicFinding {
  id: string;
  caseId: string;
  title: string;
  description: string;
  severity: TimelineEvent['severity'];
  category: EventCategory;
  
  // MITRE mapping
  mitreTechniques: string[];
  killChainPhase?: string;
  
  // Evidence
  supportingEvents: string[]; // Timeline event IDs
  artifacts: string[];
  
  // Analysis
  confidence: number;
  analystAssessment: Assessment;
  recommendations: string[];
  
  // Status
  status: 'new' | 'confirmed' | 'false_positive' | 'escalated';
  assignedTo?: string;
  createdAt: Date;
  updatedAt: date;
}

export type Assessment = 
  | 'benign_activity'
  | 'suspicious_but_legitimate'
  | 'likely_malicious'
  | 'confirmed_malicious'
  | 'requires_additional_analysis';

export interface ExtractedIOC {
  id: string;
  type: IOCType;
  value: string;
  source: ArtifactSource;
  sourceEventId: string;
  
  // Threat intel
  threatLevel: 'unknown' | 'low' | 'medium' | 'high' | 'critical';
  firstSeenInCase?: Date;
  lastSeenInCase?: Date;
  occurrenceCount: number;
  
  // Enrichment
  whoisData?: WhoisData;
  dnsRecords?: DNSRecord[];
  virusTotalResult?: VTResult;
  
  // Actions taken
  blocked: boolean;
  blockedAt?: Date;
  blockedMethod?: string;
}

export type IOCType = 
  | 'ip'
  | 'domain'
  | 'url'
  | 'hash'
  | 'email'
  | 'indicator_regex'
  | 'yara_rule'
  | 'msisdn'
  | 'imsi'
  | 'imei';

export interface WhoisData {
  registrar: string;
  createdDate: Date;
  updatedDate: Date;
  expiryDate: Date;
  registrantOrg?: string;
  registrantCountry?: string;
  nameServers: string[];
}

export interface DNSRecord {
  type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'NS' | 'TXT';
  value: string;
  ttl: number;
}

export interface VTResult {
  detectionRatio: string; // e.g., "5/72"
  lastAnalysis: Date;
  permalink: string;
  categories: string[];
}

// ============================================================
// FORENSIC ANALYZER CLASS
// ============================================================

export class ForensicAnalyzer {
  private cases: Map<string, ForensicCase> = new Map();
  private config: ForensicConfig;

  constructor(config?: Partial<ForensicConfig>) {
    this.config = { ...DEFAULT_FORENSIC_CONFIG, ...config };
  }

  // ============================================================
  // CASE MANAGEMENT
  // ============================================================

  /**
   * Create a new forensic case
   */
  createCase(params: {
    name: string;
    description: string;
    type: CaseType;
    severity: ForensicCase['severity'];
    leadAnalyst: string;
    tags?: string[];
  }): ForensicCase {
    const case_: ForensicCase = {
      id: this.generateId('FC'),
      name: params.name,
      description: params.description,
      type: params.type,
      severity: params.severity,
      status: 'new',
      priority: this.calculatePriority(params.type, params.severity),
      timeline: [],
      artifacts: [],
      findings: [],
      iocs: [],
      leadAnalyst: params.leadAnalyst,
      analysts: [params.leadAnalyst],
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: params.tags || [],
    };

    this.cases.set(case_.id, case_);
    this.logActivity('case_created', { caseId: case_.id, type: params.type });

    return case_;
  }

  /**
   * Add timeline events to a case
   */
  addTimelineEvents(caseId: string, events: Omit<TimelineEvent, 'id'>[]): TimelineEvent[] {
    const case_ = this.getCase(caseId);
    const newEvents: TimelineEvent[] = [];

    for (const event of events) {
      const timelineEvent: TimelineEvent = {
        ...event,
        id: this.generateId('TEV'),
        childEventIds: [],
      };
      case_.timeline.push(timelineEvent);
      newEvents.push(timelineEvent);
    }

    // Sort and update time range
    case_.timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    if (case_.timeline.length > 0) {
      case_.timeRange = {
        start: case_.timeline[0].timestamp,
        end: case_.timeline[case_.timeline.length - 1].timestamp,
        durationMs: case_.timeline[case_.timeline.length - 1].timestamp.getTime() - case_.timeline[0].timestamp.getTime(),
      };
    }
    
    case_.updatedAt = new Date();
    return newEvents;
  }

  // ============================================================
  // ARTIFACT ANALYSIS
  // ============================================================

  /**
   * Analyze Windows Prefetch files
   */
  analyzePrefetch(data: PrefetchData): AnalysisResult<PrefetchFinding[]> {
    const findings: PrefetchFinding[] = [];

    // Check for suspicious executables
    const suspiciousExes = [
      'powershell.exe', 'cmd.exe', 'cscript.exe', 'wscript.exe',
      'mshta.exe', 'regsvr32.exe', 'rundll32.exe', 'certutil.exe',
      'bitsadmin.exe', 'wmic.exe', 'forfiles.exe'
    ];

    if (suspiciousExes.includes(data.executableName.toLowerCase())) {
      findings.push({
        type: 'suspicious_executable',
        executable: data.executableName,
        runCount: data.runCount,
        lastRun: data.lastExecTime,
        paths: data.paths,
        severity: data.runCount > 10 ? 'high' : 'medium',
        description: `Suspicious executable ${data.executableName} executed ${data.runCount} times`,
        recommendation: 'Review execution context and command-line arguments',
      });
    }

    // Check for executables from temp folders
    const tempPaths = data.paths.filter(p => 
      p.toLowerCase().includes('\\temp\\') || 
      p.toLowerCase().includes('\\tmp\\') ||
      p.toLowerCase().includes('%temp%')
    );

    if (tempPaths.length > 0) {
      findings.push({
        type: 'execution_from_temp',
        executable: data.executableName,
        runCount: data.runCount,
        lastRun: data.lastExecTime,
        paths: tempPaths,
        severity: 'high',
        description: `Executable ${data.executableName} executed from temporary directory`,
        recommendation: 'High indicator of potential malicious activity - investigate immediately',
      });
    }

    return {
      success: true,
      artifactType: 'prefetch',
      findings,
      summary: `${findings.length} suspicious patterns found in ${data.executableName} prefetch`,
    };
  }

  /**
   * Analyze Windows Registry artifacts
   */
  analyzeRegistry(registryData: RegistryData): AnalysisResult<RegistryFinding[]> {
    const findings: RegistryFinding[] = [];

    // Check Run/RunOnce keys for persistence
    const runKeys = [
      ...registryData.hklm_run || [],
      ...registryData.hkcu_run || [],
      ...registryData.hklm_runonce || [],
      ...registryData.hkcu_runonce || []
    ];

    for (const entry of runKeys) {
      // Check for suspicious values
      const suspiciousPatterns = [
        /powershell.*-enc/i,
        /cmd.*\/c/i,
        /certutil.*-decode/i,
        /bitsadmin/i,
        /mshta/i,
        /javascript/i,
        /vbscript/i,
      ];

      if (suspiciousPatterns.some(p => p.test(entry.value))) {
        findings.push({
          type: 'suspicious_persistence',
          key: entry.key,
          name: entry.name,
          value: entry.value,
          severity: 'critical',
          description: `Suspicious persistence mechanism in ${entry.key}\\${entry.name}`,
          recommendation: 'Immediate investigation required - possible malware persistence',
          mitreTechnique: ['T1547.001', 'T1060'],
        });
      }
    }

    // Check services for unusual configurations
    for (const service of registryData.services || []) {
      if (service.imagePath && (
        service.imagePath.includes(':\\Users\\') ||
        service.imagePath.includes(':\\ProgramData\\') ||
        service.imagePath.includes('\\Temp\\')
      )) {
        findings.push({
          type: 'suspicious_service',
          key: service.key,
          name: service.name,
          value: service.imagePath,
          severity: 'high',
          description: `Service ${service.name} has unusual ImagePath pointing to user-writable location`,
          recommendation: 'Verify service legitimacy - possible persistence mechanism',
          mitreTechnique: ['T1543.003'],
        });
      }
    }

    return {
      success: true,
      artifactType: 'registry',
      findings,
      summary: `${findings.length} suspicious registry entries detected`,
    };
  }

  /**
   * Analyze browser history
   */
  analyzeBrowserHistory(historyData: BrowserHistoryData): AnalysisResult<BrowserFinding[]> {
    const findings: BrowserFinding[] = [];

    // Check for malicious/suspicious domains
    const suspiciousDomains = historyData.visits.filter(visit => 
      this.isSuspiciousDomain(visit.domain)
    );

    for (const visit of suspiciousDomains) {
      findings.push({
        type: 'suspicious_domain_visit',
        domain: visit.domain,
        url: visit.url,
        visitTime: visit.timestamp,
        visitCount: visit.visitCount,
        severity: 'medium',
        description: `Visit to potentially suspicious domain: ${visit.domain}`,
        recommendation: 'Check domain reputation and correlate with other activity',
      });
    }

    // Check for downloads from suspicious sources
    const suspiciousDownloads = historyData.downloads.filter(dl =>
      !dl.url.startsWith('https://') ||
      this.isSuspiciousDomain(new URL(dl.url).hostname)
    );

    for (const dl of suspiciousDownloads) {
      findings.push({
        type: 'suspicious_download',
        domain: new URL(dl.url).hostname,
        url: dl.url,
        filename: dl.filename,
        downloadTime: dl.timestamp,
        fileSize: dl.fileSize,
        severity: 'high',
        description: `Potentially suspicious file downloaded: ${dl.filename}`,
        recommendation: 'Locate and analyze downloaded file, check hash against threat intel',
      });
    }

    // Check for credential-related searches
    const credentialSearches = historyData.searches.filter(search =>
      /password|credential|login|account|hack|crack|exploit/i.test(search.query)
    );

    if (credentialSearches.length > 0) {
      findings.push({
        type: 'suspicious_search',
        queries: credentialSearches.map(s => s.query),
        severity: 'medium',
        description: `Credential-related or hacking tool searches detected (${credentialSearches.length} queries)`,
        recommendation: 'Correlate with user activity and access logs',
      });
    }

    return {
      success: true,
      artifactType: 'browser_history',
      findings,
      summary: `${findings.length} suspicious browser activities identified`,
    };
  }

  /**
   * Analyze network connections (from NetFlow/PCAP)
   */
  analyzeNetworkConnections(connections: NetworkConnection[]): AnalysisResult<NetworkFinding[]> {
    const findings: NetworkFinding[] = [];

    // Group by destination IP to find C2 beacons
    const destIpGroups = new Map<string, NetworkConnection[]>();
    for (const conn of connections) {
      const group = destIpGroups.get(conn.dstIp) || [];
      group.push(conn);
      destIpGroups.set(conn.dstIp, group);
    }

    // Detect beaconing behavior
    for (const [dstIp, conns] of destIpGroups) {
      if (conns.length >= 5) {
        const intervals: number[] = [];
        for (let i = 1; i < conns.length; i++) {
          intervals.push(conns[i].timestamp.getTime() - conns[i-1].timestamp.getTime());
        }

        if (intervals.length >= 3) {
          const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
          const variance = intervals.reduce((sum, val) => sum + Math.pow(val - avgInterval, 2), 0) / intervals.length;
          const stdDev = Math.sqrt(variance);
          const coefficientOfVariation = stdDev / avgInterval;

          // Low CV indicates regular/beacon-like pattern
          if (coefficientOfVariation < 0.3 && avgInterval < 300000) { // < 5 min interval
            findings.push({
              type: 'potential_beaconing',
              dstIp,
              connectionCount: conns.length,
              avgIntervalSeconds: Math.round(avgInterval / 1000),
              cv: Math.round(coefficientOfVariation * 100) / 100,
              ports: [...new Set(conns.map(c => c.dstPort))],
              totalBytesSent: conns.reduce((sum, c) => sum + c.bytesSent, 0),
              totalBytesReceived: conns.reduce((sum, c) => sum + c.bytesReceived, 0),
              severity: 'high',
              description: `Potential C2 beaconing to ${dstIp}: ${conns.length} connections with low variance timing`,
              recommendation: 'Investigate destination IP, check for malware, isolate host if confirmed',
            });
          }
        }
      }
    }

    // Detect connections to known bad ports
    const badPorts = [4444, 5555, 6667, 6668, 1337, 31337, 44444];
    for (const conn of connections) {
      if (badPorts.includes(conn.dstPort)) {
        findings.push({
          type: 'suspicious_port',
          dstIp: conn.dstIp,
          dstPort: conn.dstPort,
          protocol: conn.protocol,
          timestamp: conn.timestamp,
          severity: 'high',
          description: `Connection to known suspicious port ${conn.dstPort} on ${conn.dstIp}`,
          recommendation: 'Investigate process making connection, check for reverse shell',
        });
      }
    }

    // Detect large data transfers (potential exfiltration)
    const largeTransfers = connections.filter(c => c.bytesSent > 50 * 1024 * 1024); // > 50MB
    for (const transfer of largeTransfers) {
      findings.push({
        type: 'large_data_transfer',
        dstIp: transfer.dstIp,
        dstPort: transfer.dstPort,
        bytesSent: transfer.bytesSent,
        timestamp: transfer.timestamp,
        duration: transfer.duration,
        severity: 'medium',
        description: `Large outbound data transfer: ${(transfer.bytesSent / 1024 / 1024).toFixed(2)} MB to ${transfer.dstIp}:${transfer.dstPort}`,
        recommendation: 'Verify if transfer is authorized, check for data exfiltration',
      });
    }

    return {
      success: true,
      artifactType: 'network_connections',
      findings,
      summary: `${findings.length} suspicious network patterns detected`,
    };
  }

  // ============================================================
  // TIMELINE ANALYSIS
  // ============================================================

  /**
   * Build super timeline from multiple sources
   */
  buildSuperTimeline(events: TimelineEvent[]): SuperTimeline {
    // Sort all events by timestamp
    const sorted = [...events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Identify gaps
    const gaps: TimelineGap[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const gapMs = sorted[i].timestamp.getTime() - sorted[i-1].timestamp.getTime();
      if (gapMs > 3600000) { // > 1 hour gap
        gaps.push({
          start: sorted[i-1].timestamp,
          end: sorted[i].timestamp,
          durationMinutes: Math.round(gapMs / 60000),
          possibleCauses: [
            'System offline or logging gap',
            'Attacker dormant period',
            'Log rotation/cleanup',
            'Defense evasion via time manipulation',
          ],
        });
      }
    }

    // Group events into phases
    const phases = this.identifyPhases(sorted);

    // Calculate statistics
    const stats = this.calculateTimelineStats(sorted);

    return {
      events: sorted,
      totalEvents: sorted.length,
      timeRange: {
        start: sorted[0]?.timestamp || new Date(),
        end: sorted[sorted.length - 1] || new Date(),
        durationMs: sorted.length > 1 ? 
          sorted[sorted.length - 1].timestamp.getTime() - sorted[0].timestamp.getTime() : 0,
      },
      gaps,
      phases,
      statistics: stats,
    };
  }

  /**
   * Filter timeline by criteria
   */
  filterTimeline(
    events: TimelineEvent[],
    filters: TimelineFilters
  ): TimelineEvent[] {
    return events.filter(event => {
      if (filters.eventTypes && !filters.eventTypes.includes(event.eventType)) return false;
      if (filters.categories && !filters.categories.includes(event.category)) return false;
      if (filters.sources && !filters.sources.includes(event.source)) return false;
      if (filters.severities && !filters.severities.includes(event.severity)) return false;
      if (filters.timeRange) {
        if (event.timestamp < filters.timeRange.start || event.timestamp > filters.timeRange.end) return false;
      }
      if (filters.minConfidence && event.confidence < filters.minConfidence) return false;
      if (filters.entityFilter) {
        const hasEntity = event.relatedEntities.some(e =>
          e.value.toLowerCase().includes(filters.entityFilter!.toLowerCase())
        );
        if (!hasEntity) return false;
      }
      return true;
    });
  }

  // ============================================================
  // IOC EXTRACTION
  // ============================================================

  /**
   * Extract IOCs from timeline events
   */
  extractIOCs(events: TimelineEvent[]): ExtractedIOC[] {
    const iocMap = new Map<string, ExtractedIOC>();

    for (const event of events) {
      for (const entity of event.relatedEntities) {
        const iocType = this.mapEntityTypeToIOC(entity.type);
        if (!iocType) continue;

        const existing = iocMap.get(entity.value);
        if (existing) {
          existing.occurrenceCount++;
          existing.lastSeenInCase = event.timestamp;
          if (!existing.sourceEventId) existing.sourceEventId = event.id;
        } else {
          iocMap.set(entity.value, {
            id: this.generateId('IOC'),
            type: iocType,
            value: entity.value,
            source: event.source,
            sourceEventId: event.id,
            threatLevel: 'unknown',
            firstSeenInCase: event.timestamp,
            lastSeenInCase: event.timestamp,
            occurrenceCount: 1,
            blocked: false,
          });
        }
      }
    }

    return Array.from(iocMap.values());
  }

  // ============================================================
  // GETTERS & UTILITIES
  // ============================================================

  getCase(id: string): ForensicCase {
    const case_ = this.cases.get(id);
    if (!case_) throw new Error(`Forensic case not found: ${id}`);
    return case_;
  }

  getCasesByStatus(status: CaseStatus): ForensicCase[] {
    return Array.from(this.cases.values()).filter(c => c.status === status);
  }

  // ============================================================
  // PRIVATE METHODS
  // ============================================================

  private calculatePriority(type: CaseType, severity: ForensicCase['severity']): number {
    const basePriority = {
      incident_response: 8,
      malware_analysis: 7,
      data_breach: 9,
      insider_threat: 6,
      fraud_investigation: 5,
      telecom_fraud: 6,
      ss7_attack: 10,
      compliance_audit: 4,
    }[type];

    const severityModifier = { low: -2, medium: 0, high: 2, critical: 4 }[severity];

    return Math.max(1, Math.min(10, basePriority + severityModifier));
  }

  private isSuspiciousDomain(domain: string): boolean {
    const suspiciousIndicators = [
      /[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/, // IP address as domain
      /\.(tk|ml|ga|cf|gq|pw)/i, // TLDs often used for malicious sites
      /[a-z0-9]{20,}/i, // Very long subdomain (DGA)
      /paypal|amazon|microsoft|google.*login/i, // Typosquatting candidates
    ];

    return suspiciousIndicators.some(pattern => pattern.test(domain));
  }

  private identifyPhases(events: TimelineEvent[]): AttackPhase[] {
    const phases: AttackPhase[] = [];
    let currentPhase: AttackPhase | null = null;

    for (const event of events) {
      const phaseName = this.categorizePhase(event);

      if (!currentPhase || currentPhase.name !== phaseName) {
        if (currentPhase) {
          currentPhase.end = event.timestamp;
          phases.push(currentPhase);
        }
        currentPhase = {
          name: phaseName,
          start: event.timestamp,
          end: event.timestamp,
          eventCount: 1,
          techniques: new Set([event.eventType]),
        };
      } else {
        currentPhase.end = event.timestamp;
        currentPhase.eventCount++;
        currentPhase.techniques.add(event.eventType);
      }
    }

    if (currentPhase) {
      phases.push(currentPhase);
    }

    return phases;
  }

  private categorizePhase(event: TimelineEvent): string {
    switch (event.category) {
      case 'discovery': return 'Reconnaissance';
      case 'initial_access':
      case 'execution': return 'Initial Access & Execution';
      case 'persistence': return 'Persistence';
      case 'privilege_escalation': return 'Privilege Escalation';
      case 'defense_evasion': return 'Defense Evasion';
      case 'credential_access': return 'Credential Access';
      case 'lateral_movement': return 'Lateral Movement';
      case 'collection': return 'Collection';
      case 'exfiltration': return 'Exfiltration';
      case 'command_control': return 'C2 Communication';
      case 'impact': return 'Impact';
      default: return 'Unknown Activity';
    }
  }

  private calculateTimelineStats(events: TimelineEvent[]): TimelineStatistics {
    const categories = new Map<EventCategory, number>();
    const severities = new Map<TimelineEvent['severity'], number>();
    const sources = new Map<ArtifactSource, number>();

    for (const event of events) {
      categories.set(event.category, (categories.get(event.category) || 0) + 1);
      severities.set(event.severity, (severities.get(event.severity) || 0) + 1);
      sources.set(event.source, (sources.get(event.source) || 0) + 1);
    }

    return {
      totalEvents: events.length,
      uniqueCategories: categories.size,
      uniqueSources: sources.size,
      eventsByCategory: Object.fromEntries(categories),
      eventsBySeverity: Object.fromEntries(severities),
      eventsBySource: Object.fromEntries(sources),
      criticalEvents: events.filter(e => e.severity === 'critical').length,
      maliciousEvents: events.filter(e => e.severity === 'malicious').length,
    };
  }

  private mapEntityTypeToIOC(type: EntityType): IOCType | null {
    const mapping: Record<EntityType, IOCType | null> = {
      ip_address: 'ip',
      domain: 'domain',
      url: 'url',
      hash_md5: 'hash',
      hash_sha1: 'hash',
      hash_sha256: 'hash',
      email: 'email',
      msisdn: 'msisdn',
      imsi: 'imsi',
      imei: 'imei',
      file: null,
      process: null,
      registry_key: null,
      user: null,
      sid: null,
      guid: null,
      port: null,
      mac_address: null,
      service_name: null,
    };
    return mapping[type];
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  private logActivity(action: string, details: Record<string, any>): void {
    console.log(`[ForensicAnalyzer] ${action}:`, JSON.stringify(details));
  }
}

// ============================================================
// SUPPORTING TYPES
// ============================================================

export interface ForensicConfig {
  enableMLClassification: boolean;
  maxTimelineEvents: number;
  autoEnrichIOCs: boolean;
  vtApiKey?: string;
  whoisEnabled: boolean;
}

export interface SuperTimeline {
  events: TimelineEvent[];
  totalEvents: number;
  timeRange: TimeRange;
  gaps: TimelineGap[];
  phases: AttackPhase[];
  statistics: TimelineStatistics;
}

export interface TimelineGap {
  start: Date;
  end: Date;
  durationMinutes: number;
  possibleCauses: string[];
}

export interface AttackPhase {
  name: string;
  start: Date;
  end: Date;
  eventCount: number;
  techniques: Set<string>;
}

export interface TimelineStatistics {
  totalEvents: number;
  uniqueCategories: number;
  uniqueSources: number;
  eventsByCategory: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  eventsBySource: Record<string, number>;
  criticalEvents: number;
  maliciousEvents: number;
}

export interface TimelineFilters {
  eventTypes?: EventType[];
  categories?: EventCategory[];
  sources?: ArtifactSource[];
  severities?: TimelineEvent['severity'][];
  timeRange?: TimeRange;
  minConfidence?: number;
  entityFilter?: string;
}

// Analysis result types
export interface AnalysisResult<T> {
  success: boolean;
  artifactType: string;
  findings: T;
  summary: string;
  error?: string;
}

export interface PrefetchData {
  executableName: string;
  runCount: number;
  lastExecTime: Date;
  paths: string[];
  timestamps: Date[];
}

export interface PrefetchFinding {
  type: 'suspicious_executable' | 'execution_from_temp' | 'unusual_timing';
  executable: string;
  runCount: number;
  lastRun: Date;
  paths: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendation: string;
}

export interface RegistryData {
  hklm_run?: Array<{ key: string; name: string; value: string }>;
  hkcu_run?: Array<{ key: string; name: string; value: string }>;
  hklm_runonce?: Array<{ key: string; name: string; value: string }>;
  hkcu_runonce?: Array<{ key: string; name: string; value: string }>;
  services?: Array<{ key: string; name: string; imagePath: string }>;
  winlogon?: Array<{ key: string; name: string; value: string }>;
}

export interface RegistryFinding {
  type: 'suspicious_persistence' | 'suspicious_service' | 'suspicious_configuration';
  key: string;
  name: string;
  value: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendation: string;
  mitreTechniques?: string[];
}

export interface BrowserHistoryData {
  visits: Array<{
    url: string;
    domain: string;
    timestamp: Date;
    title: string;
    visitCount: number;
  }>;
  downloads: Array<{
    url: string;
    filename: string;
    timestamp: Date;
    fileSize: number;
  }>;
  searches: Array<{
    query: string;
    timestamp: Date;
    engine: string;
  }>;
}

export interface BrowserFinding {
  type: 'suspicious_domain_visit' | 'suspicious_download' | 'suspicious_search' | 'credential_theft';
  domain?: string;
  url?: string;
  queries?: string[];
  filename?: string;
  visitTime?: Date;
  downloadTime?: Date;
  visitCount?: number;
  fileSize?: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendation: string;
}

export interface NetworkConnection {
  srcIp: string;
  srcPort: number;
  dstIp: string;
  dstPort: number;
  protocol: 'tcp' | 'udp' | 'icmp';
  timestamp: Date;
  bytesSent: number;
  bytesReceived: number;
  duration: number; // milliseconds
  state: 'established' | 'closed' | 'attempted';
}

export interface NetworkFinding {
  type: 'potential_beaconing' | 'suspicious_port' | 'large_data_transfer' | 'data_exfiltration' | 'c2_communication';
  dstIp: string;
  dstPort?: number;
  protocol?: string;
  timestamp?: Date;
  connectionCount?: number;
  avgIntervalSeconds?: number;
  cv?: number;
  ports?: number[];
  totalBytesSent?: number;
  totalBytesReceived?: number;
  bytesSent?: number;
  duration?: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendation: string;
}

// Default configuration
const DEFAULT_FORENSIC_CONFIG: ForensicConfig = {
  enableMLClassification: false,
  maxTimelineEvents: 100000,
  autoEnrichIOCs: true,
  vtApiKey: undefined,
  whoisEnabled: true,
};

// Export singleton
export const forensicAnalyzer = new ForensicAnalyzer();
