/**
 * Security Headers API Route
 * National SOC Platform for Algeria (2026-2030)
 * 
 * Provides OWASP-recommended security headers for the SOC platform.
 * This endpoint returns recommended security header configurations
 * and validates existing header implementations.
 * 
 * @route GET /api/security/headers - Get recommended security headers
 * @route POST /api/security/headers/validate - Validate security headers
 * @route GET /api/security/headers/csp - Get CSP configuration
 * 
 * @module security/api/headers
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  generateSecurityHeaders,
  validateSecurityHeaders,
} from '../../lib/security-lib';
import type {
  SecurityHeadersConfiguration,
  CSPConfiguration,
  HSTSConfiguration,
  PermissionsPolicyDirective,
} from '../../types/security.types';

/**
 * Default SOC platform security headers configuration
 */
const DEFAULT_SOC_HEADERS: SecurityHeadersConfiguration = {
  contentSecurityPolicy: {
    enabled: true,
    reportOnly: false,
    directives: {
      'default-src': "'self'",
      'script-src': "'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com",
      'style-src': "'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
      'img-src': "'self' data: blob: https: http://localhost:*",
      'font-src': "'self' https://fonts.gstatic.com https://cdn.jsdelivr.net",
      'connect-src': "'self' wss: https: http://localhost:* http://localhost:*",
      'media-src': "'self'",
      'object-src': "'none'",
      'frame-src': "'self'",
      'frame-ancestors': "'self'",
      'base-uri': "'self'",
      'form-action': "'self'",
      'upgrade-insecure-requests': true,
    },
    reportUri: '/api/security/csp-report',
  },
  strictTransportSecurity: {
    enabled: true,
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
    preloadSubmitted: false,
  },
  xFrameOptions: 'DENY',
  xContentTypeOptions: 'nosniff',
  xXSSProtection: '0', // Disabled in favor of CSP
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: {
    accelerometer: ['none'],
    'ambient-light-sensor': ['none'],
    autoplay: ['self'],
    battery: ['none'],
    camera: ['none'],
    'clipboard-read': ['none'],
    'clipboard-write': ['self'],
    displaycapture: ['none'],
    'document-domain': ['none'],
    'encrypted-media': ['self'],
    fullscreen: ['self'],
    geolocation: ['none'],
    gyroscope: ['none'],
    hid: ['none'],
    magnetometer: ['none'],
    microphone: ['none'],
    midi: ['none'],
    payment: ['none'],
    'picture-in-picture': ['self'],
    'publickey-credentials-get': ['self'],
    'screen-wake-lock': ['none'],
    serial: ['none'],
    usb: ['none'],
    'web-share': ['self'],
    'xr-spatial-tracking': ['none'],
  },
  crossOriginOpenerPolicy: 'same-origin',
  crossOriginEmbedderPolicy: 'require-corp',
  crossOriginResourcePolicy: 'same-origin',
  cacheControl: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  pragma: 'no-cache',
  expires: '0',
  customHeaders: [
    { name: 'X-Powered-By', value: 'National-SOC-Algeria/1.0', description: 'Server identification' },
    { name: 'X-Content-Type-Options', value: 'nosniff', description: 'MIME type sniffing protection' },
    { name: 'X-Permitted-Cross-Domain-Policies', value: 'none', description: 'Cross-domain policy' },
    { name: 'Expect-CT', value: 'max-age=86400, enforce', description: 'Certificate Transparency' },
  ],
};

/**
 * GET /api/security/headers
 * Returns recommended security headers for the SOC platform
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'json';
    const component = searchParams.get('component'); // Optional component-specific config

    let headers = generateSecurityHeaders(DEFAULT_SOC_HEADERS);

    // Component-specific overrides
    if (component) {
      headers = getComponentSpecificHeaders(component, headers);
    }

    if (format === 'nginx') {
      return getNginxFormat(headers);
    }

    if (format === 'apache') {
      return getApacheFormat(headers);
    }

    // Return JSON response with additional metadata
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        headers,
        configuration: DEFAULT_SOC_HEADERS,
        recommendations: getHeaderRecommendations(),
        owaspCompliance: checkOWASPCompliance(DEFAULT_SOC_HEADERS),
      },
      meta: {
        version: '1.0.0',
        source: 'national-soc-algeria-security-module',
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Security Headers API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate security headers',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/security/headers/validate
 * Validates provided security headers against OWASP recommendations
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { headers, url } = body;

    if (!headers) {
      return NextResponse.json(
        { success: false, error: 'No headers provided for validation' },
        { status: 400 }
      );
    }

    const validation = validateSecurityHeaders(headers);

    // Additional analysis
    const analysis = performHeaderAnalysis(headers);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      validation,
      analysis,
      grade: calculateSecurityGrade(validation),
      recommendations: generateRecommendations(validation, analysis),
    });
  } catch (error) {
    console.error('Header Validation Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to validate headers',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Gets component-specific header configurations
 */
function getComponentSpecificHeaders(
  component: string,
  baseHeaders: Record<string, string>
): Record<string, string> {
  const overrides: Record<string, Partial<Record<string, string>>> = {
    dashboard: {
      'Content-Security-Policy': baseHeaders['Content-Security-Policy']?.replace(
        "'self'",
        "'self' https://grafana.local"
      ),
    },
    api: {
      'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
      'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    },
    monitoring: {
      'Content-Security-Policy': baseHeaders['Content-Security-Policy'] +
        " https://prometheus.local https://alertmanager.local",
    },
  };

  return { ...baseHeaders, ...(overrides[component] || {}) };
}

/**
 * Returns headers in Nginx configuration format
 */
function getNginxFormat(headers: Record<string, string>) {
  const nginxLines = Object.entries(headers).map(
    ([key, value]) => `    add_header ${key} "${value.replace(/"/g, '\\"')}" always;`
  );

  const nginxConfig = `# Security Headers Configuration
# Generated by National SOC Platform Security Module
# Last Updated: ${new Date().toISOString()}

# Apply in server or location block
location / {
${nginxLines.join('\n')}
    
    # ... rest of configuration
}`;

  return new NextResponse(nginxConfig, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': 'attachment; filename="security-headers.conf"',
    },
  });
}

/**
 * Returns headers in Apache configuration format
 */
function getApacheFormat(headers: Record<string, string>) {
  const apacheLines = Object.entries(headers).map(
    ([key, value]) => `Header always set ${key} "${value.replace(/"/g, '\\"')}"`
  );

  const apacheConfig = `# Security Headers Configuration
# Generated by National SOC Platform Security Module
# Last Updated: ${new Date().toISOString()}

<IfModule mod_headers.c>
${apacheLines.join('\n')}
</IfModule>`;

  return new NextResponse(apacheConfig, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': 'attachment; filename="security-headers.conf"',
    },
  });
}

/**
 * Gets general header recommendations
 */
function getHeaderRecommendations(): Array<{
  header: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  recommendation: string;
  rationale: string;
}> {
  return [
    {
      header: 'Content-Security-Policy',
      priority: 'critical',
      recommendation: 'Implement strict CSP with nonce-based script execution',
      rationale: 'Prevents XSS attacks by controlling resource loading sources',
    },
    {
      header: 'Strict-Transport-Security',
      priority: 'critical',
      recommendation: 'Enable HSTS with max-age of at least 1 year',
      rationale: 'Forces HTTPS connections and prevents protocol downgrade attacks',
    },
    {
      header: 'X-Frame-Options',
      priority: 'high',
      recommendation: 'Set to DENY or SAMEORIGIN',
      rationale: 'Prevents clickjacking attacks',
    },
    {
      header: 'Referrer-Policy',
      priority: 'medium',
      recommendation: 'Set to strict-origin-when-cross-origin',
      rationale: 'Controls referrer information leakage',
    },
    {
      header: 'Permissions-Policy',
      priority: 'medium',
      recommendation: 'Disable unnecessary browser features',
      rationale: 'Reduces attack surface from powerful browser APIs',
    },
  ];
}

/**
 * Checks OWASP compliance level of current configuration
 */
function checkOWASPCompliance(config: SecurityHeadersConfiguration): {
  score: number;
  compliant: string[];
  nonCompliant: Array<{ control: string; status: string }>;
} {
  const checks = [
    {
      control: 'A5:2021 - Security Misconfiguration',
      compliant: !!config.contentSecurityPolicy.enabled,
      status: config.contentSecurityPolicy.enabled ? 'PASS' : 'FAIL',
    },
    {
      control: 'Transport Layer Protection',
      compliant: config.strictTransportSecurity.enabled && 
                 config.strictTransportSecurity.maxAge >= 15768000,
      status: config.strictTransportSecurity.enabled ? 'PASS' : 'FAIL',
    },
    {
      control: 'Clickjacking Protection',
      compliant: config.xFrameOptions === 'DENY' || config.xFrameOptions === 'SAMEORIGIN',
      status: config.xFrameOptions === 'DENY' ? 'PASS' : 'PARTIAL',
    },
    {
      control: 'MIME Sniffing Protection',
      compliant: config.xContentTypeOptions === 'nosniff',
      status: config.xContentTypeOptions === 'nosniff' ? 'PASS' : 'FAIL',
    },
    {
      control: 'Referrer Protection',
      compliant: !!config.referrerPolicy && config.referrerPolicy !== '',
      status: config.referrerPolicy ? 'PASS' : 'FAIL',
    },
    {
      control: 'Browser Feature Control',
      compliant: Object.keys(config.permissionsPolicy).length > 10,
      status: Object.keys(config.permissionsPolicy).length > 10 ? 'PASS' : 'PARTIAL',
    },
  ];

  const compliant = checks.filter(c => c.compliant).map(c => c.control);
  const nonCompliant = checks.filter(c => !c.compliant).map(c => ({ 
    control: c.control, 
    status: c.status 
  }));

  return {
    score: Math.round((compliant.length / checks.length) * 100),
    compliant,
    nonCompliant,
  };
}

/**
 * Performs detailed header analysis
 */
function performHeaderAnalysis(headers: Record<string, string>) {
  return {
    totalHeaders: Object.keys(headers).length,
    criticalHeadersPresent: {
      csp: !!headers['Content-Security-Policy'],
      hsts: !!headers['Strict-Transport-Security'],
      xFrameOptions: !!headers['X-Frame-Options'],
      xContentTypeOptions: !!headers['X-Content-Type-Options'],
      referrerPolicy: !!headers['Referrer-Policy'],
      permissionsPolicy: !!headers['Permissions-Policy'],
    },
    hstsAnalysis: analyzeHSTS(headers['Strict-Transport-Security']),
    cspAnalysis: analyzeCSP(headers['Content-Security-Policy']),
    potentialIssues: detectPotentialIssues(headers),
  };
}

/**
 * Analyzes HSTS configuration
 */
function analyzeHSTS(hsts?: string) {
  if (!hsts) return { configured: false };

  const maxAgeMatch = hsts.match(/max-age=(\d+)/);
  const includeSubdomains = hsts.includes('includeSubDomains');
  const preload = hsts.includes('preload');

  return {
    configured: true,
    maxAge: maxAgeMatch ? parseInt(maxAgeMatch[1]) : null,
    maxAgeDays: maxAgeMatch ? Math.round(parseInt(maxAgeMatch[1]) / 86400) : null,
    includeSubdomains,
    preload,
    rating: rateHSTS(maxAgeMatch ? parseInt(maxAgeMatch[1]) : 0, includeSubdomains, preload),
  };
}

/**
 * Rates HSTS configuration strength
 */
function rateHSTS(maxAge: number, subdomains: boolean, preload: boolean): 'excellent' | 'good' | 'acceptable' | 'weak' | 'not_configured' {
  if (maxAge >= 31536000 && subdomains && preload) return 'excellent';
  if (maxAge >= 15768000 && subdomains) return 'good';
  if (maxAge >= 86400) return 'acceptable';
  if (maxAge > 0) return 'weak';
  return 'not_configured';
}

/**
 * Analyzes CSP configuration
 */
function analyzeCSP(csp?: string) {
  if (!csp) return { configured: false };

  const directives = csp.split(';').map(d => d.trim());
  const directiveNames = directives.map(d => d.split(' ')[0]);

  return {
    configured: true,
    directiveCount: directives.length,
    hasDefaultSrc: directiveNames.includes('default-src'),
    hasScriptSrc: directiveNames.includes('script-src'),
    hasStyleSrc: directiveNames.includes('style-src'),
    hasObjectSrc: directiveNames.includes('object-src'),
    hasFrameAncestors: directiveNames.includes('frame-ancestors'),
    hasUpgradeInsecureRequests: directiveNames.includes('upgrade-insecure-requests'),
    unsafeInlineInScriptSrc: directives.some(d => 
      d.startsWith('script-src') && d.includes("'unsafe-inline'")
    ),
    unsafeEvalInScriptSrc: directives.some(d => 
      d.startsWith('script-src') && d.includes("'unsafe-eval'")
    ),
    objectNone: directives.some(d => 
      d.startsWith('object-src') && d.includes("'none'")
    ),
    rating: rateCSP(directiveNames, directives),
  };
}

/**
 * Rates CSP configuration strength
 */
function rateCSP(directives: string[], fullDirectives: string[]): 'strong' | 'moderate' | 'weak' | 'minimal' | 'not_configured' {
  if (directives.length === 0) return 'not_configured';
  
  const requiredDirectives = ['default-src', 'script-src', 'style-src'];
  const hasRequired = requiredDirectives.every(d => directives.includes(d));
  const hasUnsafeInline = fullDirectives.some(d => d.includes("'unsafe-inline'"));
  const hasUnsafeEval = fullDirectives.some(d => d.includes("'unsafe-eval'"));

  if (hasRequired && !hasUnsafeInline && !hasUnsafeEval) return 'strong';
  if (hasRequired && !hasUnsafeEval) return 'moderate';
  if (directives.includes('default-src')) return 'weak';
  return 'minimal';
}

/**
 * Detects potential issues in headers
 */
function detectPotentialIssues(headers: Record<string, string>): Array<{ issue: string; severity: string; suggestion: string }> {
  const issues: Array<{ issue: string; severity: string; suggestion: string }> = [];

  // Check for missing server info hiding
  if (!headers['Server'] && !headers['X-Powered-By']) {
    // This is actually good - no issue
  } else if (headers['Server']) {
    issues.push({
      issue: 'Server header reveals software information',
      severity: 'low',
      suggestion: 'Remove or obscure Server header',
    });
  }

  // Check for X-XSS-Protection conflicts
  if (headers['X-XSS-Protection'] !== '0' && headers['Content-Security-Policy']) {
    issues.push({
      issue: 'X-XSS-Protection may conflict with CSP',
      severity: 'info',
      suggestion: 'Set X-XSS-Protection to 0 when using CSP',
    });
  }

  // Check Cache-Control consistency
  if (headers['Cache-Control']?.includes('no-store') && headers['Expires'] !== '0') {
    issues.push({
      issue: 'Cache-Control and Expires may be inconsistent',
      severity: 'info',
      suggestion: 'Set Expires to 0 when using no-store',
    });
  }

  return issues;
}

/**
 * Calculates overall security grade
 */
function calculateSecurityGrade(validation: { valid: boolean; issues: Array<{ header: string; severity: string }> }): 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' {
  const criticalCount = validation.issues.filter(i => i.severity === 'critical').length;
  const highCount = validation.issues.filter(i => i.severity === 'high').length;
  const mediumCount = validation.issues.filter(i => i.severity === 'medium').length;

  if (validation.valid && mediumCount === 0) return 'A+';
  if (validation.valid) return 'A';
  if (criticalCount === 0 && highCount <= 1) return 'B';
  if (criticalCount === 0) return 'C';
  if (criticalCount === 1) return 'D';
  return 'F';
}

/**
 * Generates actionable recommendations based on validation results
 */
function generateRecommendations(
  validation: { valid: boolean; issues: Array<{ header: string; severity: string; message: string }> },
  analysis: ReturnType<typeof performHeaderAnalysis>
): Array<{ priority: string; action: string; impact: string }> {
  const recommendations: Array<{ priority: string; action: string; impact: string }> = [];

  // Add recommendations based on validation issues
  for (const issue of validation.issues) {
    recommendations.push({
      priority: issue.severity,
      action: issue.message,
      impact: getImpactForSeverity(issue.severity),
    });
  }

  // Add proactive recommendations
  if (!analysis.criticalHeadersPresent.csp) {
    recommendations.push({
      priority: 'critical',
      action: 'Implement Content-Security-Policy header',
      impact: 'Prevents Cross-Site Scripting (XSS) attacks',
    });
  }

  if (!analysis.hstsAnalysis?.configured) {
    recommendations.push({
      priority: 'critical',
      action: 'Enable HTTP Strict Transport Security (HSTS)',
      impact: 'Prevents protocol downgrade and cookie hijacking attacks',
    });
  }

  if (analysis.cspAnalysis?.configured && analysis.cspAnalysis.unsafeInlineInScriptSrc) {
    recommendations.push({
      priority: 'high',
      action: 'Remove unsafe-inline from script-src, use nonces instead',
      impact: 'Eliminates XSS attack vector through inline scripts',
    });
  }

  return recommendations.sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    return order[a.priority] - order[b.priority];
  });
}

/**
 * Maps severity to impact description
 */
function getImpactForSeverity(severity: string): string {
  switch (severity) {
    case 'critical':
      return 'Critical vulnerability that can lead to complete system compromise';
    case 'high':
      return 'High-risk vulnerability that could allow significant unauthorized access';
    case 'medium':
      return 'Medium-risk issue that could aid in further attacks';
    case 'low':
      return 'Low-risk informational finding for defense-in-depth';
    default:
      return 'General security improvement opportunity';
  }
}
