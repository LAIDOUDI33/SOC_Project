'use client';

// ============================================================
// National SOC Platform - Attack Surface Management Dashboard
// Frontend component for ASM visualization and management
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Shield,
  Globe,
  Server,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  Plus,
  RefreshCw,
  Eye,
  Trash2,
  Radar,
  Lock,
  Unlock,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';

// Types
interface Asset {
  id: string;
  name: string;
  type: string;
  value: string;
  status: string;
  risk_score: number;
  exposure_level: string;
  environment: string;
  classification: string;
  is_monitored: boolean;
  last_scanned?: string;
  tags?: string[];
}

interface DashboardMetrics {
  total_assets: number;
  exposed_assets: number;
  critical_exposures: number;
  average_risk_score: number;
  assets_by_type: Record<string, number>;
  monitored_assets: number;
}

// Constants
const EXPOSURE_COLORS = {
  critical: 'bg-red-500 text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-yellow-500 text-black',
  low: 'bg-green-500 text-white',
  internal: 'bg-gray-500 text-white',
};

const STATUS_ICONS = {
  active: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  inactive: <XCircle className="h-4 w-4 text-gray-400" />,
  retired: <Minus className="h-4 w-4 text-gray-400" />,
  unknown: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
};

const TYPE_ICONS = {
  domain: <Globe className="h-4 w-4" />,
  ip: <Server className="h-4 w-4" />,
  url: <ExternalLink className="h-4 w-4" />,
  service: <Shield className="h-4 w-4" />,
  cloud_resource: <Radar className="h-4 w-4" />,
  api_endpoint: <Lock className="h-4 w-4" />,
};

export default function AttackSurfaceDashboard() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterExposure, setFilterExposure] = useState('all');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [discoveryTarget, setDiscoveryTarget] = useState('');
  const [isDiscovering, setIsDiscovering] = useState(false);

  // Fetch data
  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterType !== 'all') params.append('type', filterType);
      if (filterExposure !== 'all') params.append('exposure', filterExposure);
      
      const [assetsRes, metricsRes] = await Promise.all([
        fetch(`/api/attack-surface?${params}`),
        fetch('/api/attack-surface?action=dashboard'),
      ]);
      
      if (assetsRes.ok) {
        const assetsData = await assetsRes.json();
        setAssets(assetsData.data || []);
      }
      
      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setMetrics(metricsData);
      }
    } catch (error) {
      console.error('Failed to fetch attack surface data:', error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filterType, filterExposure]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Run discovery
  const handleDiscovery = async () => {
    if (!discoveryTarget.trim()) return;
    
    setIsDiscovering(true);
    try {
      const response = await fetch('/api/attack-surface', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'discover',
          target: discoveryTarget.trim(),
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(`Discovery complete! Found ${result.assets?.length || 0} assets.`);
        fetchAssets();
        setDiscoveryTarget('');
      }
    } catch (error) {
      console.error('Discovery failed:', error);
      alert('Discovery failed. Please try again.');
    } finally {
      setIsDiscovering(false);
    }
  };

  // Delete asset
  const handleDelete = async (assetId: string) => {
    if (!confirm('Are you sure you want to retire this asset?')) return;
    
    try {
      const response = await fetch(`/api/attack-surface/${assetId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        fetchAssets();
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  // Risk score color
  const getRiskColor = (score: number) => {
    if (score >= 80) return 'text-red-600 bg-red-50';
    if (score >= 60) return 'text-orange-600 bg-orange-50';
    if (score >= 40) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Radar className="h-8 w-8 text-primary" />
            Attack Surface Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Discover, monitor, and manage your organization's internet-facing attack surface
          </p>
        </div>
        
        {/* Discovery Dialog */}
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Run Discovery
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Asset Discovery</DialogTitle>
              <DialogDescription>
                Enter a domain or IP address to discover associated attack surface assets.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Input
                placeholder="e.g., example.com or 203.0.113.50"
                value={discoveryTarget}
                onChange={(e) => setDiscoveryTarget(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleDiscovery()}
              />
              <Button 
                onClick={handleDiscovery} 
                disabled={isDiscovering || !discoveryTarget.trim()}
                className="w-full"
              >
                {isDiscovering ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Radar className="mr-2 h-4 w-4" />
                    Start Discovery
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Metrics Cards */}
      {metrics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.total_assets}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Exposed Assets</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{metrics.exposed_assets}</div>
              <p className="text-xs text-muted-foreground">
                {Math.round((metrics.exposed_assets / metrics.total_assets) * 100)}% of total
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical Exposures</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{metrics.critical_exposures}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Risk Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getRiskColor(metrics.average_risk_score).split(' ')[0]}`}>
                {metrics.average_risk_score}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monitored</CardTitle>
              <Shield className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{metrics.monitored_assets}</div>
              <p className="text-xs text-muted-foreground">
                {Math.round((metrics.monitored_assets / metrics.total_assets) * 100)}% coverage
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="assets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="assets">Assets Inventory</TabsTrigger>
          <TabsTrigger value="exposure">Exposure Analysis</TabsTrigger>
          <TabsTrigger value="certificates">Certificates</TabsTrigger>
        </TabsList>

        <TabsContent value="assets" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search assets by name or value..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="domain">Domain</SelectItem>
                    <SelectItem value="ip">IP Address</SelectItem>
                    <SelectItem value="url">URL</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="cloud_resource">Cloud Resource</SelectItem>
                    <SelectItem value="api_endpoint">API Endpoint</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={filterExposure} onValueChange={setFilterExposure}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Exposure" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="internal">Internal</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button variant="outline" onClick={fetchAssets}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Assets Table */}
          <Card>
            <CardContent className="pt-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Risk Score</TableHead>
                      <TableHead>Exposure</TableHead>
                      <TableHead>Environment</TableHead>
                      <TableHead>Monitored</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                          No assets found. Run discovery or add assets manually.
                        </TableCell>
                      </TableRow>
                    ) : (
                      assets.map((asset) => (
                        <TableRow key={asset.id} className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedAsset(asset)}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {TYPE_ICONS[asset.type as keyof typeof TYPE_ICONS] || <Globe className="h-4 w-4" />}
                              <div>
                                <div className="font-medium">{asset.name}</div>
                                <div className="text-sm text-muted-foreground">{asset.value}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{asset.type}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {STATUS_ICONS[asset.status as keyof typeof STATUS_ICONS]}
                              <span className="capitalize text-sm">{asset.status}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${getRiskColor(asset.risk_score)}`}>
                              {asset.risk_score}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge className={EXPOSURE_COLORS[asset.exposure_level as keyof typeof EXPOSURE_COLORS]}>
                              {asset.exposure_level.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="capitalize text-sm">{asset.environment}</span>
                          </TableCell>
                          <TableCell>
                            {asset.is_monitored ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-gray-400" />
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); }}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(asset.id); }}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exposure">
          <Card>
            <CardHeader>
              <CardTitle>Exposure Analysis</CardTitle>
              <CardDescription>
                Overview of your organization's exposure levels and risk distribution
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
                {['critical', 'high', 'medium', 'low'].map((level) => (
                  <div key={level} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="capitalize font-medium">{level}</span>
                      <Badge className={EXPOSURE_COLORS[level as keyof typeof EXPOSURE_COLORS]}>
                        {assets.filter(a => a.exposure_level === level).length}
                      </Badge>
                    </div>
                    <Progress 
                      value={assets.length > 0 ? (assets.filter(a => a.exposure_level === level).length / assets.length) * 100 : 0}
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
              
              {/* High-risk assets list */}
              <div className="space-y-2">
                <h4 className="font-semibold">High-Risk Assets Requiring Attention</h4>
                {assets
                  .filter(a => a.risk_score >= 60)
                  .sort((a, b) => b.risk_score - a.risk_score)
                  .slice(0, 5)
                  .map((asset) => (
                    <div key={asset.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {TYPE_ICONS[asset.type as keyof typeof TYPE_ICONS] || <Globe className="h-4 w-4" />}
                        <div>
                          <div className="font-medium">{asset.name}</div>
                          <div className="text-sm text-muted-foreground">{asset.value}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded-full text-sm font-medium ${getRiskColor(asset.risk_score)}`}>
                          {asset.risk_score}
                        </span>
                        <Badge className={EXPOSURE_COLORS[asset.exposure_level as keyof typeof EXPOSURE_COLORS]}>
                          {asset.exposure_level}
                        </Badge>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="certificates">
          <Card>
            <CardHeader>
              <CardTitle>Certificate Management</CardTitle>
              <CardDescription>
                Monitor SSL/TLS certificates across all discovered assets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Lock className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <h3 className="font-semibold mb-2">Certificate Monitoring</h3>
                <p className="mb-4">
                  Certificate inventory and expiry tracking will be available here after integration with certificate scanners.
                </p>
                <Button variant="outline">
                  Configure Certificate Scanning
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
