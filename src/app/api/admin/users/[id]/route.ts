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

const updatePasswordSchema = z.object({
  newPassword: z.string().min(12).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).+$/, 
    'Must contain uppercase, lowercase, number, and special character'),
  forcePasswordChange: z.boolean().default(true),
});

const updateRoleSchema = z.object({
  roleId: z.string(),
  reason: z.string().optional(),
});

// GET /api/admin/users/[id] - Get single user details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await checkAdminAccess(request);
    if (authError) return authError;

    const { id } = await params;
    
    const user = await db.user.findUnique({
      where: { id },
      include: {
        role: true,
        sessions: {
          select: { id: true, createdAt: true, lastActiveAt: true, ipAddress: true, userAgent: true },
          orderBy: { lastActiveAt: 'desc' },
          take: 10,
        },
        auditLogs: {
          select: { id: true, action: true, createdAt: true, details: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        _count: {
          select: {
            sessions: true,
            auditLogs: true,
            incidents: true,
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Remove sensitive data
    const { passwordHash, mfaSecret, ...safeUser } = user;

    return NextResponse.json({
      success: true,
      data: safeUser
    });
  } catch (error) {
    console.error('Admin get user error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/users/[id] - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await checkAdminAccess(request);
    if (authError) return authError;

    const body = await request.json();
    const { id } = await params;
    
    // Check user exists
    const existingUser = await db.user.findUnique({ where: { id } });
    if (!existingUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const allowedUpdates = [
      'name', 'email', 'department', 'phone', 'status', 'mfaEnabled'
    ];
    
    const updates: any = {};
    for (const key of allowedUpdates) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }

    // Handle MFA changes
    if (body.mfaEnabled !== undefined && body.mfaEnabled !== existingUser.mfaEnabled) {
      const crypto = await import('crypto');
      if (body.mfaEnabled) {
        updates.mfaSecret = crypto.randomBytes(32).toString('base64');
      } else {
        updates.mfaSecret = null;
      }
    }

    const user = await db.user.update({
      where: { id },
      data: updates,
      include: { role: true }
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: 'system',
        action: 'USER_UPDATED',
        entityType: 'User',
        entityId: user.id,
        details: `Admin updated user ${user.email}: ${Object.keys(updates).join(', ')}`,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'admin-api',
      }
    });

    const { passwordHash, mfaSecret, ...safeUser } = user;

    return NextResponse.json({
      success: true,
      data: safeUser,
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Admin update user error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/users/[id]/password - Reset user password/role/status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await checkAdminAccess(request);
    if (authError) return authError;

    const body = await request.json();
    const { id } = await params;
    
    if (body.newPassword) {
      // Password reset flow
      const passwordData = updatePasswordSchema.parse(body);
      
      const user = await db.user.findUnique({ where: { id } });
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        );
      }

      const crypto = await import('crypto');
      const salt = crypto.randomBytes(32).toString('hex');
      
      const { createHash } = crypto;
      const hash = createHash('pbkdf2')
        .update(passwordData.newPassword + salt)
        .digest('hex');

      await db.user.update({
        where: { id },
        data: {
          passwordHash: `${salt}:${hash}`,
          lastPasswordChange: new Date(),
          ...(passwordData.forcePasswordChange && { passwordResetRequired: true }),
        }
      });

      // Invalidate all sessions for this user
      await db.session.deleteMany({ where: { userId: id } });

      // Create audit log
      await db.auditLog.create({
        data: {
          userId: 'system',
          action: 'PASSWORD_RESET',
          entityType: 'User',
          entityId: id,
          details: `Admin reset password for user ${user.email}`,
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'admin-api',
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Password reset successfully. User will need to login again.'
      });
    }
    
    if (body.roleId) {
      // Role change flow
      const roleData = updateRoleSchema.parse(body);
      
      const role = await db.role.findUnique({ where: { id: roleData.roleId } });
      if (!role) {
        return NextResponse.json(
          { success: false, error: 'Role not found' },
          { status: 404 }
        );
      }

      const user = await db.user.update({
        where: { id },
        data: { roleId: roleData.roleId },
        include: { role: true }
      });

      // Create audit log
      await db.auditLog.create({
        data: {
          userId: 'system',
          action: 'ROLE_CHANGED',
          entityType: 'User',
          entityId: id,
          details: `Admin changed role for ${user.email} to ${role.name}. Reason: ${roleData.reason || 'Not specified'}`,
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'admin-api',
        }
      });

      return NextResponse.json({
        success: true,
        data: user,
        message: 'User role updated successfully'
      });
    }

    if (body.status !== undefined) {
      // Status change flow
      const validStatuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED', 'LOCKED'];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json(
          { success: false, error: 'Invalid status' },
          { status: 400 }
        );
      }

      const user = await db.user.update({
        where: { id },
        data: { status: body.status },
        include: { role: true }
      });

      // If suspending/locking, invalidate sessions
      if (body.status === 'SUSPENDED' || body.status === 'LOCKED') {
        await db.session.deleteMany({ where: { userId: id } });
      }

      // Create audit log
      await db.auditLog.create({
        data: {
          userId: 'system',
          action: 'STATUS_CHANGED',
          entityType: 'User',
          entityId: id,
          details: `Admin changed status for ${user.email} to ${body.status}`,
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'admin-api',
        }
      });

      return NextResponse.json({
        success: true,
        data: user,
        message: `User status changed to ${body.status}`
      });
    }

    return NextResponse.json(
      { success: false, error: 'No valid update operation specified' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Admin patch user error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[id] - Delete user (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await checkAdminAccess(request);
    if (authError) return authError;

    const { id } = await params;
    const user = await db.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Soft delete by setting status to INACTIVE and anonymizing
    const crypto = await import('crypto');
    const anonId = `deleted_${crypto.randomBytes(8).toString('hex')}`;
    
    await db.user.update({
      where: { id },
      data: {
        email: `${anonId}@deleted.local`,
        name: 'Deleted User',
        status: 'INACTIVE',
        passwordHash: '',
        mfaSecret: null,
        phone: null,
        department: null,
      }
    });

    // Invalidate all sessions
    await db.session.deleteMany({ where: { userId: id } });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: 'system',
        action: 'USER_DELETED',
        entityType: 'User',
        entityId: id,
        details: `Admin deleted user (was: ${user.email})`,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'admin-api',
      }
    });

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Admin delete user error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
