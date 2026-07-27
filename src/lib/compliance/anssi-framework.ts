/**
 * ANSSI (Agence nationale de la sécurité des systèmes d'information) 
 * Alignment Framework for Djezzy Algeria SOC Platform
 * 
 * This module provides mapping between ARTP requirements and ANSSI standards:
 * - PSSI: Politique de Sécurité des Systèmes d'Information
 * - EBIOS: Méthode de gestion des risques
 * - RGS: Référentiel Général de Sécurité
 * - SecNumCloud: Cloud Security
 * - PASSI/ESS: Security Auditors and Experts
 * 
 * Algeria often references ANSSI standards as best practice benchmarks.
 * 
 * @version 1.0.0
 * @module compliance/anssi-framework
 */

import { AnssiDomain, MappingStrength, AnssiImplementationStatus, AnssiCertLevel } from '@prisma/client';

// ============================================================
// ANSSI Framework Configuration
// ============================================================

export const ANSSI_FRAMEWORK = {
  id: 'anssi-france-alignment',
  name: 'anssi-best-practices',
  displayName: 'ANSSI Cybersecurity Best Practices Alignment',
  description: 'Alignment of Djezzy security controls with French ANSSI (Agence nationale de la sécurité des systèmes d\'information) standards and methodologies, serving as international best practice benchmark for Algerian telecom security.',
  version: '2024.1',
  issuingBody: 'ANSSI - Agence nationale de la sécurité des systèmes d\'information',
  jurisdiction: 'FR', // Reference standard from France
  documentationUrl: 'https://www.ssi.gouv.fr/',
  
  // Domains covered
  domains: [
    { id: 'PSSI', name: 'Security Policy (PSSI)', description: 'Information System Security Policy framework' },
    { id: 'EBIOS', name: 'Risk Management (EBIOS)', description: 'Risk assessment methodology' },
    { id: 'RGS', name: 'General Security Reference (RGS)', description: 'Technical security requirements' },
    { id: 'SEC_NUM_CLOUD', name: 'Cloud Security (SecNumCloud)', description: 'Cloud service provider security qualification' },
    { id: 'PASSI', name: 'Security Auditors (PASSI)', description: 'Information system security audit service providers' },
    { id: 'ESS', name: 'Security Experts (ESS)', description: 'Expert consultants in information system security' },
    { id: 'DETECTION', name: 'Incident Detection', description: 'Detection of security events and incidents' },
    { id: 'RESPONSE', name: 'Incident Response', description: 'Response to computer attacks and incidents' }
  ] as const
};

// ============================================================
// ANSSI Alignment Definitions
// ============================================================

export interface AnssiAlignmentDefinition {
  id: string;
  anssiReference: string;
  anssiDomain: AnssiDomain;
  anssiCategory: string;
  title: string;
  description: string;
  requirements: string;
  implementationGuidance: string;
  evidenceRequirements: string[];
  artpMapping: string[]; // Related ARTP control IDs
  certRelevant: boolean;
  certLevel?: AnssiCertLevel;
}

export const ANSSI_ALIGNMENTS: AnssiAlignmentDefinition[] = [
  // ========================================
  // DOMAIN: PSSI (Politique de Sécurité des SI)
  // ========================================
  {
    id: 'ANSSI-PSSI-001',
    anssiReference: 'PSSI-DIR-001',
    anssiDomain: AnssiDomain.PSSI,
    anssiCategory: 'Governance',
    title: 'Security Policy Governance',
    description: 'Establish formal Information System Security Policy (PSSI) approved by executive management, defining security objectives, principles, and organizational structure.',
    requirements: 'Documented PSSI with executive approval. Clear security objectives aligned with business goals. Defined security organization and roles. Annual review and update cycle. Communication to all personnel.',
    implementationGuidance: 'Develop PSSI document following ANSSI template. Obtain CEO/Board approval. Define ISSM (Information System Security Manager) role. Distribute and acknowledge receipt. Review annually or after significant changes.',
    evidenceRequirements: [
      'Approved PSSI document',
      'Executive approval record',
      'ISSM job description',
      'Distribution/acknowledgment records',
      'Review meeting minutes'
    ],
    artpMapping: ['ARTP-RD-001'],
    certRelevant: true,
    certLevel: AnssiCertLevel.BASIC
  },
  {
    id: 'ANSSI-PSSI-002',
    anssiReference: 'PSSI-ORG-001',
    anssiDomain: AnssiDomain.PSSI,
    anssiCategory: 'Organization',
    title: 'Security Organization Structure',
    description: 'Define clear security organization with dedicated resources, reporting lines, and coordination mechanisms across the enterprise.',
    requirements: 'Dedicated security function (CISO/team). Reporting line to executive management. Security committee with cross-functional representation. Defined responsibilities per role. Adequate budget and resources.',
    implementationGuidance: 'Establish CISO position reporting to CEO/CTO. Build security team with required competencies. Create cross-functional security committee. Document RACI matrix. Secure budget allocation.',
    evidenceRequirements: [
      'Org chart showing security function',
      'CISO job description',
      'Committee charter and membership',
      'RACI matrix',
      'Budget allocation'
    ],
    artpMapping: ['ARTP-IM-003', 'ARTP-DP-006'],
    certRelevant: true,
    certLevel: AnssiCertLevel.STANDARD
  },
  {
    id: 'ANSSI-PSSI-003',
    anssiReference: 'PSSI-SENS-001',
    anssiDomain: AnssiDomain.PSSI,
    anssiCategory: 'Sensitivity Classification',
    title: 'Information Classification Scheme',
    description: 'Implement information classification scheme defining sensitivity levels, handling requirements, and protective measures for each classification.',
    requirements: 'Defined classification levels (typically 4). Classification criteria and examples. Handling procedures per level. Labeling standards. Training on classification. Periodic compliance verification.',
    implementationGuidance: 'Adopt 4-level model (Public/Internal/Confidential/Secret). Develop classification guide with examples. Implement labeling (physical/digital). Include in security awareness training. Audit classification compliance.',
    evidenceRequirements: [
      'Classification policy',
      'Classification guide with examples',
      'Handling procedures per level',
      'Labeling standards',
      'Training materials',
      'Audit results'
    ],
    artpMapping: ['ARTP-DP-001', 'ARTP-DP-004'],
    certRelevant: true,
    certLevel: AnssiCertLevel.STANDARD
  },

  // ========================================
  // DOMAIN: EBIOS (Risk Management Methodology)
  // ========================================
  {
    id: 'ANSSI-EBIOS-001',
    anssiReference: 'EBIOS-RISK-001',
    anssiDomain: AnssiDomain.EBIOS,
    anssiCategory: 'Risk Assessment',
    title: 'Structured Risk Assessment Process',
    description: 'Implement EBIOS risk methodology for systematic identification, evaluation, and treatment of information security risks.',
    requirements: 'Documented risk assessment methodology. Risk register maintained current. Regular risk assessments (annual minimum). Risk ownership assignment. Risk treatment planning and tracking. Integration with business continuity.',
    implementationGuidance: 'Adopt EBIOS 2023 methodology. Conduct workshops with business stakeholders. Use risk scoring matrix (likelihood x impact). Maintain risk register in GRC tool. Quarterly risk reviews. Annual comprehensive assessment.',
    evidenceRequirements: [
      'Risk assessment methodology document',
      'Current risk register',
      'Risk assessment workshop records',
      'Treatment plan status',
      'Risk review meeting minutes'
    ],
    artpMapping: ['ARTP-IM-006', 'ARTP-BC-001'],
    certRelevant: true,
    certLevel: AnssiCertLevel.ADVANCED
  },
  {
    id: 'ANSSI-EBIOS-002',
    anssiReference: 'EBIOS-ASSET-001',
    anssiDomain: AnssiDomain.EBIOS,
    anssiCategory: 'Asset Management',
    title: 'Asset Identification and Valuation',
    description: 'Maintain comprehensive inventory of information assets with business value, sensitivity classification, and ownership assignment.',
    requirements: 'Asset inventory covering all critical assets. Business impact values assigned. Owner/stewardship defined. Classification applied. Regular inventory reconciliation (quarterly). New asset onboarding process.',
    implementationGuidance: 'Deploy asset management tool/CMDB. Define asset valuation criteria. Assign owners per business unit. Integrate classification into asset creation workflow. Automated discovery where possible. Quarterly owner attestation.',
    evidenceRequirements: [
      'Asset inventory (sample)',
      'Valuation methodology',
      'Owner assignment list',
      'Classification coverage stats',
      'Reconciliation procedure'
    ],
    artpMapping: ['ARTP-DP-001', 'ARTP-NS-002'],
    certRelevant: false
  },
  {
    id: 'ANSSI-EBIOS-003',
    anssiReference: 'EBIOS-Threat-001',
    anssiDomain: AnssiDomain.EBIOS,
    anssiCategory: 'Threat Assessment',
    title: 'Threat Modeling and Assessment',
    description: 'Conduct systematic threat modeling identifying potential threat actors, attack vectors, and scenarios relevant to telecom infrastructure.',
    requirements: 'Defined threat actor profiles (nation-state, cybercrime, insider, etc.). Attack scenario library. Threat intelligence integration. Telecom-specific threats (SS7, signaling fraud). Regular threat landscape updates.',
    implementationGuidance: 'Build telecom-specific threat model. Include APT groups targeting telecom sector. Subscribe to threat intel feeds (commercial + government). Participate in ISACs. Quarterly threat briefings.',
    evidenceRequirements: [
      'Threat actor profiles',
      'Attack scenario catalog',
      'Threat intelligence sources',
      'Telecom threat specifics',
      'Threat briefing materials'
    ],
    artpMapping: ['ARTP-IM-001', 'ARTP-NS-003', 'ARTP-FP-001'],
    certRelevant: true,
    certLevel: AnssiCertLevel.EXPERT
  },

  // ========================================
  // DOMAIN: RGS (Référentiel Général de Sécurité)
  // ========================================
  {
    id: 'ANSSI-RGS-001',
    anssiReference: 'RGS-AUTH-001',
    anssiDomain: AnssiDomain.RGS,
    anssiCategory: 'Authentication',
    title: 'Strong Authentication Requirements',
    description: 'Implement multi-factor authentication for privileged access and sensitive systems following RGS authentication guidelines.',
    requirements: 'MFA for all administrative access. MFA for remote access. Strong password policy (min 12 chars, complexity). Account lockout after failed attempts. Session timeout. Privileged access management (PAM).',
    implementationGuidance: 'Deploy MFA solution (hardware token, TOTP, FIDO2). Integrate with identity provider. Enforce MFA for VPN, admin consoles, sensitive apps. PAM for shared/root accounts. Password manager encouragement.',
    evidenceRequirements: [
      'Authentication policy',
      'MFA deployment scope',
      'Password policy settings',
      'PAM configuration',
      'Session timeout settings'
    ],
    artpMapping: ['ARTP-NS-001', 'ARTP-LI-003'],
    certRelevant: true,
    certLevel: AnssiCertLevel.STANDARD
  },
  {
    id: 'ANSSI-RGS-002',
    anssiReference: 'RGS-CRYPTO-001',
    anssiDomain: AnssiDomain.RGS,
    anssiCategory: 'Cryptography',
    title: 'Cryptographic Controls',
    description: 'Use approved cryptographic algorithms and key lengths per RGS recommendations, with proper key management practices.',
    requirements: 'Approved algorithms only (AES-256, RSA-3072+, SHA-256+). No deprecated algorithms (DES, MD5, SHA1). Key management procedure. HSM for root keys. Certificate lifecycle management. Crypto-agility roadmap.',
    implementationGuidance: 'Inventory all crypto usage. Deprecate weak algorithms. Deploy HSM for PKI root keys. Automate certificate lifecycle. Plan post-quantum crypto migration. Regular crypto audit.',
    evidenceRequirements: [
      'Crypto policy (approved algos)',
      'Algorithm inventory',
      'Key management procedure',
      'HSM deployment proof',
      'Certificate management process'
    ],
    artpMapping: ['ARTP-NS-003', 'ARTP-SP-002', 'ARTP-LI-004'],
    certRelevant: true,
    certLevel: AnssiCertLevel.ADVANCED
  },
  {
    id: 'ANSSI-RGS-003',
    anssiReference: 'RGS-LOG-001',
    anssiDomain: AnssiDomain.RGS,
    anssiCategory: 'Logging',
    title: 'Security Event Logging',
    description: 'Implement comprehensive security logging across all systems with centralized collection, protection, and analysis capabilities.',
    requirements: 'Log all security-relevant events. Centralized log management (SIEM). Log integrity protection. Retention per legal requirement (min 12 months). Log review procedures. Alerting on critical events.',
    implementationGuidance: 'Define logging standards per system type. Forward logs to SIEM. Implement log integrity (hashing/WORM). Storage with appropriate retention. Daily review of high-severity alerts. Monthly log analysis reports.',
    evidenceRequirements: [
      'Logging policy and standards',
      'SIEM architecture',
      'Log source coverage report',
      'Integrity protection method',
      'Retention configuration',
      'Review procedures'
    ],
    artpMapping: ['ARTP-IM-001', 'ARTP-NS-007', 'ARTP-LI-005'],
    certRelevant: true,
    certLevel: AnssiCertLevel.STANDARD
  },
  {
    id: 'ANSSI-RGS-004',
    anssiReference: 'RGS-NETWORK-001',
    anssiDomain: AnssiDomain.RGS,
    anssiCategory: 'Network Security',
    title: 'Network Security Architecture',
    description: 'Design and operate network infrastructure following defense-in-depth principles with proper segmentation, monitoring, and access control.',
    requirements: 'Network segmentation by sensitivity. Firewall at boundaries. IDS/IPS deployment. Network monitoring. Secure remote access. Wireless security. SDN security policies.',
    implementationGuidance: 'Zone-based architecture (DMZ, internal, data). Next-gen firewalls. Micro-segmentation for data centers. NDR for east-west traffic. Zero-trust network access (ZTNA). Regular architecture reviews.',
    evidenceRequirements: [
      'Network architecture diagram',
      'Segmentation design',
      'Firewall rule sets',
      'IDS/IPS placement',
      'Remote access security',
      'Wireless security config'
    ],
    artpMapping: ['ARTP-NS-002', 'ARTP-NS-005', 'ARTP-NS-006'],
    certRelevant: true,
    certLevel: AnssiCertLevel.ADVANCED
  },
  {
    id: 'ANSSI-RGS-005',
    anssiReference: 'RGS-SECOP-001',
    anssiDomain: AnssiDomain.RGS,
    anssiCategory: 'Operational Security',
    title: 'Secure Operations Procedures',
    description: 'Establish secure operational procedures for change management, incident response, vulnerability management, and backup operations.',
    requirements: 'Change management with security review. Vulnerability management SLAs. Backup and recovery tested. Incident response procedures. Security monitoring 24/7. Supplier security management.',
    implementationGuidance: 'ITSM-integrated change advisory board. VM program with risk-based prioritization. 3-2-1 backup strategy. IR playbooks per scenario. SOC operations runbooks. Vendor security assessments.',
    evidenceRequirements: [
      'Change management procedure',
      'VM SLA definitions',
      'Backup policy and test results',
      'IR playbook library',
      'SOC operations manual',
      'Vendor assessment process'
    ],
    artpMapping: ['ARTP-NS-008', 'ARTP-BC-001', 'ARTP-BC-003', 'ARTP-IM-002'],
    certRelevant: true,
    certLevel: AnssiCertLevel.STANDARD
  },

  // ========================================
  // DOMAIN: SecNumCloud (Cloud Security)
  // ========================================
  {
    id: 'ANSSI-SNC-001',
    anssiReference: 'SecNumCloud-PROV-001',
    anssiDomain: AnssiDomain.SEC_NUM_CLOUD,
    anssiCategory: 'Provider Qualification',
    title: 'Cloud Service Provider Security Qualification',
    description: 'Ensure cloud service providers meet security requirements through formal qualification (SecNumCloud equivalent) or equivalent assessment.',
    requirements: 'Cloud provider security assessment. Data residency verification. SLA including security terms. Right to audit clause. Incident notification requirements. Exit strategy defined.',
    implementationGuidance: 'Maintain qualified cloud provider list. Conduct due diligence before engagement. Include security requirements in contracts. Regular provider reviews. Multi-cloud strategy for resilience. Data classification for cloud placement.',
    evidenceRequirements: [
      'Qualified provider list',
      'Assessment criteria',
      'Contract security clauses',
      'Provider review records',
      'Data residency confirmation',
      'Exit plan documentation'
    ],
    artpMapping: ['ARTP-DP-005'],
    certRelevant: true,
    certLevel: AnssiCertLevel.BASIC
  },
  {
    id: 'ANSSI-SNC-002',
    anssiReference: 'SecNumCloud-DATA-001',
    anssiDomain: AnssiDomain.SEC_NUM_CLOUD,
    anssiCategory: 'Data Protection in Cloud',
    title: 'Cloud Data Protection Controls',
    description: 'Implement encryption, access control, and data loss prevention for data stored and processed in cloud environments.',
    requirements: 'Encryption at rest (customer-managed keys preferred). Encryption in transit. Cloud access security broker (CASB). DLP for sensitive data. API security. Container/image security if applicable.',
    implementationGuidance: 'Customer-managed encryption keys (BYOK). TLS 1.3 for all connections. CASB deployment for SaaS. DLP policies for cloud storage. API gateway with authentication. Image scanning pipeline.',
    evidenceRequirements: [
      'Encryption configuration (cloud)',
      'CASB/DLP policies',
      'Access control configuration',
      'API security measures',
      'Container security (if applicable)',
      'Data flow diagrams (cloud)'
    ],
    artpMapping: ['ARTP-DP-001', 'ARTP-SP-001'],
    certRelevant: true,
    certLevel: AnssiCertLevel.STANDARD
  },

  // ========================================
  // DOMAIN: Detection & Response
  // ========================================
  {
    id: 'ANSSI-DET-001',
    anssiReference: 'DETECT-SIEM-001',
    anssiDomain: AnssiDomain.DETECTION,
    anssiCategory: 'SIEM & Correlation',
    title: 'Security Information and Event Management',
    description: 'Operate SIEM platform with comprehensive log correlation, threat detection rules, and real-time alerting capabilities.',
    requirements: 'Centralized log collection from all sources. Correlation rules for known attack patterns. Custom rules for telecom-specific threats. Alert triage and investigation workflow. Dashboard and reporting. Tuning program for quality.',
    implementationGuidance: 'Enterprise SIEM (Splunk, QRadar, Sentinel). Integration with all NEs and security tools. MITRE ATT&CK based detection logic. SOAR integration for automation. Analyst-led tuning sprints.',
    evidenceRequirements: [
      'SIEM architecture and coverage',
      'Correlation rule library',
      'Telecom-specific rules',
      'Alert workflow definition',
      'Dashboard examples',
      'Tuning metrics (FP rate)'
    ],
    artpMapping: ['ARTP-IM-001', 'ARTP-RGS-003'],
    certRelevant: true,
    certLevel: AnssiCertLevel.STANDARD
  },
  {
    id: 'ANSSI-DET-002',
    anssiReference: 'DETECT-THREAT-INT-001',
    anssiDomain: AnssiDomain.DETECTION,
    anssiCategory: 'Threat Intelligence',
    title: 'Threat Intelligence Program',
    description: 'Maintain threat intelligence capability collecting, processing, and operationalizing indicators of compromise and threat context.',
    requirements: 'TI feeds from multiple sources. IOC extraction and enrichment. TI integration with security tools. Threat hunting program. Intelligence sharing (ISACs). Regular threat briefings.',
    implementationGuidance: 'Commercial TI platform (Recorded Future, MISP). Government sharing (CERT-DZ). Internal IOC development. Dedicated threat hunter(s). Bi-weekly threat briefings. ISAC participation.',
    evidenceRequirements: [
      'TI platform and feed list',
      'IOC integration examples',
      'Hunting mission reports',
      'Briefing presentations',
      'Sharing participation records',
      'TI metrics (IOCs actioned)'
    ],
    artpMapping: ['ARTP-IM-008', 'ARTP-FP-001'],
    certRelevant: false
  },
  {
    id: 'ANSSI-RESP-001',
    anssiReference: 'RESP-IR-001',
    anssiDomain: AnssiDomain.RESPONSE,
    anssiCategory: 'Incident Response',
    title: 'Computer Security Incident Response Team (CSIRT)',
    description: 'Establish and maintain CSIRT capability following ANSSI recommendations for incident response processes, procedures, and capabilities.',
    requirements: 'CSIRT charter and authority. Incident response procedures (detection to closure). Communication templates. Forensic capability. Threat intelligence integration. Regular exercises. Coordination with external parties.',
    implementationGuidance: 'Formal CSIRT establishment. Playbook library per incident type. IR platform (case management). Forensics toolkit and training. Tabletop and technical exercises quarterly. External coordination agreements.',
    evidenceRequirements: [
      'CSIRT charter',
      'IR playbook library',
      'Forensic toolkit inventory',
      'Exercise records',
      'External coordination docs',
      'Case management tool'
    ],
    artpMapping: ['ARTP-IM-002', 'ARTP-IM-003', 'ARTP-IM-006', 'ARTP-IM-007'],
    certRelevant: true,
    certLevel: AnssiCertLevel.ADVANCED
  },
  {
    id: 'ANSSI-RESP-002',
    anssiReference: 'RESP-CRISIS-001',
    anssiDomain: AnssiDomain.RESPONSE,
    anssiCategory: 'Crisis Management',
    title: 'Security Crisis Management',
    description: 'Implement crisis management framework for major security events with defined escalation, communication, and decision-making processes.',
    requirements: 'Crisis levels and triggers. Crisis team composition. Escalation matrix. Communication plans (internal/external/media). Decision log. Post-crisis review process. War room facilities.',
    implementationGuidance: '3-level crisis model (1/2/3). Pre-defined crisis team with alternates. Phone/email tree for activation. Pre-approved statements for common scenarios. After-action review methodology. Physical/virtual war room.',
    evidenceRequirements: [
      'Crisis level definitions',
      'Crisis team roster',
      'Escalation matrix',
      'Communication templates',
      'Decision log template',
      'War room setup'
    ],
    artpMapping: ['ARTP-BC-004', 'ARTP-IM-007'],
    certRelevant: true,
    certLevel: AnssiCertLevel.STANDARD
  }
];

// Total: 18 ANSSI alignments

// Helper functions
export function getAnssiAlignmentById(id: string): AnssiAlignmentDefinition | undefined {
  return ANSSI_ALIGNMENTS.find(a => a.id === id);
}

export function getAnssiAlignmentsByDomain(domain: AnssiDomain): AnssiAlignmentDefinition[] {
  return ANSSI_ALIGNMENTS.filter(a => a.ansiDomain === domain);
}

export function getAnssiAlignmentCount(): number {
  return ANSSI_ALIGNMENTS.length;
}

// Cross-reference functions
export function getAnssiAlignmentsForArtpControl(artpControlId: string): AnssiAlignmentDefinition[] {
  return ANSSI_ALIGNMENTS.filter(a => a.artpMapping.includes(artpControlId));
}

export function getArtpControlsForAnssiAlignment(anssiId: string): string[] {
  const alignment = ANSSI_ALIGNMENTS.find(a => a.id === ansiId);
  return alignment?.artpMapping || [];
}
