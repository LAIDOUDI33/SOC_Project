/**
 * Algerian National CSIRT Threat Sharing Integration
 * Djezzy National SOC Platform
 * 
 * Interface for sharing threat intelligence with the national
 * Computer Security Incident Response Team (CSIRT)
 */

// ============================================================
// Type Definitions
// ============================================================

export interface ThreatIntelligence {
  id: string
  type: 'ioc' | 'campaign' | 'vulnerability' | 'malware' | 'ttp'
  classification: 'public' | 'restricted' | 'confidential'
  priority: 'critical' | 'high' | 'medium' | 'low'
  
  // Core content
  title: string
  description: string
  technicalDetails?: Record<string, unknown>
  
  // Indicators (for IOC type)
  indicators?: Array<{
    type: 'ip' | 'domain' | 'url' | 'hash-md5' | 'hash-sha1' | 'hash-sha256' | 'email' | 'msisdn' | 'imsi'
    value: string
    confidence: number
    source: string
    firstSeen: Date
    lastSeen: Date
    tags: string[]
  }>
  
  // Campaign info
  campaignInfo?: {
    name: string
    actor: string
    targetSector: string[]
    targetGeography: string[]
    timeline: {
      firstActivity: Date
      lastActivity: Date
      status: 'active' | 'dormant' | 'concluded'
    }
    mitreTechniques: string[]
  }
  
  // Metadata
  metadata: {
    submittedBy: string
    organization: string
    submittedAt: Date
    lastUpdated: Date
    version: number
    language: 'fr' | 'en' | 'ar'
    tlp: 'WHITE' | 'GREEN' | 'AMBER' | 'RED'
  }
  
  // Relationships
  relatedIndicators?: string[]
  relatedCampaigns?: string[]
  references?: Array<{
    title: string
    url: string
    source: string
  }>
}

export interface CSIRTSubmissionResult {
  success: boolean
  ticketId: string
  receivedAt: Date
  processingStatus: 'received' | 'validated' | 'published' | 'rejected'
  publishedAt?: Date
  visibility: 'national' | 'sector' | 'organization'
  message?: string
}

export interface CSIRTConfig {
  endpoint: string
  apiKey: string
  organizationId: string
  autoPublishThreshold: 'low' | 'medium' | 'high'
}

// ============================================================
// National CSIRT Integration Class
// ============================================================

export class NationalCSIRT {
  private static instance: NationalCSIRT
  private config: CSIRTConfig

  private constructor() {
    this.config = {
      endpoint: process.env.CSIRT_API_URL || 'https://csirt.cerist.dz/api/v1',
      apiKey: process.env.CSIRT_API_KEY || '',
      organizationId: process.env.ORGANIZATION_ID || 'DJEZZY-TELCO',
      autoPublishThreshold: (process.env.CSIRT_AUTO_PUBLISH || 'high') as 'low' | 'medium' | 'high'
    }
  }

  public static getInstance(): NationalCSIRT {
    if (!NationalCSIRT.instance) {
      NationalCSIRT.instance = new NationalCSIRT()
    }
    return NationalCSIRT.instance
  }

  /**
   * Submit threat intelligence to National CSIRT
   */
  async submitThreatIntel(threat: ThreatIntelligence): Promise<CSIRTSubmissionResult> {
    console.log(`[CSIRT] Submitting ${threat.type}: ${threat.title}`)

    try {
      // Validate submission
      this.validateThreatIntel(threat)

      // Prepare payload
      const payload = {
        ...this.formatForSubmission(threat),
        organization_id: this.config.organizationId,
        submitted_at: new Date().toISOString()
      }

      // In production, make API call:
      // const response = await fetch(`${this.config.endpoint}/intelligence`, {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${this.config.apiKey}`,
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify(payload)
      // });

      // Determine if should be auto-published based on priority
      const shouldAutoPublish = this.shouldAutoPublish(threat.priority)

      // Simulate successful submission
      const result: CSIRTSubmissionResult = {
        success: true,
        ticketId: `CERT-DZ-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        receivedAt: new Date(),
        processingStatus: shouldAutoPublish ? 'published' : 'validated',
        publishedAt: shouldAutoPublish ? new Date() : undefined,
        visibility: this.getVisibilityFromClassification(threat.classification),
        message: shouldAutoPublish 
          ? 'Threat intelligence published to the community.'
          : 'Threat intelligence received and is under review.'
      }

      console.log(`[CSIRT] Submission successful. Ticket: ${result.ticketId}`)
      
      return result

    } catch (error) {
      console.error('[CSIRT] Submission failed:', error)
      throw new Error(`CSIRT submission error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Query threat intelligence from National CSIRT
   */
  async queryThreatIntel(options: {
    type?: ThreatIntelligence['type']
    indicatorType?: string
    indicatorValue?: string
    dateRange?: { start: Date; end: Date }
    limit?: number
  } = {}): Promise<ThreatIntelligence[]> {
    console.log('[CSIRT] Querying threat intelligence')

    // Mock response with relevant threat data for Algeria/telecom sector
    return [
      {
        id: 'THREAT-001',
        type: 'campaign',
        classification: 'restricted',
        priority: 'high',
        title: 'APT Targeting North African Telecom Operators',
        description: 'Advanced persistent threat group targeting telecommunications providers in North Africa, specifically focusing on SS7/Diameter protocol exploitation and subscriber data exfiltration.',
        campaignInfo: {
          name: 'Operation Desert Storm',
          actor: 'APT-NORTH-AFRICA-1',
          targetSector: ['telecommunications', 'government'],
          targetGeography: ['DZ', 'TN', 'MA', 'MA'],
          timeline: {
            firstActivity: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
            lastActivity: new Date(),
            status: 'active'
          },
          mitreTechniques: ['T1566', 'T1190', 'T1078', 'T1119', 'T1027', 'T1048']
        },
        metadata: {
          submittedBy: 'National CSIRT Analysis Team',
          organization: 'CERIST',
          submittedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          lastUpdated: new Date(),
          version: 3,
          language: 'en',
          tlp: 'AMBER'
        },
        indicators: [
          { type: 'ip', value: '185.220.101.45', confidence: 85, source: 'C2 Infrastructure', firstSeen: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), lastSeen: new Date(), tags: ['c2', 'malware'] },
          { type: 'domain', value: 'telecom-update.dz-customer.com', confidence: 92, source: 'Phishing Kit', firstSeen: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000), lastSeen: new Date(), tags: ['phishing', 'credential-harvesting'] },
          { type: 'hash-sha256', value: 'a1b2c3d4e5f6789012345678901234abcd5678901234abcd5678901234abcd', confidence: 95, source: 'Malware Sample', firstSeen: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000), lastSeen: new Date(), tags: ['rat', 'remote-access-trojan'] }
        ],
        references: [
          { title: 'North Africa Telecom Threat Report Q1 2024', url: '#', source: 'Internal Analysis' },
          { title: 'MITRE ATT&CK - Operation Desert Storm', url: 'https://attack.mitre.org/groups/G0014', source: 'MITRE' }
        ]
      },
      {
        id: 'THREAT-002',
        type: 'ioc',
        classification: 'public',
        priority: 'medium',
        title: 'SS7 Diameter Attack Indicators - Algeria Focus',
        description: 'Collection of known malicious indicators related to SS7/Diameter signaling attacks targeting Algerian mobile networks.',
        indicators: [
          { type: 'ip', value: '91.121.87.102', confidence: 75, source: 'Honeypot Detection', firstSeen: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), lastSeen: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), tags: ['ss7-probe', 'scanning'] },
          { type: 'ip', value: '198.51.100.23', confidence: 68, source: 'Community Feed', firstSeen: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), lastSeen: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), tags: ['ss7-attack'] },
          { type: 'imsi', value: '603029900000001', confidence: 90, source: 'Fraud Investigation', firstSeen: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), lastSeen: new Date(), tags: ['compromised-sim', 'fraud'] }
        ],
        metadata: {
          submittedBy: 'SOC Threat Intel Team',
          organization: 'Djezzy',
          submittedAt: new Date(),
          lastUpdated: new Date(),
          version: 1,
          language: 'en',
          tlp: 'WHITE'
        }
      },
      {
        id: 'THREAT-003',
        type: 'vulnerability',
        classification: 'restricted',
        priority: 'critical',
        title: 'Critical Vulnerability in HLR/HSS Equipment',
        description: 'Remote code execution vulnerability identified in common HLR/HSS equipment used by Algerian MNOs. Active exploitation observed.',
        technicalDetails: {
          cveId: 'CVE-2024-XXXX',
          cvssScore: 9.8,
          affectedVendors: ['Vendor-A', 'Vendor-B'],
          affectedProducts: ['HLR v8.x', 'HSS v3.x'],
          patchAvailable: false,
          exploitCodeAvailable: true,
          activeExploitation: true
        },
        campaignInfo: {
          name: 'Unknown APT',
          actor: 'Unattributed',
          targetSector: ['telecommunications'],
          targetGeography: ['DZ'],
          timeline: {
            firstActivity: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
            lastActivity: new Date(),
            status: 'active'
          },
          mitreTechniques: ['T1190', 'T1210']
        },
        metadata: {
          submittedBy: 'Vulnerability Management Team',
          organization: 'Djezzy SOC',
          submittedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          lastUpdated: new Date(),
          version: 2,
          language: 'en',
          tlp: 'AMBER'
        }
      }
    ]
  }

  /**
   * Request urgent consultation from CSIRT
   */
  async requestConsultation(request: {
    subject: string
    severity: 'urgent' | 'high' | 'normal'
    category: 'incident-response' | 'threat-analysis' | 'technical-assistance' | 'coordination'
    description: string
    assignedAnalyst?: string
    contactInfo: {
      name: string
      email: string
      phone: string
    }
    attachments?: Array<{ filename: string; content: Buffer; size: number }>
  }): Promise<{
    success: boolean
    consultationId: string
    estimatedResponseTime: string
    escalationPath: string[]
  }> {
    console.log(`[CSIRT] Requesting ${request.severity} consultation: ${request.subject}`)

    return {
      success: true,
      consultationId: `CONSULT-${Date.now().toString(36).toUpperCase()}`,
      estimatedResponseTime: request.severity === 'urgent' ? '< 2 hours' : request.severity === 'high' ? '< 8 hours' : '< 48 hours',
      escalationPath: request.severity === 'urgent' 
        ? ['SOC Manager -> CISO -> National CSIRT Director']
        : ['SOC Team Lead -> National CSIRT Duty Officer']
    }
  }

  /**
   * Get latest advisories from National CSIRT
   */
  async getLatestAdvisories(options: {
    limit?: number
    type?: 'security-advisory' | 'alert' | 'bulletin' | 'vulnerability'
    sector?: string
  } = {}): Promise<Array<{
    id: string
    title: string
    type: string
    severity: 'info' | 'low' | 'medium' | 'high' | 'critical'
    publishedAt: Date
    summary: string
    affectedSystems?: string[]
    mitigation?: string
    references?: string[]
  }>> {
    console.log('[CSIRT] Fetching latest advisories')

    return [
      {
        id: 'ADV-2024-042',
        title: 'Alerte: Campagne de Phishing Cibercriminel Visant le Secteur Télécom Algérien',
        type: 'alert',
        severity: 'high',
        publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        summary: 'Une nouvelle campagne de phishing ciblant les employés des opérateurs télécoms algériens a été détectée. Les emails prétendent provenir du service IT interne et demandent la mise à jour des identifiants de connexion.',
        affectedSystems: ['Email corporatif', 'Portails web internes', 'VPN employee'],
        mitigation: 'Ne pas cliquer sur les liens suspects. Vérifier l\'expéditeur réel des emails. Activer l\'authentification à deux facteurs.',
        references: ['#', '#']
      },
      {
        id: 'ADV-2024-041',
        title: 'Bulletin: Vulnérabilité Critique dans les Équipements SS7',
        type: 'vulnerability',
        severity: 'critical',
        publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        summary: 'Une vulnérabilité critique permettant l\'exécution de code à distance a été identifiée dans plusieurs modèles d\'équipements SS7 utilisés par les opérateurs en Afrique du Nord.',
        affectedSystems: ['Équipements STP', 'Passerelles SS7', 'Firewalls signalisation'],
        mitigation: 'Contacter immédiatement le fournisseur pour les correctifs. Mettre en place des règles de pare-feu temporaires pour limiter l\'exposition.',
        references: ['#', '#']
      },
      {
        id: 'ADV-2024-040',
        title: 'Conseil: Bonnes Pratiques Sécurité pour les Opérateurs Mobiles',
        type: 'security-advisory',
        severity: 'info',
        publishedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        summary: 'Publication des recommandations mises à jour concernant la sécurité des réseaux mobiles, incluant les protocoles SS7/Diameter, la gestion des abonnés, et la détection de fraude.',
        mitigation: null,
        references: ['#']
      }
    ].slice(0, options.limit || 10)
  }

  // ============================================================
  // Private Methods
  // ============================================================

  private validateThreatIntel(threat: ThreatIntelligence): void {
    if (!threat.id) throw new Error('Threat ID is required')
    if (!threat.title) throw new Error('Title is required')
    if (!threat.type) throw new Error('Threat type is required')
    if (!threat.description) throw new Error('Description is required')
    if (!threat.metadata?.submittedBy) throw new Error('Submitter information is required')

    // Validate TLP level
    const validTLP = ['WHITE', 'GREEN', 'AMBER', 'RED']
    if (!validTLP.includes(threat.metadata.tlp)) {
      throw new Error(`Invalid TLP level: ${threat.metadata.tlp}`)
    }

    // Validate IOC types if present
    if (threat.indicators) {
      const validTypes = ['ip', 'domain', 'url', 'hash-md5', 'hash-sha1', 'hash-sha256', 'email', 'msisdn', 'imsi']
      for (const indicator of threat.indicators) {
        if (!validTypes.includes(indicator.type)) {
          throw new Error(`Invalid indicator type: ${indicator.type}`)
        }
      }
    }
  }

  private formatForSubmission(threat: ThreatIntelligence): Record<string, unknown> {
    return {
      id: threat.id,
      type: threat.type,
      classification: threat.classification,
      priority: threat.priority,
      title: threat.title,
      description: threat.description,
      technical_details: threat.technicalDetails,
      indicators: threat.indicators?.map(ind => ({
        type: ind.type,
        value: ind.value,
        confidence: ind.confidence,
        source: ind.source,
        first_seen: ind.firstSeen.toISOString(),
        last_seen: ind.lastSeen.toISOString(),
        tags: ind.tags
      })),
      campaign_info: threat.campaignInfo ? {
        name: threat.campaignInfo.name,
        actor: threat.campaignInfo.actor,
        target_sector: threat.campaignInfo.targetSector,
        target_geography: threat.campaignInfo.targetGeography,
        timeline: {
          first_activity: threat.campaignInfo.timeline.firstActivity.toISOString(),
          last_activity: threat.campaignInfo.timeline.lastActivity.toISOString(),
          status: threat.campaignInfo.timeline.status
        },
        mitre_techniques: threat.campaignInfo.mitreTechniques
      } : undefined,
      metadata: {
        ...threat.metadata,
        submitted_at: threat.metadata.submittedAt.toISOString(),
        last_updated: threat.metadata.lastUpdated.toISOString()
      },
      references: threat.references,
      tlp: threat.metadata.tlp
    }
  }

  private shouldAutoPublish(priority: ThreatIntelligence['priority']): boolean {
    const thresholdOrder = { low: 0, medium: 1, high: 2, critical: 3 }
    const currentLevel = thresholdOrder[priority]
    const publishThreshold = thresholdOrder[this.config.autoPublishThreshold]
    
    return currentLevel >= publishThreshold
  }

  private getClassification(classification: ThreatIntelligence['classification']): 'national' | 'sector' | 'organization' {
    switch (classification) {
      case 'public':
        return 'national'
      case 'restricted':
        return 'sector'
      case 'confidential':
        return 'organization'
      default:
        return 'organization'
    }
  }
}

// Export singleton instance
export const nationalCSIRT = NationalCSIRT.getInstance()

export default NationalCSIRT
