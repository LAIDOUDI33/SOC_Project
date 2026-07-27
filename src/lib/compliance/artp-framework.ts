/**
 * ARTP (Autorité de Régulation de la Poste et des Télécommunications) 
 * Compliance Framework Configuration for Djezzy Algeria
 * 
 * This module defines the complete ARTP regulatory requirements for:
 * - Cybersecurity incident reporting
 * - Data protection and privacy
 * - Network security and integrity
 * - Fraud prevention and reporting
 * - Subscriber data protection
 * - Interception lawful compliance
 * 
 * @version 1.0.0
 * @module compliance/artp-framework
 */

import { 
  FrameworkType, 
  FrameworkStatus, 
  ReviewFrequency,
  ControlCriticality,
  ControlStatus,
  AnssiDomain
} from '@prisma/client';

// ============================================================
// ARTP Framework Definition
// ============================================================

export const ARTP_FRAMEWORK = {
  // Framework Metadata
  id: 'artp-algeria-2024',
  name: 'artp-telecom-dz',
  displayName: 'ARTP Telecom Security Framework - Algeria',
  description: 'Algerian Telecommunications Regulatory Authority (ARTP) cybersecurity and operational security requirements for telecom operators including mandatory incident reporting, data protection, network security, and fraud prevention.',
  version: '2024.1',
  frameworkType: FrameworkType.REGULATORY as const,
  jurisdiction: 'DZ',
  issuingBody: 'ARTP - Autorité de Régulation de la Poste et des Télécommunications',
  effectiveDate: new Date('2024-01-01'),
  reviewFrequency: ReviewFrequency.ANNUAL as const,
  status: FrameworkStatus.ACTIVE as const,
  
  // Contact Information
  contactEmail: 'securite@artp.dz',
  documentationUrl: 'https://www.artp.dz/reglementation/securite',
  
  // Control Categories (ARTP Domains)
  controlCategories: [
    { id: 'INCIDENT_MGMT', name: 'Incident Management', icon: '🚨' },
    { id: 'DATA_PROTECTION', name: 'Data Protection & Privacy', icon: '🔒' },
    { id: 'NETWORK_SECURITY', name: 'Network Infrastructure Security', icon: '🌐' },
    { id: 'FRAUD_PREVENTION', name: 'Fraud Prevention & Detection', icon: '💳' },
    { id: 'SUBSCRIBER_PROTECTION', name: 'Subscriber Protection', icon: '👥' },
    { id: 'LAWFUL_INTERCEPTION', name: 'Lawful Interception Compliance', icon: '⚖️' },
    { id: 'BUSINESS_CONTINUITY', name: 'Business Continuity', icon: '🔄' },
    { id: 'REPORTING_COMPLIANCE', name: 'Reporting & Documentation', icon: '📋' }
  ],

  // Scoring Methodology
  scoringMethodology: {
    weights: {
      critical: 5,
      high: 4,
      medium: 3,
      low: 2,
      informational: 1
    },
    thresholds: {
      compliant: 100,
      partiallyCompliant: 50,
      nonCompliant: 0
    },
    overallCalculation: 'weighted_average'
  }
};

// ============================================================
// ARTP Control Definitions
// ============================================================

export interface ArtpControlDefinition {
  controlId: string;
  controlRef: string;
  name: string;
  description: string;
  category: string;
  family: string;
  criticality: ControlCriticality;
  priority: number;
  requirements: string;
  implementationGuidance: string;
  evidenceRequirements: string[];
  testingProcedures: string;
  reportingDeadline: string; // ARTP-specific deadline
  anssiMapping?: {
    domain: AnssiDomain;
    reference: string;
    strength: 'FULL' | 'SUBSTANTIAL' | 'PARTIAL' | 'MINIMAL';
  };
  mitreTechniques?: string[];
}

export const ARTP_CONTROLS: ArtpControlDefinition[] = [
  // ========================================
  // DOMAIN 1: INCIDENT MANAGEMENT (8 controls)
  // ========================================
  {
    controlId: 'ARTP-IM-001',
    controlRef: 'JORT-2023-45-Art-12',
    name: 'Security Incident Detection Capability',
    description: 'Telecom operators must maintain a 24/7 Security Operations Center (SOC) capable of detecting cybersecurity incidents affecting network infrastructure and subscriber data within 15 minutes of occurrence.',
    category: 'INCIDENT_MGMT',
    family: 'Detection & Monitoring',
    criticality: ControlCriticality.CRITICAL,
    priority: 1,
    requirements: 'Implement real-time monitoring of all network elements, security devices, and critical systems. Maintain SIEM platform with correlation rules covering all ARTP-defined incident categories. Achieve Mean Time to Detect (MTTD) ≤ 15 minutes for critical incidents.',
    implementationGuidance: 'Deploy enterprise SIEM solution (e.g., Splunk, QRadar, or ELK Stack). Integrate all network elements (HLR/HSS, MSC, SGSN, GGSN/PGW, CSCF). Configure alerting based on ARTP severity classifications. Implement 24/7 SOC staffing with defined escalation procedures.',
    evidenceRequirements: [
      'SOC operational procedures document',
      'SIEM configuration screenshots',
      'MTTD metrics report (last quarter)',
      '24/7 staffing roster',
      'Alert correlation rule definitions'
    ],
    testingProcedures: 'Simulate critical security incident and measure detection time. Verify all critical systems are sending logs to SIEM. Test alert escalation paths. Document results in test report.',
    reportingDeadline: 'Immediate detection required'
  },
  {
    controlId: 'ARTP-IM-002',
    controlRef: 'JORT-2023-45-Art-13',
    name: 'Mandatory Incident Reporting to ARTP',
    description: 'Report all qualifying security incidents to ARTP within mandated timeframes: Critical incidents within 2 hours, High severity within 24 hours, Medium within 72 hours, with detailed technical information.',
    category: 'INCIDENT_MGMT',
    family: 'Regulatory Reporting',
    criticality: ControlCriticality.CRITICAL,
    priority: 1,
    requirements: 'Establish secure communication channel with ARTP CSIRT. Define incident classification criteria aligned with ARTP guidelines. Implement automated report generation capability. Maintain trained personnel for ARTP communications.',
    implementationGuidance: 'Integrate ARTP reporting into incident response workflow. Pre-authorize templates for each incident type. Establish PGP/GPG encrypted email channel with ARTP. Designate primary and backup ARTP liaisons. Conduct quarterly reporting drills.',
    evidenceRequirements: [
      'ARTP communication channel setup confirmation',
      'Incident classification procedure',
      'Report templates (critical/high/medium)',
      'Training records for ARTP liaisons',
      'Drill execution logs'
    ],
    testingProcedures: 'Conduct tabletop exercise simulating ARTP-required report. Verify template completeness against ARTP specifications. Test encryption channel functionality. Measure time from incident declaration to report submission readiness.',
    reportingDeadline: 'Critical: 2h | High: 24h | Medium: 72h',
    anssiMapping: { domain: AnssiDomain.RESPONSE, reference: 'RESP-003', strength: 'FULL' }
  },
  {
    controlId: 'ARTP-IM-003',
    controlRef: 'JORT-2023-45-Art-14',
    name: 'Incident Response Team (IRT) Establishment',
    description: 'Maintain a dedicated Incident Response Team with defined roles, responsibilities, and 24/7 availability for handling security incidents affecting telecom infrastructure.',
    category: 'INCIDENT_MGMT',
    family: 'Organization & Roles',
    criticality: ControlCriticality.CRITICAL,
    priority: 2,
    requirements: 'Define IRT organizational structure with clear RACI matrix. Ensure minimum team size of 6 qualified members. Maintain on-call rotation covering all hours. Establish backup/secondary team for surge capacity.',
    implementationGuidance: 'Create formal charter documenting IRT authority and scope. Define roles: Team Lead, Technical Lead, Communications Lead, Legal Liaison, Forensics Specialist, Business Liaison. Implement on-call management system. Cross-train team members. Conduct monthly team exercises.',
    evidenceRequirements: [
      'IRT charter document',
      'RACI matrix',
      'Team member qualifications list',
      'On-call schedule (current month)',
      'Training certificates',
      'Exercise records (last 6 months)'
    ],
    testingProcedures: 'Verify IRT roster is current. Confirm on-call system operational. Interview random team member on role knowledge. Review exercise frequency and participation rates.',
    reportingDeadline: 'N/A - Organizational requirement'
  },
  {
    controlId: 'ARTP-IM-004',
    controlRef: 'JORT-2023-45-Art-15',
    name: 'Incident Classification and Triage',
    description: 'Implement standardized incident classification methodology aligned with ARTP categories: Network Intrusion, Data Breach, Service Disruption, Fraud, Subscriber Impact, with consistent severity assignment.',
    category: 'INCIDENT_MGMT',
    family: 'Classification & Triage',
    criticality: ControlCriticality.HIGH,
    priority: 2,
    requirements: 'Adopt ARTP incident taxonomy. Define severity criteria for each category. Train all SOC analysts on classification. Achieve ≥95% classification consistency in peer reviews. Document all classification decisions.',
    implementationGuidance: 'Develop decision tree/classification flowchart. Integrate into ticketing system with mandatory fields. Create reference guide with examples. Implement peer review process for high/critical classifications. Monthly calibration sessions.',
    evidenceRequirements: [
      'Classification procedure document',
      'Severity criteria matrix',
      'Decision tree/flowchart',
      'Analyst training records',
      'Peer review statistics (consistency rate)',
      'Calibration session minutes'
    ],
    testingProcedures: 'Present analysts with 20 sample scenarios. Measure classification accuracy against gold standard. Calculate inter-rater reliability. Identify areas of inconsistency requiring additional training.',
    reportingDeadline: 'N/A - Process requirement'
  },
  {
    controlId: 'ARTP-IM-005',
    controlRef: 'JORT-2023-45-Art-16',
    name: 'Forensic Evidence Preservation',
    description: 'Maintain capability to preserve forensic evidence from all network elements and systems according to chain-of-custody requirements for potential legal proceedings and ARTP investigations.',
    category: 'INCIDENT_MGMT',
    family: 'Digital Forensics',
    criticality: ControlCriticality.HIGH,
    priority: 3,
    requirements: 'Define evidence types to be preserved per incident category. Establish collection procedures maintaining chain of custody. Secure storage with access logging. Retention period minimum 3 years or per legal hold requirements.',
    implementationGuidance: 'Deploy forensic workstations with write-blockers. Train designated forensics personnel. Implement evidence management system. Define preservation triggers for each incident type. Partner with certified digital forensics provider for complex cases.',
    evidenceRequirements: [
      'Evidence preservation procedure',
      'Chain of custody forms/templates',
      'Forensic toolkit inventory',
      'Personnel certifications',
      'Storage system access logs',
      'Retention policy document'
    ],
    testingProcedures: 'Conduct evidence preservation drill using simulated incident. Verify chain of custody documentation completeness. Test storage access controls. Validate retention enforcement mechanisms.',
    reportingDeadline: 'Preserve immediately upon incident detection'
  },
  {
    controlId: 'ARTP-IM-006',
    controlRef: 'JORT-2023-45-Art-17',
    name: 'Post-Incident Analysis and Lessons Learned',
    description: 'Conduct thorough post-incident analysis for all High and Critical severity incidents within 30 days, documenting root causes, corrective actions, and lessons learned for continuous improvement.',
    category: 'INCIDENT_MGMT',
    family: 'Continuous Improvement',
    criticality: ControlCriticality.HIGH,
    priority: 3,
    requirements: 'Complete root cause analysis (RCA) using structured methodology (5-Why, Fishbone, etc.). Identify contributing factors across people, process, technology. Develop SMART corrective actions. Track action completion. Share anonymized learnings with industry (via ARTP if requested).',
    implementationGuidance: 'Standardize RCA template and methodology. Assign RCA owner within 24h of incident closure. Schedule RCA meeting within 2 weeks. Present findings to security leadership. Integrate actions into risk register and project backlog.',
    evidenceRequirements: [
      'RCA methodology document',
      'RCA templates',
      'Completed RCAs (anonymized samples)',
      'Corrective action tracking log',
      'Leadership presentation materials',
      'Lessons learned repository structure'
    ],
    testingProcedures: 'Review last 3 High/Critical incident RCAs for quality and timeliness. Verify corrective action completion status. Assess whether similar incidents recurred after RCA completion.',
    reportingDeadline: 'Within 30 days of incident closure'
  },
  {
    controlId: 'ARTP-IM-007',
    controlRef: 'JORT-2023-45-Art-18',
    name: 'Subscriber Notification Requirements',
    description: 'Notify affected subscribers of data breaches or security incidents impacting their personal data within 72 hours, with clear explanation of impact and recommended protective actions.',
    category: 'INCIDENT_MGMT',
    family: 'Stakeholder Communication',
    criticality: ControlCriticality.CRITICAL,
    priority: 1,
    requirements: 'Define breach notification triggers per ARTP definition. Prepare notification templates in Arabic and French. Establish multi-channel delivery (SMS, email, app notification). Maintain call center script for subscriber inquiries. Document notification audit trail.',
    implementationGuidance: 'Integrate breach assessment workflow with legal/compliance team. Pre-translate and pre-approve notification templates. Automate subscriber extraction from affected systems. Coordinate with PR/Communications for media response. Test notification system quarterly.',
    evidenceRequirements: [
      'Notification trigger criteria',
      'Approved notification templates (AR/FR)',
      'Notification workflow procedure',
      'Call center Q&A script',
      'Delivery system test results',
      'Notification audit log (sample)'
    ],
    testingProcedures: 'Execute full notification drill with test subscriber list. Measure time from breach confirmation to first notification delivery. Verify message content accuracy. Test call center script effectiveness.',
    reportingDeadline: 'Within 72 hours of breach confirmation'
  },
  {
    controlId: 'ARTP-IM-008',
    controlRef: 'JORT-2023-45-Art-19',
    name: 'Coordination with National CSIRT',
    description: 'Maintain active coordination with Algerian National Computer Emergency Response Team (CERT-DZ / CNI) for threat intelligence sharing and major incident support.',
    category: 'INCIDENT_MGMT',
    family: 'External Coordination',
    criticality: ControlCriticality.HIGH,
    priority: 2,
    requirements: 'Establish formal coordination agreement with CERT-DZ. Participate in regular information sharing sessions. Report indicators of compromise (IOCs) to national database. Request assistance for major incidents per agreed protocols.',
    implementationGuidance: 'Sign MoU with CERT-DZ defining information exchange scope. Designate primary/backup points of contact. Attend quarterly coordination meetings. Integrate national IOC feed into security infrastructure. Document all exchanges.',
    evidenceRequirements: [
      'MoU/coordination agreement with CERT-DZ',
      'PoC designations and contact info',
      'Meeting attendance records',
      'IOC contribution logs',
      'Assistance request history',
      'Threat intelligence integration proof'
    ],
    testingProcedures: 'Verify current MoU validity. Confirm PoC accessibility. Review recent coordination activities. Test IOC feed integration. Exercise assistance request procedure.',
    reportingDeadline: 'As needed / Per agreement'
  },

  // ========================================
  // DOMAIN 2: DATA PROTECTION & PRIVACY (8 controls)
  // ========================================
  {
    controlId: 'ARTP-DP-001',
    controlRef: 'JORT-2018-44-Art-45',
    name: 'Personal Data Processing Registry',
    description: 'Maintain comprehensive registry of all personal data processing activities, including purposes, legal basis, data categories, retention periods, and third-party disclosures as required by Algerian Data Protection Law.',
    category: 'DATA_PROTECTION',
    family: 'Data Governance',
    criticality: ControlCriticality.CRITICAL,
    priority: 1,
    requirements: 'Document every processing activity involving subscriber/personal data. Include: data controller identity, processing purpose, categories of data subjects, data recipients, international transfers (if any), retention schedule, security measures. Update registry within 30 days of any change.',
    implementationGuidance: 'Deploy data mapping tool or maintain centralized registry spreadsheet. Assign data stewards for each business area. Conduct annual processing audit. Integrate with privacy impact assessment (PIA) process. Make registry available to DPO and auditors.',
    evidenceRequirements: [
      'Data processing registry (complete)',
      'Registry update procedure',
      'Data steward assignments',
      'Annual audit reports',
      'PIA integration documentation'
    ],
    testingProcedures: 'Select random processing activities and verify registry accuracy. Check update timestamps for recent changes. Interview data stewards on registry maintenance process.',
    reportingDeadline: 'Continuous - Registry always current'
  },
  {
    controlId: 'ARTP-DP-002',
    controlRef: 'JORT-2018-44-Art-46',
    name: 'Subscriber Consent Management',
    description: 'Obtain and manage valid consent for personal data processing, marketing communications, and data sharing with third parties, with ability for subscribers to withdraw consent at any time.',
    category: 'DATA_PROTECTION',
    family: 'Consent & Rights',
    criticality: ControlCriticality.CRITICAL,
    priority: 1,
    requirements: 'Capture consent at point of collection with specific purpose granularity. Store consent records with timestamp and channel. Honor withdrawal requests within 48 hours. Re-consent for material purpose changes. Maintain consent audit trail for 3 years minimum.',
    implementationGuidance: 'Implement consent management platform (CMP). Design user-friendly consent interfaces (app, web, retail). Integrate consent status into all downstream systems. Automate preference synchronization. Provide easy withdrawal mechanism (USSD, app, call center).',
    evidenceRequirements: [
      'Consent capture interfaces (screenshots)',
      'Consent text (approved legal wording)',
      'Consent database schema',
      'Withdrawal processing procedure',
      'Preference sync architecture',
      'Sample consent audit trail'
    ],
    testingProcedures: 'Test consent capture flow end-to-end. Verify consent recorded correctly. Execute withdrawal and confirm propagation. Audit consent records for completeness.',
    reportingDeadline: 'Honor withdrawal within 48 hours'
  },
  {
    controlId: 'ARTP-DP-003',
    controlRef: 'JORT-2018-44-Art-47',
    name: 'Data Subject Rights Fulfillment',
    description: 'Enable subscribers to exercise their rights: access their data, rectify inaccuracies, erase data (right to be forgotten), restrict processing, and data portability, within legally mandated timeframes.',
    category: 'DATA_PROTECTION',
    family: 'Consent & Rights',
    criticality: ControlCriticality.HIGH,
    priority: 2,
    requirements: 'Provide multiple channels for rights requests (app, website, call center, written). Acknowledge requests within 5 business days. Complete access/rectification within 30 days. Process erasure requests within 15 days (subject to legal holds). Log all requests and outcomes.',
    implementationGuidance: 'Build self-service data portal for subscribers. Automate data export generation. Implement verification process to prevent unauthorized disclosure. Train call center staff on request handling. Escalate complex requests to DPO.',
    evidenceRequirements: [
      'Rights request channels (documentation)',
      'Request acknowledgment SLA proof',
      'Self-service portal demonstration',
      'Verification procedure',
      'Staff training records',
      'Request fulfillment logs (sample)'
    ],
    testingProcedures: 'Submit test request via each channel. Measure acknowledgment time. Verify data package completeness. Test erasure execution (in non-production). Check logging accuracy.',
    reportingDeadline: 'Ack: 5 days | Access: 30 days | Erasure: 15 days'
  },
  {
    controlId: 'ARTP-DP-004',
    controlRef: 'JORT-2018-44-Art-48',
    name: 'Data Minimization and Purpose Limitation',
    description: 'Collect and process only personal data necessary for specified purposes, retain only for required duration, and prevent repurposing without additional consent.',
    category: 'DATA_PROTECTION',
    family: 'Data Governance',
    criticality: ControlCriticality.HIGH,
    priority: 2,
    requirements: 'Define data retention schedules per category. Implement automated deletion/expiry processes. Review data holdings annually for necessity. Justify any data kept beyond standard retention. Prevent unauthorized secondary use through access controls.',
    implementationGuidance: 'Classify all data assets by sensitivity and retention tier. Deploy data lifecycle management tools. Implement privacy-by-design in new projects. Conduct Privacy Impact Assessments (PIA) for new processing. Regular data discovery scans.',
    evidenceRequirements: [
      'Data retention schedule matrix',
      'Automated deletion job configurations',
      'Annual data review reports',
      'Exception justification records',
      'PIA templates and completed assessments',
      'Data discovery scan results'
    ],
    testingProcedures: 'Verify automated deletion jobs running correctly. Sample data holdings against retention schedule. Review recent PIAs for quality. Test access controls preventing unauthorized use.',
    reportingDeadline: 'Continuous - Automated enforcement'
  },
  {
    controlId: 'ARTP-DP-005',
    controlRef: 'JORT-2018-44-Art-49',
    name: 'Cross-Border Data Transfer Controls',
    description: 'Ensure international transfers of personal data occur only to jurisdictions with adequate protection or with appropriate safeguards (contractual clauses, BCRs, or explicit consent).',
    category: 'DATA_PROTECTION',
    family: 'International Transfers',
    criticality: ControlCriticality.HIGH,
    priority: 2,
    requirements: 'Inventory all international data flows. Assess destination country adequacy. Implement appropriate transfer mechanisms for inadequate jurisdictions. Monitor vendor locations for cloud services. Document legal basis for each transfer.',
    implementationGuidance: 'Map all data flows crossing borders. Classify destinations by adequacy status. Prepare Standard Contractual Clauses (SCCs) for vendor agreements. Obtain DPO approval before new international transfers. Annual transfer impact assessment.',
    evidenceRequirements: [
      'International data flow inventory',
      'Country adequacy assessment',
      'SCC templates and executed agreements',
      'Vendor location audit results',
      'DPO approval records',
      'Transfer impact assessments'
    ],
    testingProcedures: 'Trace sample data flows to verify transfer documentation. Check vendor contracts for SCCs. Verify cloud service data residency. Test data localization where applicable.',
    reportingDeadline: 'Pre-transfer authorization required'
  },
  {
    controlId: 'ARTP-DP-006',
    controlRef: 'JORT-2018-44-Art-50',
    name: 'Data Protection Officer (DPO) Appointment',
    description: 'Appoint a qualified Data Protection Officer responsible for monitoring compliance, advising on DPIAs, serving as authority contact point, and maintaining accountability.',
    category: 'DATA_PROTECTION',
    family: 'Governance & Accountability',
    criticality: ControlCriticality.CRITICAL,
    priority: 1,
    requirements: 'Designate DPO with appropriate expertise and authority. Ensure independence from operations. Provide adequate resources. Publish DPO contact details. Document DPO responsibilities and reporting line. Support ongoing professional development.',
    implementationGuidance: 'Appoint DPO at senior level (reporting to CEO/Board). Define DPO job description and KPIs. Allocate budget for tools and training. Establish direct reporting channel to board. Register DPO with ARTP if required.',
    evidenceRequirements: [
      'DPO appointment letter',
      'Job description and qualifications',
      'Organizational chart showing independence',
      'Resource allocation/budget',
      'Published contact details',
      'Training/professional development records'
    ],
    testingProcedures: 'Verify DPO appointment documentation. Confirm independence in org chart. Check resource adequacy. Test contact channel responsiveness. Review recent DPO activities/reports.',
    reportingDeadline: 'Continuous role'
  },
  {
    controlId: 'ARTP-DP-007',
    controlRef: 'JORT-2018-44-Art-51',
    name: 'Data Breach Notification to Authority',
    description: 'Notify ARTP of personal data breaches within 72 hours of becoming aware, unless breach is unlikely to result in risk to subscriber rights and freedoms.',
    category: 'DATA_PROTECTION',
    family: 'Breach Management',
    criticality: ControlCriticality.CRITICAL,
    priority: 1,
    requirements: 'Define breach assessment criteria. Establish 24/7 breach detection capability. Prepare notification content requirements. Designate authority notification responsibility. Document risk assessment methodology. Maintain notification templates.',
    implementationGuidance: 'Integrate DPO into incident response for potential breaches. Create breach risk assessment decision tree. Pre-draft notification templates. Establish secure submission channel to ARTP. Practice notification in incident exercises.',
    evidenceRequirements: [
      'Breach assessment criteria document',
      'Risk assessment methodology',
      'Notification templates',
      'Secure submission channel setup',
      'DPO involvement procedure',
      'Exercise/drill records including notification'
    ],
    testingProcedures: 'Simulate breach scenario requiring notification. Time assessment and notification preparation. Verify template completeness. Test submission channel. Measure total time against 72-hour deadline.',
    reportingDeadline: 'Within 72 hours of awareness'
  },
  {
    controlId: 'ARTP-DP-008',
    controlRef: 'JORT-2018-44-Art-52',
    name: 'Privacy by Design and Default',
    description: 'Embed data protection principles into system design from inception, implementing technical and organizational measures ensuring default privacy-protective settings.',
    category: 'DATA_PROTECTION',
    family: 'System Design',
    criticality: ControlCriticality.MEDIUM,
    priority: 3,
    requirements: 'Conduct Privacy Impact Assessment (PIA) for new systems/processes. Implement privacy-protective defaults (data minimization, pseudonymization). Integrate privacy requirements into SDLC. Train development teams on privacy patterns. Review existing systems for privacy gaps.',
    implementationGuidance: 'Add PIA gate to project methodology. Build privacy component library (encryption, access control, masking). Include privacy requirements in user stories. Conduct code reviews for privacy issues. Annual privacy audit of production systems.',
    evidenceRequirements: [
      'PIA methodology and templates',
      'SDLC privacy gate documentation',
      'Privacy pattern library',
      'Developer training curriculum',
      'Completed PIAs (samples)',
      'Privacy audit reports'
    ],
    testingProcedures: 'Review recent project PIAs for thoroughness. Verify privacy patterns used in new features. Interview developers on privacy awareness. Check production system settings for privacy defaults.',
    reportingDeadline: 'Before system deployment'
  },

  // ========================================
  // DOMAIN 3: NETWORK INFRASTRUCTURE SECURITY (8 controls)
  // ========================================
  {
    controlId: 'ARTP-NS-001',
    controlRef: 'JORT-2023-45-Art-25',
    name: 'Network Element Security Hardening',
    description: 'Apply security hardening baselines to all network elements (HLR/HSS, MSC, SGSN, GGSN/PGW, CSCF, MME) following vendor best practices and ARTP guidelines, with documented exception process.',
    category: 'NETWORK_SECURITY',
    family: 'Hardening & Configuration',
    criticality: ControlCriticality.CRITICAL,
    priority: 1,
    requirements: 'Maintain hardened configuration baseline per NE type. Apply CIS benchmarks or vendor hardening guides. Disable unused services/ports. Implement secure management protocols (SSHv2, SNMPv3). Enforce strong authentication. Scan quarterly for drift. Document and approve exceptions.',
    implementationGuidance: 'Develop baseline configurations for each NE type. Use configuration management (CMDB) to track. Deploy configuration compliance scanner (NCCM, SolarWinds). Automate remediation where possible. Change Advisory Board (CAB) for exceptions.',
    evidenceRequirements: [
      'Hardened baseline configs (per NE type)',
      'CIS/vendor benchmark references',
      'Configuration compliance scan results',
      'Exception requests and approvals',
      'Remediation tickets',
      'CMDB configuration snapshots'
    ],
    testingProcedures: 'Run compliance scan against production NEs. Verify exception approvals are current. Test baseline restoration procedure. Check for configuration drift since last scan.',
    reportingDeadline: 'Quarterly scanning | Continuous monitoring'
  },
  {
    controlId: 'ARTP-NS-002',
    controlRef: 'JORT-2023-45-Art-26',
    name: 'Network Segmentation and Access Control',
    description: 'Segment telecom network into security zones (O&M, signaling, bearer, subscriber data) with strictly enforced access controls between zones, following defense-in-depth principles.',
    category: 'NETWORK_SECURITY',
    family: 'Network Architecture',
    criticality: ControlCriticality.CRITICAL,
    priority: 1,
    requirements: 'Define security zone architecture. Implement firewalls at zone boundaries. Enforce least-privilege access between zones. Monitor and log all cross-zone traffic. Regularly review firewall rules for necessity. Protect subscriber data zone with enhanced controls.',
    implementationGuidance: 'Design zone architecture diagram (TOGAF style). Deploy next-gen firewalls at boundaries. Implement micro-segmentation in data centers. Use Software-Defined Networking (SDN) policies. Quarterly firewall rule review. Network detection and response (NDR) for east-west traffic.',
    evidenceRequirements: [
      'Security zone architecture diagram',
      'Firewall rule sets (sanitized)',
      'Zone boundary device inventory',
      'Traffic analysis reports',
      'Firewall rule review records',
      'Access control matrices'
    ],
    testingProcedures: 'Verify zone isolation with penetration testing. Test firewall rule effectiveness. Review recent rule changes for appropriateness. Simulate lateral movement attempt and detect.',
    reportingDeadline: 'Architecture: Initial + Changes | Rules: Quarterly review'
  },
  {
    controlId: 'ARTP-NS-003',
    controlRef: 'JORT-2023-45-Art-27',
    name: 'Signaling Protocol Security (SS7/Diameter/SIP)',
    description: 'Protect signaling protocols (SS7, Diameter, SIP) from interception, fraud, and denial-of-service attacks using firewalls, encryption, and anomaly detection.',
    category: 'NETWORK_SECURITY',
    family: 'Protocol Security',
    criticality: ControlCriticality.CRITICAL,
    priority: 1,
    requirements: 'Deploy signaling firewalls (STP inspection, Diameter agent, SBC). Detect and block known attack signatures. Encrypt signaling where possible (IPsec, TLS/SRTP). Monitor for abnormal patterns (location tracking, call hijacking). Correlate signaling events with fraud detection.',
    implementationGuidance: 'Install dedicated signaling security platforms (Mobileum, Mahindra, Symantec). Configure detection rules for SS7 attacks (SRI bypass, USSD fraud). Implement SIP security (SBC registration hardening, RTP encryption). Integrate with fraud management system.',
    evidenceRequirements: [
      'Signaling security architecture',
      'Firewall/detection rule configurations',
      'Attack signature detection logs',
      'Encryption deployment status',
      'Anomaly alerts and responses',
      'Fraud correlation examples'
    ],
    testingProcedures: 'Run signaling vulnerability assessment. Test known attack detection capabilities. Verify encryption status on links. Simulate signaling attack scenario and validate detection.',
    reportingDeadline: 'Continuous monitoring | Assessment: Semi-annual'
  },
  {
    controlId: 'ARTP-NS-004',
    controlRef: 'JORT-2023-45-Art-28',
    name: 'SS7 and Diameter Interconnect Security',
    description: 'Secure intercarrier SS7 and Diameter connections against roaming partner threats, implementing screening, whitelisting, and real-time monitoring.',
    category: 'NETWORK_SECURITY',
    family: 'Interconnect Security',
    criticality: ControlCriticality.CRITICAL,
    priority: 1,
    requirements: 'Validate all incoming interconnect messages against allowed ranges. Screen GT translations for IMSI catcher prevention. Monitor roaming partner behavior for anomalies. Maintain up-to-date whitelist of legitimate routes. Respond to detected abuse within 15 minutes.',
    implementationGuidance: 'Deploy STP/firewall at interconnect border. Configure IMSI range validation per partner agreement. Implement diameter routing rule enforcement. Real-time dashboard for interconnect health. Partner security SLA in interconnect agreements.',
    evidenceRequirements: [
      'Interconnect security architecture',
      'Screening rule configurations',
      'Partner whitelist (sanitized)',
      'Anomaly detection dashboards',
      'Partner SLA excerpts',
      'Incident response examples'
    ],
    testingProcedures: 'Test screening with out-of-range values. Verify whitelist currency. Simulate partner-originated attack. Measure detection-to-response time.',
    reportingDeadline: 'Response within 15 minutes'
  },
  {
    controlId: 'ARTP-NS-005',
    controlRef: 'JORT-2023-45-Art-29',
    name: 'Radio Access Network (RAN) Security',
    description: 'Secure radio access network components (NodeB/eNodeB/gNodeB, RNC, BTS) against physical and logical attacks, including rogue base station detection.',
    category: 'NETWORK_SECURITY',
    family: 'Access Network',
    criticality: ControlCriticality.HIGH,
    priority: 2,
    requirements: 'Physically secure cell sites (fencing, locks, alarms). Authenticate and encrypt backhaul connections. Detect rogue/IMSICatcher base stations. Manage remote access securely. Monitor RAN performance for security anomalies.',
    implementationGuidance: 'Implement site security standards (per risk tier). Deploy IPsec/GRE tunnels for backhaul. Use IMSI catcher detection system (cell site analyzer, network-based). Secure O&M access with jump servers. Physical security audits for high-risk sites.',
    evidenceRequirements: [
      'Site security standards',
      'Backhaul encryption configuration',
      'IMSICatcher detection system specs',
      'Remote access procedure',
      'Physical security audit reports',
      'Anomaly detection examples'
    ],
    testingProcedures: 'Verify backhaul encryption status. Test remote access security controls. Review physical security audit findings. Validate IMSICatcher detection capability.',
    reportingDeadline: 'Site audits: Annual | Encryption: Continuous'
  },
  {
    controlId: 'ARTP-NS-006',
    controlRef: 'JORT-2023-45-Art-30',
    name: 'Core Network Element Protection',
    description: 'Implement defense-in-depth for core network elements (HLR/HSS, EPC, IMS) including redundancy, access control, change management, and continuous monitoring.',
    category: 'NETWORK_SECURITY',
    family: 'Core Protection',
    criticality: ControlCriticality.CRITICAL,
    priority: 1,
    requirements: 'Cluster core NEs for high availability. Restrict administrative access (break-glass procedure). Enforce change management with rollback capability. Monitor privileged operations. Maintain disaster recovery capability (RPO/RTO targets).',
    implementationGuidance: 'Deploy active-active or active-standby clustering. Implement PAM (Privileged Access Management) for admin access. ITSM-integrated change management. Database activity monitoring (DAM) for HLR/HSS. Annual DR testing with documented results.',
    evidenceRequirements: [
      'High availability architecture',
      'PAM configuration and policies',
      'Change management procedure',
      'Privileged activity monitoring logs',
      'DR plan and test results',
      'RPO/RTO achievement metrics'
    ],
    testingProcedures: 'Verify HA status of core NEs. Test break-glass access procedure. Review change success rate. Validate DR test recency and results.',
    reportingDeadline: 'HA: Continuous | DR Testing: Annual'
  },
  {
    controlId: 'ARTP-NS-007',
    controlRef: 'JORT-2023-45-Art-31',
    name: 'Network Intrusion Detection and Prevention',
    description: 'Deploy IDS/IPS solutions at critical network points to detect and block unauthorized access, malware propagation, and attack patterns in real-time.',
    category: 'NETWORK_SECURITY',
    family: 'Detection & Prevention',
    criticality: ControlCriticality.HIGH,
    priority: 2,
    requirements: 'Cover all network segments with IDS/IPS sensors. Maintain current signature/threat feeds. Tune alerts to reduce false positives. Enable blocking for high-confidence threats. 24/7 monitoring of IDS alerts. Integrate with SIEM for correlation.',
    implementationGuidance: 'Deploy NIDS at perimeter and segment boundaries. Host-based IDS (HIDS) on critical servers. Use threat intelligence-fed rules. SOC-led tuning program (weekly reviews). Automated playbooks for common alerts.',
    evidenceRequirements: [
      'IDS/IPS deployment map',
      'Signature update status',
      'Alert tuning metrics (FP rate)',
      'Blocking rule configuration',
      'SIEM integration proof',
      'Alert response procedures'
    ],
    testingProcedures: 'Verify sensor coverage and signature freshness. Test alert detection with benign penetration attempts. Measure MTTR for IDS-triggered incidents. Review tuning effectiveness.',
    reportingDeadline: 'Signature updates: Daily | Tuning: Weekly'
  },
  {
    controlId: 'ARTP-NS-008',
    controlRef: 'JORT-2023-45-Art-32',
    name: 'Vulnerability Management Program',
    description: 'Maintain systematic vulnerability identification, prioritization, and remediation for all network infrastructure, applications, and systems.',
    category: 'NETWORK_SECURITY',
    family: 'Vulnerability Management',
    criticality: ControlCriticality.HIGH,
    priority: 2,
    requirements: 'Scan all assets weekly (authenticated where possible). Prioritize by CVSS and asset criticality. Remediate Critical: 7 days, High: 30 days, Medium: 90 days. Maintain exception process with risk acceptance. Track and report metrics.',
    implementationQualitativeGuidance: 'Deploy VM platform (Qualys, Rapid7, Tenable). Integrate with CMDB for coverage. Risk-based prioritization formula. Patch management integration. Executive dashboard with aging metrics. Exception approval by CISO.',
    evidenceRequirements: [
      'VM program documentation',
      'Scan coverage report',
      'SLA definitions (by severity)',
      'Remediation aging report',
      'Exception requests and approvals',
      'Executive metrics dashboard'
    ],
    testingProcedures: 'Verify scan coverage percentage. Check remediation SLA compliance. Review exception justifications. Validate metric accuracy.',
    reportingDeadline: 'Scanning: Weekly | Critical: 7d | High: 30d | Medium: 90d'
  },

  // ========================================
  // DOMAIN 4: FRAUD PREVENTION & DETECTION (6 controls)
  // ========================================
  {
    controlId: 'ARTP-FP-001',
    controlRef: 'JORT-2022-38-Art-15',
    name: 'Real-Time Fraud Detection System',
    description: 'Operate real-time fraud detection system capable of identifying SIM swap fraud, IRSF (International Revenue Share Fraud), Wangiri, PBX hacking, and subscription fraud with < 5 minute detection time.',
    category: 'FRAUD_PREVENTION',
    family: 'Detection Systems',
    criticality: ControlCriticality.CRITICAL,
    priority: 1,
    requirements: 'Deploy FMS (Fraud Management System) with real-time scoring. Cover all major fraud types relevant to Algeria market. Integrate with network probes for signaling analysis. Achieve detection time < 5 minutes for high-value fraud. False positive rate < 2%.',
    implementationGuidance: 'Select enterprise FMS (Subex, Mobileum, WeDo Technologies). Integrate with CDR mediation, signaling probes, and subscriber database. Machine learning models for emerging patterns. Real-time dashboards for fraud analysts. Integration with ARTP reporting for mandatory fraud types.',
    evidenceRequirements: [
      'FMS architecture and capabilities',
      'Detection rule configurations',
      'Detection time metrics (MTTD)',
      'False positive rate statistics',
      'Integration points documentation',
      'Analyst procedures and training'
    ],
    testingProcedures: 'Inject test fraud scenarios and measure detection time. Verify alert generation for each fraud type. Check false positive rate calculation. Test analyst response procedures.',
    reportingDeadline: 'Detection: < 5 minutes | Reporting: Per ARTP requirements'
  },
  {
    controlId: 'ARTP-FP-002',
    controlRef: 'JORT-2022-38-Art-16',
    name: 'SIM Swap Fraud Prevention',
    description: 'Implement robust SIM swap fraud prevention including identity verification, cooling-off periods, dual-notification, and subscriber verification before SIM reissuance.',
    category: 'FRAUD_PREVENTION',
    family: 'Subscription Fraud',
    criticality: ControlCriticality.CRITICAL,
    priority: 1,
    requirements: 'Verify subscriber identity with ≥2 factors before SIM swap. Implement 24-hour cooling-off period for new SIM activation post-swap. Notify old SIM number of swap request. Limit SIM swaps per subscriber per year (max 3). Flag suspicious patterns for investigation.',
    implementationGuidance: 'Enhance POS/dealer workflow with ID verification (national ID check). SMS notification to existing SIM before swap completion. Backend rules engine for velocity checks. Dealer training on social engineering red flags. Investigation queue for flagged swaps.',
    evidenceRequirements: [
      'SIM swap procedure document',
      'ID verification integration',
      'Cooling-off period configuration',
      'Notification template and flow',
      'Velocity limit rules',
      'Investigation queue examples'
    ],
    testingProcedures: 'Attempt SIM swap with insufficient verification (should fail). Complete valid swap and verify notifications sent. Test velocity limit enforcement. Review investigation queue handling.',
    reportingDeadline: 'Prevention: Real-time | Investigation: < 24h'
  },
  {
    controlId: 'ARTP-FP-003',
    controlRef: 'JORT-2022-38-Art-17',
    name: 'IRSF (International Revenue Share Fraud) Detection',
    description: 'Detect and block International Premium Rate Number (IPRN) fraud and revenue share schemes targeting international destinations with unusual calling patterns.',
    category: 'FRAUD_PREVENTION',
    family: 'Revenue Fraud',
    criticality: ControlCriticality.HIGH,
    priority: 2,
    requirements: 'Monitor international call patterns for anomalies (volume, duration, destination, time). Block known fraudulent IPRN ranges in real-time. Detect Wangiri callback patterns. Investigate high-risk destinations weekly. Share intelligence with international fraud forums.',
    implementationGuidance: 'Configure FMS rules for IRSF detection (high-cost destination spikes, after-hours international). Auto-block confirmed fraud ranges. Manual review for borderline cases. Participation in CFM-ATF (Communications Fraud Management Association). Roaming partner coordination.',
    evidenceRequirements: [
      'IRSF detection rule set',
      'Blocked range list (sample)',
      'Weekly investigation reports',
      'CFM-ATF membership/participation',
      'Partner coordination records',
      'Case studies (anonymized)'
    ],
    testingProcedures: 'Simulate IRSF pattern and verify detection/blocking. Check blocked range update frequency. Review investigation quality. Test partner notification process.',
    reportingDeadline: 'Blocking: Real-time | Investigation: Weekly'
  },
  {
    controlId: 'ARTP-FP-004',
    controlRef: 'JORT-2022-38-Art-18',
    name: 'Fraud Reporting to ARTP',
    description: 'Report fraud cases to ARTP as required: confirmed fraud > 500,000 DZD within 24 hours, organized crime indicators immediately, monthly statistical summary.',
    category: 'FRAUD_PREVENTION',
    family: 'Regulatory Reporting',
    criticality: ControlCriticality.HIGH,
    priority: 2,
    requirements: 'Define ARTP-reportable fraud thresholds. Automate report generation from FMS. Submit individual case reports within SLA. Monthly aggregate statistics submission. Maintain audit trail of all submissions.',
    implementationGuidance: 'Integrate ARTP reporting into fraud case workflow. Pre-populate report templates from case data. Secure submission channel. Designated fraud analyst for ARTP liaison. Monthly reconciliation of reported vs. actual cases.',
    evidenceRequirements: [
      'Reporting threshold definitions',
      'Automated report templates',
      'Submission channel configuration',
      'Individual case submissions (sample)',
      'Monthly summary reports',
      'Reconciliation records'
    ],
    testingProcedures: 'Generate test report from sample case. Verify template completeness. Test submission channel. Compare submitted cases against FMS data for accuracy.',
    reportingDeadline: '>500k DZD: 24h | Organized crime: Immediate | Summary: Monthly'
  },
  {
    controlId: 'ARTP-FP-005',
    controlRef: 'JORT-2022-38-Art-19',
    name: 'Dealer and Channel Fraud Prevention',
    description: 'Prevent fraud originating from dealer and distribution channels including unauthorized activations, commission manipulation, and identity fraud at point of sale.',
    category: 'FRAUD_PREVENTION',
    family: 'Channel Security',
    criticality: ControlCriticality.HIGH,
    priority: 2,
    requirements: 'Background check dealers before authorization. Limit activation permissions per dealer tier. Monitor dealer transaction patterns for anomalies. Regular dealer audits (risk-based). Immediate suspension capability for suspected fraud. Commission clawback provisions.',
    implementationGuidance: 'Dealer due diligence process. Role-based access in dealer portal. Dealer scorecard with fraud KPIs. Unannounced audit program. Dealer fraud investigation unit. Contract terms enabling rapid action.',
    evidenceRequirements: [
      'Dealer authorization procedure',
      'Dealer tier and permission matrix',
      'Monitoring dashboard (anonymized)',
      'Audit schedule and results',
      'Suspension procedure',
      'Contract clauses (fraud-related)'
    ],
    testingProcedures: 'Review dealer onboarding for due diligence. Verify permission limits enforced. Check monitoring alert generation. Audit suspension procedure execution.',
    reportingDeadline: 'Audits: Risk-based | Suspension: Immediate upon suspicion'
  },
  {
    controlId: 'ARTP-FP-006',
    controlRef: 'JORT-2022-38-Art-20',
    name: 'Internal Fraud Controls',
    description: 'Prevent and detect insider fraud through segregation of duties, access controls, transaction monitoring, and whistleblower mechanisms.',
    category: 'FRAUD_PREVENTION',
    family: 'Insider Threat',
    criticality: ControlCriticality.HIGH,
    priority: 2,
    requirements: 'Segregate conflicting duties (provisioning vs. approval, credit vs. collection). Implement SoD matrix in access management. Monitor privileged user transactions. Anonymous reporting channel (whistleblower). Background checks for sensitive roles. Regular access recertification.',
    implementationGuidance: 'Role-based access control with SoD engine. Privileged activity monitoring (PAM integration). Third-party ethics hotline. Pre-employment screening policy. Quarterly access certification campaign. Investigative capacity for insider cases.',
    evidenceRequirements: [
      'SoD matrix and conflicts',
      'Access control configuration',
      'Privileged activity reports',
      'Whistleblower channel info',
      'Screening policy and vendor',
      'Recertification campaign results'
    ],
    testingProcedures: 'Test SoD conflict prevention. Verify privileged monitoring coverage. Check whistleblower channel accessibility. Review recertification completion rate.',
    reportingDeadline: 'Recertification: Quarterly | Monitoring: Continuous'
  },

  // ========================================
  // DOMAIN 5: SUBSCRIBER PROTECTION (5 controls)
  // ========================================
  {
    controlId: 'ARTP-SP-001',
    controlRef: 'JORT-2020-22-Art-08',
    name: 'Subscriber Identity Protection',
    description: 'Protect subscriber identity information (IMSI, IMEI, MSISDN) from unauthorized access, use, or disclosure throughout its lifecycle.',
    category: 'SUBSCRIBER_PROTECTION',
    family: 'Identity Protection',
    criticality: ControlCriticality.CRITICAL,
    priority: 1,
    requirements: 'Encrypt subscriber data at rest and in transit. Mask/hide full identifiers in non-essential systems. Strict access control to subscriber database. Audit all access to subscriber identity data. Pseudonymize where possible for analytics.',
    implementationGuidance: 'Database encryption (TDE or application-level). Dynamic data masking in reporting/analytics. RBAC with need-to-know principle. Database activity monitoring (DAM). Tokenization/pseudonymization for big data. Annual access review.',
    evidenceRequirements: [
      'Encryption configuration',
      'Masking rules definition',
      'Access control matrix',
      'DAM reports (sample)',
      'Pseudonymization architecture',
      'Access review records'
    ],
    testingProcedures: 'Verify encryption status of subscriber tables. Test masking in reports. Attempt unauthorized access (should fail). Review DAM alerts for suspicious queries.',
    reportingDeadline: 'Protection: Continuous | Review: Quarterly'
  },
  {
    controlId: 'ARTP-SP-002',
    controlRef: 'JORT-2020-22-Art-09',
    name: 'Communication Confidentiality',
    description: 'Protect confidentiality of subscriber communications (voice, SMS, data) from interception, eavesdropping, and unauthorized disclosure.',
    category: 'SUBSCRIBER_PROTECTION',
    family: 'Communication Privacy',
    criticality: ControlCriticality.CRITICAL,
    priority: 1,
    requirements: 'Encrypt radio interface (2G/3G/4G/5G as available). Implement network-side encryption for core transport. Secure voice (SRTP/VoLTE encryption). Prevent lawful interception access abuse. Monitor for interception anomalies.',
    implementationGuidance: 'Enable A5/3-4 for 2G/3G, AES for 4G, 256-bit for 5G. IPsec for backhaul. SRTP for VoLTE calls. Dual-control for LI access. LI access logging and regular audit.',
    evidenceRequirements: [
      'Radio encryption configuration',
      'Backhaul encryption status',
      'VoLTE/SRTP deployment proof',
      'LI access control procedure',
      'LI access audit logs',
      'Anomaly detection configuration'
    ],
    testingProcedures: 'Verify radio encryption enabled. Test IPsec tunnel status. Validate SRTP negotiation. Review LI access logs for anomalies.',
    reportingDeadline: 'Encryption: Always-on | LI audit: Monthly'
  },
  {
    controlId: 'ARTP-SP-003',
    controlRef: 'JORT-2020-22-Art-10',
    name: 'Location Privacy Protection',
    description: 'Protect subscriber location information from unauthorized access, excessive collection, and misuse while enabling lawful location-based services.',
    category: 'SUBSCRIBER_PROTECTION',
    family: 'Location Privacy',
    criticality: ControlCriticality.HIGH,
    priority: 2,
    requirements: 'Collect location data only when necessary for service or legal requirement. Obtain consent for LBS (Location-Based Services). Restrict location API access. Anonymize/aggregate location data for analytics. Retention per legal maximum (typically 12 months).',
    implementationGuidance: 'Location data classification as sensitive. Consent capture in app settings. API gateway with authentication/rate limiting. Location data retention job. Differential privacy for analytics. Legal hold for investigations.',
    evidenceRequirements: [
      'Location data classification',
      'LBS consent flow',
      'API access controls',
      'Retention/deletion job config',
      'Anonymization approach',
      'Legal hold procedure'
    ],
    testingProcedures: 'Verify location access requires proper auth. Test consent flow for LBS. Check retention job execution. Validate anonymization effectiveness.',
    reportingDeadline: 'Collection: Consent-based | Retention: Per legal max'
  },
  {
    controlId: 'ARTP-SP-004',
    controlRef: 'JORT-2020-22-Art-11',
    name: 'Spam and Unsolicited Communication Protection',
    description: 'Protect subscribers from spam SMS/USSD, robocalls, and unsolicited commercial communications through filtering, opt-out mechanisms, and sender verification.',
    category: 'SUBSCRIBER_PROTECTION',
    family: 'Spam Protection',
    criticality: ControlCriticality.MEDIUM,
    priority: 3,
    requirements: 'Operate SMS spam filter with < 0.1% false positive rate. Provide easy opt-out (STOP service). Verify commercial sender registration (opt-in only). Block known spammers. Report spam sources to authorities. Monitor filtering effectiveness.',
    implementationGuidance: 'Deploy SMS firewall (content + behavioral filtering). STOP shortcode service. Sender ID registration for A2P. Blacklist management. Analytics on spam trends. Coordination with GSMA Spam Reporting Service.',
    evidenceRequirements: [
      'SMS firewall configuration',
      'Opt-out service documentation',
      'Sender registration process',
      'Blacklist management procedure',
      'Filtering effectiveness metrics',
      'Authority reporting records'
    ],
    testingProcedures: 'Test spam filter with sample messages. Verify STOP service works. Check sender registration enforcement. Review false positive/negative rates.',
    reportingDeadline: 'Filtering: Real-time | Opt-out: Immediate'
  },
  {
    controlId: 'ARTP-SP-005',
    controlRef: 'JORT-2020-22-Art-12',
    name: 'Vulnerable Subscriber Protection',
    description: 'Implement special protections for vulnerable subscriber groups (minors, elderly, persons with disabilities) including age verification, parental controls, and accessible complaint mechanisms.',
    category: 'SUBSCRIBER_PROTECTION',
    family: 'Vulnerable Groups',
    criticality: ControlCriticality.MEDIUM,
    priority: 3,
    requirements: 'Age verification for adult content/services. Parental control options (content filtering, spending limits, time restrictions). Accessible customer service for vulnerable persons. Staff training on vulnerable person interactions. Special handling procedures for complaints from vulnerable groups.',
    implementationGuidance: 'ID-based age verification at point of sale/app. Parental control feature suite in self-care app. Priority queue for elderly/disabled calls. Training module for CS agents. Escalation path for vulnerable person concerns.',
    evidenceRequirements: [
      'Age verification procedure',
      'Parental control features list',
      'Accessibility accommodations',
      'CS training curriculum',
      'Special handling procedure',
      'Complaint handling examples'
    ],
    testingProcedures: 'Test age verification flow. Verify parental control functionality. Check accessibility features. Review training completion rates.',
    reportingDeadline: 'Controls: Available at all times | Training: Onboarding + Annual'
  },

  // ========================================
  // DOMAIN 6: LAWFUL INTERCEPTION COMPLIANCE (5 controls)
  // ========================================
  {
    controlId: 'ARTP-LI-001',
    controlRef: 'JORT-2021-33-Art-05',
    name: 'Lawful Interception Capability',
    description: 'Maintain technical capability for lawful interception (LI) of communications as authorized by Algerian law, meeting ARTP handover interface standards and delivery requirements.',
    category: 'LAWFUL_INTERCEPTION',
    family: 'Technical Capability',
    criticality: ControlCriticality.CRITICAL,
    priority: 1,
    requirements: 'Deploy LI solution (CA/ADM/DF2/DF3 architecture) per ARTP standards. Support simultaneous intercepts (capacity per license). Handover interfaces compliant with ARTP specs. IRF (Intercept Related Information) and CC (Content of Communication) delivery. Encrypted delivery to LEA (Law Enforcement Agency).',
    implementationGuidance: 'Select ARTP-approved LI vendor. Integrate with all network elements (circuit and packet). Maintain capacity for peak concurrent intercepts. Regular testing with authorized agencies. Chain of custody for delivered data. LI administration security (dual control).',
    evidenceRequirements: [
      'LI architecture diagram (sanitized)',
      'ARTP approval/certification',
      'Capacity planning document',
      'Interface compliance certificate',
      'Testing records with agencies',
      'Dual-control procedure'
    ],
    testingProcedures: 'Conduct authorized LI test with participating agency. Verify IRF/CC delivery completeness. Test capacity under load. Validate encryption of delivery.',
    reportingDeadline: 'Capability: Always available | Testing: Semi-annual'
  },
  {
    controlId: 'ARTP-LI-002',
    controlRef: 'JORT-2021-33-Art-06',
    name: 'Authorization and Warrant Management',
    description: 'Process interception requests only upon valid judicial authorization, maintaining strict warrant validation, logging, and confidentiality.',
    category: 'LAWFUL_INTERCEPTION',
    family: 'Authorization',
    criticality: ControlCriticality.CRITICAL,
    priority: 1,
    requirements: 'Accept interception orders only from authorized judicial authorities. Validate warrant authenticity (signature, seal, scope). Log all requests and actions immutably. Destroy records per legal timeline. Maintain confidentiality (need-to-know). No interception without valid warrant.',
    implementationGuidance: 'Secure warrant receipt process (physical/digital). Validation checklist with legal review. Immutable audit log (blockchain/WORM). Compartmentalized LI team. Legal sign-off before activation. Secure destruction procedure.',
    evidenceRequirements: [
      'Warrant acceptance procedure',
      'Validation checklist',
      'Audit log configuration',
      'Confidentiality agreement (LI team)',
      'Legal review process',
      'Destruction procedure'
    ],
    testingProcedures: 'Review warrant validation checklist. Verify audit log immutability. Test confidentiality measures. Check destruction procedure compliance.',
    reportingDeadline: 'Validation: Before each activation | Logging: Immutable'
  },
  {
    controlId: 'ARTP-LI-003',
    controlRef: 'JORT-2021-33-Art-07',
    name: 'LI System Security and Access Control',
    description: 'Protect LI administration systems with highest security controls, strict access limitation, dual-control for sensitive actions, and comprehensive audit logging.',
    category: 'LAWFUL_INTERCEPTION',
    family: 'System Security',
    criticality: ControlCriticality.CRITICAL,
    priority: 1,
    requirements: 'Restrict LI admin access to designated personnel only (minimum 2). Two-person rule for target activation. MFA mandatory for all LI system access. Real-time alerting for LI system access. Penetration testing annually. Air-gapped or highly isolated LI network segment.',
    implementationGuidance: 'Dedicated LI administration workstation(s). Background check for all LI personnel. PKI-based authentication. Video recording of sensitive operations. Separate network VLAN for LI. Red team exercise including LI systems.',
    evidenceRequirements: [
      'LI personnel list (role only)',
      'Access control policy (LI)',
      'Two-person rule procedure',
      'MFA configuration proof',
      'Network isolation diagram',
      'Penetration test results (exec summary)'
    ],
    testingProcedures: 'Verify two-person rule enforcement. Test MFA on LI systems. Check network isolation. Review penetration test findings closure.',
    reportingDeadline: 'Controls: Always active | Pentest: Annual'
  },
  {
    controlId: 'ARTP-LI-004',
    controlRef: 'JORT-2021-33-Art-08',
    name: 'Data Delivery Integrity and Confidentiality',
    description: 'Ensure intercepted data is delivered to LEA with integrity protection, encryption, and complete chain of custody, without alteration or leakage.',
    category: 'LAWFUL_INTERCEPTION',
    family: 'Data Handling',
    criticality: ControlCriticality.CRITICAL,
    priority: 1,
    requirements: 'Encrypt LI data in transit (minimum AES-256). Digital signatures for integrity. Timestamped delivery receipts. No storage beyond delivery (unless required). Anti-tamper protection. Secure delivery channel (dedicated link or VPN).',
    implementationGuidance: 'TLS 1.3 for delivery channel. Hash-based integrity verification. Atomic delivery confirmation. Automatic purge after successful delivery. Hardware security module (HSM) for keys. Dedicated MPLS or secured Internet VPN to LEA.',
    evidenceRequirements: [
      'Encryption configuration',
      'Integrity verification method',
      'Delivery receipt format',
      'Data retention policy (LI)',
      'Anti-tamper measures',
      'Channel security specification'
    ],
    testingProcedures: 'Verify encryption in transit. Test integrity check on delivery. Confirm automatic purge. Validate channel security.',
    reportingDeadline: 'Protection: For each delivery | Purge: Post-delivery'
  },
  {
    controlId: 'ARTP-LI-005',
    controlRef: 'JORT-2021-33-Art-09',
    name: 'LI Audit and Compliance Reporting',
    description: 'Maintain comprehensive audit trail of all LI activities and submit periodic compliance reports to ARTP demonstrating adherence to LI requirements.',
    category: 'LAWFUL_INTERCEPTION',
    family: 'Audit & Reporting',
    criticality: ControlCriticality.HIGH,
    priority: 2,
    requirements: 'Log all LI system accesses, warrant validations, target activations, and deliveries. Generate monthly internal LI audit. Submit semi-annual compliance report to ARTP. Preserve audit logs per legal requirement (minimum 5 years). Independent annual LI audit.',
    implementationGuidance: 'SIEM integration for LI logs. Automated monthly audit report generation. ARTP-compliant compliance report template. WORM storage for LI audit logs. External auditor engagement for annual assessment. Board-level LI oversight committee.',
    evidenceRequirements: [
      'Audit log schema (LI)',
      'Monthly audit report template',
      'ARTP compliance report format',
      'Log retention configuration',
      'External audit engagement letter',
      'Oversight committee charter'
    ],
    testingProcedures: 'Review sample audit logs for completeness. Verify monthly report generation. Check log retention enforcement. Validate external audit scope.',
    reportingDeadline: 'Monthly internal | Semi-annual ARTP | External: Annual'
  },

  // ========================================
  // DOMAIN 7: BUSINESS CONTINUITY (4 controls)
  // ========================================
  {
    controlId: 'ARTP-BC-001',
    controlRef: 'JORT-2023-45-Art-35',
    name: 'Business Continuity Plan (BCP) Maintenance',
    description: 'Maintain current Business Continuity Plan covering all critical telecom services with defined RTO/RPA objectives, recovery procedures, and tested failover capabilities.',
    category: 'BUSINESS_CONTINUITY',
    family: 'Planning',
    criticality: ControlCriticality.HIGH,
    priority: 2,
    requirements: 'Document BCP for all critical services (voice, data, SMS, signaling). Define RTO/RPO per service (voice: RTO<2h, RPO<15min). Identify critical dependencies. Update BCP annually or after significant changes. Executive approval of BCP.',
    implementationGuidance: 'Business Impact Analysis (BIA) to prioritize services. Recovery strategies per tier (hot/warm/cold). Detailed runbooks for recovery procedures. Crisis management team definition. Communication templates. Annual BCP review cycle.',
    evidenceRequirements: [
      'BCP document (current version)',
      'BIA results',
      'RTO/RPO matrix',
      'Recovery runbooks',
      'Crisis team structure',
      'Executive approval record'
    ],
    testingProcedures: 'Verify BCP version currency. Check RTO/RPO alignment with business expectations. Review runbook detail. Confirm executive approval date.',
    reportingDeadline: 'Document: Current | Review: Annual | Approval: Post-update'
  },
  {
    controlId: 'ARTP-BC-002',
    controlRef: 'JORT-2023-45-Art-36',
    name: 'Disaster Recovery Testing',
    description: 'Conduct regular disaster recovery tests including table-top exercises, technical failovers, and full-scale simulations to validate recovery capabilities.',
    category: 'BUSINESS_CONTINUITY',
    family: 'Testing & Validation',
    criticality: ControlCriticality.HIGH,
    priority: 2,
    requirements: 'Tabletop exercise: Quarterly. Technical failover: Semi-annual (per critical system). Full-scale simulation: Annually. Document test results including gaps found. Track remediation of identified gaps. Report test results to governance.',
    implementationGuidance: 'Test calendar with realistic scenarios. Scenario library (natural disaster, cyberattack, sabotage). Observer/evaluator team. Post-test debrief and report. Gap tracking in issue tracker. Escalation of critical gaps to CISO/CTO.',
    evidenceRequirements: [
      'Test calendar (current year)',
      'Scenario library',
      'Test execution reports',
      'Gap findings log',
      'Remediation tracking',
      'Governance reporting'
    ],
    testingProcedures: 'Verify test schedule adherence. Review recent test report quality. Check gap remediation progress. Validate governance reporting.',
    reportingDeadline: 'TTE: Quarterly | Failover: Semi-annual | Full: Annual'
  },
  {
    controlId: 'ARTP-BC-003',
    controlRef: 'JORT-2023-45-Art-37',
    name: 'Backup and Recovery Operations',
    description: 'Maintain reliable backup operations for all critical data and configurations with verified restore capability, offsite storage, and encryption protection.',
    category: 'BUSINESS_CONTINUITY',
    family: 'Backup Operations',
    criticality: ControlCriticality.HIGH,
    priority: 2,
    requirements: 'Daily incremental backups, weekly full backups. Offsite replication (distance > 50km). Backup encryption (AES-256 minimum). Restore test: Monthly (random selection). RPO verification. Backup success monitoring and alerting.',
    implementationGuidance: 'Enterprise backup solution (Commvault, Veritas, Veeam). 3-2-1 backup strategy (3 copies, 2 media, 1 offsite). Immutable/worm backup for ransomware protection. Backup as a service (BaaS) for offsite. Automated restore testing.',
    evidenceRequirements: [
      'Backup policy and schedule',
      'Backup success reports',
      'Offsite storage arrangement',
      'Encryption configuration',
      'Restore test results',
      'Monitoring and alerting config'
    ],
    testingProcedures: 'Verify backup success rate. Test restore from backup (surprise exercise). Check offsite replication status. Validate encryption.',
    reportingDeadline: 'Backup: Daily | Restore test: Monthly | Offsite: Continuous'
  },
  {
    controlId: 'ARTP-BC-004',
    controlRef: 'JORT-2023-45-Art-38',
    name: 'Crisis Management Organization',
    description: 'Maintain structured crisis management organization with defined roles, escalation procedures, communication plans, and decision-making authority for major disruptions.',
    category: 'BUSINESS_CONTINUITY',
    family: 'Crisis Management',
    criticality: ControlCriticality.HIGH,
    priority: 2,
    requirements: 'Define Crisis Management Team (CMT) with alternates. Establish crisis levels (1-3) with triggers. Decision authority matrix. Internal/external communication plans. Media response procedure. Regular CMT exercises. Crisis room facilities.',
    implementationGuidance: 'CMT charter with clear authority. Crisis playbook per scenario. Pre-approved communication templates. Media training for spokespersons. War room setup (physical and virtual). Quarterly CMT meetings. Annual crisis simulation.',
    evidenceRequirements: [
      'CMT charter and roster',
      'Crisis level definitions',
      'Decision authority matrix',
      'Communication templates',
      'Media training records',
      'Exercise records'
    ],
    testingProcedures: 'Verify CMT roster currency. Test war room readiness. Review communication templates. Check exercise frequency.',
    reportingDeadline: 'Organization: Always ready | Exercises: Quarterly'
  },

  // ========================================
  // DOMAIN 8: REPORTING & DOCUMENTATION (6 controls)
  // ========================================
  {
    controlId: 'ARTP-RD-001',
    controlRef: 'JORT-2023-45-Art-40',
    name: 'Security Documentation Maintenance',
    description: 'Maintain comprehensive, current documentation of all security policies, procedures, configurations, and network diagrams required for ARTP inspections and audits.',
    category: 'REPORTING_COMPLIANCE',
    family: 'Documentation',
    criticality: ControlCriticality.HIGH,
    priority: 2,
    requirements: 'Documented Information Security Management System (ISMS). Policy review cycle (annual minimum). Procedure documents for all security processes. Network architecture diagrams (current). Configuration baseline documentation. Document version control. Readily accessible for ARTP inspection.',
    implementationGuidance: 'Centralized document management system (DMS). Document owner assignment. Review reminder workflow. Version control with change history. Classification marking. ARTP-specific document index. Annual document audit.',
    evidenceRequirements: [
      'ISMS document index',
      'Policy review schedule',
      'Sample policy documents',
      'Network diagrams (sanitized)',
      'Configuration baseline docs',
      'DMS access proof'
    ],
    testingProcedures: 'Verify document currency. Check review dates. Validate version control. Test ARTP document retrieval speed.',
    reportingDeadline: 'Documents: Always current | Review: Annual'
  },
  {
    controlId: 'ARTP-RD-002',
    controlRef: 'JORT-2023-45-Art-41',
    name: 'Security Metrics and KPI Reporting',
    description: 'Track, analyze, and report key security metrics and KPIs to demonstrate security posture, identify trends, and support decision-making for ARTP and internal stakeholders.',
    category: 'REPORTING_COMPLIANCE',
    family: 'Metrics & Reporting',
    criticality: ControlCriticality.MEDIUM,
    priority: 3,
    requirements: 'Defined security KPI framework (aligned with ARTP interests). Automated data collection where possible. Monthly metric calculation and trend analysis. Dashboard for real-time visibility. Quarterly executive report. Annual security posture assessment. ARTP-mandated metrics inclusion.',
    implementationGuidance: 'KPI definition: MTTD, MTTR, patch compliance, phishing click rate, training completion, etc. Data sources: SIEM, VM, phishing tool, LMS. BI tool for visualization (PowerBI, Tableau). Threshold-based alerting for KPI degradation. Benchmark against industry peers.',
    evidenceRequirements: [
      'KPI framework document',
      'Metric definitions and sources',
      'Dashboard screenshots',
      'Monthly/quarterly reports',
      'Trend analysis examples',
      'Benchmark comparisons'
    ],
    testingProcedures: 'Verify KPI calculation accuracy. Check data source integration. Validate dashboard freshness. Review trend analysis methodology.',
    reportingDeadline: 'Metrics: Monthly | Dashboard: Real-time | Executive: Quarterly'
  },
  {
    controlId: 'ARTP-RD-003',
    controlRef: 'JORT-2023-45-Art-42',
    name: 'Audit Facilitation and Evidence Provision',
    description: 'Facilitate ARTP audits and inspections by providing timely access to systems, documentation, evidence, and personnel as required.',
    category: 'REPORTING_COMPLIANCE',
    family: 'Audit Support',
    criticality: ControlCriticality.HIGH,
    priority: 2,
    requirements: 'Designated audit coordinator. Audit evidence repository (pre-collected). Remote access capability for ARTP auditors (secure). Personnel availability commitment. Finding response process (remediation plans within 30 days). Previous finding closure tracking.',
    implementationGuidance: 'Audit readiness program (continuous readiness). Evidence collection automation. Secure auditor workspace (physical/network). Audit response playbooks. Finding lifecycle management. Regular mock audits.',
    evidenceRequirements: [
      'Audit coordinator designation',
      'Evidence repository structure',
      'Remote access procedure',
      'Personnel availability policy',
      'Finding response procedure',
      'Mock audit records'
    ],
    testingProcedures: 'Test evidence retrieval speed. Verify remote access security. Review finding response timeliness. Check previous finding closure rate.',
    reportingDeadline: 'Readiness: Continuous | Response: Within 30 days'
  },
  {
    controlId: 'ARTP-RD-004',
    controlRef: 'JORT-2023-45-Art-43',
    name: 'Records Retention and Archival',
    description: 'Maintain security-relevant records for legally mandated periods with secure archival, retrieval capability, and proper disposal.',
    category: 'REPORTING_COMPLIANCE',
    family: 'Records Management',
    criticality: ControlCriticality.MEDIUM,
    priority: 3,
    requirements: 'Records retention schedule per regulation (security logs: 3 years, audit records: 7 years, etc.). Secure archival storage (immutable preferred). Indexed retrieval capability. Secure disposal (shredding, degaussing). Legal hold procedure. Retention exception documentation.',
    implementationGuidance: 'Records management policy with schedule. Archive system (WORM storage). Indexing/metadata for searchability. Disposal vendor with certificate of destruction. Legal hold coordination with Legal department. Annual retention compliance review.',
    evidenceRequirements: [
      'Retention schedule',
      'Archive system configuration',
      'Retrieval capability demo',
      'Disposal certificates',
      'Legal hold procedure',
      'Compliance review records'
    ],
    testingProcedures: 'Test retrieval of archived record. Verify disposal certificate existence. Check legal hold process. Review retention compliance.',
    reportingDeadline: 'Per schedule (varies by record type)'
  },
  {
    controlId: 'ARTP-RD-005',
    controlRef: 'JORT-2023-45-Art-44',
    name: 'Security Awareness Training Records',
    description: 'Maintain comprehensive records of security awareness training completion for all employees and contractors, demonstrating compliance with ARTP training requirements.',
    category: 'REPORTING_COMPLIANCE',
    family: 'Training Records',
    criticality: ControlCriticality.MEDIUM,
    priority: 3,
    requirements: 'Training completion records for all personnel. Curriculum content documentation. Assessment scores (where applicable). Refresher training schedule (annual). Role-based specialized training records. Contractor training verification. Completion rate reporting.',
    implementationGuidance: 'Learning Management System (LMS) integration. Automated enrollment and reminders. Completion tracking dashboard. Manager visibility into team completion. Export capability for audit. Annual training needs assessment.',
    evidenceRequirements: [
      'LMS configuration',
      'Training curriculum outline',
      'Completion reports (aggregate)',
      'Assessment pass rates',
      'Specialized training list',
      'Contractor verification process'
    ],
    testingProcedures: 'Verify LMS data accuracy. Check completion rate calculation. Test export functionality. Review curriculum currency.',
    reportingDeadline: 'Tracking: Continuous | Annual training: Per employee anniversary'
  },
  {
    controlId: 'ARTP-RD-006',
    controlRef: 'JORT-2023-45-Art-45',
    name: 'Continuous Improvement Documentation',
    description: 'Document security improvements, lessons learned, and optimization initiatives to demonstrate mature security program evolution to ARTP.',
    category: 'REPORTING_COMPLIANCE',
    family: 'Improvement Tracking',
    criticality: ControlCriticality.LOW,
    priority: 4,
    requirements: 'Security improvement roadmap. Initiative tracking with status. Lessons learned repository. Industry benchmarking participation. Best practice adoption log. maturity model assessments (annual). Investment justification for security projects.',
    implementationGuidance: 'Project portfolio for security initiatives. Lessons learned database (post-incident, post-exercise). Participation in industry forums (GSMA, FTSA-CFI). Maturity assessment using CMMI or custom model. Business case templates for security investments.',
    evidenceRequirements: [
      'Improvement roadmap',
      'Initiative tracker',
      'Lessons learned entries',
      'Forum participation records',
      'Maturity assessment results',
      'Business case examples'
    ],
    testingProcedures: 'Verify initiative tracking currency. Review lessons learned quality. Check maturity assessment recency. Validate roadmap alignment with strategy.',
    reportingDeadline: 'Roadmap: Annual refresh | Tracking: Continuous'
  }
];

// Total: 50 ARTP controls across 8 domains

// Helper functions
export function getArtpControlById(controlId: string): ArtpControlDefinition | undefined {
  return ARTP_CONTROLS.find(c => c.controlId === controlId);
}

export function getArtpControlsByCategory(category: string): ArtpControlDefinition[] {
  return ARTP_CONTROLS.filter(c => c.category === category);
}

export function getArtpControlsByCriticality(criticality: ControlCriticality): ArtpControlDefinition[] {
  return ARTP_CONTROLS.filter(c => c.criticality === criticality);
}

export function getArtpControlCount(): number {
  return ARTP_CONTROLS.length;
}

export function getArtpCategories(): string[] {
  return [...new Set(ARTP_CONTROLS.map(c => c.category))];
}
