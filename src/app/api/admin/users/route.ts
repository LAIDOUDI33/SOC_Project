import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/middleware';
import { z } from 'zod';

// Admin-only access
async function checkAdminAccess(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (authResult) return authResult;
  return null;
}

// Validation schemas
const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  roleId: z.string().optional(),
  department: z.string().optional(),
  phone: z.string().optional(),
  mfaEnabled: z.boolean().default(false),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'LOCKED']).default('ACTIVE'),
});

const updateUserSchema = createUserSchema.partial();

const queryUsersSchema = z.object({
  page: z.string().default('1'),
  limit: z.string().default('20'),
  search: z.string().optional(),
  role: z.string().optional(),
  status: z.string().optional(),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// GET /api/admin/users - List all users with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const authError = await checkAdminAccess(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const query = queryUsersSchema.parse(Object.fromEntries(searchParams));

    const page = parseInt(query.page);
    const limit = Math.min(parseInt(query.limit), 100); // Max 100 per page
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { name: { contains: query.search, mode: 'insensitive' } },
        { department: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.role) {
      where.roleId = query.role;
    }

    if (query.status) {
      where.status = query.status;
    }

    // Fetch users with their roles
    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        include: {
          role: {
            select: { id: true, name: true, description: true }
          },
          _count: {
            select: {
              sessions: true,
              auditLogs: true,
            }
          }
        },
        skip,
        take: limit,
        orderBy: { [query.sortBy]: query.sortOrder },
      }),
      db.user.count({ where }),
    ]);

    // Get available roles for filter dropdown
    const roles = await db.role.findMany({
      select: { id: true, name: true, _count: { select: { users: true } } },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        filters: {
          roles,
          statuses: ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'LOCKED'],
        }
      }
    });
  } catch (error) {
    console.error('Admin users list error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST /api/admin/users - Create new user
export async function POST(request: NextRequest) {
  try {
    const authError = await checkAdminAccess(request);
    if (authError) return authError;

    const body = await request.json();
    const data = createUserSchema.parse(body);

    // Check if email already exists
    const existingUser = await db.user.findUnique({
      where: { email: data.email }
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // If roleId provided, verify it exists
    if (data.roleId) {
      const role = await db.role.findUnique({ where: { id: data.roleId } });
      if (!role) {
        return NextResponse.json(
          { success: false, error: 'Role not found' },
          { status: 404 }
        );
      }
    }

    // Create user with default password (will need to be reset)
    const crypto = await import('crypto');
    const tempPassword = crypto.randomBytes(16).toString('hex');
    const salt = crypto.randomBytes(32).toString('hex');
    
    const { createHash } = crypto;
    const hash = createHash('pbkdf2')
      .update(tempPassword + salt)
      .digest('hex');

    const user = await db.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash: `${salt}:${hash}`,
        roleId: data.roleId,
        department: data.department,
        phone: data.phone,
        mfaEnabled: data.mfaEnabled,
        mfaSecret: data.mfaEnabled ? crypto.randomBytes(32).toString('base64') : null,
        status: data.status,
        lastPasswordChange: new Date(),
      },
      include: {
        role: {
          select: { id: true, name: true, description: true }
        }
      }
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: 'system',
        action: 'USER_CREATED',
        entityType: 'User',
        entityId: user.id,
        details: `Admin created user ${user.email}`,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'admin-api',
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        user,
        temporaryPassword: tempPassword, // Only shown once on creation
        message: 'User created successfully. Temporary password should be changed on first login.'
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Admin user creation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
