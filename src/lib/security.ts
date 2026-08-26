/**
 * National SOC Platform - Security Utilities
 * Algeria 2026-2030 | Production Security Functions
 * 
 * Comprehensive security utilities:
 * - Password hashing and verification (bcrypt)
 * - Data encryption/decryption (AES-256-GCM)
 * - Input sanitization
 * - CSRF protection
 * - Rate limiting
 * - Security headers
 */

import crypto from 'crypto'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ============= CONSTANTS =============

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const TAG_LENGTH = 16
const SALT_LENGTH = 32

// In production, these should be in environment variables
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex')

// ============= PASSWORD UTILITIES =============

/**
 * Hash a password using bcrypt (via Web Crypto API fallback)
 */
export async function hashPassword(password: string): Promise<string> {
  // Use bcrypt if available, otherwise use PBKDF2
  try {
    const { hash } = await import('bcryptjs')
    return await hash(password, 12)
  } catch {
    // Fallback to PBKDF2
    return pbkdf2Hash(password)
  }
}

/**
 * Verify a password against its hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    const { compare } = await import('bcryptjs')
    return await compare(password, hash)
  } catch {
    return pbkdf2Verify(password, hash)
  }
}

/**
 * PBKDF2 password hashing (fallback)
 */
async function pbkdf2Hash(password: string): Promise<string> {
  const salt = crypto.randomBytes(SALT_LENGTH).toString('hex')
  const hash = crypto.pbkdf2Sync(
    password,
    salt,
    100000, // iterations
    64, // keylen
    'sha512'
  ).toString('hex')
  
  return `pbkdf2_sha512$100000$${salt}$${hash}`
}

/**
 * PBKDF2 password verification (fallback)
 */
function pbkdf2Verify(password: string, storedHash: string): boolean {
  try {
    const [, , salt, hash] = storedHash.split('$')
    const verifyHash = crypto.pbkdf2Sync(
      password,
      salt,
      100000,
      64,
      'sha512'
    ).toString('hex')
    
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(verifyHash))
  } catch {
    return false
  }
}

// ============= ENCRYPTION UTILITIES =============

/**
 * Encrypt sensitive data using AES-256-GCM
 */
export function encrypt(plaintext: string): string {
  try {
    const key = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex')
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const tag = cipher.getAuthTag()
    
    // Return format: iv:tag:encrypted
    return [iv.toString('hex'), tag.toString('hex'), encrypted].join(':')
  } catch (error) {
    console.error('Encryption error:', error)
    throw new Error('Failed to encrypt data')
  }
}

/**
 * Decrypt data using AES-256-GCM
 */
export function decrypt(ciphertext: string): string {
  try {
    const key = Buffer.from(ENCRYPTION_KEY.slice(0, 64), 'hex')
    const parts = ciphertext.split(':')
    
    if (parts.length !== 3) {
      throw new Error('Invalid ciphertext format')
    }
    
    const [ivHex, tagHex, encrypted] = parts
    const iv = Buffer.from(ivHex, 'hex')
    const tag = Buffer.from(tagHex, 'hex')
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(tag)
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch (error) {
    console.error('Decryption error:', error)
    throw new Error('Failed to decrypt data')
  }
}

/**
 * Generate a secure random token
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex')
}

/**
 * Generate a cryptographically secure random ID
 */
export function generateSecureId(prefix: string = ''): string {
  const bytes = crypto.randomBytes(16)
  const id = bytes.toString('base64url').replace(/=/g, '')
  return prefix ? `${prefix}_${id}` : id
}

// ============= INPUT SANITIZATION =============

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return input
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Validate email address format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailRegex.test(email)
}

/**
 * Validate IP address (IPv4 or IPv6)
 */
export function isValidIP(ip: string): boolean {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/
  const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/
  
  if (ipv4Regex.test(ip)) {
    return ip.split('.').every(octet => parseInt(octet) <= 255)
  }
  
  return ipv6Regex.test(ip)
}

/**
 * Sanitize SQL-like inputs (basic prevention)
 */
export function sanitizeSQL(input: string): string {
  if (typeof input !== 'string') return input
  
  return input
    .replace(/['"\\]/g, '\\$&')
    .replace(/--/g, '-- ')
    .replace(/;/g, '; ')
}

// ============= CSRF PROTECTION =============

/**
 * Generate CSRF token
 */
export function generateCSRFToken(): string {
  return generateToken(32)
}

/**
 * Validate CSRF token
 */
export function validateCSRFToken(token: string, sessionToken: string): boolean {
  if (!token || !sessionToken) return false
  
  // Simple comparison - in production, use timing-safe comparison
  return crypto.timingSafeEqual(
    Buffer.from(token),
    Buffer.from(sessionToken)
  )
}

// ============= SECURITY HEADERS =============

/**
 * Get security headers for responses
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    // Prevent clickjacking
    'X-Frame-Options': 'DENY',
    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',
    // XSS Protection
    'X-XSS-Protection': '1; mode=block',
    // Referrer Policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    // HSTS (only in production)
    ...(process.env.NODE_ENV === 'production' && {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
    }),
    // Permissions Policy
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()'
  }
}

/**
 * Content Security Policy configuration
 */
export function getCSP(nonce?: string): string {
  const directives = [
    "default-src 'self'",
    `script-src ${nonce ? `'nonce-${nonce}'` : "'self'"} 'unsafe-inline'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' wss: https: ws:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests"
  ]
  
  return directives.join('; ')
}

// ============= RATE LIMITING =============

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory store for rate limiting (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>()

/**
 * Check rate limit for a given key
 */
export function checkRateLimit(
  key: string, 
  windowMs: number = 60000, 
  maxRequests: number = 100
): { allowed: boolean; remaining: number; resetTime: number; retryAfter?: number } {
  const now = Date.now()
  const entry = rateLimitStore.get(key)
  
  if (!entry || now > entry.resetTime) {
    // Create new entry or reset expired one
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs })
    return { allowed: true, remaining: maxRequests - 1, resetTime: now + windowMs }
  }
  
  if (entry.count >= maxRequests) {
    return { 
      allowed: false, 
      remaining: 0, 
      resetTime: entry.resetTime, 
      retryAfter: Math.ceil((entry.resetTime - now) / 1000) 
    }
  }
  
  entry.count++
  return { allowed: true, remaining: maxRequests - entry.count, resetTime: entry.resetTime }
}

/**
 * Clean up expired rate limit entries
 */
export function cleanupRateLimits(): void {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupRateLimits, 5 * 60 * 1000)

// ============= SECURITY MIDDLEWARE =============

/**
 * Apply security middleware to request
 */
export function securityMiddleware(request: NextRequest): NextResponse {
  const response = NextResponse.next()
  
  // Apply security headers
  const headers = getSecurityHeaders()
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  
  // Apply CSP
  response.headers.set('Content-Security-Policy', getCSP())
  
  return response
}

/**
 * CORS middleware
 */
export function corsMiddleware(origin?: string): Record<string, string> {
  const allowedOrigins = (
    process.env.ALLOWED_ORIGINS || 
    process.env.APP_URL || 
    'http://localhost:3000'
  ).split(',')
  
  const isAllowed = !origin || allowedOrigins.some(o => o.trim() === origin)
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin || allowedOrigins[0] : '',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-CSRF-Token',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'true',
    ...(isAllowed ? {} : { 'Vary': 'Origin' })
  }
}
