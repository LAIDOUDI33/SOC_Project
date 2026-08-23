import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/threat-hunting/sessions - List hunting sessions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const hunterId = searchParams.get('hunterId');
    
    // Demo data for CEO presentation
    const mockSessions = [
      {
        id: 'hunt-001',
        name: 'SS7 Location Tracking Investigation',
        description: 'Hunting for unauthorized SRI requests indicating subscriber tracking',
        hypothesis: 'Threat actors are exploiting SS7 vulnerabilities to track high-value subscribers',
        status: 'ACTIVE',
        hunterName: 'Karim Boudjema',
        hunterId: 'user-003',
        findingsCount: 12,
        iocsExtracted: 8,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
        lastActivity: new Date(Date.now() - 3600000)
      },
      {
        id: 'hunt-002',
        name: 'SIM Swap Fraud Pattern Analysis',
        description: 'Analyzing patterns in recent SIM swap requests to identify fraud ring',
        hypothesis: 'Coordinated fraud ring using social engineering at retail outlets combined with insider help',
        status: 'ACTIVE',
        hunterName: 'Karim Boudjema',
        hunterId: 'user-003',
        findingsCount: 47,
        iocsExtracted: 23,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
        lastActivity: new Date(Date.now() - 1800000)
      },
      {
        id: 'hunt-003',
        name: 'IMS Catcher Detection Hunt',
        description: 'Proactive hunt for IMS catcher activity using RF and network indicators',
        hypothesis: 'Surveillance equipment operating near sensitive locations in Algiers',
        status: 'COMPLETED',
        hunterName: 'Fatima Zerhouni',
        hunterId: 'user-002',
        findingsCount: 3,
        iocsExtracted: 5,
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'hunt-004',
        name: 'Insider Threat Indicators',
        description: 'Hunting for behavioral anomalies indicating potential insider threats',
        hypothesis: 'Contractor or employee may be attempting data exfiltration',
        status: 'PAUSED',
        hunterName: 'Sara Mansouri',
        hunterId: 'user-006',
        findingsCount: 5,
        iocsExtracted: 2,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      }
    ];

    let filteredSessions = mockSessions;
    if (status) {
      filteredSessions = filteredSessions.filter(s => s.status === status.toUpperCase());
    }
    
    return NextResponse.json({
      success: true,
      data: filteredSessions,
      total: filteredSessions.length
    });
  } catch (error) {
    console.error('Error fetching hunt sessions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch hunt sessions' },
      { status: 500 }
    );
  }
}

// POST /api/threat-hunting/sessions - Create new hunting session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, hypothesis, hunterId, tags } = body;

    // Validate required fields
    if (!name || !hypothesis || !hunterId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, hypothesis, hunterId' },
        { status: 400 }
      );
    }

    // Create new session (demo implementation)
    const newSession = {
      id: `hunt-${Date.now()}`,
      name,
      description: description || '',
      hypothesis,
      status: 'DRAFT',
      hunterId,
      hunterName: body.hunterName || 'Unknown',
      findingsCount: 0,
      iocsExtracted: 0,
      tags: tags || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return NextResponse.json({
      success: true,
      data: newSession,
      message: 'Hunting session created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating hunt session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create hunt session' },
      { status: 500 }
    );
  }
}
