'use client';

/**
 * Message Inspector Component
 * Djezzy National SOC Platform - SS7 Tools Suite
 * 
 * SS7 Message Detail Viewer:
 * - Raw hex dump viewer
 * - Decoded message fields (tree view)
 * - Message flow diagram (call flow)
 * - Export to PCAP/Wireshark format
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileCode2, Eye, Download, Copy, Check,
  ChevronRight, ChevronDown, Search, Filter,
  ArrowRightLeft, Clock, Hash, Layers,
  RefreshCw, Maximize2, Minimize2, Terminal,
  TreePine, Binary, Info, AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

// Types
interface DecodedField {
  name: string;
  value: string;
  type: string;
  offset?: number;
  length?: number;
  children?: DecodedField[];
}

interface SS7MessageDetail {
  id: string;
  timestamp: Date;
  protocol: string;
  direction: 'inbound' | 'outbound';
  
  // Routing info
  opc: string;
  dpc: string;
  sls: number;
  
  // Raw data
  rawHex: string;
  packetLength: number;
  
  // Decoded structure
  decodedFields: DecodedField[];
  
  // Summary
  operationName?: string;
  messageType?: string;
  subscriberInfo?: {
    maskedMSISDN: string;
    maskedIMSI: string;
  };
  
  // Metadata
  sourceIP: string;
  destPort: number;
  linksetName: string;
  riskScore: number;
}

// Sample message data generator
function generateSampleMessages(): SS7MessageDetail[] {
  return [
    {
      id: 'msg_001',
      timestamp: new Date(Date.now() - 5000),
      protocol: 'MAP',
      direction: 'inbound',
      opc: '3-065-001',
      dpc: '3-003-001',
      sls: 5,
      rawHex: '62284804010a0002010101000201010201' +
               '0301020302030401040510060a07180802190901' +
               '0a010b010c010d010e010f0310110112120113' +
               '011415161718191a1b1c1d1e1f20212223242526',
      packetLength: 87,
      decodedFields: [
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
      ],
      operationName: 'sendAuthenticationInfo',
      subscriberInfo: { maskedMSISDN: '+21355****56', maskedIMSI: '60301********' },
      sourceIP: '10.64.15.23',
      destPort: 2905,
      linksetName: 'LINKSET-MSC-HLR',
      riskScore: 5,
    },
    {
      id: 'msg_002',
      timestamp: new Date(Date.now() - 12000),
      protocol: 'ISUP',
      direction: 'outbound',
      opc: '3-101-001',
      dpc: '3-065-001',
      sls: 12,
      rawHex: '01010315060a030400120604042d216' +
               '80039104a130900682160700400070200' +
               '01800705010802',
      packetLength: 42,
      decodedFields: [
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
      ],
      operationName: 'IAM',
      messageType: 'Initial Address Message',
      subscriberInfo: { maskedMSISDN: '+21366****54', maskedIMSI: '' },
      sourceIP: '10.64.15.24',
      destPort: 2905,
      linksetName: 'LINKSET-MSC-STP',
      riskScore: 35,
    },
    {
      id: 'msg_003',
      timestamp: new Date(Date.now() - 25000),
      protocol: 'CAP',
      direction: 'inbound',
      opc: '3-281-001',
      dpc: '3-101-001',
      sls: 3,
      rawHex: '62284804010a0002010101000201010201' +
               '0301020302030401040510060a0718080219' +
               '09010a010b010c010d010e010f03101101' +
               '121201131415161718191a1b1c1d1e1f2021',
      packetLength: 78,
      decodedFields: [
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
      ],
      operationName: 'initialDP',
      subscriberInfo: { maskedMSISDN: '+21377****78', maskedIMSI: '' },
      sourceIP: '10.64.15.25',
      destPort: 2905,
      linksetName: 'LINKSET-SCP-MSC',
      riskScore: 15,
    },
    {
      id: 'msg_004',
      timestamp: new Date(Date.now() - 45000),
      protocol: 'MAP',
      direction: 'outbound',
      opc: '3-003-001',
      dpc: '3-065-001',
      sls: 8,
      rawHex: '62284804010a0002010101000201010201' +
               '0301020302030401040510060a0718080219' +
               '09010a010b010c010d010e010f03101101' +
               '121201131415161718191a1b1c1d1e1f2021',
      packetLength: 82,
      decodedFields: [
        { name: 'TCAP', value: '', type: 'container', children: [
          { name: 'Transaction ID', value: '0x000001C8', type: 'integer' },
          { name: 'Components', value: '1 component', type: 'array', children: [
            { name: 'Return Result Last', value: '', type: 'component', children: [
              { name: 'Invoke ID', value: '7', type: 'integer' },
              { name: 'Result', value: 'success', type: 'null' },
              { name: 'Parameters', value: '', type: 'container', children: [
                { name: 'authenticationSetList', value: '[5 vectors]', type: 'sequence-of' },
                { name: 'vector[0].RAND', value: 'A3F8E2...', type: 'octet-string' },
                { name: 'vector[0].SRES', value: '9B4C2A...', type: 'octet-string' },
                { name: 'vector[0].Kc', value: '7D1E8F...', type: 'octet-string' },
              ]}
            ]}
          ]}
        ]}
      ],
      operationName: 'sendAuthenticationInfo Response',
      subscriberInfo: { maskedMSISDN: '+21355****56', maskedIMSI: '60301********' },
      sourceIP: '10.64.15.23',
      destPort: 2905,
      linksetName: 'LINKSET-HLR-MSC',
      riskScore: 2,
    }
  ];
}

function formatHexDump(hex: string, bytesPerLine: number = 16): string[] {
  const lines: string[] = [];
  const cleanHex = hex.replace(/[^0-9a-fA-F]/g, '');
  
  for (let i = 0; i < cleanHex.length; i += bytesPerLine * 2) {
    const offset = Math.floor(i / 2);
    const hexPart = cleanHex.slice(i, i + bytesPerLine * 2);
    
    // Format hex with spaces
    let formattedHex = '';
    for (let j = 0; j < hexPart.length; j += 2) {
      if (j > 0 && j % 2 === 0) formattedHex += ' ';
      formattedHex += hexPart.substring(j, j + 2).toUpperCase();
    }
    
    // Generate ASCII representation
    let ascii = '';
    for (let j = 0; j < hexPart.length; j += 2) {
      const byteVal = parseInt(hexPart.substring(j, j + 2), 16);
      ascii += (byteVal >= 32 && byteVal <= 126) ? String.fromCharCode(byteVal) : '.';
    }
    
    lines.push(`${offset.toString(16).padStart(8, '0')}  ${formattedHex.padEnd(bytesPerLine * 3)}  |${ascii}|`);
  }
  
  return lines;
}

// Main Component
export default function MessageInspector() {
  const [messages, setMessages] = useState<SS7MessageDetail[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<SS7MessageDetail | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProtocol, setFilterProtocol] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('decoded');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    setMessages(generateSampleMessages());
    setSelectedMessage(generateSampleMessages()[0]);
  }, []);

  const filteredMessages = messages.filter(msg => {
    if (filterProtocol !== 'all' && msg.protocol.toLowerCase() !== filterProtocol.toLowerCase()) return false;
    if (searchTerm && !msg.id.includes(searchTerm) && 
        !msg.operationName?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !msg.rawHex.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const handleCopyToClipboard = useCallback((text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileCode2 className="w-6 h-6 text-green-400" />
            Message Inspector
          </h2>
          <p className="text-gray-400 mt-1">SS7 message analysis and decoding</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setMessages(generateSampleMessages())}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Load Recent
          </Button>
          
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-1" />
            Export PCAP
          </Button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Messages List */}
        <Card className="bg-slate-900/50 border-slate-700 lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <Hash className="w-4 h-4 text-blue-400" />
              Messages ({filteredMessages.length})
            </CardTitle>
            
            {/* Search and Filter */}
            <div className="flex gap-2 mt-3">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input 
                  placeholder="Search..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 bg-slate-800 border-slate-600"
                />
              </div>
              
              <Select value={filterProtocol} onValueChange={setFilterProtocol}>
                <SelectTrigger className="w-[100px] bg-slate-800 border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="map">MAP</SelectItem>
                  <SelectItem value="isup">ISUP</SelectItem>
                  <SelectItem value="cap">CAP</SelectItem>
                  <SelectItem value="sccp">SCCP</SelectItem>
                  <SelectItem value="tcap">TCAP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              <div className="divide-y divide-slate-800">
                {filteredMessages.map(msg => (
                  <div
                    key={msg.id}
                    onClick={() => setSelectedMessage(msg)}
                    className={`p-3 cursor-pointer transition-colors hover:bg-slate-800/50 ${
                      selectedMessage?.id === msg.id ? 'bg-blue-900/20 border-l-2 border-l-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <Badge variant="outline" className={
                        msg.protocol === 'MAP' ? 'border-blue-500 text-blue-400' :
                        msg.protocol === 'ISUP' ? 'border-cyan-500 text-cyan-400' :
                        msg.protocol === 'CAP' ? 'border-red-500 text-red-400' :
                        'border-gray-500 text-gray-400'
                      }>
                        {msg.protocol}
                      </Badge>
                      
                      <span className={`text-xs ${
                        msg.direction === 'inbound' ? 'text-green-400' : 'text-orange-400'
                      }`}>
                        {msg.direction.toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="font-mono text-sm text-white truncate">
                      {msg.operationName || msg.messageType || 'Unknown'}
                    </div>
                    
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span>{msg.timestamp.toLocaleTimeString()}</span>
                      <span>{msg.opc} → {msg.dpc}</span>
                      <span>{msg.packetLength} bytes</span>
                    </div>
                    
                    {/* Risk indicator */}
                    {msg.riskScore > 20 && (
                      <div className="mt-2">
                        <Badge 
                          variant="outline"
                          className={
                            msg.riskScore > 50 ? 'border-red-500 text-red-400' :
                            'border-yellow-500 text-yellow-400'
                          }
                        >
                          Risk: {msg.riskScore}
                        </Badge>
                      </div>
                    )}
                  </div>
                ))}
                
                {filteredMessages.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    No messages match your filters
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Message Detail */}
        <Card className="bg-slate-900/50 border-slate-700 lg:col-span-2">
          {selectedMessage ? (
            <>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white text-lg flex items-center gap-2">
                      <Eye className="w-4 h-4 text-green-400" />
                      {selectedMessage.operationName || selectedMessage.messageType || 'Message Detail'}
                    </CardTitle>
                    <CardDescription className="mt-1 flex items-center gap-3">
                      <span>ID: {selectedMessage.id}</span>
                      <span>•</span>
                      <span>{selectedMessage.timestamp.toLocaleString()}</span>
                      <span>•</span>
                      <Badge variant="outline" className={
                        selectedMessage.protocol === 'MAP' ? 'border-blue-500 text-blue-400' :
                        selectedMessage.protocol === 'ISUP' ? 'border-cyan-500 text-cyan-400' :
                        'border-red-500 text-red-400'
                      }>
                        {selectedMessage.protocol}
                      </Badge>
                    </CardDescription>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {selectedMessage.riskScore > 20 && (
                      <Badge variant="outline" className={
                        selectedMessage.riskScore > 50 ? 'border-red-500 text-red-400' :
                        'border-yellow-500 text-yellow-400'
                      }>
                        Risk Score: {selectedMessage.riskScore}
                      </Badge>
                    )}
                    
                    <Button variant="ghost" size="sm">
                      <Maximize2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                {/* Quick Info Bar */}
                <div className="grid grid-cols-4 gap-3 mb-4 p-3 bg-slate-800/50 rounded-lg">
                  <QuickInfo label="Source PC" value={selectedMessage.opc} mono />
                  <QuickInfo label="Dest PC" value={selectedMessage.dpc} mono />
                  <QuickInfo label="SLS" value={selectedMessage.sls.toString()} mono />
                  <QuickInfo label="Size" value={`${selectedMessage.packetLength} bytes`} mono />
                  
                  {selectedMessage.subscriberInfo?.maskedMSISDN && (
                    <QuickInfo label="Subscriber" value={selectedMessage.subscriberInfo.maskedMSISDN} />
                  )}
                  <QuickInfo label="Linkset" value={selectedMessage.linksetName} />
                  <QuickInfo label="Source IP" value={selectedMessage.sourceIP} mono />
                  <QuickInfo label="Direction" value={selectedMessage.direction.toUpperCase()} 
                    color={selectedMessage.direction === 'inbound' ? 'text-green-400' : 'text-orange-400'} 
                  />
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="bg-slate-800">
                    <TabsTrigger value="decoded" className="data-[state=active]:bg-slate-600">
                      <TreePine className="w-4 h-4 mr-1" />
                      Decoded
                    </TabsTrigger>
                    <TabsTrigger value="hex" className="data-[state=active]:bg-slate-600">
                      <Binary className="w-4 h-4 mr-1" />
                      Hex Dump
                    </TabsTrigger>
                    <TabsTrigger value="flow" className="data-[state=active]:bg-slate-600">
                      <ArrowRightLeft className="w-4 h-4 mr-1" />
                      Flow
                    </TabsTrigger>
                  </TabsList>

                  {/* Decoded View */}
                  <TabsContent value="decoded" className="mt-4">
                    <ScrollArea className="h-[350px] rounded-md border border-slate-700">
                      <div className="p-4 font-mono text-sm">
                        <DecodedTree 
                          fields={selectedMessage.decodedFields} 
                          level={0}
                          onCopy={handleCopyToClipboard}
                          copiedField={copiedField}
                        />
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  {/* Hex Dump View */}
                  <TabsContent value="hex" className="mt-4">
                    <div className="relative">
                      <div className="absolute top-2 right-2 z-10">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleCopyToClipboard(selectedMessage.rawHex, 'hex')}
                        >
                          {copiedField === 'hex' ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                          {copiedField === 'hex' ? 'Copied!' : 'Copy'}
                        </Button>
                      </div>
                      
                      <ScrollArea className="h-[350px] rounded-md border border-slate-700 bg-slate-950">
                        <pre className="p-4 text-xs text-green-400 font-mono leading-relaxed">
                          {formatHexDump(selectedMessage.rawHex).map((line, idx) => (
                            <div key={idx} className="hover:bg-slate-800 px-1">{line}</div>
                          ))}
                        </pre>
                      </ScrollArea>
                    </div>
                  </TabsContent>

                  {/* Message Flow View */}
                  <TabsContent value="flow" className="mt-4">
                    <div className="h-[350px] rounded-md border border-slate-700 p-4 bg-slate-950">
                      <MessageFlowDiagram message={selectedMessage} />
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </>
          ) : (
            <CardContent className="pt-6">
              <div className="h-[500px] flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <FileCode2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Select a message to view details</p>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}

// Sub-components
function QuickInfo({ label, value, mono, color }: { 
  label: string; 
  value: string; 
  mono?: boolean;
  color?: string;
}) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-sm ${mono ? 'font-mono' : ''} ${color || 'text-white'}`}>
        {value}
      </div>
    </div>
  );
}

function DecodedTree({ 
  fields, 
  level, 
  onCopy, 
  copiedField 
}: { 
  fields: DecodedField[]; 
  level: number; 
  onCopy: (text: string, fieldId: string) => void;
  copiedField: string | null;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  return (
    <div>
      {fields.map((field, idx) => {
        const fieldId = `${field.name}-${idx}`;
        const isExpanded = expanded[fieldId];
        const hasChildren = field.children && field.children.length > 0;

        return (
          <div key={idx} style={{ marginLeft: level * 16 }}>
            <div 
              className={`flex items-center py-1 px-2 rounded hover:bg-slate-800/50 group cursor-pointer`}
              onClick={() => hasChildren && setExpanded(prev => ({ ...prev, [fieldId]: !prev[fieldId] }))}
            >
              {/* Expand/Collapse icon */}
              <span className="w-4 mr-1 text-gray-500">
                {hasChildren ? (
                  isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
                ) : (
                  <span className="inline-block w-1 h-1 rounded-full bg-gray-600 ml-1" />
                )}
              </span>

              {/* Field name */}
              <span className="text-purple-400 mr-2">{field.name}:</span>

              {/* Field value */}
              <span className={`${
                field.type === 'container' || field.type === 'array' ? 'text-gray-400 italic' :
                field.type === 'gt' || field.type === 'e164' || field.type === 'bcd' ? 'text-cyan-400' :
                field.type === 'operation' ? 'text-yellow-400' :
                field.type === 'ssn' ? 'text-orange-400' :
                field.type === 'pointcode' ? 'text-green-400' :
                'text-white'
              }`}>
                {field.value || (hasChildren ? `(${field.children!.length} items)` : '')}
              </span>

              {/* Type badge */}
              <span className="ml-auto text-xs text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                {field.type}
              </span>

              {/* Copy button */}
              {field.value && !hasChildren && (
                <button
                  className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => { e.stopPropagation(); onCopy(field.value!, fieldId); }}
                >
                  {copiedField === fieldId ? 
                    <Check className="w-3 h-3 text-green-400" /> : 
                    <Copy className="w-3 h-3 text-gray-500 hover:text-gray-300" />
                  }
                </button>
              )}
            </div>

            {/* Children */}
            {hasChildren && isExpanded && (
              <DecodedTree 
                fields={field.children!} 
                level={level + 1} 
                onCopy={onCopy}
                copiedField={copiedField}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function MessageFlowDiagram({ message }: { message: SS7MessageDetail }) {
  // Simplified sequence diagram representation
  const elements = ['MSC/VLR', 'STP', 'HLR', 'SCP'];
  
  return (
    <div className="h-full relative overflow-hidden">
      {/* Participants header */}
      <div className="flex justify-around mb-8">
        {elements.map(el => (
          <div key={el} className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center text-xs text-white font-medium">
              {el.split('/')[0]}
            </div>
            <span className="mt-2 text-xs text-gray-400">{el}</span>
          </div>
        ))}
      </div>

      {/* Lifelines */}
      <div className="absolute top-32 left-0 right-0 bottom-8 flex justify-around pointer-events-none">
        {elements.map(() => (
          <div className="w-px h-full bg-slate-700" />
        ))}
      </div>

      {/* Message arrows (simplified based on message type) */}
      <div className="relative z-10 space-y-8 px-4">
        {message.protocol === 'MAP' && message.operationName?.includes('Authentication') ? (
          <>
            <FlowArrow from={0} to={2} label="sendAuthenticationInfo" time="T+0ms" color="#3b82f6" />
            <FlowArrow from={2} to={0} label="returnResult (vectors)" time="+45ms" color="#22c55e" />
          </>
        ) : message.protocol === 'ISUP' ? (
          <>
            <FlowArrow from={0} to={1} label="IAM (Initial Address)" time="T+0ms" color="#06b6d4" />
            <FlowArrow from={1} to={2} label="IAM (forwarded)" time="+3ms" color="#06b6d4" />
          </>
        ) : message.protocol === 'CAP' ? (
          <>
            <FlowArrow from={0} to={3} label="initialDP" time="T+0ms" color="#ef4444" />
            <FlowArrow from={3} to={0} label="requestReportBCSMEvent" time="+12ms" color="#f97316" />
          </>
        ) : (
          <div className="text-center py-8 text-gray-500 text-sm">
            No flow diagram available for this message type
          </div>
        )}
      </div>

      {/* Time axis */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-8 text-xs text-gray-600">
        <span>T+0ms</span>
        <span>T+{(message.id === 'msg_001' ? 45 : message.id === 'msg_002' ? 3 : 12)}ms</span>
      </div>
    </div>
  );
}

function FlowArrow({ from, to, label, time, color }: { 
  from: number; 
  to: number; 
  label: string; 
  time: string; 
  color: string;
}) {
  const positions = [10, 35, 60, 85]; // Percentage positions for each element
  
  return (
    <div className="flex items-center relative" style={{ paddingLeft: `${positions[from]}%`, paddingRight: `${100 - positions[to]}%` }}>
      <div className="flex-1 relative">
        <div 
          className="h-px absolute top-1/2"
          style={{ 
            backgroundColor: color,
            left: 0,
            right: 0,
          }}
        />
        <div 
          className="absolute top-1/2 transform -translate-y-1/2 text-xs px-2 py-0.5 rounded whitespace-nowrap"
          style={{ 
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: '#1e293b',
            color: color,
            border: `1px solid ${color}`,
          }}
        >
          {label}
        </div>
        <span className="absolute -top-4 left-1/2 transform -translate-x-1/2 text-xs text-gray-600">
          {time}
        </span>
      </div>
      
      {/* Arrow head */}
      <div 
        className="w-0 h-0 absolute"
        style={{
          borderTop: '5px solid transparent',
          borderBottom: '5px solid transparent',
          borderLeft: `8px solid ${color}`,
          right: 0,
          top: '50%',
          transform: 'translateY(-50%)',
        }}
      />
    </div>
  );
}
