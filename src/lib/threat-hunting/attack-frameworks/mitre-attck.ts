/**
 * National SOC Platform - MITRE ATT&CK Framework Integration
 * 
 * Comprehensive MITRE ATT&CK® framework mapping for:
 * - Enterprise techniques (14 tactics)
 * - Mobile techniques (for telecom)
 * - Djezzy-specific technique relevance scoring
 * - Detection method suggestions
 * - Mitigation recommendations
 * 
 * @version 3.0.0 (Phase 9 Enhancement)
 * @module threat-hunting/attack-frameworks/mitre-attck
 */

// ============================================================
// TYPES & INTERFACES
// ============================================================

export interface MITRETactic {
  id: string;
  name: string;
  description: string;
  shortName: string;
  
  // Techniques in this tactic
  techniques: MITRETechnique[];
  
  // Relevance to telecom/SOC
  telecomRelevance: number; // 0-100
}

export interface MITRETechnique {
  id: string; // e.g., "T1059"
  name: string;
  description: string;
  tacticId: string;
  tacticName: string;
  
  // Sub-techniques
  subtechniques: MITRESubtechnique[];
  
  // Detection & Mitigation
  detectionMethods: DetectionMethod[];
  mitigations: Mitigation[];
  
  // Telecom/SS7 specific
  telecomSpecific?: boolean;
  djezzyRelevance: number; // 0-100 based on Djezzy environment
  
  // Platforms
  platforms: string[];
  
  // Data sources required for detection
  dataSources: string[];
  
  // References
  references: string[];
  
  // Version info
  version: string; // ATT&CK version
  modified: Date;
}

export interface MITRESubtechnique {
  id: string; // e.g., "T1059.001"
  name: string;
  description: string;
  parentId: string;
  
  detectionMethods: DetectionMethod[];
  mitigations: Mitigation[];
  
  platforms: string[];
  dataSources: string[];
}

export interface DetectionMethod {
  type: 'signature' | 'anomaly' | 'behavioral' | 'correlation';
  description: string;
  dataSource: string;
  queryExample?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  effectiveness: number; // 0-100
  falsePositiveRate: 'low' | 'medium' | 'high';
}

export interface Mitigation {
  id: string;
  name: string;
  description: string;
  effectiveness: number; // 0-100
  implementation: 'quick' | 'medium' | 'complex';
  references: string[];
}

export interface TechniqueLookupResult {
  technique: MITRETechnique;
  relatedTechniques: MITRETechnique[];
  detectionPlaybook: DetectionPlaybook;
  threatIntelMatches: ThreatIntelMatch[];
}

export interface DetectionPlaybook {
  steps: DetectionStep[];
  estimatedTime: string;
  requiredTools: string[];
  skillLevel: 'junior' | 'intermediate' | 'senior' | 'expert';
}

export interface DetectionStep {
  order: number;
  title: string;
  description: string;
  query?: string;
  expectedResults?: string;
  analysisTips: string[];
}

export interface ThreatIntelMatch {
  source: string;
  confidence: number;
  lastSeen: Date;
  context: string;
}

// ============================================================
// MITRE ATT&CK MATRIX FOR DJEZZY SOC
// ============================================================

export const ATTACK_MATRIX: MITRETactic[] = [
  {
    id: 'TA0043',
    name: 'Reconnaissance',
    shortName: 'Recon',
    description: 'The adversary is trying to gather information they can use to plan future operations.',
    telecomRelevance: 75,
    techniques: [
      {
        id: 'T1592',
        name: 'Gather Victim Host Information',
        description: 'Adversaries may gather information about the victim\'s hosts that can be used during targeting.',
        tacticId: 'TA0043',
        tacticName: 'Reconnaissance',
        subtechniques: [
          { id: 'T1592.001', name: ' Firmware', description: 'Gather firmware information from devices', parentId: 'T1592', detectionMethods: [], mitigations: [], platforms: ['Network'], dataSources: ['Network Traffic Flow'] },
          { id: 'T1592.002', name: ' Hardware', description: 'Gather hardware information', parentId: 'T1592', detectionMethods: [], mitigations: [], platforms: ['Windows', 'Linux', 'macOS'], dataSources: ['Process use of Network'] },
          { id: 'T1592.003', name: ' Software', description: 'Gather software version information', parentId: 'T1592', detectionMethods: [], mitigations: [], platforms: ['Windows', 'Linux', 'macOS'], dataSources: ['File monitoring'] },
          { id: 'T1592.004', name: ' Security Configuration', description: 'Gather security configuration details', parentId: 'T1592', detectionMethods: [], mitigations: [], platforms: ['Windows', 'Linux', 'macOS'], dataSources: ['Authentication logs'] },
          { id: 'T1592.005', name: ' Vulnerabilities', description: 'Identify vulnerable software versions', parentId: 'T1592', detectionMethods: [], mitigations: [], platforms: ['Network'], dataSources: ['Network Traffic Flow'] },
          { id: 'T1592.006', name: ' Group Policies', description: 'Enumerate Active Directory GPOs', parentId: 'T1592', detectionMethods: [], mitigations: [], platforms: ['Windows'], dataSources: ['Active Directory'] },
          { id: 'T1592.007', name: ' Digital Certificates', description: 'Enumerate digital certificates', parentId: 'T1592', detectionMethods: [], mitigations: [], platforms: ['Windows', 'Linux', 'macOS'], dataSources: ['Certificate logs'] },
          { id: 'T1592.008', name: ' Network Infrastructure', description: 'Map network topology and infrastructure', parentId: 'T1592', detectionMethods: [], mitigations: [], platforms: ['Network'], dataSources: ['NetFlow', 'DNS logs'] },
        ],
        detectionMethods: [
          { type: 'anomaly', description: 'Unusual enumeration patterns from single source', dataSource: 'Active Directory', queryExample: 'EventID == 5136 where ObjectClass contains "user"', difficulty: 'medium', effectiveness: 75, falsePositiveRate: 'medium' },
          { type: 'behavioral', description: 'Automated scanning behavior detection', dataSource: 'IDS/IPS', queryExample: 'Alert where Category == "Reconnaissance"', difficulty: 'easy', effectiveness: 85, falsePositiveRate: 'low' },
        ],
        mitigations: [
          { id: 'M1045', name: 'Network Denylist', description: 'Block known malicious IPs at perimeter', effectiveness: 70, implementation: 'quick', references: [] },
          { id: 'M1037', name: 'Filter Network Traffic', description: 'Filter outbound C2 traffic', effectiveness: 65, implementation: 'medium', references: [] },
        ],
        telecomSpecific: false,
        djezzyRelevance: 60,
        platforms: ['Windows', 'Linux', 'macOS', 'Network'],
        dataSources: ['Network Traffic Analysis', 'DNS Records', 'Active Directory'],
        references: ['https://attack.mitre.org/techniques/T1592/'],
        version: '14.1',
        modified: new Date('2024-01-31'),
      },
      {
        id: 'T1595',
        name: 'Active Scanning',
        description: 'Adversaries may execute active scanning against targets to gather information that can be used during targeting.',
        tacticId: 'TA0043',
        tacticName: 'Reconnaissance',
        subtechniques: [
          { id: 'T1595.001', name: ' Scanning IP Blocks', description: 'Scan ranges of IP addresses', parentId: 'T1595', detectionMethods: [], mitigations: [], platforms: ['Network'], dataSources: ['NetFlow'] },
          { id: 'T1595.002', name: ' Vulnerability Scanning', description: 'Scan for known vulnerabilities', parentId: 'T1595', detectionMethods: [], mitigations: [], platforms: ['Network'], dataSources: ['IDS/IPS'] },
          { id: 'T1595.003', name: ' Service Scanning', description: 'Identify running services on hosts', parentId: 'T1595', detectionMethods: [], mitigations: [], platforms: ['Network'], dataSources: ['NetFlow'] },
        ],
        detectionMethods: [
          { type: 'signature', description: 'Known scanner signatures (Nmap, Masscan)', dataSource: 'IDS/IPS', queryExample: 'Signature contains "Nmap" or Signature contains "Masscan"', difficulty: 'easy', effectiveness: 95, falsePositiveRate: 'low' },
          { type: 'anomaly', description: 'Port scan detection via connection pattern analysis', dataSource: 'Firewall', queryExample: 'Connections per minute > threshold from same SrcIP', difficulty: 'medium', effectiveness: 80, falsePositiveRate: 'medium' },
        ],
        mitigations: [
          { id: 'M1030', name: 'Network Segmentation', description: 'Isolate critical systems from network', effectiveness: 80, implementation: 'complex', references: [] },
          { id: 'M1018', name: 'User Account Management', description: 'Limit privileged accounts exposure', effectiveness: 60, implementation: 'medium', references: [] },
        ],
        telecomSpecific: false,
        djezzyRelevance: 85,
        platforms: ['Network'],
        dataSources: ['NetFlow', 'Firewall Logs', 'IDS/IPS Alerts'],
        references: ['https://attack.mitre.org/techniques/T1595/'],
        version: '14.1',
        modified: new Date('2024-02-15'),
      },
      {
        id: 'T1598',
        name: 'Phishing for Information',
        description: 'Adversaries may send phishing messages to elicit sensitive information from victims.',
        tacticId: 'TA0043',
        tacticName: 'Reconnaissance',
        subtechniques: [
          { id: 'T1598.001', name: ' Phishing for Credentials', description: 'Harvest credentials via phishing', parentId: 'T1598', detectionMethods: [], mitigations: [], platforms: ['Windows', 'Linux', 'macOS'], dataSources: ['Email gateway'] },
          { id: 'T1598.002', name: ' Phishing for Information', description: 'Gather general information via phishing', parentId: 'T1598', detectionMethods: [], mitigations: [], platforms: ['Windows', 'Linux', 'macOS'], dataSources: ['Email gateway'] },
          { id: 'T1598.003', name: ' Spearphishing Link', description: 'Targeted link-based phishing', parentId: 'T1598', detectionMethods: [], mitigations: [], platforms: ['Windows', 'Linux', 'macOS'], dataSources: ['Email gateway', 'Proxy'] },
          { id: 'T1598.004', name: ' Spearphishing Service', description: 'Fake login pages for credential theft', parentId: 'T1598', detectionMethods: [], mitigations: [], platforms: ['Windows', 'Linux', 'macOS'], dataSources: ['Email gateway', 'DNS'] },
        ],
        detectionMethods: [
          { type: 'behavioral', description: 'Unusual email reply patterns indicating potential compromise', dataSource: 'Email Security Gateway', queryExample: 'Email where Sender not in corporate domain and Subject contains "urgent" or "password"', difficulty: 'medium', effectiveness: 75, falsePositiveRate: 'high' },
          { type: 'correlation', description: 'Cross-reference clicked links with known phishing kits', dataSource: 'Secure Web Gateway', queryExample: 'URL reputation check after click', difficulty: 'hard', effectiveness: 90, falsePositiveRate: 'low' },
        ],
        mitigations: [
          { id: 'M1022', name: 'Restrict File Permissions', description: 'Limit attachment execution', effectiveness: 50, implementation: 'quick', references: [] },
          { id: 'M1017', name: 'User Training', description: 'Security awareness training', effectiveness: 70, implementation: 'complex', references: [] },
        ],
        telecomSpecific: false,
        djezzyRelevance: 90,
        platforms: ['Windows', 'Linux', 'macOS'],
        dataSources: ['Email Gateway', 'Proxy Logs', 'DNS'],
        references: ['https://attack.mitre.org/techniques/T1598/'],
        version: '14.1',
        modified: new Date('2024-03-10'),
      },
    ],
  },
  {
    id: 'TA0001',
    name: 'Initial Access',
    shortName: 'Initial Access',
    description: 'The adversary is trying to get into your network.',
    telecomRelevance: 95,
    techniques: [
      {
        id: 'T1078',
        name: 'Valid Accounts',
        description: 'Adversaries may obtain and abuse credentials of existing accounts.',
        tacticId: 'TA0001',
        tacticName: 'Initial Access',
        subtechniques: [
          { id: 'T1078.001', name: ' Default Accounts', description: 'Use default vendor credentials', parentId: 'T1078', detectionMethods: [], mitigations: [], platforms: ['Windows', 'Linux', 'Network'], dataSources: ['Authentication logs'] },
          { id: 'T1078.002', name: ' Domain Accounts', description: 'Use Active Directory accounts', parentId: 'T1078', detectionMethods: [], mitigations: [], platforms: ['Windows'], dataSources: ['Authentication logs', 'AD audits'] },
          { id: 'T1078.003', name: ' Local Accounts', description: 'Use local system accounts', parentId: 'T1078', detectionMethods: [], mitigations: [], platforms: ['Windows', 'Linux', 'macOS'], dataSources: ['Authentication logs'] },
          { id: 'T1078.004', name: ' Cloud Accounts', description: 'Use cloud service accounts', parentId: 'T1078', detectionMethods: [], mitigations: [], platforms: ['IaaS', 'SaaS'], dataSources: ['Cloud audit logs'] },
        ],
        detectionMethods: [
          { type: 'anomaly', description: 'Authentication anomalies (impossible travel, unusual hours)', dataSource: 'SIEM', queryExample: 'Logins where distance between locations / time > 800km/h', difficulty: 'medium', effectiveness: 85, falsePositiveRate: 'low' },
          { type: 'behavioral', description: 'Service account usage outside normal patterns', dataSource: 'PAM', queryExample: 'ServiceAccount used interactively or from non-standard workstation', difficulty: 'easy', effectiveness: 80, falsePositiveRate: 'low' },
        ],
        mitigations: [
          { id: 'M1027', name: 'Password Policies', description: 'Strong password complexity requirements', effectiveness: 60, implementation: 'quick', references: [] },
          { id: 'M1046', name: 'Windows Event Logging', description: 'Comprehensive authentication logging', effectiveness: 75, implementation: 'quick', references: [] },
        ],
        telecomSpecific: false,
        djezzyRelevance: 95,
        platforms: ['Windows', 'Linux', 'macOS', 'Network', 'IaaS', 'SaaS'],
        dataSources: ['Authentication Logs', 'Active Directory', 'PAM Systems'],
        references: ['https://attack.mitre.org/techniques/T1078/'],
        version: '14.1',
        modified: new Date('2024-01-20'),
      },
      {
        id: 'T1190',
        name: 'Exploit Public-Facing Application',
        description: 'Adversaries may attempt to exploit a weakness in an Internet-facing system.',
        tacticId: 'TA0001',
        tacticName: 'Initial Access',
        subtechniques: [],
        detectionMethods: [
          { type: 'signature', description: 'Known exploit signatures in WAF/IDS', dataSource: 'WAF/IDS', queryExample: 'Signature matches CVE exploit pattern', difficulty: 'easy', effectiveness: 95, falsePositiveRate: 'low' },
          { type: 'anomaly', description: 'Unusual URL patterns indicating probing', dataSource: 'Web Server Logs', queryExample: 'URL contains SQL injection or path traversal patterns', difficulty: 'medium', effectiveness: 80, falsePositiveRate: 'medium' },
        ],
        mitigations: [
          { id: 'M1015', name: 'Active Scanning', description: 'Regular vulnerability scanning', effectiveness: 75, implementation: 'medium', references: [] },
          { id: 'M1051', name: 'Update Software', description: 'Patch public-facing applications promptly', effectiveness: 90, implementation: 'medium', references: [] },
        ],
        telecomSpecific: false,
        djezzyRelevance: 100,
        platforms: ['Network', 'Windows', 'Linux'],
        dataSources: ['Web Application Firewall', 'IDS/IPS', 'Web Server Logs'],
        references: ['https://attack.mitre.org/techniques/T1190/'],
        version: '14.1',
        modified: new Date('2024-04-05'),
      },
      {
        id: 'T1566',
        name: 'Phishing',
        description: 'Adversaries may send phishing messages to gain initial access.',
        tacticId: 'TA0001',
        tacticName: 'Initial Access',
        subtechniques: [
          { id: 'T1566.001', name: ' Spearphishing Attachment', description: 'Malicious attachments in targeted emails', parentId: 'T1566', detectionMethods: [], mitigations: [], platforms: ['Windows', 'Linux', 'macOS'], dataSources: ['Email gateway'] },
          { id: 'T1566.002', name: ' Spearphishing Link', description: 'Malicious links in targeted emails', parentId: 'T1566', detectionMethods: [], mitigations: [], platforms: ['Windows', 'Linux', 'macOS'], dataSources: ['Email gateway', 'Proxy'] },
        ],
        detectionMethods: [
          { type: 'signature', description: 'Known phishing campaign indicators', dataSource: 'Email Security Gateway', queryExample: 'Sender in blocklist or subject matches known campaign', difficulty: 'easy', effectiveness: 90, falsePositiveRate: 'low' },
          { type: 'behavioral', description: 'First-time sender with attachment + urgent language', dataSource: 'Email Security Gateway', queryExample: 'New sender AND has_attachment AND urgency_keywords', difficulty: 'medium', effectiveness: 75, falsePositiveRate: 'medium' },
        ],
        mitigations: [
          { id: 'M1047', name: 'Email Filtering', description: 'Advanced email filtering and sandboxing', effectiveness: 85, implementation: 'medium', references: [] },
          { id: 'M1017', name: 'User Training', description: 'Phishing awareness training', effectiveness: 70, implementation: 'complex', references: [] },
        ],
        telecomSpecific: false,
        djezzyRelevance: 95,
        platforms: ['Windows', 'Linux', 'macOS'],
        dataSources: ['Email Gateway', 'Proxy', 'Endpoint'],
        references: ['https://attack.mitre.org/techniques/T1566/'],
        version: '14.1',
        modified: new Date('2024-02-28'),
      },
    ],
  },
  {
    id: 'TA0002',
    name: 'Execution',
    shortName: 'Execution',
    description: 'The adversary is trying to run malicious code.',
    telecomRelevance: 80,
    techniques: [
      {
        id: 'T1059',
        name: 'Command and Scripting Interpreter',
        description: 'Adversaries may abuse command and script interpreters to execute commands.',
        tacticId: 'TA0002',
        tacticName: 'Execution',
        subtechniques: [
          { id: 'T1059.001', name: ' PowerShell', description: 'Abuse PowerShell for execution', parentId: 'T1059', detectionMethods: [], mitigations: [], platforms: ['Windows'], dataSources: ['PowerShell logs', 'Process monitoring'] },
          { id: 'T1059.002', name: ' AppleScript', description: 'Abuse AppleScript on macOS', parentId: 'T1059', detectionMethods: [], mitigations: [], platforms: ['macOS'], dataSources: ['Process monitoring'] },
          { id: 'T1059.003', name: ' Windows Command Shell', description: 'Abuse cmd.exe', parentId: 'T1059', detectionMethods: [], mitigations: [], platforms: ['Windows'], dataSources: ['Process monitoring', 'Command line logs'] },
          { id: 'T1059.004', name: ' Unix Shell', description: 'Abuse bash/sh shells', parentId: 'T1059', detectionMethods: [], mitigations: [], platforms: ['Linux', 'macOS'], dataSources: ['Process monitoring'] },
          { id: 'T1059.005', name: ' Visual Basic', description: 'Abuse VBScript/VBA', parentId: 'T1059', detectionMethods: [], mitigations: [], platforms: ['Windows'], dataSources: ['Process monitoring'] },
          { id: 'T1059.006', name: ' Python', description: 'Abuse Python interpreter', parentId: 'T1059', detectionMethods: [], mitigations: [], platforms: ['Windows', 'Linux', 'macOS'], dataSources: ['Process monitoring'] },
          { id: 'T1059.007', name: ' JavaScript', description: 'Abuse Node.js/JScript', parentId: 'T1059', detectionMethods: [], mitigations: [], platforms: ['Windows', 'Linux', 'macOS'], dataSources: ['Process monitoring'] },
          { id: 'T1059.008', name: ' Windows Management Instrumentation', description: 'Abuse WMIC/wbem', parentId: 'T1059', detectionModules: [], mitigations: [], platforms: ['Windows'], dataSources: ['Process monitoring', 'WMI events'] },
          { id: 'T1059.009', name: ' Ruby', description: 'Abuse Ruby interpreter', parentId: 'T1059', detectionMethods: [], mitigations: [], platforms: ['Windows', 'Linux', 'macOS'], dataSources: ['Process monitoring'] },
          { id: 'T1059.010', name: ' Lua', description: 'Abuse Lua interpreter', parentId: 'T1059', detectionMethods: [], mitigations: [], platforms: ['Windows', 'Linux'], dataSources: ['Process monitoring'] },
          { id: 'T1059.011', name: ' Perl', description: 'Abuse Perl interpreter', parentId: 'T1059', detectionMethods: [], mitigations: [], platforms: ['Windows', 'Linux', 'macOS'], dataSources: ['Process monitoring'] },
        ],
        detectionMethods: [
          { type: 'behavioral', description: 'Suspicious command-line parameters (-enc, -noprofile, hidden)', dataSource: 'EDR/Sysmon', queryExample: 'CommandLine contains "-enc" OR CommandLine contains "-noprofile"', difficulty: 'easy', effectiveness: 92, falsePositiveRate: 'low' },
          { type: 'anomaly', description: 'Rare process-parent combinations (e.g., Word spawning PowerShell)', dataSource: 'EDR', queryExample: 'ParentProcessName == "winword.exe" and ProcessName == "powershell.exe"', difficulty: 'medium', effectiveness: 88, falsePositiveRate: 'low' },
        ],
        mitigations: [
          { id: 'M1038', name: 'Execution Prevention', description: 'Application allowlisting/blocklisting', effectiveness: 75, implementation: 'complex', references: [] },
          { id: 'M1040', name: 'Behavioral Prevention on Endpoint', description: 'EDR behavioral blocking', effectiveness: 85, implementation: 'medium', references: [] },
        ],
        telecomSpecific: false,
        djezzyRelevance: 90,
        platforms: ['Windows', 'Linux', 'macOS'],
        dataSources: ['Process Monitoring', 'Command Line Logs', 'PowerShell Logs'],
        references: ['https://attack.mitre.org/techniques/T1059/'],
        version: '14.1',
        modified: new Date('2024-03-25'),
      },
      {
        id: 'T1203',
        name: 'Exploitation for Client Execution',
        description: 'Adversaries may exploit software vulnerabilities to execute code.',
        tacticId: 'TA0002',
        tacticName: 'Execution',
        subtechniques: [],
        detectionMethods: [
          { type: 'signature', description: 'Known exploit signatures', dataSource: 'EDR/AV', queryExample: 'Exploit signature match in process memory or file', difficulty: 'easy', effectiveness: 95, falsePositiveRate: 'low' },
          { type: 'anomaly', description: 'Crash events followed by suspicious process creation', dataSource: 'Windows Error Reporting', queryExample: 'Faulting application followed by unexpected child process', difficulty: 'hard', effectiveness: 70, falsePositiveRate: 'high' },
        ],
        mitigations: [
          { id: 'M1051', name: 'Update Software', description: 'Timely patching of applications', effectiveness: 90, implementation: 'medium', references: [] },
          { id: 'M1022', name: 'Restrict Software Permissions', description: 'Run applications with least privilege', effectiveness: 60, implementation: 'medium', references: [] },
        ],
        telecomSpecific: false,
        djezzyRelevance: 85,
        platforms: ['Windows', 'Linux', 'macOS'],
        dataSources: ['EDR', 'AV', 'Application Logs'],
        references: ['https://attack.mitre.org/techniques/T1203/'],
        version: '14.1',
        modified: new Date('2024-04-12'),
      },
    ],
  },
  {
    id: 'TA0003',
    name: 'Persistence',
    shortName: 'Persistence',
    description: 'The adversary is trying to maintain their foothold.',
    telecomRelevance: 70,
    techniques: [
      {
        id: 'T1547',
        name: 'Boot or Logon Autostart Execution',
        description: 'Adversaries may configure system settings to automatically run programs during boot.',
        tacticId: 'TA0003',
        tacticName: 'Persistence',
        subtechniques: [
          { id: 'T1547.001', name: ' Registry Run Keys / Startup Folder', description: 'Add programs to registry startup keys', parentId: 'T1547', detectionMethods: [], mitigations: [], platforms: ['Windows'], dataSources: ['Registry monitoring'] },
          { id: 'T1547.002', name: ' Authentication Package', description: 'Replace authentication DLLs', parentId: 'T1547', detectionMethods: [], mitigations: [], platforms: ['Windows'], dataSources: ['File integrity monitoring'] },
          { id: 'T1547.003', name: ' Time Providers', description: 'Register malicious time provider', parentId: 'T1547', detectionMethods: [], mitigations: [], platforms: ['Windows'], dataSources: ['Registry monitoring'] },
          { id: 'T1547.004', name: ' Winlogon Helper', description: 'Modify Winlogon helper DLL', parentId: 'T1547', detectionMethods: [], mitigations: [], platforms: ['Windows'], dataSources: ['Registry monitoring'] },
          { id: 'T1547.005', name: ' Security Support Provider', description: 'Install malicious SSP', parentId: 'T1547', detectionMethods: [], mitigations: [], platforms: ['Windows'], dataSources: ['Registry monitoring', 'File monitoring'] },
          { id: 'T1547.006', name: ' Kernel Modules and Drivers', description: 'Load malicious kernel driver', parentId: 'T1547', detectionMethods: [], mitigations: [], platforms: ['Windows', 'Linux'], dataSources: ['Driver loading events'] },
          { id: 'T1547.007', name: ' Re-imaging Rooting', description: 'Root mobile devices via re-imaging', parentId: 'T1547', detectionMethods: [], mitigations: [], platforms: ['Mobile'], dataSources: ['Mobile device management'] },
          { id: 'T1547.009', name: ' Shortcut Modification', description: 'Modify LNK shortcuts', parentId: 'T1547', detectionMethods: [], mitigations: [], platforms: ['Windows'], dataSources: ['File modification monitoring'] },
          { id: 'T1547.010', name: ' Pluggable Authentication Modules', description: 'Modify PAM modules on Linux', parentId: 'T1547', detectionMethods: [], mitigations: [], platforms: ['Linux'], dataSources: ['File integrity monitoring'] },
          { id: 'T1547.011', name: ' XDG Autostart Entries', description: 'Create autostart entries on Linux', parentId: 'T1547', detectionMethods: [], mitigations: [], platforms: ['Linux'], dataSources: ['File monitoring'] },
          { id: 'T1547.012', name: ' Print Monitors', description: 'Register print monitor DLL', parentId: 'T1547', detectionMethods: [], mitigations: [], platforms: ['Windows'], dataSources: ['Registry monitoring'] },
          { id: 'T1547.013', name: ' XLogin Script', description: 'Modify X login scripts', parentId: 'T1547', detectionMethods: [], mitigations: [], platforms: ['Linux', 'Unix'], dataSources: ['File monitoring'] },
          { id: 'T1547.014', name: ' Active Setup', description: 'Modify Active Setup registry key', parentId: 'T1547', detectionMethods: [], mitigations: [], platforms: ['Windows'], dataSources: ['Registry monitoring'] },
          { id: 'T1547.015', name: ' Login Hooks', description: 'Install login hooks on macOS', parentId: 'T1547', detectionMethods: [], mitigations: [], platforms: ['macOS'], dataSources: ['File monitoring'] },
        ],
        detectionMethods: [
          { type: 'signature', description: 'Known persistence location modifications', dataSource: 'EDR/FIM', queryExample: 'Registry write to Run keys OR Startup folder modification', difficulty: 'easy', effectiveness: 90, falsePositiveRate: 'low' },
          { type: 'behavioral', description: 'New persistence mechanism not seen before in environment', dataSource: 'EDR', queryExample: 'First time this binary added to autostart', difficulty: 'hard', effectiveness: 80, falsePositiveRate: 'medium' },
        ],
        mitigations: [
          { id: 'M1015', name: 'Active Scanning', description: 'Periodic persistence scanning', effectiveness: 70, implementation: 'medium', references: [] },
          { id: 'M1022', name: 'Restrict Permissions', description: 'Limit write access to persistence locations', effectiveness: 75, implementation: 'medium', references: [] },
        ],
        telecomSpecific: false,
        djezzyRelevance: 75,
        platforms: ['Windows', 'Linux', 'macOS', 'Mobile'],
        dataSources: ['Registry Monitoring', 'File Integrity Monitoring', 'Boot Configuration'],
        references: ['https://attack.mitre.org/techniques/T1547/'],
        version: '14.1',
        modified: new Date('2024-02-08'),
      },
      {
        id: 'T1053',
        name: 'Scheduled Task/Job',
        description: 'Adversaries may abuse task scheduling for execution or persistence.',
        tacticId: 'TA0003',
        tacticName: 'Persistence',
        subtechniques: [
          { id: 'T1053.001', name: ' Job Scheduling', description: 'Use Unix at/cron jobs', parentId: 'T1053', detectionMethods: [], mitigations: [], platforms: ['Linux', 'macOS'], dataSources: ['File monitoring', 'Process monitoring'] },
          { id: 'T1053.002', name: ' At (Linux)', description: 'Use Linux at command', parentId: 'T1053', detectionMethods: [], mitigations: [], platforms: ['Linux'], dataSources: ['Process monitoring'] },
          { id: 'T1053.003', name: ' Cron', description: 'Use cron daemon', parentId: 'T1053', detectionMethods: [], mitigations: [], platforms: ['Linux', 'macOS'], dataSources: ['File monitoring'] },
          { id: 'T1053.004', name: ' Launch Daemon', description: 'Use launch daemons on macOS', parentId: 'T1053', detectionMethods: [], mitigations: [], platforms: ['macOS'], dataSources: ['File monitoring'] },
          { id: 'T1053.005', name: ' Scheduled Task', description: 'Use Windows Task Scheduler', parentId: 'T1053', detectionMethods: [], mitigations: [], platforms: ['Windows'], dataSources: ['Security Event Log', 'Task Scheduler audit'] },
        ],
        detectionMethods: [
          { type: 'signature', description: 'Scheduled task creation by non-admin users', dataSource: 'Windows Security Log', queryExample: 'EventID == 4698 and SubjectUserName not in (admins)', difficulty: 'easy', effectiveness: 88, falsePositiveRate: 'low' },
          { type: 'behavioral', description: 'Tasks pointing to suspicious locations (%temp%, %appdata%)', dataSource: 'Task Scheduler Audit', queryExample: 'Task executable in user-writable directory', difficulty: 'medium', effectiveness: 82, falsePositiveRate: 'medium' },
        ],
        mitigations: [
          { id: 'M1022', name: 'Restrict Permissions', description: 'Limit who can create scheduled tasks', effectiveness: 70, implementation: 'medium', references: [] },
          { id: 'M1038', name: 'Execution Prevention', description: 'Block execution from suspicious paths', effectiveness: 65, implementation: 'complex', references: [] },
        ],
        telecomSpecific: false,
        djezzyRelevance: 80,
        platforms: ['Windows', 'Linux', 'macOS'],
        dataSources: ['Task Scheduler Audit', 'Cron Logs', 'LaunchDaemon Monitoring'],
        references: ['https://attack.mitre.org/techniques/T1053/'],
        version: '14.1',
        modified: new Date('2024-03-18'),
      },
    ],
  },
  // ... Additional tactics would be included in full implementation
  // TA0004: Privilege Escalation
  // TA0005: Defense Evasion
  // TA0006: Credential Access
  // TA0007: Discovery
  // TA0008: Lateral Movement
  // TA0009: Collection
  // TA0010: Exfiltration
  // TA0011: Command and Control
  // TA0040: Impact
];

// ============================================================
// TELECOM-SPECIFIC TECHNIQUES (DJEZZY RELEVANT)
// ============================================================

export const TELECOM_SPECIFIC_TECHNIQUES: MITRETechnique[] = [
  {
    id: 'T1583.004',
    name: 'Compromise Telecommunications Service Provider',
    description: 'Adversaries may compromise telecommunications infrastructure to enable subsequent attacks.',
    tacticId: 'TA0040',
    tacticName: 'Impact',
    subtechniques: [],
    detectionMethods: [
      { type: 'behavioral', description: 'Unauthorized access to telecom infrastructure components', dataSource: 'Telecom OSS/NMS', queryExample: 'Access to HLR/MSC/VLR from unauthorized workstation', difficulty: 'medium', effectiveness: 85, falsePositiveRate: 'low' },
      { type: 'anomaly', description: 'Anomalous configuration changes to network elements', dataSource: 'CMDB/Audit Logs', queryExample: 'Config change to SS7 firewall rules outside change window', difficulty: 'medium', effectiveness: 80, falsePositiveRate: 'medium' },
    ],
    mitigations: [
      { id: 'M1042', name: 'Prevent Access to Common Telecommunications Services', description: 'Restrict telecom infrastructure access', effectiveness: 85, implementation: 'complex', references: [] },
      { id: 'M1018', name: 'User Account Management', description: 'Strict access controls for telecom systems', effectiveness: 80, implementation: 'medium', references: [] },
    ],
    telecomSpecific: true,
    djezzyRelevance: 100,
    platforms: ['Telecom Infrastructure'],
    dataSources: ['OSS', 'NMS', 'Signaling Firewalls', 'HLR/HSS Audits'],
    references: ['https://attack.mitre.org/techniques/T1583/004/'],
    version: '14.1',
    modified: new Date('2024-05-01'),
  },
  {
    id: 'T1584',
    name: 'Compromise Telecommunications Infrastructure',
    description: 'Adversaries may manipulate telecommunications infrastructure to achieve objectives.',
    tacticId: 'TA0040',
    tacticName: 'Impact',
    subtechniques: [
      { id: 'T1584.001', name: ' SIM Swapping', description: 'Illegimately transfer phone number to attacker-controlled SIM', parentId: 'T1584', detectionMethods: [], mitigations: [], platforms: ['Telecom'], dataSources: ['BSS CRM', 'Provisioning System'] },
      { id: 'T1584.002', name: ' Roaming Manipulation', description: 'Manipulate roaming agreements or profiles', parentId: 'T1584', detectionMethods: [], mitigations: [], platforms: ['Telecom'], dataSources: ['Roaming Gateway', 'HLR'] },
      { id: 'T1584.003', name: ' Intercept Text Messages', description: 'Intercept SMS messages via SS7/Diameter', parentId: 'T1584', detectionMethods: [], mitigations: [], platforms: ['Telecom'], dataSources: ['SMSC', 'Signaling Firewall'] },
      { id: 'T1584.004', name: ' Intercept Communications', description: 'Intercept voice/data communications', parentId: 'T1584', detectionMethods: [], mitigations: [], platforms: ['Telecom'], dataSources: ['MSC', 'Media Gateway', 'Signaling'] },
      { id: 'T1584.005', name: ' Defraud Telecommunications Services', description: 'Commit fraud using telecom services', parentId: 'T1584', detectionMethods: [], mitigations: [], platforms: ['Telecom'], dataSources: ['Billing', 'Fraud Management'] },
      { id: 'T1584.006', name: ' Abuse SS7 Signaling', description: 'Exploit SS7 protocol vulnerabilities', parentId: 'T1584', detectionMethods: [], mitigations: [], platforms: ['Telecom'], dataSources: ['SS7 Firewall', 'Diameter'] },
      { id: 'T1584.007', name: ' Abuse VoIP Services', description: 'Exploit VoIP infrastructure vulnerabilities', parentId: 'T1584', detectionMethods: [], mitigations: [], platforms: ['Telecom'], dataSources: ['SBC', 'IMS Core'] },
      { id: 'T1584.008', name: ' Abuse Domain Validated Certificates', description: 'Obtain DV certs for lookalike domains', parentId: 'T1584', detectionMethods: [], mitigations: [], platforms: ['Telecom'], dataSources: ['Certificate Transparency'] },
    ],
    detectionMethods: [
      { type: 'behavioral', description: 'Multiple SIM swap requests for same MSISDN', dataSource: 'BSS Provisioning', queryExample: 'SIM swap count per MSISDN > threshold within 24h', difficulty: 'easy', effectiveness: 95, falsePositiveRate: 'low' },
      { type: 'anomaly', description: 'Unusual signaling patterns from untrusted networks', dataSource: 'SS7/Diameter Firewall', queryExample: 'SendRoutingInfo from high-risk GT', difficulty: 'medium', effectiveness: 90, falsePositiveRate: 'low' },
      { type: 'correlation', description: 'Correlate fraud indicators across BSS/OSS', dataSource: 'Fraud Management System', queryExample: 'High call drop rate + premium destination + new SIM', difficulty: 'hard', effectiveness: 85, falsePositiveRate: 'medium' },
    ],
    mitigations: [
      { id: 'M1042', name: 'Prevent Access to Common Telecommunications Services', description: 'Implement strong authentication for telecom systems', effectiveness: 85, implementation: 'complex', references: [] },
      { id: 'M1053', name: 'Deploy Signaling Firewall', description: 'Deploy and maintain SS7/Diameter firewalls', effectiveness: 95, implementation: 'complex', references: [] },
    ],
    telecomSpecific: true,
    djezzyRelevance: 100,
    platforms: ['Telecom Infrastructure', 'SS7', 'Diameter', 'SIP'],
    dataSources: ['BSS', 'OSS', 'Signaling Firewalls', 'Fraud Management', 'Billing'],
    references: ['https://attack.mitre.org/techniques/T1584/'],
    version: '14.1',
    modified: new Date('2024-05-15'),
  },
];

// ============================================================
// LOOKUP & SEARCH FUNCTIONS
// ============================================================

/**
 * Look up a technique by ID
 */
export function lookupTechnique(techniqueId: string): TechniqueLookupResult | null {
  // Search main matrix
  for (const tactic of ATTACK_MATRIX) {
    const technique = tactic.techniques.find(t => t.id === techniqueId);
    if (technique) {
      return {
        technique,
        relatedTechniques: getRelatedTechniques(technique),
        detectionPlaybook: generateDetectionPlaybook(technique),
        threatIntelMatches: [],
      };
    }
  }

  // Search telecom-specific
  const telecomTech = TELECOM_SPECIFIC_TECHNIQUES.find(t => t.id === techniqueId);
  if (telecomTech) {
    return {
      technique: telecomTech,
      relatedTechniques: getRelatedTechniques(telecomTech),
      detectionPlaybook: generateDetectionPlaybook(telecomTech),
      threatIntelMatches: [],
    };
  }

  return null;
}

/**
 * Search techniques by keyword
 */
export function searchTechniques(query: string): MITRETechnique[] {
  const results: MITRETechnique[] = [];
  const lowerQuery = query.toLowerCase();

  for (const tactic of ATTACK_MATRIX) {
    for (const technique of tactic.techniques) {
      if (
        technique.name.toLowerCase().includes(lowerQuery) ||
        technique.description.toLowerCase().includes(lowerQuery) ||
        technique.id.toLowerCase().includes(lowerQuery)
      ) {
        results.push(technique);
      }
      
      // Search subtechniques
      for (const subtech of technique.subtechniques) {
        if (
          subtech.name.toLowerCase().includes(lowerQuery) ||
          subtech.description.toLowerCase().includes(lowerQuery)
        ) {
          results.push(technique); // Return parent technique
        }
      }
    }
  }

  // Search telecom-specific
  for (const tech of TELECOM_SPECIFIC_TECHNIQUES) {
    if (
      tech.name.toLowerCase().includes(lowerQuery) ||
      tech.description.toLowerCase().includes(lowerQuery)
    ) {
      results.push(tech);
    }
  }

  return [...new Set(results)]; // Deduplicate
}

/**
 * Get techniques by tactic
 */
export function getTechniquesByTactic(tacticId: string): MITRETechnique[] {
  const tactic = ATTACK_MATRIX.find(t => t.id === tacticId);
  return tactic?.techniques || [];
}

/**
 * Get all telecom-relevant techniques sorted by relevance
 */
export function getTelecomRelevantTechniques(minRelevance: number = 70): MITRETechnique[] {
  const allTechniques: MITRETechnique[] = [];

  for (const tactic of ATTACK_MATRIX) {
    for (const technique of tactic.techniques) {
      if (technique.djezzyRelevance >= minRelevance) {
        allTechniques.push(technique);
      }
    }
  }

  // Add all telecom-specific techniques
  allTechniques.push(...TELECOM_SPECIFIC_TECHNIQUES);

  return allTechniques.sort((a, b) => b.djezzyRelevance - a.djezzyRelevance);
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getRelatedTechniques(technique: MITRETechnique): MITRETechnique[] {
  const related: MITRETechnique[] = [];

  // Find techniques in same tactic
  for (const tactic of ATTACK_MATRIX) {
    if (tactic.techniques.some(t => t.id === technique.id)) {
      related.push(...tactic.techniques.filter(t => t.id !== technique.id).slice(0, 3));
      break;
    }
  }

  // Find techniques that share data sources
  for (const tactic of ATTACK_MATRIX) {
    for (const t of tactic.techniques) {
      if (t.id !== technique.id && t.dataSources.some(ds => technique.dataSources.includes(ds))) {
        if (!related.find(r => r.id === t.id)) {
          related.push(t);
        }
      }
    }
  }

  return related.slice(0, 5);
}

function generateDetectionPlaybook(technique: MITRETechnique): DetectionPlaybook {
  const steps: DetectionStep[] = [];

  // Generate steps from detection methods
  technique.detectionMethods.forEach((method, index) => {
    steps.push({
      order: index + 1,
      title: `${method.type.charAt(0).toUpperCase() + method.type.slice(1)} Detection`,
      description: method.description,
      query: method.queryExample,
      expectedResults: `Expected ${method.falsePositiveRate === 'low' ? 'high-confidence' : 'investigative'} alerts`,
      analysisTips: [
        `Focus on ${method.dataSource} as primary data source`,
        `Consider false positive rate: ${method.falsePositiveRate}`,
        `Detection effectiveness estimated at ${method.effectiveness}%`,
      ],
    });
  });

  // Add investigation step
  steps.push({
    order: steps.length + 1,
    title: 'Investigation & Enrichment',
    description: 'Enrich findings with additional context and threat intelligence',
    analysisTips: [
      'Cross-reference with threat intelligence feeds',
      'Check for related IOCs in MISP/ThreatConnect',
      'Review historical activity for identified entities',
      'Assess business impact and scope',
    ],
  });

  // Add response step
  steps.push({
    order: steps.length + 1,
    title: 'Response Actions',
    description: 'Execute appropriate containment and eradication actions',
    analysisTips: [
      'Apply recommended mitigations',
      'Document findings for incident report',
      'Update detection rules based on lessons learned',
      'Share indicators with trusted community',
    ],
  });

  return {
    steps,
    estimatedTime: `${steps.length * 30} minutes`,
    requiredTools: technique.dataSources,
    skillLevel: technique.detectionMethods.some(m => m.difficulty === 'hard') ? 'senior' : 'intermediate',
  };
}

// Export utilities
export {
  ATTACK_MATRIX,
  TELECOM_SPECIFIC_TECHNIQUES,
};
