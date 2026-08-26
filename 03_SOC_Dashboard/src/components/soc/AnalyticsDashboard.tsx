"use client";

import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ==================== MOCK DATA FOR CHARTS ====================

// Alert trend data (last 7 days)
const alertTrendData = [
  { date: "Mon", critical: 8, high: 24, medium: 45, low: 18 },
  { date: "Tue", critical: 12, high: 28, medium: 52, low: 22 },
  { date: "Wed", critical: 6, high: 19, medium: 38, low: 15 },
  { date: "Thu", critical: 15, high: 35, medium: 62, low: 28 },
  { date: "Fri", critical: 9, high: 22, medium: 41, low: 19 },
  { date: "Sat", critical: 4, high: 14, medium: 29, low: 12 },
  { date: "Sun", critical: 11, high: 26, medium: 48, low: 21 }
];

// Severity distribution data
const severityDistribution = [
  { name: "Critical", value: 12, color: "#ef4444" },
  { name: "High", value: 34, color: "#f97316" },
  { name: "Medium", value: 67, color: "#eab308" },
  { name: "Low", value: 34, color: "#3b82f6" }
];

// Incident MTTR data
const mttrData = [
  { category: "Ransomware", mttr: 12.5, target: 4.0 },
  { category: "Phishing", mttr: 2.1, target: 1.0 },
  { category: "Malware", mttr: 6.3, target: 3.0 },
  { category: "DDoS", mttr: 1.8, target: 0.5 },
  { category: "Data Breach", mttr: 24.0, target: 8.0 },
  { category: "Unauthorized Access", mttr: 4.5, target: 2.0 }
];

// EPS (Events Per Second) over 24 hours
const epsData = Array.from({ length: 24 }, (_, i) => ({
  hour: `${i.toString().padStart(2, "0")}:00`,
  eps: Math.floor(700000 + Math.random() * 300000 + Math.sin(i / 3) * 150000),
  capacity: 1000000
}));

// Threat actor activity radar
const threatActorData = [
  { subject: "Sophistication", APT28: 95, APT29: 92, Lazarus: 89, SilentLibrarian: 75 },
  { subject: "Resources", APT28: 90, APT29: 88, Lazarus: 85, SilentLibrarian: 60 },
  { subject: "Persistence", APT28: 92, APT29: 90, Lazarus: 87, SilentLibrarian: 70 },
  { subject: "Reach", APT28: 88, APT29: 85, Lazarus: 82, SilentLibrarian: 55 },
  { subject: "Impact", APT28: 94, APT29: 91, Lazarus: 90, SilentLibrarian: 65 },
  { subject: "Stealth", APT28: 96, APT29: 94, Lazarus: 78, SilentLibrarian: 80 }
];

// Source distribution
const sourceData = [
  { name: "Wazuh SIEM", alerts: 45, color: "#10b981" },
  { name: "Wazuh EDR", alerts: 32, color: "#06b6d4" },
  { name: "MISP TIP", alerts: 18, color: "#8b5cf6" },
  { name: "Suricata IDS", alerts: 28, color: "#f59e0b" },
  { name: "TheHive SOAR", alerts: 15, color: "#ec4899" },
  { name: "Other Sources", alerts: 9, color: "#6b7280" }
];

// Incident status breakdown
const incidentStatusData = [
  { status: "Open", count: 23, color: "#ef4444" },
  { status: "Contained", count: 8, color: "#f97316" },
  { status: "Eradicated", count: 5, color: "#eab308" },
  { status: "Recovered", count: 12, color: "#3b82f6" },
  { status: "Closed", count: 45, color: "#10b981" }
];

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 border border-slate-700 rounded-lg p-3 shadow-xl backdrop-blur-sm">
        <p className="text-white font-medium text-sm mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            <span 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-slate-400">{entry.name}:</span>
            <span className="text-white font-medium">{entry.value?.toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// Main Analytics Dashboard Component
export function AnalyticsDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState("7d");
  const [isLive, setIsLive] = useState(false);

  // Simulate live updates
  useEffect(() => {
    if (!isLive) return;
    
    const interval = setInterval(() => {
      // This would update chart data in real implementation
      console.log("[Analytics] Live update tick");
    }, 5000);

    return () => clearInterval(interval);
  }, [isLive]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Advanced Analytics
          </h2>
          <p className="text-sm text-slate-400 mt-1">Real-time security metrics and trends</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Period Selector */}
          <Tabs value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <TabsList className="bg-slate-800 border border-slate-700">
              <TabsTrigger value="24h" className="text-xs">24H</TabsTrigger>
              <TabsTrigger value="7d" className="text-xs">7D</TabsTrigger>
              <TabsTrigger value="30d" className="text-xs">30D</TabsTrigger>
              <TabsTrigger value="90d" className="text-xs">90D</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Live Toggle */}
          <button
            onClick={() => setIsLive(!isLive)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isLive 
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50" 
                : "bg-slate-800 text-slate-400 border border-slate-700"
            }`}
          >
            <span className={`inline-block w-2 h-2 rounded-full mr-2 ${isLive ? "bg-emerald-500 animate-pulse" : "bg-slate-600"}`} />
            {isLive ? "LIVE" : "PAUSED"}
          </button>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Alert Trends - Area Chart */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base flex items-center justify-between">
              <span>Alert Trends</span>
              <Badge variant="outline" className="border-emerald-500/50 text-emerald-400 text-xs">
                Last 7 Days
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={alertTrendData}>
                <defs>
                  <linearGradient id="colorCritical" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorMedium" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#eab308" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area type="monotone" dataKey="critical" stackId="1" stroke="#ef4444" fill="url(#colorCritical)" name="Critical" />
                <Area type="monotone" dataKey="high" stackId="1" stroke="#f97316" fill="url(#colorHigh)" name="High" />
                <Area type="monotone" dataKey="medium" stackId="1" stroke="#eab308" fillOpacity={0.5} fill="#eab308" name="Medium" />
                <Area type="monotone" dataKey="low" stackId="1" stroke="#3b82f6" fillOpacity={0.3} fill="#3b82f6" name="Low" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Severity Distribution - Pie Chart */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base">Severity Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={severityDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {severityDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    verticalAlign="bottom" 
                    formatter={(value) => <span className="text-slate-300">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Stats below chart */}
            <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-slate-700">
              {severityDistribution.map((item) => (
                <div key={item.name} className="text-center">
                  <p className="text-lg font-bold" style={{ color: item.color }}>{item.value}</p>
                  <p className="text-xs text-slate-500">{item.name}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* EPS Processing - Line Chart */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base flex items-center justify-between">
              <span>Events Per Second (EPS)</span>
              <span className="text-xs text-cyan-400 font-mono">Peak: 1.25M</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={epsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="hour" stroke="#64748b" fontSize={10} interval={3} />
                <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="eps" stroke="#06b6d4" strokeWidth={2} dot={false} name="Current EPS" />
                <Line type="monotone" dataKey="capacity" stroke="#475569" strokeWidth={1} strokeDasharray="5 5" dot={false} name="Capacity" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* MTTR Analysis - Bar Chart */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base flex items-center justify-between">
              <span>MTTR by Category</span>
              <Badge variant="outline" className="border-orange-500/50 text-orange-400 text-xs">
                Target: &lt;4h avg
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={mttrData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" stroke="#64748b" fontSize={12} unit="h" />
                <YAxis dataKey="category" type="category" stroke="#64748b" fontSize={11} width={100} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="mttr" fill="#f97316" radius={[0, 4, 4, 0]} name="Actual MTTR" />
                <Bar dataKey="target" fill="#22c55e" radius={[0, 4, 4, 0]} name="Target MTTR" opacity={0.6} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Threat Actor Capabilities - Radar Chart */}
        <Card className="bg-slate-800/50 border-slate-700/50 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base">Threat Actor Capability Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <RadarChart data={threatActorData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={12} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#64748b" />
                <Legend />
                <Radar name="APT28" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} strokeWidth={2} />
                <Radar name="APT29" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} strokeWidth={2} />
                <Radar name="Lazarus" stroke="#f97316" fill="#f97316" fillOpacity={0.2} strokeWidth={2} />
                <Radar name="Silent Librarian" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.2} strokeWidth={2} />
                {threatActorData.map((_, index) => (
                  <g key={index}>
                    <Radar dataKey="APT28" />
                    <Radar dataKey="APT29" />
                    <Radar dataKey="Lazarus" />
                    <Radar dataKey="SilentLibrarian" />
                  </g>
                ))}
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Source Distribution - Horizontal Bar */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base">Alerts by Source</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={sourceData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" stroke="#64748b" fontSize={12} />
                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} width={110} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="alerts" radius={[0, 4, 4, 0]}>
                  {sourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Incident Status - Donut Chart */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base">Incident Lifecycle</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={incidentStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="count"
                  >
                    {incidentStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-2 mt-4 pt-4 border-t border-slate-700">
              {incidentStatusData.map((item) => (
                <div key={item.status} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-300">{item.status}</span>
                  </div>
                  <span className="font-semibold text-white">{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard 
          title="Total Alerts (7D)" 
          value="1,047" 
          change="+12.5%" 
          positive={false}
          icon="🚨"
        />
        <SummaryCard 
          title="Avg Resolution Time" 
          value="4.2h" 
          change="-22%" 
          positive={true}
          icon="⏱️"
        />
        <SummaryCard 
          title="Threats Blocked" 
          value="19,929" 
          change="+8.3%" 
          positive={true}
          icon="🛡️"
        />
        <SummaryCard 
          title="System Uptime" 
          value="99.97%" 
          change="+0.02%" 
          positive={true}
          icon="✅"
        />
      </div>
    </div>
  );
}

// Summary Card Component
function SummaryCard({ title, value, change, positive, icon }: { 
  title: string; 
  value: string; 
  change: string; 
  positive: boolean;
  icon: string;
}) {
  return (
    <Card className="bg-slate-800/50 border-slate-700/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <span className="text-2xl">{icon}</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${
            positive 
              ? "text-green-400 bg-green-500/10" 
              : "text-red-400 bg-red-500/10"
          }`}>
            {change}
          </span>
        </div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-slate-500 mt-1">{title}</p>
      </CardContent>
    </Card>
  );
}

export default AnalyticsDashboard;
