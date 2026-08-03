/**
 * Djezzy SOC Platform - Bundle Size Analyzer
 * 
 * Analyze JavaScript bundle sizes and identify optimization opportunities:
 * - Track chunk sizes over time
 * - Identify large dependencies
 * - Suggest code splitting opportunities
 * - Monitor bundle growth between deployments
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================
// TYPES
// ============================================================

interface BundleChunk {
  name: string;
  size: number;
  gzipSize: number;
  renderedSize?: number;
  modules: string[];
}

interface BundleAnalysis {
  timestamp: string;
  totalSize: number;
  totalGzipSize: number;
  chunks: BundleChunk[];
  largestModules: ModuleInfo[];
  recommendations: Recommendation[];
}

interface ModuleInfo {
  name: string;
  size: number;
  percentage: number;
  type: 'vendor' | 'application' | 'shared' | 'unknown';
}

interface Recommendation {
  type: 'code_splitting' | 'tree_shaking' | 'dynamic_import' | 'alternative' | 'lazy_load';
  priority: 'high' | 'medium' | 'low';
  module: string;
  currentSize: number;
  potentialSavings: number;
  description: string;
  implementation: string;
}

interface BundleThresholds {
  maxTotalSizeKB: number;
  maxChunkSizeKB: number;
  maxVendorSizeKB: number;
  warningThresholdPercent: number;
  criticalThresholdPercent: number;
}

// ============================================================
// CONFIGURATION
// ============================================================

const DEFAULT_THRESHOLDS: BundleThresholds = {
  maxTotalSizeKB: 500,      // 500KB total gzipped
  maxChunkSizeKB: 100,      // 100KB per chunk gzipped
  maxVendorSizeKB: 150,     // 150KB for vendor chunks
  warningThresholdPercent: 80,
  criticalThresholdPercent: 95,
};

// Known large packages and their alternatives
const LARGE_PACKAGE_ALTERNATIVES: Record<string, { alternative: string; savings: number }> = {
  'moment': { alternative: 'date-fns', savings: 80 },
  'lodash': { alternative: 'lodash-es (tree-shakeable)', savings: 60 },
  '@ant-design/icons': { alternative: 'lucide-react', savings: 90 },
  'chart.js': { alternative: 'recharts', savings: 20 },
  'jquery': { alternative: 'Native DOM APIs', savings: 95 },
  'bootstrap': { alternative: 'tailwindcss + shadcn/ui', savings: 70 },
  'axios': { alternative: 'native fetch', savings: 30 },
};

// ============================================================
// ANALYSIS FUNCTIONS
// ============================================================

/**
 * Analyze the Next.js build output for bundle size information
 */
export async function analyzeBundle(
  buildDir: string = '.next',
  thresholds: BundleThresholds = DEFAULT_THRESHOLDS
): Promise<BundleAnalysis> {
  const analysis: BundleAnalysis = {
    timestamp: new Date().toISOString(),
    totalSize: 0,
    totalGzipSize: 0,
    chunks: [],
    largestModules: [],
    recommendations: [],
  };

  try {
    // Read build manifest if available
    const buildManifestPath = path.join(buildDir, 'build-manifest.json');
    
    if (fs.existsSync(buildManifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(buildManifestPath, 'utf-8'));
      // Process manifest data
      analyzeBuildManifest(manifest, analysis);
    }

    // Try to get more detailed stats from analyze script
    const stats = await getWebpackStats();
    if (stats) {
      analyzeWebpackStats(stats, analysis);
    }

    // Generate recommendations
    generateRecommendations(analysis, thresholds);

  } catch (error) {
    console.error('Bundle analysis failed:', error);
  }

  return analysis;
}

function analyzeBuildManifest(manifest: any, analysis: BundleAnalysis): void {
  // Parse Next.js build manifest for chunk information
  const pages = manifest.pages || {};
  
  Object.entries(pages).forEach(([page, files]: [string, any]) => {
    if (Array.isArray(files)) {
      files.forEach((file: string) => {
        // Extract chunk info from file paths
        const chunkName = extractChunkName(file);
        analysis.chunks.push({
          name: chunkName || page,
          size: 0, // Would need actual file size
          gzipSize: 0,
          modules: [],
        });
      });
    }
  });
}

async function getWebpackStats(): Promise<any> {
  try {
    // Check if webpack stats file exists
    const statsPath = path.join(process.cwd(), '.next/webpack-stats.json');
    if (fs.existsSync(statsPath)) {
      return JSON.parse(fs.readFileSync(statsPath, 'utf-8'));
    }
    return null;
  } catch {
    return null;
  }
}

function analyzeWebpackStats(stats: any, analysis: BundleAnalysis): void {
  if (!stats?.assets) return;

  let totalSize = 0;
  let totalGzipSize = 0;

  stats.assets.forEach((asset: any) => {
    const size = asset.size || 0;
    totalSize += size;

    // Estimate gzip size (roughly 20-30% of original)
    const estimatedGzipSize = Math.round(size * 0.25);
    totalGzipSize += estimatedGzipSize;

    analysis.chunks.push({
      name: asset.name,
      size,
      gzipSize: estimatedGzipSize,
      modules: asset.modules || [],
    });

    // Track large modules
    if (size > 50000) { // > 50KB
      analysis.largestModules.push({
        name: asset.name,
        size,
        percentage: 0, // Will calculate after total is known
        type: identifyModuleType(asset.name),
      });
    }
  });

  analysis.totalSize = totalSize;
  analysis.totalGzipSize = totalGzipSize;

  // Calculate percentages
  analysis.largestModules.forEach(module => {
    module.percentage = (module.size / totalSize) * 100;
  });

  // Sort by size descending
  analysis.largestModules.sort((a, b) => b.size - a.size);
}

// ============================================================
// RECOMMENDATION ENGINE
// ============================================================

function generateRecommendations(
  analysis: BundleAnalysis,
  thresholds: BundleThresholds
): void {
  const { totalGzipSize, chunks, largestModules } = analysis;

  // Check total bundle size
  const totalSizeKB = totalGzipSize / 1024;
  if (totalSizeKB > thresholds.maxTotalSizeKB) {
    const ratio = totalSizeKB / thresholds.maxTotalSizeKB;
    analysis.recommendations.push({
      type: 'code_splitting',
      priority: ratio > 1.5 ? 'high' : 'medium',
      module: 'Total Bundle',
      currentSize: totalGzipSize,
      potentialSavings: Math.round(totalGzipSize * 0.3),
      description: `Total bundle size (${totalSizeKB.toFixed(0)}KB) exceeds threshold (${thresholds.maxTotalSizeKB}KB)`,
      implementation: 'Implement route-based code splitting and dynamic imports for heavy components',
    });
  }

  // Check individual chunk sizes
  chunks.forEach(chunk => {
    const chunkSizeKB = chunk.gzipSize / 1024;
    if (chunkSizeKB > thresholds.maxChunkSizeKB) {
      analysis.recommendations.push({
        type: 'dynamic_import',
        priority: chunkSizeKB > thresholds.maxChunkSizeKB * 2 ? 'high' : 'medium',
        module: chunk.name,
        currentSize: chunk.gzipSize,
        potentialSavings: Math.round(chunk.gzipSize * 0.6),
        description: `Chunk "${chunk.name}" (${chunkSizeKB.toFixed(0)}KB) exceeds threshold`,
        implementation: `Use next/dynamic import with ssr: false for ${chunk.name}`,
      });
    }
  });

  // Check for known large packages
  largestModules.forEach(module => {
    const moduleName = extractPackageName(module.name);
    if (LARGE_PACKAGE_ALTERNATIVES[moduleName]) {
      const alt = LARGE_PACKAGE_ALTERNATIVES[moduleName];
      analysis.recommendations.push({
        type: 'alternative',
        priority: 'high',
        module: moduleName,
        currentSize: module.size,
        potentialSavings: Math.round(module.size * (alt.savings / 100)),
        description: `${moduleName} is a known large package. Consider using ${alt.alternative} instead`,
        implementation: `Replace ${moduleName} with ${alt.alternative}. Savings: ~${alt.savings}%`,
      });
    }
  });

  // Sort recommendations by potential savings
  analysis.recommendations.sort((a, b) => b.potentialSavings - a.potentialSavings);
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function extractChunkName(filePath: string): string {
  const parts = filePath.split('/');
  const fileName = parts[parts.length - 1];
  return fileName.replace(/\.[^.]+$/, '');
}

function extractPackageName(modulePath: string): string {
  // Try to extract npm package name from path
  const match = modulePath.match(/node_modules\/([^/]+)/);
  return match ? match[1] : modulePath;
}

function identifyModuleType(name: string): ModuleInfo['type'] {
  if (name.includes('node_modules')) return 'vendor';
  if (name.includes('chunks') || name.includes('framework')) return 'shared';
  if (name.includes('pages') || name.includes('components')) return 'application';
  return 'unknown';
}

// ============================================================
// REPORTING
// ============================================================

/**
 * Generate a human-readable bundle report
 */
export function generateReport(analysis: BundleAnalysis): string {
  const lines: string[] = [];
  
  lines.push('='.repeat(60));
  lines.push('Djezzy SOC Platform - Bundle Analysis Report');
  lines.push('='.repeat(60));
  lines.push(`Generated: ${analysis.timestamp}`);
  lines.push('');
  lines.push('--- Summary ---');
  lines.push(`Total Size: ${(analysis.totalSize / 1024).toFixed(0)} KB`);
  lines.push(`Gzipped Size: ${(analysis.totalGzipSize / 1024).toFixed(0)} KB`);
  lines.push(`Number of Chunks: ${analysis.chunks.length}`);
  lines.push('');
  
  if (analysis.largestModules.length > 0) {
    lines.push('--- Largest Modules ---');
    analysis.largestModules.slice(0, 10).forEach((mod, i) => {
      lines.push(`${i + 1}. ${mod.name}: ${(mod.size / 1024).toFixed(0)} KB (${mod.percentage.toFixed(1)}%)`);
    });
    lines.push('');
  }
  
  if (analysis.recommendations.length > 0) {
    lines.push('--- Recommendations ---');
    analysis.recommendations.forEach((rec, i) => {
      lines.push(`${i + 1}. [${rec.priority.toUpperCase()}] ${rec.type.replace('_', ' ').toUpperCase()}`);
      lines.push(`   Module: ${rec.module}`);
      lines.push(`   Current Size: ${(rec.currentSize / 1024).toFixed(0)} KB`);
      lines.log(`   Potential Savings: ${(rec.potentialSavings / 1024).toFixed(0)} KB`);
      lines.push(`   ${rec.description}`);
      lines.push(`   → ${rec.implementation}`);
      lines.push('');
    });
  }
  
  lines.push('='.repeat(60));
  
  return lines.join('\n');
}

/**
 * Check if bundle meets performance budgets
 */
export function checkBudgets(
  analysis: BundleAnalysis,
  thresholds: BundleThresholds = DEFAULT_THRESHOLDS
): { passed: boolean; violations: Array<{ metric: string; actual: number; limit: number }> } {
  const violations: Array<{ metric: string; actual: number; limit: number }> = [];
  
  const totalSizeKB = analysis.totalGzipSize / 1024;
  if (totalSizeKB > thresholds.maxTotalSizeKB) {
    violations.push({ metric: 'total_gzip_size', actual: totalSizeKB, limit: thresholds.maxTotalSizeKB });
  }
  
  const vendorChunks = analysis.chunks.filter(c => c.name.includes('vendor') || c.name.includes('chunk-'));
  vendorChunks.forEach(chunk => {
    const chunkSizeKB = chunk.gzipSize / 1024;
    if (chunkSizeKB > thresholds.maxVendorSizeKB) {
      violations.push({ metric: `chunk_${chunk.name}`, actual: chunkSizeKB, limit: thresholds.maxVendorSizeKB });
    }
  });
  
  return {
    passed: violations.length === 0,
    violations,
  };
}

/**
 * Save analysis to file for historical tracking
 */
export function saveAnalysisHistory(
  analysis: BundleAnalysis,
  historyDir: string = '.performance/bundle-history'
): void {
  if (!fs.existsSync(historyDir)) {
    fs.mkdirSync(historyDir, { recursive: true });
  }
  
  const filename = `bundle-analysis-${Date.now()}.json`;
  fs.writeFileSync(
    path.join(historyDir, filename),
    JSON.stringify(analysis, null, 2)
  );
}

// Export types and main function
export type { BundleAnalysis, BundleChunk, Recommendation, BundleThresholds };
export default analyzeBundle;
