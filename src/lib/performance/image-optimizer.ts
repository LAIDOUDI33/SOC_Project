/**
 * Djezzy SOC Platform - Image Optimization Utilities
 * 
 * Optimized image handling for dashboard and reports:
 * - Automatic format conversion (AVIF/WebP)
 * - Responsive image generation
 * - Lazy loading support
 * - Blur placeholder generation
 */

import Image from 'next/image';

// ============================================================
// TYPES
// ============================================================

interface ImageOptions {
  /** Width in pixels */
  width?: number;
  /** Height in pixels */
  height?: number;
  /** Image quality (1-100) */
  quality?: number;
  /** Priority loading (above fold) */
  priority?: boolean;
  /** Enable blur placeholder */
  blurPlaceholder?: boolean;
  /** CSS class name */
  className?: string;
  /** Alt text for accessibility */
  alt: string;
  /** Object fit style */
  objectFit?: 'cover' | 'contain' | 'fill' | 'none';
  /** Fill container (requires parent with position:relative) */
  fill?: boolean;
}

interface ResponsiveImageConfig {
  /** Breakpoint sizes */
  sizes: {
    mobile: number;    // < 640px
    tablet: number;    // < 768px
    desktop: number;   // < 1024px
    large: number;     // < 1280px
    xlarge: number;    // > 1280px
  };
  /** Device pixel ratios to generate */
  pixelRatios: [1, 2, 3];
  /** Default quality per format */
  quality: {
    avif: number;
    webp: number;
    jpeg: number;
  };
}

// ============================================================
// CONFIGURATION
// ============================================================

const DEFAULT_RESPONSIVE_CONFIG: ResponsiveImageConfig = {
  sizes: {
    mobile: 375,
    tablet: 640,
    desktop: 768,
    large: 1024,
    xlarge: 1536,
  },
  pixelRatios: [1, 2, 3],
  quality: {
    avif: 75,
    webp: 80,
    jpeg: 85,
  },
};

const IMAGE_DOMAINS = [
  'cdn.djezzy.dz',
  'static.djezzy.dz',
  'images.djezzy.dz',
];

// ============================================================
// BLUR PLACEHOLDER GENERATION
// ============================================================

/**
 * Generate a low-quality blur placeholder for images
 * Creates a tiny base64 encoded version for instant display
 */
export async function generateBlurPlaceholder(
  src: string,
  width: number = 10,
  height: number = 10
): Promise<string> {
  try {
    // In production, this would use a server-side utility
    // For now, return a simple SVG placeholder
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#e2e8f0;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#cbd5e1;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grad)" />
      </svg>
    `;
    
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  } catch (error) {
    console.warn('Failed to generate blur placeholder:', error);
    return '';
  }
}

/**
 * Get a solid color placeholder as fallback
 */
export function getColorPlaceholder(color: string = '#e2e8f0'): string {
  return `data:image/svg+xml;base64,${Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect fill="${color}" width="1" height="1"/></svg>`
  ).toString('base64')}`;
}

// ============================================================
// OPTIMIZED IMAGE COMPONENT
// ============================================================

interface OptimizedImageProps extends Omit<ImageOptions, 'alt'> {
  src: string;
  alt: string;
  /** Responsive sizes attribute */
  sizes?: string;
  /** Custom loader function */
  loader?: (props: { src: string; width: number; quality?: number }) => string;
}

/**
 * OptimizedImage component with automatic optimization
 * 
 * @example
 * ```tsx
 * <OptimizedImage
 *   src="/images/dashboard-hero.jpg"
 *   alt="SOC Dashboard Overview"
 *   width={1200}
 *   height={600}
 *   priority
 *   blurPlaceholder
 * />
 * ```
 */
export function OptimizedImage({
  src,
  alt,
  width = 800,
  height = 600,
  quality = 85,
  priority = false,
  blurPlaceholder: useBlur = false,
  className,
  objectFit = 'cover',
  fill = false,
  sizes,
}: OptimizedImageProps) {
  // Validate source URL
  const isValidSrc = validateImageUrl(src);
  
  if (!isValidSrc) {
    console.error(`Invalid image source: ${src}`);
    return null;
  }

  // Build image props
  const imageProps = {
    src,
    alt,
    width: fill ? undefined : width,
    height: fill ? undefined : height,
    quality,
    priority,
    className: `optimized-image ${className || ''}`,
    ...(objectFit && { style: { objectFit } }),
    ...(sizes && { sizes }),
    ...(fill && { fill }),
    // Placeholder configuration
    placeholder: useBlur ? 'blur' : undefined,
    blurDataURL: useBlur ? getColorPlaceholder() : undefined,
    // Loading behavior
    loading: priority ? undefined : 'lazy',
  };

  return (
    <div className={`image-wrapper ${useBlur ? 'with-blur' : ''}`}>
      <Image {...imageProps} />
      {alt && <span className="sr-only">{alt}</span>}
    </div>
  );
}

// ============================================================
// RESPONSIVE IMAGE GENERATOR
// ============================================================

/**
 * Generate responsive srcset for different screen sizes
 */
export function generateResponsiveSrcset(
  baseUrl: string,
  config: ResponsiveImageConfig = DEFAULT_RESPONSIVE_CONFIG
): string {
  const sources: string[] = [];
  
  for (const [breakpoint, size] of Object.entries(config.sizes)) {
    for (const dpr of config.pixelRatios) {
      const targetWidth = size * dpr;
      sources.push(`${baseUrl}?w=${targetWidth}&q=${config.quality.webp} ${targetWidth}w`);
    }
  }
  
  return sources.join(', ');
}

/**
 * Generate sizes attribute for responsive images
 */
export function generateSizesAttribute(
  customSizes?: Partial<Record<keyof ResponsiveImageConfig['sizes'], string>>
): string {
  const defaults = {
    mobile: '(max-width: 639px) 100vw',
    tablet: '(max-width: 767px) 100vw',
    desktop: '(max-width: 1023px) 100vw',
    large: '(max-width: 1279px) 100vw',
    xlarge: '100vw',
  };
  
  const sizes = { ...defaults, ...customSizes };
  
  return Object.values(sizes).join(', ');
}

// ============================================================
// ICON OPTIMIZATION
// ============================================================

/**
 * Optimized icon component using inline SVG or sprite
 */
export interface IconProps {
  name: string;
  size?: number | string;
  className?: string;
  color?: string;
  /** Inline SVG content (for small icons) */
  svgContent?: string;
}

export function SOCIcon({ name, size = 24, className, color = 'currentColor', svgContent }: IconProps) {
  if (svgContent) {
    return (
      <span
        className={`soc-icon soc-icon--inline ${className || ''}`}
        dangerouslySetInnerHTML={{ __html: svgContent }}
        style={{
          width: typeof size === 'number' ? `${size}px` : size,
          height: typeof size === 'number' ? `${size}px` : size,
          color,
          display: 'inline-block',
        }}
      />
    );
  }

  // Use sprite reference for larger icon sets
  return (
    <svg
      className={`soc-icon soc-icon--sprite ${className || ''}`}
      width={typeof size === 'number' ? size : parseInt(size)}
      height={typeof size === 'number' ? size : parseInt(size)}
      role="img"
      aria-label={name}
    >
      <use href={`/icons/sprite.svg#icon-${name}`} />
    </svg>
  );
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Validate that an image URL is allowed
 */
function validateImageUrl(src: string): boolean {
  try {
    const url = new URL(src, window.location.origin);
    
    // Allow relative URLs
    if (url.origin === window.location.origin) return true;
    
    // Allow configured CDN domains
    if (IMAGE_DOMAINS.some(domain => url.hostname.endsWith(domain))) return true;
    
    // Block other external URLs
    console.warn(`Blocked external image: ${src}`);
    return false;
  } catch {
    return false;
  }
}

/**
 * Calculate optimal image dimensions based on container
 */
export function calculateOptimalDimensions(
  containerWidth: number,
  containerHeight: number,
  aspectRatio: number = 16 / 9,
  maxDensity: number = 2
): { width: number; height: number } {
  const devicePixelRatio = typeof window !== 'undefined' 
    ? Math.min(window.devicePixelRatio || 1, maxDensity)
    : 1;
  
  return {
    width: Math.round(containerWidth * devicePixelRatio),
    height: Math.round((containerWidth / aspectRatio) * devicePixelRatio),
  };
}

/**
 * Get image format preference based on browser support
 */
export function getPreferredFormat(): 'avif' | 'webp' | 'jpeg' {
  if (typeof document === 'undefined') return 'webp';
  
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  
  // Check AVIF support
  if (canvas.toDataURL('image/avif').startsWith('data:image/avif')) {
    return 'avif';
  }
  
  // Check WebP support
  if (canvas.toDataURL('image/webp').startsWith('data:image/webp')) {
    return 'webp';
  }
  
  return 'jpeg';
}

/**
 * Preload critical images
 */
export function preloadImages(urls: string[], priority: 'high' | 'low' = 'high'): void {
  urls.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = url;
    
    if (priority === 'high') {
      link.fetchPriority = 'high';
    }
    
    document.head.appendChild(link);
  });
}

// Export components and utilities
export default OptimizedImage;
