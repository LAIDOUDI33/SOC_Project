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

// Define all available permissions
const AVAILABLE_PERMISSIONS = [
  // User management
  'users:read', 'users:create', 'users:update', 'users:delete',
  // Incident management
  'incidents:read', 'incidents:create', 'incidents:update', 'incidents:delete', 'incidents:escalate', 'incidents:resolve',
  // Alert management
  'alerts:read', 'alerts:acknowledge', 'alerts:escalate', 'alerts:close',
  // Threat intelligence
  'threats:read', 'threats:create', 'threats:update', 'threats:delete',
  // Threat hunting
  'hunting:read', 'hunting:create', 'hunting:execute', 'hunting:export',
  // Analytics & Reports
  'analytics:read', 'reports:read', 'reports:create', 'reports:export',
  // Telecom/SS7
  'ss7:read', 'ss7:analyze', 'telecom:read', 'telecom:manage',
  // Compliance
  'compliance:read', 'compliance:manage', 'compliance:audit',
  // System administration
  'system:admin', 'system:config', 'system:backup', 'system:maintenance',
  // Audit logs
  'audit:read', 'audit:export',
  // Session management
  'sessions:read', 'sessions:terminate',
  // API management
  'apikeys:read', 'apikeys:create', 'apikeys:revoke',
];

const createRoleSchema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().optional(),
  permissions: z.array(z.string()).refine(
    perms => perms.every(p => AVAILABLE_PERMISSIONS.includes(p)),
    { message: 'Invalid permission(s) specified' }
  ),
  isSystemRole: z.boolean().default(false), // System roles cannot be deleted
});

const updateRoleSchema = createRoleSchema.partial();

// GET /api/admin/roles - List all roles with permissions
export async function GET(request: NextRequest) {
  try {
    const authError = await checkAdminAccess(request);
    if (authError) return authError;

    const roles = await db.role.findMany({
      include: {
        _count: {
          select: { users: true }
        }
      },
      orderBy: [{ isSystemRole: 'desc' }, { name: 'asc' }]
    });

    // Get permission usage statistics
    const permissionUsage = await db.role.aggregate({
      _count: true,
    });

    return NextResponse.json({
      success: true,
      data: {
        roles,
        availablePermissions: AVAILABLE_PERMISSIONS,
        permissionCategories: {
          'User Management': ['users:read', 'users:create', 'users:update', 'users:delete'],
          'Incident Management': ['incidents:read', 'incidents:create', 'incidents:update', 'incidents:delete', 'incidents:escalate', 'incidents:resolve'],
          'Alert Management': ['alerts:read', 'alerts:acknowledge', 'alerts:escalate', 'alerts:close'],
          'Threat Intelligence': ['threats:read', 'threats:create', 'threats:update', 'threats:delete'],
          'Threat Hunting': ['hunting:read', 'hunting:create', 'hunting:execute', 'hunting:export'],
          'Analytics & Reports': ['analytics:read', 'reports:read', 'reports:create', 'reports:export'],
          'Telecom/SS7': ['ss7:read', 'ss7:analyze', 'telecom:read', 'telecom:manage'],
          'Compliance': ['compliance:read', 'compliance:manage', 'compliance:audit'],
          'System Administration': ['system:admin', 'system:config', 'system:backup', 'system:maintenance'],
          'Audit & Security': ['audit:read', 'audit:export', 'sessions:read', 'sessions:terminate'],
          'API Management': ['apikeys:read', 'apikeys:create', 'apikeys:revoke'],
        },
        totalRoles: roles.length,
        totalUsers: permissionUsage._count,
      }
    });
  } catch (error) {
    console.error('Admin roles list error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch roles' },
      { status: 500 }
    );
  }
}

// POST /api/admin/roles - Create new role
export async function POST(request: NextRequest) {
  try {
    const authError = await checkAdminAccess(request);
    if (authError) return authError;

    const body = await request.json();
    const data = createRoleSchema.parse(body);

    // Check if role name already exists
    const existingRole = await db.role.findUnique({
      where: { name: data.name }
    });

    if (existingRole) {
      return NextResponse.json(
        { success: false, error: 'Role with this name already exists' },
        { status: 409 }
      );
    }

    const role = await db.role.create({
      data: {
        name: data.name,
        description: data.description,
        permissions: data.permissions,
        isSystemRole: data.isSystemRole,
      }
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: 'system',
        action: 'ROLE_CREATED',
        entityType: 'Role',
        entityId: role.id,
        details: `Admin created role: ${role.name} with permissions: ${data.permissions.join(', ')}`,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'admin-api',
      }
    });

    return NextResponse.json({
      success: true,
      data: role,
      message: 'Role created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Admin role creation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create role' },
      { status: 500 }
    );
  }
}
