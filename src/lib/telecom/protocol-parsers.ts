/**
 * National SOC Platform - Telecom Protocol Parsers
 * Algeria 2026-2030 | Protocol Analysis for Mobile Networks
 * 
 * Implements parsers for:
 * - GTPv1/GTPv2 (GPRS Tunneling Protocol)
 * - SS7/MAP (Signaling System 7 / Mobile Application Part)
 * - Diameter (AAA Protocol)
 * - RADIUS (Legacy AAA)
 * 
 * Each parser extracts security-relevant fields and generates alerts
 */

import { ALGERIAN_OPERATORS, TELECOM_THREATS } from './operators'

// ============= TYPES =============

export interface ParsedPacket {
  timestamp: Date
  protocol: string
  sourceIp: string
  destinationIp: string
  sourcePort: number
  destinationPort: number
  rawPacket?: Buffer
  
  // Parsed fields
  messageType?: string
  messageLength?: number
  sequenceNumber?: number
  imsi?: string
  imei?: string
  msisdn?: string
  
  // Security analysis
  threatIndicators: ThreatIndicator[]
  riskScore: number
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  
  // Context
  operatorId?: string
  networkElement?: string
  subscriberContext?: SubscriberContext
}

export interface ThreatIndicator {
  id: string
  type: string
  description: string
  confidence: number
  iocValue?: string
  ruleTriggered?: string
}

export interface SubscriberContext {
  imsi?: string
  msisdn?: string
  location?: {
    lac?: number
    cellId?: number
    tac?: int
    plmn?: string
  }
  roaming?: boolean
  roamingPartner?: string
  sessionInfo?: {
    apn?: string
    ipAddress?: string
    duration?: number
    bytesUp?: number
    bytesDown?: number
  }
}

// ============= GTP PARSER =============

export interface GTPOptions {
  version: 1 | 2
  teid?: number
  messageType?: number
  sequenceNumber?: number
  tunnelEndpointIdentifier?: number
}

export class GTPParser {
  /**
   * Parse a GTP packet and extract security-relevant information
   */
  static parse(rawData: Buffer, options: Partial<GTPOptions> = {}): ParsedPacket {
    const packet: ParsedPacket = {
      timestamp: new Date(),
      protocol: options.version === 2 ? 'gtp_v2' : 'gtp_v1',
      sourceIp: '',
      destinationIp: '',
      sourcePort: 2123,
      destinationPort: 2123,
      rawPacket: rawData,
      threatIndicators: [],
      riskScore: 0,
      severity: 'info'
    }

    try {
      if (rawData.length < 8) {
        throw new Error('Invalid GTP packet: too short')
      }

      // GTP Header parsing
      const flags = rawData[0]
      const version = (flags >> 5) & 0x07
      const protocolType = (flags >> 4) & 0x01 // 0=GTP, 1=GTP'
      
      packet.messageType = this.getMessageType(version, rawData[1])
      packet.messageLength = rawData.readUInt16BE(2)
      packet.sequenceNumber = options.sequenceNumber ?? rawData.readUInt32BE(4) & 0xFFFFFF
      
      // Extract TEID (Tunnel Endpoint Identifier)
      if (rawData.length >= 12) {
        options.teid = rawData.readUInt32BE(8)
      }

      // Parse information elements based on message type
      this.parseInformationElements(packet, rawData, options)

      // Calculate risk score
      packet.riskScore = this.calculateRiskScore(packet)
      packet.severity = this.getSeverityFromScore(packet.riskScore)

    } catch (error) {
      packet.threatIndicators.push({
        id: 'GTP-PARSE-ERROR',
        type: 'parse_error',
        description: `Failed to parse GTP packet: ${error instanceof Error ? error.message : 'Unknown error'}`,
        confidence: 0.9
      })
      packet.riskScore = 30
      packet.severity = 'medium'
    }

    return packet
  }

  private static getMessageType(version: number, typeCode: number): string {
    const gtpv1Types: Record<number, string> = {
      1: 'Echo Request',
      2: 'Echo Response',
      16: 'Create PDP Context Request',
      17: 'Create PDP Context Response',
      18: 'Update PDP Context Request',
      19: 'Update PDP Context Response',
      20: 'Delete PDP Context Request',
      21: 'Delete PDP Context Response'
    }

    const gtpv2Types: Record<number, string> = {
      1: 'Echo Request',
      2: 'Echo Response',
      32: 'Create Session Request',
      33: 'Create Session Response',
      34: 'Modify Bearer Request',
      35: 'Modify Bearer Response',
      36: 'Delete Session Request',
      37: 'Delete Session Response'
    }

    return version === 2 ? (gtpv2Types[typeCode] || `Unknown (${typeCode})`) : 
           (gtpv1Types[typeCode] || `Unknown (${typeCode})`)
  }

  private static parseInformationElements(packet: ParsedPacket, data: Buffer, options: Partial<GTPOptions>): void {
    let offset = options.version === 2 ? 12 : 8 // Skip header
    
    while (offset < data.length && offset < packet.messageLength! + 8) {
      const ieType = data[offset]
      const ieLength = data[offset + 1]
      const ieValue = data.slice(offset + 2, offset + 2 + ieLength)

      switch (ieType) {
        case 0x01: // IMSI
          packet.imsi = this.parseIMSI(ieValue)
          packet.subscriberContext = { ...packet.subscriberContext, imsi: packet.imsi }
          
          // Check for suspicious IMSI patterns
          if (this.isSuspiciousIMSI(packet.imsi)) {
            packet.threatIndicators.push({
              id: 'GTP-SUSPICIOUS-IMSI',
              type: 'anomaly',
              description: 'Suspicious IMSI pattern detected',
              confidence: 0.7,
              iocValue: packet.imsi
            })
          }
          break

        case 0x02: // MSISDN (Phone Number)
          packet.msisdn = this.parseMSISDN(ieValue)
          packet.subscriberContext = { ...packet.subscriberContext, msisdn: packet.msisdn }
          break

        case 0x03: // APN (Access Point Name)
          const apn = ieValue.toString('ascii')
          packet.subscriberContext = {
            ...packet.subscriberContext,
            sessionInfo: { ...packet.subscriberContext?.sessionInfo, apn }
          }
          
          // Check for suspicious APN usage
          if (this.isSuspiciousAPN(apn)) {
            packet.threatIndicators.push({
              id: 'GTP-SUSPICIOUS-APN',
              type: 'policy_violation',
              description: `Suspicious APN usage: ${apn}`,
              confidence: 0.6,
              iocValue: apn
            })
          }
          break

        case 0x07: // RAII (Routing Area Identity)
          const mcc = ((ieValue[0] & 0x0F) << 2) | ((ieValue[1] >> 6) & 0x03)
          const mnc = ((ieValue[1] & 0x3F))
          packet.subscriberContext = {
            ...packet.subscriberContext,
            location: { ...packet.subscriberContext?.location, lac: ieValue.readUInt16BE(2), plmn: `${mcc}${mnc}` }
          }
          
          // Check for roaming
          const isRoaming = !Object.values(ALGERIAN_OPERATORS).some(
            op => op.mcc === String(mcc).padStart(3, '0')
          )
          if (isRoaming) {
            packet.subscriberContext!.roaming = true
            packet.threatIndicators.push({
              id: 'GTP-ROAMING-DETECTED',
              type: 'roaming',
              description: `Subscriber roaming on foreign network PLMN: ${mcc}${mnc}`,
              confidence: 0.9,
              iocValue: `${mcc}${mnc}`
            })
          }
          break

        case 0x51: // Charging ID
          // Log for billing correlation
          break

        case 0x80: // User Location Information
          if (ieValue.length >= 8) {
            packet.subscriberContext = {
              ...packet.subscriberContext,
              location: {
                ...packet.subscriberContext?.location,
                cgi: ieValue.readUInt32BE(4),
                sai: ieValue.readUInt16BE(0),
                rai: ieValue.readUInt32BE(2)
              }
            }
          }
          break
      }

      offset += 2 + ieLength
    }
  }

  private static parseIMSI(data: Buffer): string {
    // IMSI is encoded in BCD format, may have filler digit
    let imsi = ''
    for (let i = 0; i < Math.min(data.length, 8); i++) {
      const byte = data[i]
      imsi += ((byte >> 4) & 0x0F).toString()
      imsi += (byte & 0x0F).toString()
    }
    return imsi.replace(/f/g, '') // Remove filler
  }

  private static parseMSISDN(data: Buffer): string {
    // MSISDN in BCD format
    let msisdn = ''
    for (let i = 0; i < Math.min(data.length, 9); i++) {
      const byte = data[i]
      msisdn += ((byte >> 4) & 0x0F).toString()
      msisdn += (byte & 0x0F).toString()
    }
    return msisdn.replace(/f/g, '')
  }

  private static isSuspiciousIMSI(imsi: string): boolean {
    // Check for test SIMs, known patterns
    const suspiciousPatterns = [
      /^00101/, // Test IMSI prefix
      /^000000/, // All zeros
      /^99999/, // Test pattern
      /^(.)\1{14}$/ // All same digits
    ]
    return suspiciousPatterns.some(pattern => pattern.test(imsi))
  }

  private static isSuspiciousAPN(apn: string): boolean {
    const suspiciousAPNs = [
      'internet', // Generic - might indicate misconfiguration
      'tunnel', // VPN-like
      'free', // Suspicious name
      'bypass' // Clearly malicious intent
    ]
    return suspiciousAPNs.some(susp => apn.toLowerCase().includes(susp))
  }

  private static calculateRiskScore(packet: ParsedPacket): number {
    let score = 0
    
    for (const indicator of packet.threatIndicators) {
      score += indicator.confidence * 100
    }

    // Additional scoring based on message type
    const highRiskMessages = ['Create PDP Context Request', 'Create Session Request']
    if (highRiskMessages.includes(packet.messageType)) {
      score += 10
    }

    return Math.min(100, score)
  }

  private static getSeverityFromScore(score: number): 'critical' | 'high' | 'medium' | 'low' | 'info' {
    if (score >= 80) return 'critical'
    if (score >= 60) return 'high'
    if (score >= 40) return 'medium'
    if (score >= 20) return 'low'
    return 'info'
  }
}

// ============= SS7/MAP PARSER =============

export class SS7MAPParser {
  /**
   * Parse SS7/MAP signaling messages
   */
  static parse(rawData: Buffer, context?: { opc?: number; dpc?: number }): ParsedPacket {
    const packet: ParsedPacket = {
      timestamp: new Date(),
      protocol: 'ss7_map',
      sourceIp: '',
      destinationIp: '',
      sourcePort: 2940,
      destinationPort: 2940,
      rawPacket: rawData,
      threatIndicators: [],
      riskScore: 0,
      severity: 'info'
    }

    try {
      // MTP3 header (routing label)
      if (rawData.length >= 5) {
        const sls = rawData[0] & 0x0F
        const opc = rawData.readUInt24BE(0) >> 4 // Originating point code
        const dpc = rawData.readUInt24BE(2) & 0xFFFFF // Destination point code
        
        // Map point codes to network elements
        packet.networkElement = this.identifyNetworkElement(dpc)
      }

      // TCAP/MAP layer parsing
      if (rawData.length > 5) {
        this.parseTCAPLayer(packet, rawData.slice(5))
      }

      packet.riskScore = this.calculateSS7RiskScore(packet)
      packet.severity = this.getSeverityFromScore(packet.riskScore)

    } catch (error) {
      packet.threatIndicators.push({
        id: 'SS7-PARSE-ERROR',
        type: 'parse_error',
        description: `Failed to parse SS7 packet: ${error instanceof Error ? error.message : 'Unknown error'}`,
        confidence: 0.85
      })
      packet.riskScore = 50
      packet.severity = 'high'
    }

    return packet
  }

  private static identifyNetworkElement(pointCode: number): string {
    // Point code to element mapping would be configured per operator
    const ranges: Array<{ start: number; end: number; name: string }> = [
      { start: 1, end: 10, name: 'HLR' },
      { start: 11, end: 20, name: 'MSC/VLR' },
      { start: 21, end: 30, name: 'SGSN' },
      { start: 31, end: 40, name: 'GMSC' },
      { start: 41, end: 50, name: 'SMSC' }
    ]

    const range = ranges.find(r => pointCode >= r.start && pointCode <= r.end)
    return range?.name || `Unknown(${pointCode})`
  }

  private static parseTCAPLayer(packet: ParsedPacket, data: Buffer): void {
    if (data.length < 4) return

    // Simplified TCAP parsing
    const messageType = data[0] & 0x03
    
    switch (messageType) {
      case 0x01: // Unstructured SS Request (USSD)
        this.parseUSSDMessage(packet, data)
        break
      case 0x02: // Begin (dialog initiation)
        this.parseBeginDialog(packet, data)
        break
      case 0x04: // Continue
        this.parseContinueDialog(packet, data)
        break
      case 0x08: // End
        this.parseEndDialog(packet, data)
        break
      case 0x0A: // Abort
        packet.threatIndicators.push({
          id: 'SS7-TCP-ABORT',
          type: 'anomaly',
          description: 'TCAP dialog aborted unexpectedly',
          confidence: 0.5
        })
        break
    }

    // Look for MAP operations
    this.detectMAPOperations(packet, data)
  }

  private static parseUSSDMessage(packet: ParsedPacket, data: Buffer): void {
    // USSD messages can contain sensitive info or attack vectors
    // This is simplified - real implementation needs full ASN.1 decoding
    const ussdString = data.toString('ascii').replace(/[^\x20-\x7E]/g, '')
    
    if (ussdString) {
      // Check for common attack patterns
      const attackPatterns = [
        { pattern: '*#06#', desc: 'IMEI extraction attempt', severity: 'medium' },
        { pattern: '**21*', desc: 'Call forwarding manipulation attempt', severity: 'high' },
        { pattern: '**00*', desc: 'Call forwarding disable attempt', severity: 'medium' },
        { pattern: '*#*#', desc: 'Service code access', severity: 'low' }
      ]

      for (const { pattern, desc, severity } of attackPatterns) {
        if (ussdString.includes(pattern)) {
          packet.threatIndicators.push({
            id: `USSD-${pattern.replace(/[^a-zA-Z0-9]/g, '')}`,
            type: 'ussd_manipulation',
            description: desc,
            confidence: 0.75,
            iocValue: ussdString.substring(0, 20)
          })
        }
      }
    }
  }

  private static parseBeginDialog(packet: ParsedPacket, data: Buffer): void {
    // Analyze dialog initiation for suspicious patterns
    // High-frequency dialogs from same origin could indicate scanning
  }

  private static parseContinueDialog(packet: ParsedPacket, data: Buffer): void {
    // Continue dialog analysis
  }

  private static parseEndDialog(packet: ParsedPacket, data: Buffer): void {
    // End dialog analysis
  }

  private static detectMAPOperations(packet: ParsedPacket, data: Buffer): void {
    // Critical MAP operations that need monitoring
    const criticalOperations = [
      { oid: '2.16.840.1.113718.5.2.1.1', name: 'sendRoutingInfoForSM', threat: 'location_tracking' },
      { oid: '2.16.840.1.113718.5.2.1.2', name: 'provideSubscriberInfo', threat: 'subscriber_profiling' },
      { oid: '2.16.840.1.113718.5.2.1.3', name: 'updateLocation', threat: 'location_tracking' },
      { oid: '2.16.840.1.113718.5.2.2.1', name: 'forwardShortMessage', threat: 'sms_interception' },
      { oid: '2.16.840.1.113718.5.2.2.2', name: 'mt-forwardShortMessage', threat: 'sms_delivery' },
      { oid: '2.16.840.1.113718.5.2.4.1', name: 'authenticationFailureReport', threat: 'auth_failure' }
    ]

    // In real implementation, we'd decode ASN.1 TLV structure
    // For now, check if any known OIDs exist in the data
    const dataHex = data.toString('hex').toLowerCase()

    for (const op of criticalOperations) {
      if (dataHex.includes(op.oid.replace(/\./g, ''))) {
        packet.threatIndicators.push({
          id: `MAP-${op.name.replace(/\s+/g, '_')}`,
          type: op.threat,
          description: `Critical MAP operation: ${op.name}`,
          confidence: 0.9,
          ruleTriggered: `map_critical_operation_${op.name}`
        })

        // Mark as ARPT reportable if it's a privacy-invasive operation
        if (['location_tracking', 'subscriber_profiling', 'sms_interception'].includes(op.threat)) {
          packet.threatIndicators.push({
            id: 'ARPT-REPORTABLE',
            type: 'compliance',
            description: 'Operation requires ARPT reporting',
            confidence: 1.0
          })
        }
      }
    }
  }

  private static calculateSS7RiskScore(packet: ParsedPacket): number {
    let score = 0
    
    for (const indicator of packet.threatIndicators) {
      score += indicator.confidence * 100
    }

    // Extra weight for privacy-invasive operations
    const hasPrivacyViolation = packet.threatIndicators.some(i => 
      ['location_tracking', 'subscriber_profiling', 'sms_interception'].includes(i.type)
    )
    if (hasPrivacyViolation) {
      score += 30
    }

    return Math.min(100, score)
  }

  private static getSeverityFromScore(score: number): 'critical' | 'high' | 'medium' | 'low' | 'info' {
    if (score >= 80) return 'critical'
    if (score >= 60) return 'high'
    if (score >= 40) return 'medium'
    if (score >= 20) return 'low'
    return 'info'
  }
}

// ============= DIAMETER PARSER =============

export class DiameterParser {
  /**
   * Parse Diameter protocol messages (LTE/5G AAA)
   */
  static parse(rawData: Buffer): ParsedPacket {
    const packet: ParsedPacket = {
      timestamp: new Date(),
      protocol: 'diameter',
      sourceIp: '',
      destinationIp: '',
      sourcePort: 3868,
      destinationPort: 3868,
      rawPacket: rawData,
      threatIndicators: [],
      riskScore: 0,
      severity: 'info'
    }

    try {
      if (rawData.length < 20) {
        throw new Error('Invalid Diameter packet: too short')
      }

      // Diameter header (20 bytes)
      const version = rawData[0] >> 4
      const messageLength = rawData.readUInt24BE(1)
      const commandFlags = rawData[4]
      const commandCode = rawData.readUInt24BE(5)
      const applicationId = rawData.readUInt32BE(12)
      const hopByHopId = rawData.readUInt32Byte(16)
      const endToEndId = rawData.readUInt32Byte(20)

      packet.messageType = this.getCommandName(commandCode, applicationId)
      packet.sequenceNumber = hopByHopId

      // Parse AVPs (Attribute Value Pairs)
      this.parseAVPs(packet, rawData.slice(20))

      packet.riskScore = this.calculateDiameterRiskScore(packet)
      packet.severity = this.getSeverityFromScore(packet.riskScore)

    } catch (error) {
      packet.threatIndicators.push({
        id: 'DIAMETER-PARSE-ERROR',
        type: 'parse_error',
        description: `Failed to parse Diameter packet: ${error instanceof Error ? error.message : 'Unknown error'}`,
        confidence: 0.85
      })
      packet.riskScore = 40
      packet.severity = 'medium'
    }

    return packet
  }

  private static getCommandName(commandCode: number, applicationId: number): string {
    // Common Diameter commands
    const commands: Record<string, string> = {
      '265': 'Authentication Information Request (AIR)',
      '266': 'Authentication Information Answer (AIA)',
      '271': 'Update Location Request (ULR)',
      '272': 'Update Location Answer (ULA)',
      '280': 'Cancel Location Request (CLR)',
      '281': 'Cancel Location Answer (CLA)',
      '300': 'Authentication Request (AAR)',
      '301': 'Authentication Answer (AAA)',
      '257': 'Credit Control Request (CCR)',
      '258': 'Credit Control Answer (CCA)',
      '316': 'Push Notification Request (PNR)',
      '317': 'Push Notification Answer (PNA)'
    }

    return commands[String(commandCode)] || `Unknown Command (${commandCode})`
  }

  private static parseAVPs(packet: ParsedPacket, data: Buffer): void {
    let offset = 0

    while (offset + 8 <= data.length) {
      const avpCode = data.readUInt32BE(offset)
      const avpFlags = data[offset + 4]
      const avpLength = data.readUInt24BE(offset + 5) & 0x00FFFFFF
      const vendorId = (avpFlags & 0x80) ? data.readUInt32BE(offset + 8) : 0

      const avpData = data.slice(
        offset + 8 + (vendorId ? 4 : 0),
        offset + avpLength
      )

      switch (avpCode) {
        case 1: // User-Name (IMSI/MSISDN)
          packet.imsi = avpData.toString('utf8')
          packet.subscriberContext = { ...packet.subscriberContext, imsi: packet.imsi }
          break

        case 443: // Subscription-ID
          // Could be IMSI or MSISDN depending on type
          break

        case 141: // Visited-Network-Identifier
          const visitedPlmn = avpData.toString('utf8')
          if (visitedPlmn) {
            const isRoaming = !Object.values(ALGERIAN_OPERATORS).some(
              op => `${op.mcc}${op.mnc}` === visitedPlmn
            )
            if (isRoaming) {
              packet.subscriberContext = { ...packet.subscriberContext, roaming: true, roamingPartner: visitedPlmn }
              packet.threatIndicators.push({
                id: 'DIAMETER-ROAMING',
                type: 'roaming',
                description: `Subscriber roaming on visited network: ${visitedPlmn}`,
                confidence: 0.95,
                iocValue: visitedPlmn
              })
            }
          }
          break

        case 457: // Result-Code
          const resultCode = avpData.readInt32BE(0)
          if (resultCode !== 2001) { // DIAMETER_SUCCESS
            packet.threatIndicators.push({
              id: 'DIAMETER-AUTH-FAILURE',
              type: 'auth_failure',
              description: `Diameter authentication failed with result code: ${resultCode}`,
              confidence: 0.8
            })
          }
          break

        case 462: // Experimental-Result-Code
          const expResultCode = avpData.readInt32BE(0)
          if (expResultCode !== 2001) {
            packet.threatIndicators.push({
              id: 'DIAMETER-AUTH-FAILURE-EXP',
              type: 'auth_failure',
              description: `Experimental auth failure: ${expResultCode}`,
              confidence: 0.75
            })
          }
          break

        case 1000: // Terminal-Information
          // Contains IMEI, device capabilities
          if (avpData.length >= 15) {
            packet.imei = avpData.slice(0, 15).toString('ascii')
            packet.subscriberContext = { ...packet.subscriberContext, imei: packet.imei }
            
            if (this.isBlacklistedIMEI(packet.imei)) {
              packet.threatIndicators.push({
                id: 'DIAMETER-BLACKLISTED-IMEI',
                type: 'fraud',
                description: `Blacklisted device IMEI detected: ${packet.imei}`,
                confidence: 0.95,
                iocValue: packet.imei
              })
            }
          }
          break
      }

      // Move to next AVP (align to 4-byte boundary)
      offset += avpLength + (avpLength % 4 ? 4 - (avpLength % 4) : 0)
    }
  }

  private static isBlacklistedIMEI(imei: string): boolean {
    // Check against known blacklisted patterns
    // In production, query actual blacklist database
    const blacklistedPatterns = [
      /^35\d{13}$/, // Example pattern
      /^000000/, // Invalid IMEI
      /^(.)\1{14}/ // All same digits
    ]
    
    return blacklistedPatterns.some(p => p.test(imei))
  }

  private static calculateDiameterRiskScore(packet: ParsedPacket): number {
    let score = 0
    
    for (const indicator of packet.threatIndicators) {
      score += indicator.confidence * 100
    }

    // Extra weight for authentication failures
    const hasAuthFailure = packet.threatIndicators.some(i => i.type === 'auth_failure')
    if (hasAuthFailure) {
      score += 20
    }

    return Math.min(100, score)
  }

  private static getSeverityFromScore(score: number): 'critical' | 'high' | 'medium' | 'low' | 'info' {
    if (score >= 80) return 'critical'
    if (score >= 60) return 'high'
    if (score >= 40) return 'medium'
    if (score >= 20) return 'low'
    return 'info'
  }
}

// ============= UNIFIED PROTOCOL HANDLER =============

export class TelecomProtocolHandler {
  /**
   * Auto-detect and parse telecom protocol packets
   */
  static parsePacket(rawData: Buffer, port?: number): ParsedPacket {
    // Detect protocol based on port or content
    if (port === 2123 || port === 2152 || port === 3386) {
      return GTPParser.parse(rawData, { version: port === 3386 ? 1 : 2 })
    } else if (port === 2940 || port === 3747) {
      return SS7MAPParser.parse(rawData)
    } else if (port === 3868 || port === 1812) {
      return port === 3868 ? DiameterParser.parse(rawData) : RADIUSParser.parse(rawData)
    } else {
      // Try auto-detection
      return this.autoDetectAndParse(rawData)
    }
  }

  private static autoDetectAndParse(rawData: Buffer): ParsedPacket {
    // Try each parser and use the one that succeeds best
    const parsers = [
      { parser: GTPParser, priority: 1 },
      { parser: SS7MAPParser, priority: 2 },
      { parser: DiameterParser, priority: 3 }
    ]

    let bestResult: ParsedPacket | null = null
    let lowestErrorCount = Infinity

    for (const { parser } of parsers) {
      try {
        const result = parser.parse(rawData)
        const errorCount = result.threatIndicators.filter(t => t.type === 'parse_error').length
        
        if (errorCount < lowestErrorCount) {
          lowestErrorCount = errorCount
          bestResult = result
        }
        
        if (errorCount === 0) break
      } catch {
        continue
      }
    }

    return bestResult || {
      timestamp: new Date(),
      protocol: 'unknown',
      sourceIp: '',
      destinationIp: '',
      sourcePort: 0,
      destinationPort: 0,
      threatIndicators: [{
        id: 'UNKNOWN-PROTOCOL',
        type: 'unknown',
        description: 'Could not identify protocol',
        confidence: 1.0
      }],
      riskScore: 10,
      severity: 'low'
    }
  }
}

// Placeholder for RADIUS parser
class RADIUSParser {
  static parse(rawData: Buffer): ParsedPacket {
    return {
      timestamp: new Date(),
      protocol: 'radius',
      sourceIp: '',
      destinationIp: '',
      sourcePort: 1812,
      destinationPort: 1812,
      rawPacket: rawData,
      threatIndicators: [],
      riskScore: 0,
      severity: 'info'
    }
  }
}

// ============= EXPORTS =============

export { GTPParser, SS7MAPParser, DiameterParser, TelecomProtocolHandler }
