/**
 * SS7 Messages Inspection API
 * Djezzy National SOC Platform - SS7 Tools Suite
 * 
 * Endpoints:
 * GET /api/ss7/messages - Recent messages list
 * GET /api/ss7/messages/:id - Full message detail (decoded)
 * POST /api/ss7/messages/decode - Decode raw hex message
 * GET /api/ss7/messages/export - Export as PCAP
 */

import { NextRequest, NextResponse } from 'next/server';
import { decodeSS7Message, SS7ProtocolLayer } from '@/lib/ss7/ss7-decoder';

// Sample messages database (in production, this would query a real DB)
const sampleMessages = [
  {
    id: 'msg_001',
    timestamp: new Date(Date.now() - 5000).toISOString(),
    protocol: 'MAP',
    direction: 'inbound',
    opc: '3-065-001',
    dpc: '3-003-001',
    sls: 5,
    rawHex: '62284804010a000201010100020101020103010203020401' +
             '0510060a071808021909010a010b010c010d010e010f03101101' +
             '121201131415161718191a1b1c1d1e1f20212223242526',
    packetLength: 87,
    operationName: 'sendAuthenticationInfo',
    subscriberInfo: {
      maskedMSISDN: '+21355****56',
      maskedIMSI: '60301********',
    },
    sourceIP: '10.64.15.23',
    destPort: 2905,
    linksetName: 'LINKSET-MSC-HLR',
    riskScore: 5,
  },
  {
    id: 'msg_002',
    timestamp: new Date(Date.now() - 12000).toISOString(),
    protocol: 'ISUP',
    direction: 'outbound',
    opc: '3-101-001',
    dpc: '3-065-001',
    sls: 12,
    rawHex: '01010315060a030400120604042d21680039104a1309006821670070' +
             '04000702001800705010802',
    packetLength: 42,
    operationName: 'IAM (Initial Address Message)',
    messageType: 'Initial Address Message',
    subscriberInfo: {
      maskedMSISDN: '+21366****54',
      maskedIMSI: '',
    },
    sourceIP: '10.64.15.24',
    destPort: 2905,
    linksetName: 'LINKSET-MSC-STP',
    riskScore: 35,
  },
  {
    id: 'msg_003',
    timestamp: new Date(Date.now() - 25000).toISOString(),
    protocol: 'CAP',
    direction: 'inbound',
    opc: '3-281-001',
    dpc: '3-101-001',
    sls: 3,
    rawHex: '62284804010a0002010101000201010201030102030204010510' +
             '060a071808021909010a010b010c010d010e010f03101101' +
             '121201131415161718191a1b1c1d1e1f2021',
    packetLength: 78,
    operationName: 'initialDP',
    subscriberInfo: {
      maskedMSISDN: '+21377****78',
      maskedIMSI: '',
    },
    sourceIP: '10.64.15.25',
    destPort: 2905,
    linksetName: 'LINKSET-SCP-MSC',
    riskScore: 15,
  },
];

function generateDecodedDetail(messageId: string) {
  const base = sampleMessages.find(m => m.id === messageId);
  
  if (!base) return null;
  
  // Generate detailed decoded structure based on protocol
  let decodedFields;
  
  switch (base.protocol) {
    case 'MAP':
      decodedFields = [
        { name: 'TCAP', value: '', type: 'container', children: [
          { name: 'Transaction ID', value: '0x000001A4', type: 'integer', offset: 4, length: 4 },
          { name: 'Dialogue Portion', value: 'map-ac v3', type: 'oid', offset: 12 },
          { name: 'Components', value: '1 component', type: 'array', children: [
            { name: 'Invoke', value: '', type: 'component', children: [
              { name: 'Invoke ID', value: '7', type: 'integer' },
              { name: 'Operation Code', value: 'sendAuthenticationInfo (56)', type: 'operation' },
              { name: 'Parameters', value: '', type: 'container', children: [
                { name: 'imsi', value: '60301********', type: 'tbcd-string' },
                { name: 'numberOfRequestedVectors', value: '5', type: 'integer' },
                { name: 'segmentationProhibited', value: 'true', type: 'boolean' },
              ]}
            ]}
          ]}
        ]},
        { name: 'SCCP', value: '', type: 'container', children: [
          { name: 'Message Type', value: 'UDT (Unitdata)', type: 'enum' },
          { name: 'Protocol Class', value: 'Class 0', type: 'integer' },
          { name: 'Called Party Address', value: '+21355****56', type: 'gt' },
          { name: 'Calling Party Address', value: '3-065-001', type: 'pc' },
          { name: 'Destination SSN', value: 'MAP-HLR (8)', type: 'ssn' },
        ]},
        { name: 'MTP3 Routing Label', value: '', type: 'container', children: [
          { name: 'OPC', value: '3-065-001', type: 'pointcode' },
          { name: 'DPC', value: '3-003-001', type: 'pointcode' },
          { name: 'SLS', value: '5', type: 'integer' },
        ]}
      ];
      break;
      
    case 'ISUP':
      decodedFields = [
        { name: 'ISUP', value: '', type: 'container', children: [
          { name: 'Message Type', value: 'IAM (Initial Address Message)', type: 'enum' },
          { name: 'CIC', value: '453', type: 'integer', offset: 2, length: 2 },
          { name: 'Nature of Connection', value: 'Satellite ISUP', type: 'hex', offset: 4 },
          { name: 'Forward Call Indicators', value: '0x00', type: 'hex' },
          { name: 'Calling Party Category', value: 'Ordinary calling subscriber', type: 'enum' },
          { name: 'Transmission Medium Requirement', value: '64kbps clear', type: 'enum' },
          { name: 'Called Party Number', value: '+22250123456', type: 'e164' },
          { name: 'Calling Party Number', value: '+21366****54', type: 'e164' },
        ]}
      ];
      break;
      
    case 'CAP':
      decodedFields = [
        { name: 'TCAP', value: '', type: 'container', children: [
          { name: 'Transaction ID', value: '0x000001B2', type: 'integer' },
          { name: 'Dialogue Portion', value: 'cap-ac v3', type: 'oid' },
          { name: 'Components', value: '1 component', type: 'array', children: [
            { name: 'Invoke', value: '', type: 'component', children: [
              { name: 'Invoke ID', value: '3', type: 'integer' },
              { name: 'Operation Code', value: 'initialDP (0)', type: 'operation' },
              { name: 'Parameters', value: '', type: 'container', children: [
                { name: 'Service Key', value: '99', type: 'integer' },
                { name: 'Calling Party Number', value: '+21377****78', type: 'bcd' },
                { name: 'Called Party Number', value: '+22250123456', type: 'bcd' },
                { name: 'Location Information', value: 'VLR-Algiers', type: 'enum' },
              ]}
            ]}
          ]}
        ]}
      ];
      break;
      
    default:
      decodedFields = [{ name: 'Raw Data', value: base.rawHex, type: 'hex' }];
  }
  
  return {
    ...base,
    decodedFields,
  };
}

function formatHexDump(hex: string): string[] {
  const lines: string[] = [];
  const cleanHex = hex.replace(/[^0-9a-fA-F]/g, '');
  
  for (let i = 0; i < cleanHex.length; i += 32) {
    const offset = Math.floor(i / 2);
    const hexPart = cleanHex.slice(i, i + 32);
    
    let formattedHex = '';
    for (let j = 0; j < hexPart.length; j += 2) {
      if (j > 0 && j % 2 === 0) formattedHex += ' ';
      formattedHex += hexPart.substring(j, j + 2).toUpperCase();
    }
    
    lines.push(`${offset.toString(16).padStart(8, '0')}  ${formattedHex.padEnd(47)}  |${'|'.repeat(16)}|`);
  }
  
  return lines;
}

// Generate PCAP data (simplified)
function generatePCAPData(messages: any[]): string {
  // This is a simplified PCAP generator - production would use proper libpcap format
  const pcapHeader = Buffer.from([
    0xd4, 0xc3, 0xb2, 0xa1, // Magic number
    0x02, 0x00, 0x04, 0x00, // Version 2.4
    0x00, 0x00, 0x00, 0x00, // Timezone offset
    0x00, 0x00, 0x00, 0x00, // Timestamp accuracy
    0xff, 0xff, 0x00, 0x00, // Snaplen
    0x01, 0x00, 0x00, 0x00, // Link layer type (Ethernet)
  ]);
  
  // Return as base64 for JSON transport
  return pcapHeader.toString('base64');
}

// GET handler
export async function GET(request: NextRequest, { params }: { params: { id?: string[] } }) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const messageId = params?.id?.[0];
    
    if (messageId) {
      // Get specific message detail
      const detail = generateDecodedDetail(messageId);
      
      if (!detail) {
        return NextResponse.json(
          { success: false, error: 'Message not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        data: detail,
        timestamp: new Date().toISOString(),
      });
    }
    
    switch (action) {
      case 'export':
        return handleExport(searchParams);
        
      default:
        return handleGetMessages(searchParams);
    }
  } catch (error) {
    console.error('SS7 Messages API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST handler
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    switch (action) {
      case 'decode':
        return handleDecode(body);
        
      default:
        return NextResponse.json(
          { success: false, error: 'Unknown action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('SS7 Messages POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleGetMessages(searchParams: URLSearchParams) {
  const limit = parseInt(searchParams.get('limit') || '100');
  const protocol = searchParams.get('protocol');
  const direction = searchParams.get('direction');
  const offset = parseInt(searchParams.get('offset') || '0');
  
  let messages = [...sampleMessages];
  
  // Apply filters
  if (protocol && protocol !== 'all') {
    messages = messages.filter(m => m.protocol.toUpperCase() === protocol.toUpperCase());
  }
  
  if (direction && direction !== 'all') {
    messages = messages.filter(m => m.direction === direction);
  }
  
  // Apply pagination
  const paginatedMessages = messages.slice(offset, offset + limit);
  
  return NextResponse.json({
    success: true,
    data: {
      messages: paginatedMessages,
      totalCount: messages.length,
      limit,
      offset,
      hasMore: offset + limit < messages.length,
    },
    timestamp: new Date().toISOString(),
  });
}

async function handleDecode(body: any) {
  const { hexData, assumedProtocol } = body;
  
  if (!hexData) {
    return NextResponse.json(
      { success: false, error: 'hexData is required' },
      { status: 400 }
    );
  }
  
  try {
    // Use the decoder library
    const result = decodeSS7Message(hexData, {
      assumedProtocol: assumedProtocol as SS7ProtocolLayer,
    });
    
    return NextResponse.json({
      success: true,
      data: {
        input: hexData,
        decoded: result.data,
        warnings: result.warnings,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (decodeError) {
    return NextResponse.json({
      success: false,
      error: `Decode failed: ${decodeError instanceof Error ? decodeError.message : 'Unknown error'}`,
      rawInput: hexData,
    }, { status: 400 });
  }
}

async function handleExport(searchParams: URLSearchParams) {
  const format = searchParams.get('format') || 'pcap';
  const protocol = searchParams.get('protocol');
  const limit = parseInt(searchParams.get('limit') || '100');
  
  let messages = sampleMessages;
  
  if (protocol && protocol !== 'all') {
    messages = messages.filter(m => m.protocol.toUpperCase() === protocol.toUpperCase());
  }
  
  messages = messages.slice(0, limit);
  
  switch (format.toLowerCase()) {
    case 'pcap':
      const pcapData = generatePCAPData(messages);
      return NextResponse.json({
        success: true,
        data: {
          format: 'pcap',
          filename: `ss7_export_${Date.now()}.pcap`,
          content: pcapData,
          size: Math.round(pcapData.length * 0.75),
          messageCount: messages.length,
        },
        timestamp: new Date().toISOString(),
      });
      
    case 'json':
      return NextResponse.json({
        success: true,
        data: {
          format: 'json',
          messages,
          exportTime: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      });
      
    case 'csv':
      // Generate CSV headers and rows
      const headers = ['id', 'timestamp', 'protocol', 'direction', 'opc', 'dpc', 'sls', 'packetLength', 'operationName'];
      const csvRows = [headers.join(',')];
      
      messages.forEach(msg => {
        csvRows.push([
          msg.id,
          msg.timestamp,
          msg.protocol,
          msg.direction,
          msg.opc,
          msg.dpc,
          msg.sls.toString(),
          msg.packetLength.toString(),
          msg.operationName || '',
        ].join(','));
      });
      
      return new Response(csvRows.join('\n'), {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="ss7_export_${Date.now()}.csv"`,
        },
      });
      
    default:
      return NextResponse.json(
        { success: false, error: `Unsupported format: ${format}` },
        { status: 400 }
      );
  }
}
