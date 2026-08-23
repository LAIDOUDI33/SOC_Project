import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  
  // Turbopack configuration (Next.js 16+)
  turbopack: {},
  
  // SECURITY: Don't ignore TypeScript errors - catch them at build time
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // Enable React Strict Mode to catch unsafe patterns during development
  reactStrictMode: true,
  
  // Comprehensive Security Headers for all responses
  // Based on OWASP recommendations and ANRT compliance requirements
  async headers() {
    const isProduction = process.env.NODE_ENV === 'production';
    
    return [
      {
        // Apply to all routes
        source: '/(.*)',
        headers: [
          // ============================================================
          // FRAME PROTECTION (Clickjacking Prevention)
          // ============================================================
          {
            key: 'X-Frame-Options',
            value: 'DENY', // Completely prevents iframe embedding
          },
          
          // ============================================================
          // MIME TYPE SNIFFING PROTECTION
          // ============================================================
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          
          // ============================================================
          // REFERRER POLICY - Limit referrer information leakage
          // ============================================================
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          
          // ============================================================
          // XSS PROTECTION (Legacy browsers)
          // Note: Modern browsers use CSP instead, but this helps older ones
          // ============================================================
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          
          // ============================================================
          // PERMISSIONS POLICY - Disable unnecessary browser features
          // Critical for SOC platform handling sensitive data
          // ============================================================
          {
            key: 'Permissions-Policy',
            value: [
              'camera=()',
              'microphone=()',
              'geolocation=()',
              'fullscreen=(self)',
              'payment=()',
              'usb=()',
              'magnetometer=()',
              'gyroscope=()',
              'accelerometer=()',
            ].join(', '),
          },
          
          // ============================================================
          // CONTENT SECURITY POLICY (CSP)
          // CRITICAL: Prevents XSS attacks and data exfiltration
          // ============================================================
          {
            key: 'Content-Security-Policy',
            value: [
              // Default directive - restrict all sources by default
              "default-src 'self'",
              
              // Script sources - removed unsafe-eval, using nonce-based approach for inline scripts
              // Note: Tailwind CSS requires 'unsafe-inline' for style elements in development
              // In production, consider using a CSP nonce or hash-based approach
              ...(isProduction 
                ? ["script-src 'self'"] 
                : ["script-src 'self' 'unsafe-inline'"]),
              
              // Style sources - allow inline styles for Tailwind CSS (required)
              // In production with proper PurgeCSS/Tailwind JIT, this can be tightened
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              
              // Image sources - allow data URIs for embedded images
              "img-src 'self' data: blob: https:",
              
              // Connect sources - API endpoints and WebSocket
              "connect-src 'self' wss: ws:",
              
              // Font sources
              "font-src 'self' https://fonts.gstatic.com",
              
              // Frame sources - no framing allowed (matches X-Frame-Options)
              "frame-src 'none'",
              
              // Object/embed sources
              "object-src 'none'",
              
              // Base URI
              "base-uri 'self'",
              
              // Form action
              "form-action 'self'",
              
              // Report violations to endpoint (in production)
              ...(isProduction ? ["report-uri /api/security/csp-report"] : []),
            ].join('; '),
          },
          
          // ============================================================
          // STRICT TRANSPORT SECURITY (HSTS)
          // Only in production with valid HTTPS certificate
          // Prevents SSL stripping attacks
          // ============================================================
          ...(isProduction ? [{
            key: 'Strict-Transport-Security',
            // 1 year max age, include subdomains, allow preloading
            value: 'max-age=31536000; includeSubDomains; preload',
          }] : []),
          
          // ============================================================
          // EXPECT-CT (Certificate Transparency)
          // Helps detect misissued certificates
          // ============================================================
          ...(isProduction ? [{
            key: 'Expect-CT',
            value: 'max-age=86400, enforce, report-uri="https://soc.djezzy.dz/api/ct-report"',
          }] : []),
        ],
      },
      {
        // API-specific headers
        source: '/api/(.*)',
        headers: [
          // No caching for API responses (prevents sensitive data caching)
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          // Short expiry for any accidentally cached responses
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
      {
        // Static assets caching
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Public assets (logo, etc.)
        source: '/public/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400',
          },
        ],
      },
    ];
  },
  
  // Server external packages (moved from experimental)
  serverExternalPackages: ['@prisma/client'],
  
  // Webpack configuration for security
  webpack: (config, { dev, isServer }) => {
    // Security: Don't expose source maps in production
    if (!dev && !isServer) {
      config.devtool = false;
    }
    
    return config;
  },
};

export default nextConfig;
