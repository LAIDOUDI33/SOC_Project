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

const updateRoleSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
});

// GET /api/admin/roles/[id] - Get single role with details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await checkAdminAccess(request);
    if (authError) return authError;

    const { id } = await params;
    
    const role = await db.role.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            status: true,
          }
        },
        _count: {
          select: { users: true }
        }
      }
    });

    if (!role) {
      return NextResponse.json(
        { success: false, error: 'Role not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: role
    });
  } catch (error) {
    console.error('Admin get role error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch role' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/roles/[id] - Update role
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await checkAdminAccess(request);
    if (authError) return authError;

    const body = await request.json();
    const { id } = await params;
    
    const existingRole = await db.role.findUnique({ where: { id } });
    if (!existingRole) {
      return NextResponse.json(
        { success: false, error: 'Role not found' },
        { status: 404 }
      );
    }

    // Prevent modification of system roles' core properties
    if (existingRole.isSystemRole && body.name && body.name !== existingRole.name) {
      return NextResponse.json(
        { success: false, error: 'Cannot rename system roles' },
        { status: 400 }
      );
    }

    const data = updateRoleSchema.parse(body);
    
    const updates: any = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.description !== undefined) updates.description = data.description;
    if (data.permissions !== undefined) updates.permissions = data.permissions;

    const role = await db.role.update({
      where: { id },
      data: updates,
      include: {
        _count: { select: { users: true } }
      }
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: 'system',
        action: 'ROLE_UPDATED',
        entityType: 'Role',
        entityId: id,
        details: `Admin updated role ${role.name}: ${Object.keys(updates).join(', ')}`,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'admin-api',
      }
    });

    return NextResponse.json({
      success: true,
      data: role,
      message: 'Role updated successfully'
    });
  } catch (error) {
    console.error('Admin update role error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update role' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/roles/[id] - Delete role
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await checkAdminAccess(request);
    if (authError) return authError;

    const { id } = await params;
    
    const role = await db.role.findUnique({ 
      where: { id },
      include: { _count: { select: { users: true } } }
    });

    if (!role) {
      return NextResponse.json(
        { success: false, error: 'Role not found' },
        { status: 404 }
      );
    }

    // Prevent deletion of system roles
    if (role.isSystemRole) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete system roles' },
        { status: 400 }
      );
    }

    // Check if role has users assigned
    if (role._count.users > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Cannot delete role with ${role._count.users} user(s) assigned. Reassign users first.` 
        },
        { status: 400 }
      );
    }

    await db.role.delete({ where: { id } });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: 'system',
        action: 'ROLE_DELETED',
        entityType: 'Role',
        entityId: id,
        details: `Admin deleted role: ${role.name}`,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'admin-api',
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Role deleted successfully'
    });
  } catch (error) {
    console.error('Admin delete role error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete role' },
      { status: 500 }
    );
  }
}
