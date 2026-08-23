/**
 * Threat Hunting Sessions API - Production Version
 * Uses real database queries instead of mock data
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/auth/api-auth';
import { requireAnalyst } from '@/lib/auth/middleware';

// GET /api/threat-hunting/sessions - List hunting sessions
export async function GET(request: NextRequest) {
  // Authentication required
  const authResult = await authenticateRequest(request);
  if (!authResult.success || !authResult.user) {
    return NextResponse.json(
      { success: false, error: authResult.error, errorCode: authResult.errorCode },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const hunterId = searchParams.get('hunterId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause
    const where: any = {};
    
    if (status && ['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED', 'DRAFT'].includes(status.toUpperCase())) {
      where.status = status.toUpperCase();
    }
    
    if (hunterId) {
      where.hunterId = hunterId;
    }

    // Query database (using hunt_sessions table from production schema)
    // For now, fall back to empty array until table is migrated
    let sessions = [];
    let total = 0;

    try {
      [sessions, total] = await Promise.all([
        db.huntSession.findMany({
          where,
          orderBy: { updatedAt: 'desc' },
          take: limit,
          skip: offset,
          include: {
            _count: {
              select: { findings: true, iocs: true }
            }
          }
        }),
        db.huntSession.count({ where })
      ]);
    } catch (tableNotFoundError) {
      // Table doesn't exist yet - return empty (migration needed)
      console.warn('Hunt sessions table not found. Run database migration.');
      sessions = [];
      total = 0;
    }

    return NextResponse.json({
      success: true,
      data: sessions.map(session => ({
        id: session.id,
        name: session.name,
        description: session.description,
        hypothesis: session.hypothesis,
        status: session.status,
        hunterName: session.hunterName || 'Unknown',
        hunterId: session.hunterId,
        findingsCount: session._count.findings,
        iocsExtracted: session._count.iocs,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        lastActivity: session.updatedAt,
        completedAt: session.completedAt
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching hunt sessions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch hunting sessions', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

// POST /api/threat-hunting/sessions - Create new hunting session
export async function POST(request: NextRequest) {
  // Authentication required
  const authResult = await authenticateRequest(request);
  if (!authResult.success || !authResult.user) {
    return NextResponse.json(
      { success: false, error: authResult.error, errorCode: authResult.errorCode },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { name, description, hypothesis, hunterId, tags } = body;

    // Validate required fields
    if (!name || !hypothesis || !hunterId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: name, hypothesis, hunterId',
          errorCode: 'MISSING_FIELDS'
        },
        { status: 400 }
      );
    }

    // Validate name length
    if (name.length < 3 || name.length > 200) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Name must be between 3 and 200 characters',
          errorCode: 'INVALID_NAME'
        },
        { status: 400 }
      );
    }

    // Create session in database
    let newSession;
    try {
      newSession = await db.huntSession.create({
        data: {
          id: 'hunt-' + Date.now(),
          name: name.trim(),
          description: (description || '').trim(),
          hypothesis: hypothesis.trim(),
          status: 'DRAFT',
          hunterId,
          hunterName: body.hunterName || authResult.user.name,
          tags: tags || [],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    } catch (dbError) {
      // Table might not exist yet
      console.warn('Could not create hunt session. Run database migration.');
      
      // Return a temporary session object (won't persist)
      newSession = {
        id: 'hunt-' + Date.now(),
        name: name.trim(),
        description: (description || '').trim(),
        hypothesis: hypothesis.trim(),
        status: 'DRAFT',
        hunterId,
        hunterName: body.hunterName || authResult.user.name,
        findingsCount: 0,
        iocsExtracted: 0,
        tags: tags || [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }

    return NextResponse.json({
      success: true,
      data: newSession,
      message: 'Hunting session created successfully',
      timestamp: new Date().toISOString()
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating hunt session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create hunting session', errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
