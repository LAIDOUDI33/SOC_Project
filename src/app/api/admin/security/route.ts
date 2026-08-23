import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/middleware';
import { z } from 'zod';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// Admin-only access
async function checkAdminAccess(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (authResult) return authResult;
  return null;
}

// Configuration file paths
const CONFIG_DIR = join(process.cwd(), 'config');
const SECURITY_CONFIG_PATH = join(CONFIG_DIR, 'security');
const CORS_CONFIG_PATH = join(SECURITY_CONFIG_PATH, 'cors.json');
const RATE_LIMIT_CONFIG_PATH = join(SECURITY_CONFIG_PATH, 'rate-limits.json');

// Default configurations
const defaultCORSConfig = {
  allowedOrigins: ['http://localhost:3000'],
  allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400,
  credentials: true,
};

const defaultRateLimitConfig = {
  global: {
    windowMs: 60000,
    maxRequests: 100,
  },
  endpoints: {
    '/api/auth': { windowMs: 60000, maxRequests: 10 },
    '/api/auth/login': { windowMs: 900000, maxRequests: 5 },
    '/api/admin': { windowMs: 60000, maxRequests: 50 },
    default: { windowMs: 60000, maxRequests: 60 },
  },
  whitelist: [],
  blocklist: [],
};

// Helper to read/write config files
function readConfig<T>(path: string, defaultValue: T): T {
  try {
    if (existsSync(path)) {
      const content = readFileSync(path, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error(`Error reading config ${path}:`, error);
  }
  return defaultValue;
}

function writeConfig<T>(path: string, config: T): boolean {
  try {
    // Ensure directory exists
    const dir = path.substring(0, path.lastIndexOf('/'));
    if (!existsSync(dir)) {
      require('fs').mkdirSync(dir, { recursive: true });
    }
    writeFileSync(path, JSON.stringify(config, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error(`Error writing config ${path}:`, error);
    return false;
  }
}

// GET /api/admin/security - Get security configuration
export async function GET(request: NextRequest) {
  try {
    const authError = await checkAdminAccess(request);
    if (authError) return authError;

    const corsConfig = readConfig(CORS_CONFIG_PATH, defaultCORSConfig);
    const rateLimitConfig = readConfig(RATE_LIMIT_CONFIG_PATH, defaultRateLimitConfig);

    // Get API keys if they exist
    const apiKeys = await db.apiKey.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        permissions: true,
        rateLimit: true,
        lastUsedAt: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    // Get current security headers from next.config
    const securityHeaders = {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'",
    };

    // Get blocked IPs and whitelist
    const [blockedIPs, whitelistedIPs] = await Promise.all([
      db.blockedIP.findMany({
        where: { active: true },
        select: { id: true, ipAddress: true, reason: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      db.whitelistedIP.findMany({
        where: { active: true },
        select: { id: true, ipAddress: true, description: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      })
    ]);

    return NextResponse.json({
      success: true,
      data: {
        cors: corsConfig,
        rateLimits: rateLimitConfig,
        apiKeys,
        securityHeaders,
        ipManagement: {
          blocked: blockedIPs,
          whitelisted: whitelistedIPs,
        },
        features: {
          mfaRequired: process.env.MFA_REQUIRED === 'true',
          passwordPolicy: {
            minLength: 12,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSpecialChars: true,
            maxAgeDays: 90,
            historyCount: 5,
          },
          sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '3600'),
          maxLoginAttempts: 5,
          lockoutDuration: 900, // 15 minutes
        }
      }
    });
  } catch (error) {
    console.error('Admin security get error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch security configuration' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/security - Update security configuration
export async function PUT(request: NextRequest) {
  try {
    const authError = await checkAdminAccess(request);
    if (authError) return authError;

    const body = await request.json();
    const { section, ...config } = body;

    switch (section) {
      case 'cors': {
        const corsSchema = z.object({
          allowedOrigins: z.array(z.string().url()),
          allowedMethods: z.array(z.string()),
          allowedHeaders: z.array(z.string()),
          maxAge: z.number(),
          credentials: z.boolean(),
        });
        
        const validatedConfig = corsSchema.parse(config);
        const success = writeConfig(CORS_CONFIG_PATH, validatedConfig);
        
        if (!success) {
          return NextResponse.json(
            { success: false, error: 'Failed to save CORS configuration' },
            { status: 500 }
          );
        }

        // Create audit log
        await db.auditLog.create({
          data: {
            userId: 'system',
            action: 'CONFIG_CHANGED',
            entityType: 'Configuration',
            details: `Admin updated CORS configuration`,
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'admin-api',
          }
        });

        return NextResponse.json({
          success: true,
          message: 'CORS configuration updated successfully',
          data: validatedConfig
        });
      }

      case 'rate-limits': {
        const rateLimitSchema = z.object({
          global: z.object({ windowMs: z.number(), maxRequests: z.number() }),
          endpoints: z.record(z.object({ windowMs: z.number(), maxRequests: z.number() })),
          whitelist: z.array(z.string()),
          blocklist: z.array(z.string()),
        });
        
        const validatedConfig = rateLimitSchema.parse(config);
        const success = writeConfig(RATE_LIMIT_CONFIG_PATH, validatedConfig);
        
        if (!success) {
          return NextResponse.json(
            { success: false, error: 'Failed to save rate limit configuration' },
            { status: 500 }
          );
        }

        await db.auditLog.create({
          data: {
            userId: 'system',
            action: 'CONFIG_CHANGED',
            entityType: 'Configuration',
            details: `Admin updated rate limit configuration`,
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'admin-api',
          }
        });

        return NextResponse.json({
          success: true,
          message: 'Rate limit configuration updated successfully',
          data: validatedConfig
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown section: ${section}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Admin security update error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update security configuration' },
      { status: 500 }
    );
  }
}

// POST /api/admin/security - Security actions (block IP, create API key, etc.)
export async function POST(request: NextRequest) {
  try {
    const authError = await checkAdminAccess(request);
    if (authError) return authError;

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'block-ip': {
        const { ipAddress, reason, durationHours = 24 } = body;
        
        if (!ipAddress) {
          return NextResponse.json(
            { success: false, error: 'IP address is required' },
            { status: 400 }
          );
        }

        // Check if already blocked
        const existing = await db.blockedIP.findUnique({
          where: { ipAddress }
        });

        if (existing) {
          await db.blockedIP.update({
            where: { ipAddress },
            data: {
              active: true,
              reason: reason || existing.reason,
              expiresAt: new Date(Date.now() + durationHours * 60 * 60 * 1000),
            }
          });
        } else {
          await db.blockedIP.create({
            data: {
              ipAddress,
              reason: reason || 'Blocked by administrator',
              expiresAt: new Date(Date.now() + durationHours * 60 * 60 * 1000),
            }
          });
        }

        await db.auditLog.create({
          data: {
            userId: 'system',
            action: 'IP_BLOCKED',
            entityType: 'Security',
            entityId: ipAddress,
            details: `Admin blocked IP: ${ipAddress}. Reason: ${reason}`,
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'admin-api',
          }
        });

        return NextResponse.json({
          success: true,
          message: `IP ${ipAddress} has been blocked`
        });
      }

      case 'unblock-ip': {
        const { ipAddress } = body;
        
        if (!ipAddress) {
          return NextResponse.json(
            { success: false, error: 'IP address is required' },
            { status: 400 }
          );
        }

        await db.blockedIP.update({
          where: { ipAddress },
          data: { active: false }
        });

        await db.auditLog.create({
          data: {
            userId: 'system',
            action: 'IP_UNBLOCKED',
            entityType: 'Security',
            entityId: ipAddress,
            details: `Admin unblocked IP: ${ipAddress}`,
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'admin-api',
          }
        });

        return NextResponse.json({
          success: true,
          message: `IP ${ipAddress} has been unblocked`
        });
      }

      case 'whitelist-ip': {
        const { ipAddress, description } = body;
        
        if (!ipAddress) {
          return NextResponse.json(
            { success: false, error: 'IP address is required' },
            { status: 400 }
          );
        }

        await db.whitelistedIP.upsert({
          where: { ipAddress },
          update: { active: true, description },
          create: { ipAddress, description }
        });

        await db.auditLog.create({
          data: {
            userId: 'system',
            action: 'IP_WHITELISTED',
            entityType: 'Security',
            entityId: ipAddress,
            details: `Admin whitelisted IP: ${ipAddress}`,
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'admin-api',
          }
        });

        return NextResponse.json({
          success: true,
          message: `IP ${ipAddress} has been whitelisted`
        });
      }

      case 'create-api-key': {
        const { name, permissions, expiresInDays = 30, rateLimit = 1000 } = body;
        
        if (!name) {
          return NextResponse.json(
            { success: false, error: 'API key name is required' },
            { status: 400 }
          );
        }

        const crypto = await import('crypto');
        const keyValue = `sk_${crypto.randomBytes(32).toString('hex')}`;
        const keyPrefix = keyValue.substring(0, 8) + '...';

        const apiKey = await db.apiKey.create({
          data: {
            name,
            keyValue,
            keyPrefix,
            permissions: permissions || ['read'],
            rateLimit,
            expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
          }
        });

        await db.auditLog.create({
          data: {
            userId: 'system',
            action: 'API_KEY_CREATED',
            entityType: 'ApiKey',
            entityId: apiKey.id,
            details: `Admin created API key: ${name}`,
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'admin-api',
          }
        });

        // Return full key only once
        return NextResponse.json({
          success: true,
          data: {
            ...apiKey,
            keyValue, // Only shown on creation
            message: 'API key created. Save this key securely as it will not be shown again.'
          }
        }, { status: 201 });
      }

      case 'revoke-api-key': {
        const { keyId } = body;
        
        if (!keyId) {
          return NextResponse.json(
            { success: false, error: 'Key ID is required' },
            { status: 400 }
          );
        }

        await db.apiKey.update({
          where: { id: keyId },
          data: { isActive: false }
        });

        await db.auditLog.create({
          data: {
            userId: 'system',
            action: 'API_KEY_REVOKED',
            entityType: 'ApiKey',
            entityId: keyId,
            details: `Admin revoked API key`,
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'admin-api',
          }
        });

        return NextResponse.json({
          success: true,
          message: 'API key has been revoked'
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Admin security action error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to execute security action' },
      { status: 500 }
    );
  }
}
