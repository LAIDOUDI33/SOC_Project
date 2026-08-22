'use client';

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import {
  MapPin,
  AlertTriangle,
  TrendingUp,
  Info,
  X,
  ShieldAlert,
  Phone,
  Wifi,
  CreditCard,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * Geographic region data for heatmap
 */
export interface GeoRegion {
  /** Region identifier (wilaya code for Algeria) */
  id: string;
  /** Display name */
  name: string;
  /** Approximate coordinates for positioning [x, y] as percentage (0-100) */
  position: [number, number];
  /** Attack/fraud intensity value (0-100) */
  intensity: number;
  /** Number of incidents in this region */
  incidentCount: number;
  /** Primary threat type */
  primaryThreat?: ThreatType;
  /** Additional metadata */
  details?: string;
}

/** Types of threats to display */
export type ThreatType = 'fraud' | 'cyberattack' | 'signaling' | 'intrusion' | 'all';

/** Threat type configuration */
export const THREAT_TYPE_CONFIG: Record<ThreatType, {
  label: string;
  icon: React.ElementType;
  color: string;
}> = {
  fraud: { label: 'Fraud', icon: CreditCard, color: '#f97316' },
  cyberattack: { label: 'Cyber Attack', icon: ShieldAlert, color: '#ef4444' },
  signaling: { label: 'Signaling', icon: Wifi, color: '#8b5cf6' },
  intrusion: { label: 'Intrusion', icon: MapPin, color: '#eab308' },
  all: { label: 'All Threats', icon: AlertTriangle, color: '#64748b' },
};

/** Color scale configuration for heatmap */
const HEATMAP_COLORS = [
  { threshold: 0, color: '#166534' },    // Dark green (very low)
  { threshold: 20, color: '#22c55e' },   // Green (low)
  { threshold: 40, color: '#84cc16' },   // Lime green
  { threshold: 60, color: '#eab308' },   // Yellow (medium)
  { threshold: 80, color: '#f97316' },   // Orange (high)
  { threshold: 100, color: '#ef4444' },  // Red (critical)
];

/** Sample Algeria regional data with attack/fraud statistics */
export const ALGERIA_REGION_DATA: GeoRegion[] = [
  // Major cities and their wilayas
  { id: '16', name: 'Algiers', position: [48, 42], intensity: 92, incidentCount: 847, primaryThreat: 'cyberattack', details: 'Capital region - highest activity' },
  { id: '31', name: 'Oran', position: [22, 58], intensity: 78, incidentCount: 523, primaryThreat: 'fraud', details: 'Major commercial hub' },
  { id: '40', name: 'Constantine', position: [72, 35], intensity: 65, incidentCount: 389, primaryThreat: 'signaling', details: 'Eastern telecom gateway' },
  { id: '37', name: 'Annaba', position: [82, 52], intensity: 45, incidentCount: 234, primaryThreat: 'fraud', details: 'Port city - SIM box activity' },
  { id: '29', name: 'Mascara', position: [18, 45], intensity: 32, incidentCount: 156, primaryThreat: 'intrusion', details: 'Border region concerns' },
  { id: '28', name: 'M\'sila', position: [58, 50], intensity: 28, incidentCount: 134, primaryThreat: 'signaling', details: 'Central routing point' },
  { id: '33', name: 'Bejaia', position: [32, 44], intensity: 55, incidentCount: 278, primaryThreat: 'cyberattack', details: 'Coastal data center cluster' },
  { id: '34', name: 'Biskra', position: [68, 62], intensity: 41, incidentCount: 198, primaryThreat: 'intrusion', details: 'Sahara gateway' },
  { id: '27', name: 'Djelfa', position: [50, 55], intensity: 22, incidentCount: 98, primaryThreat: 'signaling', details: 'Transit route monitoring' },
  { id: '39', name: 'El Oued', position: [85, 70], intensity: 38, incidentCount: 187, primaryThreat: 'fraud', details: 'Cross-border activity detected' },
  { id: '18', name: 'Jijel', position: [58, 30], intensity: 25, incidentCount: 112, primaryThreat: 'cyberattack', details: 'Coastal surveillance area' },
  { id: '32', name: 'El Bayadh', position: [12, 58], intensity: 15, incidentCount: 67, primaryThreat: 'intrusion', details: 'Remote border region' },
  { id: '43', name: 'Milan', position: [65, 42], intensity: 48, incidentCount: 245, primaryThreat: 'signaling', details: 'Industrial zone traffic' },
  { id: '47', name: 'Ghardaia', position: [58, 68], intensity: 19, incidentCount: 89, primaryThreat: 'fraud', details: 'Saharan route monitoring' },
  { id: '51', name: 'Tamanrasset', position: [58, 92], intensity: 12, incidentCount: 45, primaryThreat: 'intrusion', details: 'Deep south outpost' },
  { id: '11', name: 'Tlemcen', position: [10, 48], intensity: 52, incidentCount: 267, primaryThreat: 'cyberattack', details: 'Western border gateway' },
];

export interface GeoHeatmapProps {
  /** Regional data to display on the map */
  regions?: GeoRegion[];
  /** Callback when a region is clicked */
  onRegionClick?: (region: GeoRegion) => void;
  /** Additional CSS classes */
  className?: string;
  /** Show legend (default: true) */
  showLegend?: boolean;
  /** Show tooltips on hover (default: true) */
  showTooltips?: boolean;
  /** Default threat filter (default: 'all') */
  defaultThreatFilter?: ThreatType;
  /** Enable animation on data update (default: true) */
  animate?: boolean;
}

/** Get color based on intensity value */
function getHeatColor(intensity: number): string {
  for (let i = HEATMAP_COLORS.length - 1; i >= 0; i--) {
    if (intensity >= HEATMAP_COLORS[i].threshold) {
      return HEATMAP_COLORS[i].color;
    }
  }
  return HEATMAP_COLORS[0].color;
}

/** Get opacity based on intensity value */
function getHeatOpacity(intensity: number): number {
  return 0.4 + (intensity / 100) * 0.6;
}

/** Simplified Algeria SVG path (approximate outline) */
const ALGERIA_OUTLINE_PATH = `
  M 12 35
  L 8 42 L 5 48 L 8 55 L 12 58 L 10 65 L 15 75
  L 25 88 L 40 95 L 55 98 L 70 95 L 80 90
  L 92 78 L 95 68 L 92 58 L 88 50 L 90 42
  L 85 35 L 78 28 L 70 22 L 60 18 L 50 15
  L 40 18 L 30 25 L 22 30 Z
`;

/** City positions for labels */
const CITY_LABELS = [
  { name: 'Algiers', position: [48, 42], offset: [15, -5] as [number, number] },
  { name: 'Oran', position: [22, 58], offset: [-35, 5] as [number, number] },
  { name: 'Constantine', position: [72, 35], offset: [10, -8] as [number, number] },
  { name: 'Annaba', position: [82, 52], offset: [10, 5] as [number, number] },
];

/**
 * GeoHeatmap - Geographic heatmap for attack/fraud visualization
 * 
 * Features:
 * - Simplified Algeria map with wilaya-level regions
 * - Hotspots showing attack density by region
 * - Major cities labeled (Algiers, Oran, Constantine, Annaba)
 * - Color gradient from green (low) to red (high)
 * - Interactive tooltips showing stats on hover
 * - Legend with intensity scale
 * - Animation when data updates
 * 
 * @example
 * ```tsx
 * <GeoHeatmap
 *   regions={algeriaData}
 *   onRegionClick={(region) => showRegionDetails(region)}
 * />
 * ```
 */
export function GeoHeatmap({
  regions = ALGERIA_REGION_DATA,
  onRegionClick,
  className,
  showLegend = true,
  showTooltips = true,
  defaultThreatFilter = 'all',
  animate = true,
}: GeoHeatmapProps) {
  // State management
  const [selectedRegion, setSelectedRegion] = useState<GeoRegion | null>(null);
  const [hoveredRegion, setHoveredRegion] = useState<GeoRegion | null>(null);
  const [threatFilter, setThreatFilter] = useState<ThreatType>(defaultThreatFilter);

  // Filter regions by threat type
  const filteredRegions = useMemo(() => {
    if (threatFilter === 'all') return regions;
    return regions.filter((r) => r.primaryThreat === threatFilter);
  }, [regions, threatFilter]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalIncidents = regions.reduce((sum, r) => sum + r.incidentCount, 0);
    const avgIntensity = Math.round(regions.reduce((sum, r) => sum + r.intensity, 0) / regions.length);
    const maxIntensity = Math.max(...regions.map((r) => r.intensity));
    const hotspots = regions.filter((r) => r.intensity > 70).length;
    
    return { totalIncidents, avgIntensity, maxIntensity, hotspots };
  }, [regions]);

  // Handle region interaction
  const handleRegionClick = useCallback(
    (region: GeoRegion) => {
      setSelectedRegion(region === selectedRegion ? null : region);
      onRegionClick?.(region);
    },
    [onRegionClick, selectedRegion]
  );

  // Render hotspot circle for each region
  const renderHotspot = (region: GeoRegion) => {
    const isSelected = selectedRegion?.id === region.id;
    const isHovered = hoveredRegion?.id === region.id;
    const color = getHeatColor(region.intensity);
    const baseOpacity = getHeatOpacity(region.intensity);
    const size = 15 + (region.intensity / 100) * 25;

    return (
      <g key={region.id} className="cursor-pointer">
        {/* Outer glow for high-intensity regions */}
        {region.intensity > 60 && (
          <circle
            cx={region.position[0]}
            cy={region.position[1]}
            r={size + 10}
            fill={color}
            opacity={0.1}
          >
            {animate && (
              <animate
                attributeName="opacity"
                values="0.1;0.2;0.1"
                dur={`${2 + (100 - region.intensity) / 50}s`}
                repeatCount="indefinite"
              />
            )}
          </circle>
        )}

        {/* Main hotspot circle */}
        <circle
          cx={region.position[0]}
          cy={region.position[1]}
          r={size}
          fill={color}
          opacity={isHovered || isSelected ? 0.9 : baseOpacity}
          className="transition-all duration-300"
          style={{
            transformOrigin: `${region.position[0]}px ${region.position[1]}px`,
            transform: isHovered ? 'scale(1.2)' : undefined,
          }}
        />

        {/* Inner bright core */}
        <circle
          cx={region.position[0]}
          cy={region.position[1]}
          r={size * 0.4}
          fill={color}
          opacity={0.9}
        />

        {/* Selection ring */}
        {isSelected && (
          <circle
            cx={region.position[0]}
            cy={region.position[1]}
            r={size + 5}
            fill="none"
            stroke="#fff"
            strokeWidth={2}
            opacity={0.8}
          >
            <animate
              attributeName="r"
              values={`${size + 5};${size + 10};${size + 5}`}
              dur="2s"
              repeatCount="indefinite"
            />
          </circle>
        )}

        {/* Invisible hit area for easier interaction */}
        <circle
          cx={region.position[0]}
          cy={region.position[1]}
          r={Math.max(size, 20)}
          fill="transparent"
          onClick={() => handleRegionClick(region)}
          onMouseEnter={() => setHoveredRegion(region)}
          onMouseLeave={() => setHoveredRegion(null)}
        />

        {/* Incident count badge for significant regions */}
        {region.incidentCount > 200 && (
          <text
            x={region.position[0]}
            y={region.position[1] + 4}
            textAnchor="middle"
            className="text-[10px] font-bold fill-white pointer-events-none select-none"
          >
            {region.incidentCount > 999 ? `${(region.incidentCount / 1000).toFixed(1)}k` : region.incidentCount}
          </text>
        )}
      </g>
    );
  };

  return (
    <TooltipProvider delayDuration={150}>
      <Card className={cn('overflow-hidden', className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="w-5 h-5 text-red-400" />
              Geographic Threat Distribution - Algeria
            </CardTitle>
            
            {/* Quick stats */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{stats.totalIncidents.toLocaleString()} events</span>
              </div>
              <Badge variant="outline" className="text-orange-400 border-orange-500/30">
                {stats.hotspots} hotspots
              </Badge>
            </div>
          </div>

          {/* Threat Type Filter */}
          <div className="flex flex-wrap gap-2 mt-3">
            {(Object.entries(THREAT_TYPE_CONFIG) as [ThreatEventType, typeof THREAT_TYPE_CONFIG[ThreatType]][]).map(
              ([type, config]) => (
                <button
                  key={type}
                  onClick={() => setThreatFilter(type)}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all',
                    'border',
                    threatFilter === type
                      ? 'bg-slate-700 border-slate-500 text-slate-200'
                      : 'bg-transparent border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-300'
                  )}
                >
                  <config.icon className="w-3 h-3" style={{ color: config.color }} />
                  {config.label}
                  {type !== 'all' && (
                    <span className="ml-0.5 opacity-70">
                      ({regions.filter((r) => r.primaryThreat === type).length})
                    </span>
                  )}
                </button>
              )
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0 relative">
          <div className="relative bg-slate-950/50 p-4">
            {/* SVG Map Container */}
            <svg
              viewBox="0 0 100 110"
              className="w-full h-auto"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                {/* Gradient for map background */}
                <linearGradient id="map-bg" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0f172a" />
                  <stop offset="100%" stopColor="#1e293b" />
                </linearGradient>

                {/* Glow filter for hotspots */}
                <filter id="heatmap-glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Background map shape */}
              <path
                d={ALGERIA_OUTLINE_PATH}
                fill="url(#map-bg)"
                stroke="#334155"
                strokeWidth={0.5}
                className="opacity-80"
              />

              {/* Grid lines for reference */}
              <g stroke="#1e293b" strokeWidth={0.1} opacity={0.5}>
                {[20, 40, 60, 80].map((x) => (
                  <line key={`v-${x}`} x1={x} y1={10} x2={x} y2={100} />
                ))}
                {[20, 40, 60, 80].map((y) => (
                  <line key={`h-${y}`} x1={5} y1={y} x2={95} y2={y} />
                ))}
              </g>

              {/* Hotspot circles */}
              <g filter="url(#heatmap-glow)">
                {filteredRegions.map(renderHotspot)}
              </g>

              {/* City labels */}
              {CITY_LABELS.map((city) => (
                <g key={city.name}>
                  <text
                    x={city.position[0] + city.offset[0]}
                    y={city.position[1] + city.offset[1]}
                    className="text-[5px] font-semibold fill-slate-300 pointer-events-none"
                    textAnchor="start"
                  >
                    {city.name}
                  </text>
                  {/* Small dot for city location */}
                  <circle
                    cx={city.position[0]}
                    cy={city.position[1]}
                    r={1}
                    fill="#94a3b8"
                    opacity={0.7}
                  />
                </g>
              ))}

              {/* Compass indicator */}
              <g transform="translate(90, 15)">
                <circle cx={0} cy={0} r={4} fill="none" stroke="#475569" strokeWidth={0.3} />
                <text x={0} y="-5} " textAnchor="middle" className="text-[4px] fill-slate-500">N</text>
                <polygon points="0,-3 -1,1 0,0 1,1" fill="#64748b" />
              </g>
            </svg>

            {/* Hover tooltip overlay */}
            {showTooltips && hoveredRegion && !selectedRegion && (
              <div
                className="absolute z-20 bg-slate-900/98 rounded-lg border border-slate-700 shadow-xl p-3 min-w-[180px]"
                style={{
                  left: `${hoveredRegion.position[0]}%`,
                  top: `${hoveredRegion.position[1]}%`,
                  transform: 'translate(-50%, -120%)',
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm text-slate-200">{hoveredRegion.name}</span>
                  <Badge
                    variant="outline"
                    className="text-[10px]"
                    style={{
                      color: getHeatColor(hoveredRegion.intensity),
                      borderColor: getHeatColor(hoveredRegion.intensity),
                    }}
                  >
                    {hoveredRegion.intensity}% risk
                  </Badge>
                </div>
                
                <div className="space-y-1 text-xs text-slate-400">
                  <div className="flex justify-between">
                    <span>Incidents:</span>
                    <span className="font-medium text-slate-300">{hoveredRegion.incidentCount}</span>
                  </div>
                  {hoveredRegion.primaryThreat && (
                    <div className="flex justify-between items-center">
                      <span>Primary:</span>
                      <span className="flex items-center gap-1" style={{ color: THREAT_TYPE_CONFIG[hoveredRegion.primaryThreat]?.color }}>
                        {(() => {
                          const IconComponent = THREAT_TYPE_CONFIG[hoveredRegion.primaryThreat!]?.icon || AlertTriangle;
                          return <IconComponent className="w-3 h-3" />;
                        })()}
                        {THREAT_TYPE_CONFIG[hoveredRegion.primaryThreat]?.label}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Selected region detail panel */}
            {selectedRegion && (
              <div className="absolute top-4 right-4 w-64 bg-slate-900/98 rounded-xl border border-slate-700 shadow-2xl z-30 overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" style={{ color: getHeatColor(selectedRegion.intensity) }} />
                    <span className="font-semibold text-slate-200">{selectedRegion.name}</span>
                  </div>
                  <button
                    onClick={() => setSelectedRegion(null)}
                    className="p-1 hover:bg-slate-800 rounded transition-colors"
                  >
                    <X className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
                
                <div className="p-4 space-y-3">
                  {/* Intensity gauge */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">Risk Level</span>
                      <span className="font-bold" style={{ color: getHeatColor(selectedRegion.intensity) }}>
                        {selectedRegion.intensity}%
                      </span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${selectedRegion.intensity}%`,
                          backgroundColor: getHeatColor(selectedRegion.intensity),
                        }}
                      />
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                      <p className="text-lg font-bold text-slate-200">{selectedRegion.incidentCount}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">Incidents</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-2 text-center">
                      <p className="text-lg font-bold text-slate-200">
                        {selectedRegion.intensity > 70 ? 'High' : selectedRegion.intensity > 40 ? 'Med' : 'Low'}
                      </p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider">Priority</p>
                    </div>
                  </div>

                  {/* Threat type */}
                  {selectedRegion.primaryThreat && (
                    <div className="flex items-center gap-2 p-2 bg-slate-800/30 rounded-lg">
                      {(() => {
                        const IconComponent = THREAT_TYPE_CONFIG[selectedRegion.primaryThreat!]?.icon || AlertTriangle;
                        return <IconComponent className="w-4 h-4" style={{ color: THERT_TYPE_CONFIG[selectedRegion.primaryThreat!]?.color }} />;
                      })()}
                      <span className="text-sm text-slate-300">
                        {THREAT_TYPE_CONFIG[selectedRegion.primaryThreat!]?.label}
                      </span>
                    </div>
                  )}

                  {/* Description */}
                  {selectedRegion.details && (
                    <p className="text-xs text-slate-500 italic">{selectedRegion.details}</p>
                  )}

                  {/* Action button */}
                  <button
                    onClick={() => {
                      onRegionClick?.(selectedRegion);
                      setSelectedRegion(null);
                    }}
                    className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Info className="w-4 h-4" />
                    View Full Report
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Legend */}
          {showLegend && (
            <div className="px-4 pb-4">
              <div className="flex items-center justify-between bg-slate-900/50 rounded-lg p-3 border border-slate-800">
                <span className="text-xs font-medium text-slate-400">Intensity Scale</span>
                <div className="flex items-center gap-1">
                  {HEATMAP_COLORS.map((entry, index) => (
                    <Tooltip key={index}>
                      <TooltipTrigger asChild>
                        <div
                          className="w-6 h-4 rounded-sm cursor-pointer"
                          style={{ backgroundColor: entry.color }}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p className="text-xs">
                          {index === 0 ? `<${entry.threshold + 20}` : `${entry.threshold}${index < HEATMAP_COLORS.length - 1 ? '-' : '+'}`}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                  <span className="text-[10px] text-slate-500 ml-2 w-16">
                    Low → High
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

// Fix typo in component
const THERT_TYPE_CONFIG = THREAT_TYPE_CONFIG;

// Named export for barrel file
export default GeoHeatmap;
