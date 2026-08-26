/**
 * National SOC Platform - User Repository
 * Algeria 2026-2030 | User Management & Authentication
 * 
 * Handles all user-related operations:
 * - Authentication and authorization helpers
 * - Role-based access control data
 * - MFA management
 * - API key management
 * - Session tracking
 */

import { Prisma, db, PaginatedResult, PaginationParams } from '../db'
import { BaseRepository, BaseFilters } from './base.repository'
import { SOCError, ErrorCode } from '../errors'
import { 
  User, UserRole, MfaMethod, ApiKeyPermission 
} from '@prisma/client'
import { hashPassword, verifyPassword } from '../security'

export interface UserFilters extends BaseFilters {
  role?: UserRole | UserRole[]
  department?: string
  isActive?: boolean
  hasMfaEnabled?: boolean
}

export interface CreateUserData {
  email: string
  name: string
  password: string
  role?: UserRole
  department?: string
  phone?: string
}

export interface ApiKeyCreateData {
  name: string
  permissions: ApiKeyPermission[]
  expiresAt?: Date
  ipAddress?: string
}

export class UserRepository extends BaseRepository<User> {
  constructor() {
    super('user')
  }

  protected getSearchFields(): string[] {
    return ['email', 'name', 'department']
  }

  /**
   * Find user by email (for authentication)
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      return await db.user.findUnique({
        where: { email: email.toLowerCase() },
        include: {
          apiKeys: true,
          sessions: { where: { expires: { gt: new Date() } }, take: 5 }
        }
      })
    } catch (error) {
      throw this.handleError(error, 'findByEmail')
    }
  }

  /**
   * Create a new user with password hashing
   */
  async createUser(data: CreateUserData, createdBy?: string): Promise<User> {
    // Check if email already exists
    const existing = await this.findByEmail(data.email)
    if (existing) {
      throw new SOCError(
        ErrorCode.UNIQUE_CONSTRAINT_VIOLATION,
        'User with this email already exists',
        { email: data.email }
      )
    }

    const passwordHash = await hashPassword(data.password)

    try {
      return await db.user.create({
        data: {
          email: data.email.toLowerCase(),
          name: data.name,
          passwordHash,
          role: data.role ?? UserRole.ANALYST,
          department: data.department,
          phone: data.phone,
          ...(createdBy && { createdBy })
        }
      })
    } catch (error) {
      throw this.handleError(error, 'createUser')
    }
  }

  /**
   * Verify user credentials
   */
  async verifyCredentials(email: string, password: string): Promise<{
    user: User
    requiresMfa: boolean
  }> {
    const user = await this.findByEmail(email)
    
    if (!user) {
      throw new SOCError(ErrorCode.AUTHENTICATION_FAILED, 'Invalid credentials', { email })
    }

    if (!user.isActive) {
      throw new SOCError(ErrorCode.ACCOUNT_DISABLED, 'Account is disabled', { email })
    }

    if (user.isLocked) {
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        throw new SOCError(ErrorCode.ACCOUNT_LOCKED, 'Account is temporarily locked', {
          lockedUntil: user.lockedUntil
        })
      } else {
        // Lock expired, unlock account
        await this.update(user.id, { isLocked: false, failedLoginAttempts: 0 })
      }
    }

    const isValid = await verifyPassword(password, user.passwordHash ?? '')
    if (!isValid) {
      await this.handleFailedLogin(user.id)
      throw new SOCError(ErrorCode.AUTHENTICATION_FAILED, 'Invalid credentials', { email })
    }

    // Reset failed login attempts on success
    await this.update(user.id, {
      failedLoginAttempts: 0,
      lastLoginAt: new Date()
    })

    return {
      user,
      requiresMfa: user.mfaEnabled
    }
  }

  /**
   * Handle failed login attempt with lockout logic
   */
  private async handleFailedLogin(userId: string): Promise<void> {
    const user = await this.findById(userId)
    if (!user) return

    const maxAttempts = 5
    const lockoutDuration = 30 // minutes

    const newAttempts = (user?.failedLoginAttempts ?? 0) + 1

    if (newAttempts >= maxAttempts) {
      const lockedUntil = new Date(Date.now() + lockoutDuration * 60 * 1000)
      await this.update(userId, {
        failedLoginAttempts: newAttempts,
        isLocked: true,
        lockedUntil
      })
    } else {
      await this.update(userId, { failedLoginAttempts: newAttempts })
    }
  }

  /**
   * Update user password
   */
  async updatePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await this.findById(userId)
    if (!user || !user.passwordHash) {
      throw new SOCError(ErrorCode.NOT_FOUND, 'User not found')
    }

    const isValid = await verifyPassword(currentPassword, user.passwordHash)
    if (!isValid) {
      throw new SOCError(ErrorCode.AUTHENTICATION_FAILED, 'Current password is incorrect')
    }

    const newPasswordHash = await hashPassword(newPassword)
    await this.update(userId, {
      passwordHash: newPasswordHash,
      passwordChangedAt: new Date(),
      // Set password expiry to 90 days from now
      passwordExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    })
  }

  /**
   * Enable MFA for user
   */
  async enableMfa(
    userId: string,
    secret: string,
    backupCodes: string[],
    method: MfaMethod = MfaMethod.TOTP
  ): Promise<void> {
    await this.update(userId, {
      mfaEnabled: true,
      mfaSecret: secret,
      mfaBackupCodes: backupCodes as any,
      mfaMethod,
      mfaVerifiedAt: new Date()
    })
  }

  /**
   * Disable MFA for user
   */
  async disableMfa(userId: string): Promise<void> {
    await this.update(userId, {
      mfaEnabled: false,
      mfaSecret: null,
      mfaBackupCodes: null,
      mfaMethod: null,
      mfaVerifiedAt: null
    })
  }

  /**
   * Create API key for programmatic access
   */
  async createApiKey(
    userId: string,
    data: ApiKeyCreateData
  ) {
    const key = `soc_${this.generateSecureToken(32)}`
    const keyHash = await hashPassword(key)

    return db.apiKey.create({
      data: {
        name: data.name,
        keyHash,
        permissions: data.permissions as any,
        userId,
        expiresAt: data.expiresAt,
        lastUsedIp: data.ipAddress,
        createdBy: userId
      },
      select: {
        id: true,
        name: true,
        key: true, // Only time the raw key is shown
        permissions: true,
        expiresAt: true,
        createdAt: true
      }
    })
  }

  /**
   * Validate API key
   */
  async validateApiKey(key: string): Promise<{
    user: User
    apiKey: any
  } | null> {
    const apiKeys = await db.apiKey.findMany({
      where: {
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      include: { user: true }
    })

    for (const apiKey of apiKeys) {
      if (await verifyPassword(key, apiKey.keyHash)) {
        // Update last used
        await db.apiKey.update({
          where: { id: apiKey.id },
          data: { lastUsedAt: new Date() }
        })

        return { user: apiKey.user, apiKey }
      }
    }

    return null
  }

  /**
   * Revoke API key
   */
  async revokeApiKey(apiKeyId: string): Promise<void> {
    await db.apiKey.update({
      where: { id: apiKeyId },
      data: { isActive: false, revokedAt: new Date() }
    })
  }

  /**
   * Get users by role
   */
  async findByRole(role: UserRole): Promise<User[]> {
    return db.user.findMany({
      where: { role, isActive: true, deletedAt: null },
      orderBy: { name: 'asc' }
    })
  }

  /**
   * Get on-call analysts for escalation
   */
  async getOnCallAnalysts(): Promise<User[]> {
    return db.user.findMany({
      where: {
        role: { in: [UserRole.SENIOR_ANALYST, UserRole.INCIDENT_RESPONDER, UserRole.MANAGER] },
        isActive: true,
        deletedAt: null
      },
      orderBy: { lastLoginAt: 'desc' },
      take: 10
    })
  }

  /**
   * Update user's last login info
   */
  async recordLogin(userId: string, ipAddress: string, userAgent?: string): Promise<void> {
    await db.user.update({
      where: { id: userId },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress
      }
    })

    // Create audit log entry would go here
  }

  /**
   * Get user activity summary
   */
  async getActivitySummary(userId: string, days: number = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    const [
      alertsHandled,
      incidentsManaged,
      tasksCompleted,
      loginCount
    ] = await Promise.all([
      db.alert.count({
        where: {
          assignedTo: userId,
          updatedAt: { gte: since }
        }
      }),
      db.incident.count({
        where: {
          assignedTo: userId,
          updatedAt: { gte: since }
        }
      }),
      db.task.count({
        where: {
          assignedTo: userId,
          status: 'COMPLETED',
          completedAt: { gte: since }
        }
      }),
      db.auditLog.count({
        where: {
          userId,
          action: { contains: 'LOGIN' },
          timestamp: { gte: since }
        }
      })
    ])

    return {
      periodDays: days,
      alertsHandled,
      incidentsManaged,
      tasksCompleted,
      loginCount
    }
  }

  /**
   * Generate secure random token
   */
  private generateSecureToken(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    const array = new Uint8Array(length)
    crypto.getRandomValues(array)
    return Array.from(array, b => chars[b % chars.length]).join('')
  }
}

// Export singleton instance
export const userRepository = new UserRepository()

export default UserRepository
