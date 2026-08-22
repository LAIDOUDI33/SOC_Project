/**
 * SS7 Message Decoder
 * Djezzy National SOC Platform - SS7 Tools Suite
 * 
 * Comprehensive decoder for SS7 protocol messages:
 * - MAP (Mobile Application Part) decoding
 * - CAP (CAMEL Application Part) decoding
 * - ISUP (ISDN User Part) decoding
 * - SCCP (Signaling Connection Control Part) decoding
 * - TCAP (Transaction Capabilities Application Part) decoding
 * 
 * Supports ITU-T Q.771-Q.775 (TCAP), Q.931 (ISUP), and 3GPP TS 29.002 (MAP)
 * 
 * @version 1.0.0
 */

import {
  SS7Message,
  SS7ProtocolLayer,
  PointCode,
  PointCodeFormat,
  GlobalTitle,
  GlobalTitleType,
  SubsystemNumber,
  SCCPMessageType,
  TCAPMessageType,
  MAPOperationCode,
  CAPOperationCode,
  ISUPMessageType,
  M3UAMessageType,
  SCTPChunkType,
  parsePointCode,
  parseGlobalTitle,
  maskMSISDN,
  maskIMSI,
  hexDump,
  bufferToHex,
  hexToBuffer,
  SCCP_MESSAGE_NAMES,
  TCAP_MESSAGE_NAMES,
  MAP_OPERATION_NAMES,
  CAP_OPERATION_NAMES,
  ISUP_MESSAGE_NAMES,
  M3UA_MESSAGE_NAMES,
  SCTP_CHUNK_NAMES,
} from './ss7-formats';

// ============================================================
// DECODER RESULT TYPES
// ============================================================

export interface DecodeResult<T = any> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
  rawBytes?: number;
  warnings?: string[];
}

export interface DecodedMAPMessage extends SS7Message {
  operation: MAPOperationCode;
  operationName: string;
  invokeId?: number;
  parameters: Record<string, any>;
  sourceSubscriber?: {
    imsi: string;
    msisdn: string;
    maskedIMSI: string;
    maskedMSISDN: string;
  };
  destinationSubscriber?: {
    imsi: string;
    msisdn: string;
    maskedIMSI: string;
    maskedMSISDN: string;
  };
}

export interface DecodedCAPMessage extends SS7Message {
  operation: CAPOperationCode;
  operationName: string;
  invokeId?: number;
  legID?: number;
  parameters: Record<string, any>;
  callingNumber?: string;
  calledNumber?: string;
}

export interface DecodedISUPMessage extends SS7Message {
  message: ISUPMessageType;
  messageName: string;
  cic: number;                    // Circuit Identification Code
  callingPartyNumber?: string;
  calledPartyNumber?: string;
  causeValue?: number;
  causeDescription?: string;
  iams?: IAMFields;               // Initial Address Message fields
}

export interface DecodedSCCPMessage extends SS7Message {
  messageType: SCCPMessageType;
  messageName: string;
  segmenting?: boolean;
  segmentation?: {
    firstSegment: boolean;
    remainingSegments: number;
  };
  hopCounter?: number;
  sequenceControl?: number;
  returnOption?: boolean;
}

export interface DecodedTCAPMessage extends SS7Message {
  messageType: TCAPMessageType;
  messageName: string;
  otid?: string;                  // Originating Transaction ID
  dtid?: string;                  // Destination Transaction ID
  dialoguePortion?: DialoguePortion;
  components: TCAPComponent[];
}

export interface DialoguePortion {
  applicationContextName?: string;
  userInformation?: any;
  confidentialityKey?: string;
  originatingEntity?: string;
  destinationEntity?: string;
}

export interface TCAPComponent {
  type: ComponentType;
  invokeId?: number;
  linkedId?: number;
  operationCode?: number;
  operationName?: string;
  parameters?: any;
  error?: {
    code: number;
    name: string;
    parameters?: any;
  };
  problem?: {
    type: ProblemType;
    code: number;
    description: string;
  };
  rejectReason?: string;
}

export enum ComponentType {
  INVOKE = 1,
  RETURN_RESULT_LAST = 2,
  RETURN_ERROR = 3,
  REJECT = 4,
  RETURN_RESULT_NOT_LAST = 7,
}

export enum ProblemType {
  GENERAL = 0,
  INVOKE = 1,
  RETURN_RESULT = 2,
  RETURN_ERROR = 3,
}

// ISUP-specific fields
export interface IAMFields {
  natureOfConnection?: number;
  forwardCallIndicators?: number;
  callingPartyCategory?: number;
  transmissionMediumRequirement?: number;
  calledPartyNumber?: string;
  callingPartyNumber?: string;
  optionalParameters?: Record<string, any>;
}

// ============================================================
// ASN.1/BER DECODER UTILITIES
// ============================================================

class BERDecoder {
  private buffer: Buffer;
  private offset: number;

  constructor(buffer: Buffer) {
    this.buffer = buffer;
    this.offset = 0;
  }

  get position(): number {
    return this.offset;
  }

  set position(value: number) {
    this.offset = value;
  }

  get remaining(): number {
    return this.buffer.length - this.offset;
  }

  decodeTag(): { tagClass: number; constructed: boolean; tagNumber: number; length: number } {
    if (this.remaining < 2) throw new Error('Insufficient data for tag');

    const byte = this.buffer[this.offset++];
    const tagClass = (byte >> 6) & 0x03;
    const constructed = (byte & 0x20) !== 0;
    let tagNumber = byte & 0x1F;

    // Long form tag
    if (tagNumber === 0x1F) {
      tagNumber = 0;
      let b;
      do {
        if (this.remaining === 0) throw new Error('Truncated tag');
        b = this.buffer[this.offset++];
        tagNumber = (tagNumber << 7) | (b & 0x7F);
      } while (b & 0x80);
    }

    const length = this.decodeLength();

    return { tagClass, constructed, tagNumber, length };
  }

  decodeLength(): number {
    if (this.remaining === 0) throw new Error('Insufficient data for length');

    const byte = this.buffer[this.offset++];

    if (byte & 0x80) {
      const numBytes = byte & 0x7F;
      if (numBytes > 4) throw new Error(`Length too long: ${numBytes} bytes`);
      
      if (this.remaining < numBytes) throw new Error('Insufficient data for length');
      
      let length = 0;
      for (let i = 0; i < numBytes; i++) {
        length = (length << 8) | this.buffer[this.offset++];
      }
      return length;
    }

    return byte;
  }

  readBytes(length: number): Buffer {
    if (this.remaining < length) throw new Error(`Insufficient data: need ${length}, have ${this.remaining}`);
    const result = this.buffer.slice(this.offset, this.offset + length);
    this.offset += length;
    return result;
  }

  readOctetString(length: number): string {
    return this.readBytes(length).toString('hex').toUpperCase();
  }

  readInteger(): number {
    const { length } = this.decodeTag();
    const bytes = this.readBytes(length);
    
    let value = 0;
    for (const byte of bytes) {
      value = (value << 8) | byte;
    }
    
    // Handle negative numbers (two's complement)
    if (bytes.length > 0 && (bytes[0] & 0x80)) {
      value -= (1 << (bytes.length * 8));
    }
    
    return value;
  }

  readString(length: number): string {
    const bytes = this.readBytes(length);
    // Try to decode as ASCII/UTF-8
    try {
      return bytes.toString('utf-8');
    } catch {
      return bytes.toString('latin1');
    }
  }

  skip(length: number): void {
    this.offset += length;
  }

  peek(): number {
    return this.buffer[this.offset];
  }
}

/**
 * Decode BCD-encoded digits from buffer
 */
function decodeBCDDigits(buffer: Buffer): string {
  let digits = '';
  for (const byte of buffer) {
    const lowNibble = byte & 0x0F;
    const highNibble = (byte >> 4) & 0x0F;
    
    if (lowNibble <= 9) digits += lowNibble.toString();
    if (highNibble <= 9) digits += highNibble.toString();
  }
  return digits;
}

/**
 * Encode address string to/from TBCD format
 */
function decodeTBCDString(buffer: Buffer): string {
  let digits = '';
  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i];
    const lowNibble = byte & 0x0F;
    const highNibble = (byte >> 4) & 0x0F;
    
    // Low nibble first in TBCD
    switch (lowNibble) {
      case 0x0A: digits += '*'; break;
      case 0x0B: digits += '#'; break;
      case 0x0C: digits += 'a'; break;
      case 0x0D: digits += 'b'; break;
      case 0x0E: digits += 'c'; break;
      default:
        if (lowNibble <= 9) digits += lowNibble.toString();
    }
    
    // High nibble second
    switch (highNibble) {
      case 0x0A: digits += '*'; break;
      case 0x0B: digits += '#'; break;
      case 0x0C: digits += 'a'; break;
      case 0x0D: digits += 'b'; break;
      case 0x0E: digits += 'c'; break;
      default:
        if (highNibble <= 9) digits += highNibble.toString();
    }
  }
  return digits;
}

// ============================================================
// MAIN SS7 DECODER CLASS
// ============================================================

export class SS7Decoder {
  private debugMode: boolean;

  constructor(debug: boolean = false) {
    this.debugMode = debug;
  }

  /**
   * Main entry point for decoding an SS7 message
   */
  decode(rawData: Buffer | string, options?: {
    assumedProtocol?: SS7ProtocolLayer;
    opc?: number;
    dpc?: number;
    direction?: 'inbound' | 'outbound';
  }): DecodeResult<SS7Message> {
    try {
      // Convert hex string to buffer if needed
      const buffer = typeof rawData === 'string' ? hexToBuffer(rawData) : rawData;
      
      if (buffer.length === 0) {
        return { success: false, error: 'Empty input data' };
      }

      // Auto-detect or use specified protocol
      const protocol = options?.assumedProtocol || this.detectProtocol(buffer);
      
      this.log(`Detected protocol: ${protocol}`);
      
      switch (protocol) {
        case SS7ProtocolLayer.SCTP:
          return this.decodeSCTP(buffer, options);
        case SS7ProtocolLayer.M3UA:
          return this.decodeM3UA(buffer, options);
        case SS7ProtocolLayer.SCCP:
          return this.decodeSCCP(buffer, options);
        case SS7ProtocolLayer.TCAP:
          return this.decodeTCAP(buffer, options);
        case SS7ProtocolLayer.MAP:
          return this.decodeMAP(buffer, options);
        case SS7ProtocolLayer.CAP:
          return this.decodeCAP(buffer, options);
        case SS7ProtocolLayer.ISUP:
          return this.decodeISUP(buffer, options);
        default:
          return this.decodeRaw(buffer, options);
      }
    } catch (error) {
      return {
        success: false,
        error: `Decode failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Attempt to detect the protocol from raw bytes
   */
  private detectProtocol(buffer: Buffer): SS7ProtocolLayer {
    if (buffer.length < 4) return SS7ProtocolLayer.MTP3;

    // Check SCTP signature
    if (buffer[0] >= 0x00 && buffer[0] <= 0x84 && buffer.length >= 12) {
      // Could be SCTP chunk
      const chunkType = buffer[0];
      if (Object.values(SCTPChunkType).includes(chunkType as SCTPChunkType)) {
        return SS7ProtocolLayer.SCTP;
      }
    }

    // Check M3UA header (Version=2, Class, Type)
    if (buffer[0] === 0x02 || buffer[0] === 0x03) {
      const m3uaClass = buffer[1];
      if (m3uaClass >= 0 && m3uaClass <= 5) {
        return SS7ProtocolLayer.M3UA;
      }
    }

    // Check SCCP message type
    const potentialSCCPMsgType = buffer[0];
    if (Object.values(SCCPMessageType).includes(potentialSCCPMsgType as SCCPMessageType)) {
      return SS7ProtocolLayer.SCCP;
    }

    // Check TCAP tag (typically starts with 0x60-0x68)
    if ((buffer[0] >= 0x60 && buffer[0] <= 0x68) || buffer[0] === 0x61) {
      return SS7ProtocolLayer.TCAP;
    }

    // Default to MTP3/ISUP
    return SS7ProtocolLayer.ISUP;
  }

  // ============================================================
  // SCTP DECODING
  // ============================================================

  private decodeSCTP(buffer: Buffer, options?: any): DecodeResult<SS7Message> {
    const result: SS7Message = {
      id: generateMessageId(),
      timestamp: new Date(),
      protocol: SS7ProtocolLayer.SCTP,
      direction: options?.direction || 'inbound',
      rawData: buffer,
      hexDump: hexDump(buffer),
      packetLength: buffer.length,
    };

    try {
      const decoder = new BERDecoder(buffer);
      
      // SCTP Common Header (16 bytes)
      const srcPort = decoder.readBytes(2).readUInt16BE(0);
      const dstPort = decoder.readBytes(2).readUInt16BE(0);
      const verificationTag = decoder.readBytes(4).readUInt32BE(0);
      const checksum = decoder.readBytes(4).readUInt32BE(0);

      result.sourcePort = srcPort;
      result.destPort = dstPort;
      result.decodedFields = {
        sourcePort: srcPort,
        destPort: dstPort,
        verificationTag: `0x${verificationTag.toString(16).toUpperCase()}`,
        checksum: `0x${checksum.toString(16).toUpperCase()}`,
        chunks: [],
      };

      // Parse chunks
      while (decoder.remaining > 0) {
        const chunkStart = decoder.position;
        
        if (decoder.remaining < 4) break;
        
        const chunkType = decoder.buffer[decoder.position];
        const chunkLength = decoder.buffer.slice(decoder.position + 2, decoder.position + 4).readUInt16BE(0);
        
        const chunkTypeName = SCTP_CHUNK_NAMES[chunkType as SCTPChunkType] || `Unknown (${chunkType})`;
        
        const chunkInfo: Record<string, any> = {
          type: chunkTypeName,
          typeCode: chunkType,
          length: chunkLength,
        };

        // Parse specific chunk types
        switch (chunkType) {
          case SCTPChunkType.DATA:
            if (decoder.remaining >= 17) {
              decoder.skip(1); // Type
              decoder.skip(2); // Length
              const flags = decoder.buffer[decoder.position];
              const tsn = decoder.readBytes(4).readUInt32BE(0);
              const sid = decoder.readBytes(2).readUInt16BE(0);
              const ssn = decoder.readBytes(2).readUInt16BE(0);
              const ppi = decoder.readBytes(4).readUInt32BE(0);
              
              chunkInfo.data = {
                flags,
                tsn,
                streamId: sid,
                streamSeqNum: ssn,
                payloadProtocolId: ppi,
                payloadSize: chunkLength - 17,
              };
            }
            break;

          case SCTPChunkType.INIT:
            if (decoder.remaining >= 20) {
              decoder.skip(3); // Type + Length
              const initTag = decoder.readBytes(4).readUInt32BE(0);
              const aRwnd = decoder.readBytes(4).readUInt32BE(0);
              const numOutbound = decoder.readBytes(2).readUInt16BE(0);
              const numInbound = decoder.readBytes(2).readUInt16BE(0);
              
              chunkInfo.init = {
                initTag: `0x${initTag.toString(16)}`,
                aRwnd,
                numOutboundStreams: numOutbound,
                numInboundStreams: numInbound,
              };
            }
            break;

          case SCTPChunkType.HEARTBEAT:
            // Heartbeat with optional parameter
            break;
        }

        (result.decodedFields.chunks as Record<string, any>[]).push(chunkInfo);
        
        // Move to next chunk (pad to 4-byte boundary)
        const paddedLength = Math.ceil(chunkLength / 4) * 4;
        decoder.position = chunkStart + paddedLength;
      }

      return { success: true, data: result };
    } catch (error) {
      return { success: true, data: result, warnings: [`SCTP parse warning: ${error}`] };
    }
  }

  // ============================================================
  // M3UA DECODING
  // ============================================================

  private decodeM3UA(buffer: Buffer, options?: any): DecodeResult<SS7Message> {
    const result: SS7Message = {
      id: generateMessageId(),
      timestamp: new Date(),
      protocol: SS7ProtocolLayer.M3UA,
      direction: options?.direction || 'inbound',
      rawData: buffer,
      hexDump: hexDump(buffer),
      packetLength: buffer.length,
    };

    try {
      // M3UA Common Header (8 bytes)
      if (buffer.length < 8) {
        return { success: false, error: 'Buffer too short for M3UA' };
      }

      const version = buffer[0];           // Should be 2 or 3
      const m3uaClass = buffer[1];         // Message Class
      const m3uaType = buffer[2];          // Message Type
      const m3uaLength = buffer.slice(6, 8).readUInt32BE(0); // Actually 4-byte length at offset 4

      const msgName = M3UA_MESSAGE_NAMES[m3uaType as M3UAMessageType] || `Unknown (${m3uaType})`;

      result.decodedFields = {
        version,
        class: m3uaClass,
        className: this.getM3UAClassName(m3uaClass),
        type: m3uaType,
        typeName: msgName,
        length: m3uaLength,
      };

      // Parse based on message class/type
      if (m3uaClass === 1 && m3uaType === 1) {
        // TRANSFER - contains MTP3 routing label + payload
        this.parseM3UATransfer(result, buffer.slice(8));
      }

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: `M3UA decode error: ${error}`, data: result };
    }
  }

  private getM3UAClassName(classCode: number): string {
    switch (classCode) {
      case 0: return 'Message Transfer (MMT)';
      case 1: return 'SS7 Signaling Network Management (SSNM)';
      case 2: return 'ASP State Maintenance (ASPSM)';
      case 3: return 'ASP Traffic Maintenance (ASPTM)';
      case 4: return 'Routing Key Management (RKM)';
      case 5: return 'Reserved for IETF';
      default: return `Unknown (${classCode})`;
    }
  }

  private parseM3UATransfer(result: SS7Message, payload: Buffer): void {
    if (payload.length < 11) return;

    // Protocol Data (Tag=0x0100)
    // Routing Label (7 bytes)
    const opcRaw = payload.slice(0, 2).readUInt16BE(0);
    const dpcRaw = payload.slice(2, 4).readUInt16BE(0);
    const sls = payload[4];
    const slc = payload[5];
    const ni_ni = payload[6]; // Network Indicator
    
    result.opc = parsePointCode(opcRaw, PointCodeFormat.ITU_14BIT);
    result.dpc = parsePointCode(dpcRaw, PointCodeFormat.ITU_14BIT);
    result.sls = sls;
    result.slc = slc;

    // SIO (Service Information Octet)
    const sio = payload[7];
    const serviceIndicator = sio & 0x0F;
    const priority = (sio >> 4) & 0x03;
    const networkIndicator = (sio >> 6) & 0x03;

    result.decodedFields!.routingLabel = {
      opc: result.opc.display,
      dpc: result.dpc.display,
      sls,
      slc,
      serviceIndicator: this.getSIName(serviceIndicator),
      priority,
      networkIndicator: ['international', 'spare', 'national', 'reserved'][networkIndicator],
    };

    // The rest is the actual payload (SCCP, ISUP, etc.)
    const userPart = payload.slice(8);
    result.decodedFields!.payloadSize = userPart.length;
    result.decodedFields!.payloadHex = bufferToHex(userPart);
  }

  private getSIName(si: number): string {
    switch (si) {
      case 0: return 'Signaling Network Management';
      case 1: return 'Signaling Network Testing/Maintenance';
      case 2: return 'SCCP';
      case 3: return 'TUP';
      case 4: return 'ISUP';
      case 5: return 'Duplex';
      case 6: return 'MSC/TUP';
      case 7: return 'DUP (Reserved)';
      case 8: return 'B-ISUP';
      case 9: return 'Satellite ISUP';
      case 10: return 'Broadband ISUP';
      case 11: return 'SS7 Signaling Test';
      case 12: return 'AAL Type 2 Signaling';
      case 13: return 'BICC';
      case 14: return 'Gateway Control';
      case 15: return 'Reserved';
      default: return `Unknown (${si})`;
    }
  }

  // ============================================================
  // SCCP DECODING
  // ============================================================

  decodeSCCP(buffer: Buffer, options?: any): DecodeResult<DecodedSCCPMessage> {
    const result: DecodedSCCPMessage = {
      id: generateMessageId(),
      timestamp: new Date(),
      protocol: SS7ProtocolLayer.SCCP,
      direction: options?.direction || 'inbound',
      opc: options?.opc ? parsePointCode(options.opc) : parsePointCode(0),
      dpc: options?.dpc ? parsePointCode(options.dpc) : parsePointCode(0),
      rawData: buffer,
      hexDump: hexDump(buffer),
      packetLength: buffer.length,
    };

    try {
      const decoder = new BERDecoder(buffer);
      
      // Message Type (first octet)
      const msgTypeByte = decoder.readBytes(1)[0];
      result.messageType = msgTypeByte as SCCPMessageType;
      result.messageName = SCCP_MESSAGE_NAMES[msgTypeByte as SCCPMessageType] || `Unknown (${msgTypeByte})`;

      result.decodedFields = {
        messageType: result.messageType,
        messageName: result.messageName,
      };

      // Parse based on message type
      switch (result.messageType) {
        case SCCPMessageType.UDT:   // Unitdata - most common for mobile
        case SCCPMessageType.XUDT:  // Extended Unitdata
        case SCCPMessageType.LUDT:  // Long Unitdata
          this.parseSCCPUnitdata(decoder, result);
          break;
          
        case SCCPMessageType.CR:    // Connection Request
        case SCCPMessageType.CC:    // Connection Confirm
          this.parseSCCPConnection(decoder, result);
          break;
          
        case SCCPMessageType.DT1:   // Data Form 1
        case SCCPMessageType.DT2:   // Data Form 2
          this.parseSCCPData(decoder, result);
          break;
          
        default:
          // Skip remaining parsing for unknown types
          break;
      }

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: `SCCP decode error: ${error}`, data: result };
    }
  }

  private parseSCCPUnitdata(decoder: BERDecoder, result: DecodedSCCPMessage): void {
    // UDT fixed part
    if (decoder.remaining < 3) return;

    const classAndHandling = decoder.readBytes(1)[0];
    const pointerCalledAddr = decoder.readBytes(1)[0];
    const pointerCallingAddr = decoder.readBytes(1)[0];
    const pointerData = decoder.readBytes(1)[0];

    result.decodedFields!.messageClass = (classAndHandling >> 4) & 0x03;
    result.decodedFields!.handling = classAndHandling & 0x0F;

    // Called Party Address (at pointer position)
    const currentPos = decoder.position;
    decoder.position = pointerCalledAddr - 1; // Adjust for 0-based indexing
    result.sccp = {
      ...result.sccp!,
      messageType: result.messageType,
      destinationGlobalTitle: this.parseSCCPAddress(decoder),
    };
    result.decodedFields!.calledPartyAddress = result.sccp.destinationGlobalTitle;

    // Calling Party Address
    decoder.position = pointerCallingAddr - 1;
    result.sccp = {
      ...result.sccp!,
      sourceGlobalTitle: this.parseSCCPAddress(decoder),
    };
    result.decodedFields!.callingPartyAddress = result.sccp.sourceGlobalTitle;

    // Data (at pointer position)
    decoder.position = pointerData - 1;
    const dataLength = decoder.remaining;
    const data = decoder.readBytes(dataLength);
    
    result.decodedFields!.dataLength = dataLength;
    result.decodedFields!.dataHex = bufferToHex(data);

    // Try to decode inner protocol (usually TCAP)
    if (dataLength > 0) {
      result.decodedFields!.innerProtocol = this.detectInnerProtocol(data);
    }
  }

  private parseSCCPConnection(decoder: BERDecoder, result: DecodedSCCPMessage): void {
    // CR/CC have slightly different structure
    if (decoder.remaining < 1) return;

    const sourceLocalRef = decoder.readBytes(3); // Variable length
    result.decodedFields!.sourceLocalRef = bufferToHex(sourceLocalRef);

    if (decoder.remaining >= 3) {
      const destLocalRef = decoder.readBytes(3);
      result.decodedFields!.destLocalRef = bufferToHex(destLocalRef);
    }

    // Parse optional addresses if present
    if (decoder.remaining > 0) {
      result.sccp = {
        ...result.sccp!,
        messageType: result.messageType,
        sourceGlobalTitle: this.parseSCCPAddress(decoder),
      };
    }
  }

  private parseSCCPData(decoder: BERDecoder, result: DecodedSCCPMessage): void {
    // DT1/DT2 contain just local reference and data
    if (decoder.remaining < 1) return;

    const localRef = decoder.readBytes(3);
    result.decodedFields!.localRef = bufferToHex(localRef);

    if (decoder.remaining > 0) {
      const data = decoder.readBytes(decoder.remaining);
      result.decodedFields!.dataHex = bufferToHex(data);
    }
  }

  private parseSCCPAddress(decoder: BERDecoder): GlobalTitle | undefined {
    if (decoder.remaining < 2) return undefined;

    const addrHeader = decoder.readBytes(1)[0];
    const addrLength = decoder.readBytes(1)[0];

    if (addrLength === 0 || decoder.remaining < addrLength) return undefined;

    const addrData = decoder.readBytes(addrLength);

    // Parse address indicators
    const pointCodeIndicator = (addrHeader >> 7) & 0x01;
    const ssnIndicator = (addrHeader >> 6) & 0x01;
    const gtIndicator = (addrHeader >> 5) & 0x01;
    const gtTranslationType = addrHeader & 0x1F;

    let offset = 0;
    let globalTitle: GlobalTitle | undefined;
    let ssn: SubsystemNumber | undefined;

    // Point Code (if present)
    if (pointCodeIndicator && offset + 2 <= addrData.length) {
      const pcRaw = addrData.slice(offset, offset + 2).readUInt16BE(0);
      offset += 2;
    }

    // Subsystem Number (if present)
    if (ssnIndicator && offset < addrData.length) {
      ssn = addrData[offset++] as SubsystemNumber;
    }

    // Global Title (if present)
    if (gtIndicator && offset < addrData.length) {
      const gtEncodingScheme = (addrData[offset] >> 4) & 0x07;
      const numberingPlan = addrData[offset] & 0x0F;
      offset++;

      if (offset < addrData.length) {
        const natureOfAddr = (addrData[offset] >> 4) & 0x07;
        const digitsLength = addrData[offset] & 0x0F;
        offset++;

        if (offset + digitsLength <= addrData.length) {
          const digits = decodeTBCDString(addrData.slice(offset, offset + digitsLength));
          
          globalTitle = {
            type: numberingPlan === 1 ? GlobalTitleType.E164 :
                   numberingPlan === 6 ? GlobalTitleType.E212 :
                   numberingPlan === 7 ? GlobalTitleType.E214 :
                   GlobalTitleType.E164,
            translationType: gtTranslationType,
            numberingPlan,
            encodingScheme: gtEncodingScheme,
            natureOfAddressIndicator: natureOfAddr,
            digits,
            masked: maskMSISDN(digits.startsWith('213') ? '+' + digits : digits),
          };
        }
      }
    }

    if (globalTitle) {
      globalTitle.destinationSSN = ssn;
    }

    return globalTitle;
  }

  private detectInnerProtocol(data: Buffer): string {
    if (data.length < 2) return 'unknown';
    
    // TCAP tags are typically 0x60-0x68
    if (data[0] >= 0x60 && data[0] <= 0x68) return 'TCAP';
    
    // Could be other protocols
    return 'unknown';
  }

  // ============================================================
  // TCAP DECODING
  // ============================================================

  decodeTCAP(buffer: Buffer, options?: any): DecodeResult<DecodedTCAPMessage> {
    const result: DecodedTCAPMessage = {
      id: generateMessageId(),
      timestamp: new Date(),
      protocol: SS7ProtocolLayer.TCAP,
      direction: options?.direction || 'inbound',
      opc: options?.opc ? parsePointCode(options.opc) : parsePointCode(0),
      dpc: options?.dpc ? parsePointCode(options.dpc) : parsePointCode(0),
      rawData: buffer,
      hexDump: hexDump(buffer),
      packetLength: buffer.length,
      components: [],
    };

    try {
      const decoder = new BERDecoder(buffer);
      
      // TCAP outer tag
      const outerTag = decoder.decodeTag();
      result.messageType = outerTag.tagNumber as TCAPMessageType;
      result.messageName = TCAP_MESSAGE_NAMES[result.messageType] || `Unknown (${outerTag.tagNumber})`;

      result.decodedFields = {
        messageType: result.messageType,
        messageName: result.messageName,
      };

      // Transaction portion
      if (decoder.remaining > 0) {
        const transTag = decoder.decodeTag();
        const transData = decoder.readBytes(transTag.length);
        
        // Originating Transaction ID (OTID)
        if (transData.length >= 4) {
          result.otid = transData.slice(0, 4).toString('hex').toUpperCase();
        }
        
        // Destination Transaction ID (DTID) - for some message types
        if (transData.length >= 8) {
          result.dtid = transData.slice(4, 8).toString('hex').toUpperCase();
        }
      }

      result.decodedFields.otid = result.otid;
      result.decodedFields.dtid = result.dtid;

      // Dialogue portion (optional)
      if (decoder.remaining > 0) {
        const savedPos = decoder.position;
        try {
          const dlgTag = decoder.decodeTag();
          if (dlgTag.tagClass === 1 && dlgTag.constructed) {
            result.dialoguePortion = this.parseDialoguePortion(decoder, dlgTag.length);
          } else {
            decoder.position = savedPos;
          }
        } catch {
          decoder.position = savedPos;
        }
      }

      // Components portion
      if (decoder.remaining > 0) {
        const compTag = decoder.decodeTag();
        if (compTag.constructed) {
          result.components = this.parseComponents(decoder, compTag.length);
        }
      }

      result.decodedFields.componentCount = result.components.length;

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: `TCAP decode error: ${error}`, data: result };
    }
  }

  private parseDialoguePortion(decoder: BERDecoder, length: number): DialoguePortion {
    const result: DialoguePortion = {};
    const endPos = decoder.position + length;

    while (decoder.position < endPos) {
      const tag = decoder.decodeTag();
      
      if (tag.tagNumber === 0x06) { // OID
        const oid = decoder.readBytes(tag.length);
        result.applicationContextName = this.formatOID(oid);
      } else if (tag.constructed && tag.length > 0) {
        // User information or other complex field
        decoder.skip(tag.length);
      } else {
        decoder.skip(tag.length);
      }
    }

    return result;
  }

  private formatOID(oid: Buffer): string {
    const components: number[] = [];
    let value = 0;
    
    for (let i = 0; i < oid.length; i++) {
      const byte = oid[i];
      value = (value << 7) | (byte & 0x7F);
      if (!(byte & 0x80)) {
        components.push(value);
        value = 0;
      }
    }

    // Well-known OIDs
    const oidStr = components.join('.');
    const knownOIDs: Record<string, string> = {
      '0.4.0.0.1.0.1.1': 'map-ac (MAP v1)',
      '0.4.0.0.1.0.1.2': 'map-ac (MAP v2)',
      '0.4.0.0.1.0.1.3': 'map-ac (MAP v3)',
      '0.4.0.0.1.0.19.2': 'cap-ac (CAP v2)',
      '0.4.0.0.1.0.24.3': 'cap-ac (CAP v3)',
      '0.4.0.0.1.0.20.2': 'IN-CSE-ac',
      '0.17.134.1': 'Remote Operations',
    };

    return knownOIDs[oidStr] || oidStr;
  }

  private parseComponents(decoder: BERDecoder, length: number): TCAPComponent[] {
    const components: TCAPComponent[] = [];
    const endPos = decoder.position + length;

    while (decoder.position < endPos) {
      try {
        const compTag = decoder.decodeTag();
        const component = this.parseComponent(decoder, compTag);
        components.push(component);
      } catch {
        // Skip malformed component
        break;
      }
    }

    return components;
  }

  private parseComponent(decoder: BERDecoder, tag: any): TCAPComponent {
    const component: TCAPComponent = {
      type: tag.tagNumber as ComponentType,
    };

    switch (component.type) {
      case ComponentType.INVOKE:
        component.invokeId = this.decodeInvokeId(decoder);
        component.operationCode = this.decodeOperationCode(decoder);
        component.operationName = this.getOperationName(component.operationCode);
        component.parameters = this.decodeParameters(decoder);
        break;

      case ComponentType.RETURN_RESULT_LAST:
      case ComponentType.RETURN_RESULT_NOT_LAST:
        component.invokeId = this.decodeInvokeId(decoder);
        // Skip result marker
        if (decoder.peek() === 0x02) {
          decoder.decodeTag(); // Result tag
          decoder.readBytes(decoder.decodeTag().length);
        }
        component.parameters = this.decodeParameters(decoder);
        break;

      case ComponentType.RETURN_ERROR:
        component.invokeId = this.decodeInvokeId(decoder);
        component.error = this.decodeError(decoder);
        break;

      case ComponentType.REJECT:
        component.invokeId = this.decodeInvokeId(decoder);
        component.problem = this.decodeProblem(decoder);
        component.rejectReason = this.getRejectReason(component.problem);
        break;
    }

    return component;
  }

  private decodeInvokeId(decoder: BERDecoder): number {
    const tag = decoder.decodeTag();
    if (tag.tagNumber === 0x02) { // INTEGER
      return decoder.readInteger();
    }
    return 0;
  }

  private decodeOperationCode(decoder: BERDecoder): number {
    const tag = decoder.decodeTag();
    if (tag.tagNumber === 0x02) { // Local integer form
      return decoder.readInteger();
    } else if (tag.tagNumber === 0x06) { // OID form
      const oid = decoder.readBytes(tag.length);
      // Extract last component as operation code
      const oidStr = oid.toString('.');
      const parts = oidStr.split('.').map(Number);
      return parts[parts.length - 1] || 0;
    }
    return 0;
  }

  private getOperationName(code: number): string {
    // Check both MAP and CAP operations
    return MAP_OPERATION_NAMES[code as MAPOperationCode] ||
           CAP_OPERATION_NAMES[code as CAPOperationCode] ||
           `Operation(${code})`;
  }

  private decodeParameters(decoder: BERDecoder): any {
    if (decoder.remaining === 0) return null;
    
    try {
      const tag = decoder.decodeTag();
      if (!tag.constructed) {
        return decoder.readBytes(tag.length).toString('hex');
      }
      
      // For SET/SEQUENCE, recursively decode
      const params: Record<string, any> = {};
      const endPos = decoder.position + tag.length;
      
      while (decoder.position < endPos) {
        try {
          const paramTag = decoder.decodeTag();
          const paramName = `param_${paramTag.tagNumber}`;
          
          if (paramTag.constructed) {
            params[paramName] = this.decodeParameters(decoder);
          } else {
            const data = decoder.readBytes(paramTag.length);
            
            // Try to interpret common types
            if (paramTag.tagNumber === 0x04) { // OCTET STRING
              params[paramName] = decodeTBCDString(data);
            } else if (paramTag.tagNumber === 0x12) { // NumericString
              params[paramName] = data.toString('ascii');
            } else if (paramTag.tagNumber === 0x13) { // PrintableString
              params[paramName] = data.toString('ascii');
            } else {
              params[paramName] = data.toString('hex').toUpperCase();
            }
          }
        } catch {
          break;
        }
      }
      
      return Object.keys(params).length > 0 ? params : null;
    } catch {
      return null;
    }
  }

  private decodeError(decoder: BERDecoder): { code: number; name: string; parameters?: any } {
    const tag = decoder.decodeTag();
    const code = decoder.readInteger();
    
    // Known MAP/CAP errors
    const errorNames: Record<number, string> = {
      // MAP errors
      34: 'unknownSubscriber',
      35: 'unknownBaseStation',
      36: 'unknownMSC',
      37: 'unknownVLR',
      38: 'unknownLMSI',
      39: 'unknownLAI',
      42: 'unexpectedDataValue',
      43: 'dataMissing',
      44: 'unknownAlphabet',
      47: 'systemFailure',
      48: 'dataMissing',
      49: 'unexpectedDataValue',
      50: 'facilityNotSupported',
      51: 'unknownOrInvalidParameter',
      53: 'resourceLimitation',
      54: 'roamingNotAllowed',
      55: 'positionMethodFailure',
      56: 'illegalSubscriber',
      57: 'illegalEquipment',
      58: 'illegalME',
      59: 'subscriberBusyForMT-SMS',
      62: 'absentSubscriberSM',
      64: 'success',
      65: 'callBarred',
      66: 'forwardingViolation',
      67: 'cug-Reject',
      70: 'subscriberBusyForMT-SMS',
      71: 'absentSubscriber',
      72: 'subscriptionViolation',
      73: 'illegalSS-Operation',
      74: 'SS-ErrorStatus',
      75: 'SS-NotAvailable',
      76: 'SS-SubscriptionViolation',
      77: 'SS-Incompatibility',
      78: 'FacilityNotSupported',
      79: 'invalidTargetBaseStation',
      80: 'noRadioResourceAvailable',
      81: 'noRoamingNumberAvailable',
      82: 'teardown',
      83: 'callAttemptTerminated',
      84: 'absentSubscriber',
      85: 'operationNotAllowed',
      86: 'shortTermDenial',
      87: 'incompatibleTerminal',
      88: 'resourceLimitation',
      89: 'ATI-NotAllowed',
      90: 'noGroupCallNumber',
      91: 'encodingProblem',
      92: 'rejectByUser',
      93: 'rejectByNetwork',
      94: 'lowerLayerFailure',
      95: 'semanticError',
      96: 'syntacticError',
      97: 'invalidReceivedInfo',
      98: 'missingMandatoryIE',
      99: 'missingConditionalIE',
      100: 'messageNotCompliantWithEncoder',
      101: 'messageNotAcceptedForProtocolState',
      102: 'timeExpiry',
      103: 'unauthorizedRequestingNetwork',
      104: 'unauthorizedRequestingLocation',
      105: 'unauthorizedLCSClient',
      106: 'positionMethodNotSupported',
    };

    return {
      code,
      name: errorNames[code] || `Error(${code})`,
    };
  }

  private decodeProblem(decoder: BERDecoder): { type: ProblemType; code: number; description: string } {
    const tag = decoder.decodeTag();
    const problemType = tag.tagNumber as ProblemType;
    const code = decoder.readInteger();

    const descriptions: Record<string, Record<number, string>> = {
      [ProblemType.GENERAL]: {
        0: 'Unrecognized component',
        1: 'Mistyped component',
        2: 'Badly structured component',
      },
      [ProblemType.INVOKE]: {
        1: 'Duplicate invocation',
        2: 'Unrecognized operation',
        3: 'Mistyped argument',
        4: 'Resource limitation',
        5: 'Initiator releasing',
        6: 'Unrecognized linked ID',
        7: 'Linked response unexpected',
        8: 'Unexpected child operation',
      },
      [ProblemType.RETURN_RESULT]: {
        0: 'Unrecognized invocation',
        1: 'Return result unexpected',
        2: 'Mistyped result',
      },
      [ProblemType.RETURN_ERROR]: {
        0: 'Unrecognized invocation',
        1: 'Return error unexpected',
        2: 'Unrecognized error',
        3: 'Unexpected error',
        4: 'Mistyped error',
      },
    };

    return {
      type: problemType,
      code,
      description: descriptions[problemType]?.[code] || `Unknown problem ${code}`,
    };
  }

  private getRejectReason(problem?: { type: ProblemType; code: number; description: string }): string {
    if (!problem) return 'Unknown reason';
    return `[${ProblemType[problem.type]}] ${problem.description}`;
  }

  // ============================================================
  // MAP DECODING
  // ============================================================

  decodeMAP(buffer: Buffer, options?: any): DecodeResult<DecodedMAPMessage> {
    // First decode as TCAP, then extract MAP-specific info
    const tcapResult = this.decodeTCAP(buffer, options);
    
    if (!tcapResult.success || !tcapResult.data) {
      return tcapResult as DecodeResult<DecodedMAPMessage>;
    }

    const tcap = tcapResult.data;
    const result: DecodedMAPMessage = {
      ...tcap,
      protocol: SS7ProtocolLayer.MAP,
      operation: MAPOperationCode.UPDATE_LOCATION, // Will be updated
      operationName: '',
      parameters: {},
    };

    // Extract MAP operation from TCAP components
    if (tcap.components.length > 0) {
      const invokeComp = tcap.components.find(c => c.type === ComponentType.INVOKE);
      if (invokeComp) {
        result.operation = (invokeComp.operationCode || 0) as MAPOperationCode;
        result.operationName = MAP_OPERATION_NAMES[result.operation] || `Unknown(${result.operation})`;
        result.invokeId = invokeComp.invokeId;
        result.parameters = invokeComp.parameters || {};

        // Extract subscriber info from parameters
        this.extractMAPSubscribers(result, invokeComp.parameters);
      }
    }

    return { success: true, data: result };
  }

  private extractMAPSubscribers(result: DecodedMAPMessage, params: any): void {
    if (!params || typeof params !== 'object') return;

    // Look for IMSI/MSISDN in various parameter names
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string') {
        // IMSI is 15 digits starting with MCC
        if (/^\d{15}$/.test(value) && value.startsWith('603')) {
          result.sourceSubscriber = {
            imsi: value,
            msisdn: '', // Would need separate lookup
            maskedIMSI: maskIMSI(value),
            maskedMSISDN: '',
          };
        }
        // MSISDN detection (Algerian numbers)
        if (/^213\d{9}$/.test(value) || /^\+?213\d{9}$/.test(value)) {
          const msisdn = value.startsWith('+') ? value : '+213' + value;
          if (result.sourceSubscriber) {
            result.sourceSubscriber.msisdn = msisdn;
            result.sourceSubscriber.maskedMSISDN = maskMSISDN(msisdn);
          } else {
            result.sourceSubscriber = {
              imsi: '',
              msisdn,
              maskedIMSI: '',
              maskedMSISDN: maskMSISDN(msisdn),
            };
          }
        }
      }
    }
  }

  // ============================================================
  // CAP DECODING
  // ============================================================

  decodeCAP(buffer: Buffer, options?: any): DecodeResult<DecodedCAPMessage> {
    // First decode as TCAP, then extract CAP-specific info
    const tcapResult = this.decodeTCAP(buffer, options);
    
    if (!tcapResult.success || !tcapResult.data) {
      return tcapResult as DecodeResult<DecodedCAPMessage>;
    }

    const tcap = tcapResult.data;
    const result: DecodedCAPMessage = {
      ...tcap,
      protocol: SS7ProtocolLayer.CAP,
      operation: CAPOperationCode.INITIAL_DP,
      operationName: '',
      parameters: {},
    };

    // Extract CAP operation from TCAP components
    if (tcap.components.length > 0) {
      const invokeComp = tcap.components.find(c => c.type === ComponentType.INVOKE);
      if (invokeComp) {
        result.operation = (invokeComp.operationCode || 0) as CAPOperationCode;
        result.operationName = CAP_OPERATION_NAMES[result.operation] || `Unknown(${result.operation})`;
        result.invokeId = invokeComp.invokeId;
        result.parameters = invokeComp.parameters || {};

        // Extract call party numbers
        this.extractCAPNumbers(result, invokeComp.parameters);
      }
    }

    return { success: true, data: result };
  }

  private extractCAPNumbers(result: DecodedCAPMessage, params: any): void {
    if (!params || typeof params !== 'object') return;

    // Look for calling/called party numbers
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string') {
        const lowerKey = key.toLowerCase();
        if (lowerKey.includes('calling') || lowerKey.includes('a_party')) {
          result.callingNumber = value;
        }
        if (lowerKey.includes('called') || lowerKey.includes('b_party')) {
          result.calledNumber = value;
        }
      }
    }
  }

  // ============================================================
  // ISUP DECODING
  // ============================================================

  decodeISUP(buffer: Buffer, options?: any): DecodeResult<DecodedISUPMessage> {
    const result: DecodedISUPMessage = {
      id: generateMessageId(),
      timestamp: new Date(),
      protocol: SS7ProtocolLayer.ISUP,
      direction: options?.direction || 'inbound',
      opc: options?.opc ? parsePointCode(options.opc) : parsePointCode(0),
      dpc: options?.dpc ? parsePointCode(options.dpc) : parsePointCode(0),
      rawData: buffer,
      hexDump: hexDump(buffer),
      packetLength: buffer.length,
      message: ISUPMessageType.IAM,
      messageName: '',
      cic: 0,
    };

    try {
      // ISUP message structure:
      // Byte 0: Circuit Identification Code (CIC) - low bits
      // Byte 1: CIC - high bits + Message Type
      
      if (buffer.length < 4) {
        return { success: false, error: 'Buffer too short for ISUP', data: result };
      }

      const cicLow = buffer[0];
      const cicHighAndMsgType = buffer[1];
      const cic = cicLow | ((cicHighAndMsgType & 0x0F) << 8);
      const msgType = (cicHighAndMsgType >> 4) & 0x0F;
      
      // Some implementations use different byte ordering
      // Let's also check if byte 2 is the message type
      const altMsgType = buffer[2];
      
      result.cic = cic;
      result.message = (msgType > 0 && msgType <= 0x30) ? msgType as ISUPMessageType : 
                       altMsgType as ISUPMessageType;
      result.messageName = ISUP_MESSAGE_NAMES[result.message] || `Unknown ISUP(${result.message})`;

      result.decodedFields = {
        circuitIdentificationCode: cic,
        messageType: result.message,
        messageName: result.messageName,
      };

      // Parse mandatory fixed parameters based on message type
      this.parseISUPMandatoryFixed(result, buffer.slice(3));

      // Parse optional parameters
      this.parseISUPOptional(result, buffer);

      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: `ISUP decode error: ${error}`, data: result };
    }
  }

  private parseISUPMandatoryFixed(result: DecodedISUPMessage, buffer: Buffer): void {
    let offset = 0;

    switch (result.message) {
      case ISUPMessageType.IAM: // Initial Address Message
        if (buffer.length >= offset + 4) {
          result.iams = {
            natureOfConnection: buffer[offset++],
            forwardCallIndicators: buffer[offset++],
            callingPartyCategory: buffer[offset++],
            transmissionMediumRequirement: buffer[offset++],
          };
        }
        break;

      case ISUPMessageType.ACM: // Address Complete
        if (buffer.length >= offset + 1) {
          result.decodedFields!.backwardCallIndicators = buffer[offset];
        }
        break;

      case ISUPMessageType.ANM: // Answer
        // No mandatory fixed parameters
        break;

      case ISUPMessageType.REL: // Release
        if (buffer.length >= offset + 2) {
          result.causeValue = buffer[offset + 1];
          result.causeDescription = this.getCauseDescription(result.causeValue);
          result.decodedFields!.causeIndicator = buffer[offset];
        }
        break;

      case ISUPMessageType.RLC: // Release Complete
        // No mandatory fixed parameters
        break;
    }
  }

  private parseISUPOptional(result: DecodedISUPMessage, buffer: Buffer): void {
    // Find optional parameters pointer
    // This varies by message type, but usually after mandatory fixed
    let optPtr = 0;
    
    switch (result.message) {
      case ISUPMessageType.IAM:
        optPtr = buffer[7] || 0; // Optional pointer after fixed fields
        break;
      case ISUPMessageType.REL:
        optPtr = buffer[3] || 0;
        break;
      default:
        optPtr = buffer[buffer.length - 1] || 0;
    }

    if (optPtr >= buffer.length) return;

    const optStart = optPtr;
    const optLength = buffer[optStart];

    if (optStart + optLength > buffer.length) return;

    let offset = optStart + 1;
    const endOpt = optStart + 1 + optLength;

    while (offset < endOpt && offset < buffer.length) {
      const paramType = buffer[offset++];
      const paramLength = buffer[offset++];

      if (offset + paramLength > buffer.length) break;

      const paramData = buffer.slice(offset, offset + paramLength);
      offset += paramLength;

      this.parseISUPParameter(result, paramType, paramData);
    }
  }

  private parseISUPParameter(result: DecodedISUPMessage, paramType: number, paramData: Buffer): void {
    switch (paramType) {
      case 0x01: // Called Party Number
        result.calledPartyNumber = this.decodeISUPNumber(paramData);
        result.decodedFields!.calledPartyNumber = result.calledPartyNumber;
        break;

      case 0x0A: // Calling Party Number
        result.callingPartyNumber = this.decodeISUPNumber(paramData);
        result.decodedFields!.callingPartyNumber = result.callingPartyNumber;
        break;

      case 0x1E: // Cause Indicators
        if (paramData.length >= 2) {
          result.causeValue = paramData[1] & 0x7F;
          result.causeDescription = this.getCauseDescription(result.causeValue);
        }
        break;

      default:
        // Store unknown parameters
        if (!result.decodedFields!.optionalParameters) {
          result.decodedFields!.optionalParameters = {};
        }
        result.decodedFields!.optionalParameters![`param_0x${paramType.toString(16)}`] = bufferToHex(paramData);
    }
  }

  private decodeISUPNumber(data: Buffer): string {
    if (data.length < 1) return '';

    const oddEvenIndicator = data[0] & 0x80;
    const natureOfAddress = data[0] & 0x7F;
    const digits = decodeTBCDString(data.slice(1));
    
    // If odd number of digits, last nibble is filler
    let number = oddEvenIndicator ? digits.slice(0, -1) : digits;
    
    // Add + prefix for international numbers
    if (natureOfAddress === 0x04 || natureOfAddress === 0x05) {
      number = '+' + number;
    }

    return number;
  }

  private getCauseDescription(cause?: number): string {
    if (cause === undefined) return '';
    
    const causeDescriptions: Record<number, string> = {
      1: 'Unassigned (unallocated) number',
      3: 'No route to destination',
      6: 'Channel unacceptable',
      16: 'Normal call clearing',
      17: 'User busy',
      18: 'No user responding',
      19: 'User alerting, no answer',
      21: 'Call rejected',
      22: 'Number changed',
      27: 'Destination out of order',
      28: 'Invalid number format (address incomplete)',
      29: 'Facility rejected',
      30: 'Response to STATUS ENQUIRY',
      31: 'Normal, unspecified',
      34: 'No circuit/channel available',
      38: 'Network out of order',
      41: 'Temporary failure',
      42: 'Switching equipment congestion',
      43: 'Access information discarded',
      44: 'Requested circuit/channel not available',
      47: 'Resource unavailable, unspecified',
      49: 'Quality of service unavailable',
      50: 'Requested facility not subscribed',
      52: 'Outgoing calls barred within CUG',
      54: 'Incoming calls barred within CUG',
      57: 'Bearer capability not authorized',
      58: 'Bearer capability not presently available',
      63: 'Service or option not available, unspecified',
      65: 'Bearer capability not implemented',
      66: 'Channel type not implemented',
      69: 'Requested facility not implemented',
      70: 'Only restricted digital information bearer capability available',
      79: 'Service or option not implemented, unspecified',
      87: 'User not member of CUG',
      87: 'Incoming calls barred within CUG',
      88: 'Incompatible destination',
      91: 'Invalid transit network selection',
      95: 'Semantically incorrect message',
      96: 'Invalid mandatory information',
      97: 'Message type non-existent or not implemented',
      98: 'Message not compatible with call state or message type non-existent',
      99: 'Information element/parameter non-existent or not implemented',
      100: 'Invalid information element contents',
      101: 'Message not compatible with call state',
      102: 'Recovery on timer expiry',
      111: 'Protocol error, unspecified',
      127: 'Interworking, unspecified',
    };

    return causeDescriptions[cause] || `Cause ${cause}`;
  }

  // ============================================================
  // RAW FALLBACK DECODER
  // ============================================================

  private decodeRaw(buffer: Buffer, options?: any): DecodeResult<SS7Message> {
    const result: SS7Message = {
      id: generateMessageId(),
      timestamp: new Date(),
      protocol: SS7ProtocolLayer.MTP3,
      direction: options?.direction || 'inbound',
      rawData: buffer,
      hexDump: hexDump(buffer),
      packetLength: buffer.length,
      decodedFields: {
        rawHex: bufferToHex(buffer),
        note: 'Could not auto-detect protocol',
      },
    };

    return { success: true, data: result };
  }

  // ============================================================
  // UTILITY METHODS
  // ============================================================

  /**
   * Batch decode multiple messages
   */
  batchDecode(messages: Array<{ data: Buffer | string; options?: any }>): DecodeResult<SS7Message>[] {
    return messages.map(msg => this.decode(msg.data, msg.options));
  }

  /**
   * Get protocol statistics from decoded messages
   */
  getProtocolStats(messages: SS7Message[]): Record<string, number> {
    const stats: Record<string, number> = {};
    
    for (const msg of messages) {
      const proto = msg.protocol;
      stats[proto] = (stats[proto] || 0) + 1;
    }
    
    return stats;
  }

  private log(message: string): void {
    if (this.debugMode) {
      console.log(`[SS7Decoder] ${message}`);
    }
  }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

let messageIdCounter = 0;

function generateMessageId(): string {
  messageIdCounter++;
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `ss7_${timestamp}_${random}_${messageIdCounter}`;
}

/**
 * Create a singleton decoder instance
 */
export function createDecoder(debug: boolean = false): SS7Decoder {
  return new SS7Decoder(debug);
}

// Export convenience functions
export function decodeSS7Message(
  data: Buffer | string,
  options?: {
    assumedProtocol?: SS7ProtocolLayer;
    opc?: number;
    dpc?: number;
    direction?: 'inbound' | 'outbound';
  }
): DecodeResult<SS7Message> {
  const decoder = new SS7Decoder();
  return decoder.decode(data, options);
}

export function decodeMAPMessage(
  data: Buffer | string,
  options?: any
): DecodeResult<DecodedMAPMessage> {
  const decoder = new SS7Decoder();
  return decoder.decodeMAP(typeof data === 'string' ? hexToBuffer(data) : data, options);
}

export function decodeCAPMessage(
  data: Buffer | string,
  options?: any
): DecodeResult<DecodedCAPMessage> {
  const decoder = new SS7Decoder();
  return decoder.decodeCAP(typeof data === 'string' ? hexToBuffer(data) : data, options);
}

export function decodeISUPMessage(
  data: Buffer | string,
  options?: any
): DecodeResult<DecodedISUPMessage> {
  const decoder = new SS7Decoder();
  return decoder.decodeISUP(typeof data === 'string' ? hexToBuffer(data) : data, options);
}

export function decodeSCCPMessage(
  data: Buffer | string,
  options?: any
): DecodeResult<DecodedSCCPMessage> {
  const decoder = new SS7Decoder();
  return decoder.decodeSCCP(typeof data === 'string' ? hexToBuffer(data) : data, options);
}
