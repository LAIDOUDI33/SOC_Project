'use client'

import React, { useState, useEffect } from 'react'
import {
  Shield, FileText, AlertTriangle, CheckCircle, Clock, TrendingUp,
  Download, Upload, Search, Filter, Plus, RefreshCw, ExternalLink,
  Award, BookOpen, BarChart3, Target, ClipboardCheck, Scale,
  Flag, Globe, Lock, Users, Database, Activity, ChevronRight,
  ChevronDown, X, Info, AlertCircle, CheckCircle2, Circle
} from 'lucide-react'

// Types
interface ComplianceMetric {
  id: string
  metricName: string
  metricCategory: string
  currentValue: number
  previousValue?: number
  targetValue?: number
  unit?: string
  trend: string
}

interface Assessment {
  id: string
  frameworkId: string
  assessmentType: string
  status: string
  overallScore?: number
  compliantCount: number
  nonCompliantCount: number
  startDate: string
  completedAt?: string
  framework?: {
    name: string
    displayName: string
  }
}

interface ArtpSubmission {
  id: string
  submissionNumber: string
  submissionType: string
  status: string
  title: string
  deadline?: string
  createdAt: string
  submittedAt?: string
  priority: string
}

interface GapAnalysis {
  totalGaps: number
  bySeverity: Record<string, number>
  byCategory: Record<string, number>
  openRemediations: number
  overdueRemediations: number
}

interface AnssiScore {
  overallAlignment: number
  byDomain: Record<string, any>
  certificationReadiness: any
}

interface DashboardData {
  metrics: ComplianceMetric[]
  latestAssessment: Assessment | null
  pendingSubmissions: number
  openGaps: number
  anssiAlignment: AnssiScore
  summary: {
    totalControls: number
    categories: string[]
  }
}

// Status colors and helpers
const statusColors: Record<string, string> = {
  COMPLETED: 'bg-green-100 text-green-800 border-green-200',
  IN_PROGRESS: 'bg-blue-100 text-blue-800 border-blue-200',
  PLANNING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  DRAFT: 'bg-gray-100 text-gray-800 border-gray-200',
  SUBMITTED: 'bg-purple-100 text-purple-800 border-purple-200',
  ACCEPTED: 'bg-green-100 text-green-800 border-green-200',
  OVERDUE: 'bg-red-100 text-red-800 border-red-200'
}

const severityColors: Record<string, string> = {
  CRITICAL: 'text-red-600 bg-red-50 border-red-200',
  HIGH: 'text-orange-600 bg-orange-50 border-orange-200',
  MEDIUM: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  LOW: 'text-blue-600 bg-blue-50 border-blue-200',
  INFORMATIONAL: 'text-gray-600 bg-gray-50 border-gray-200'
}

export default function ComplianceDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState<'overview' | 'artp' | 'anssi' | 'assessments' | 'gaps'>('overview')
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Fetch dashboard data
  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/compliance?action=dashboard')
      if (response.ok) {
        const result = await response.json()
        setData(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch compliance data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchDashboardData()
    setTimeout(() => setIsRefreshing(false), 500)
  }

  const handleInitialize = async () => {
    try {
      const response = await fetch('/api/compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'initialize' })
      })
      if (response.ok) {
        await fetchDashboardData()
        alert('Compliance engine initialized successfully!')
      }
    } catch (error) {
      console.error('Initialization failed:', error)
    }
  }

  // Format helpers
  const formatScore = (score: number) => `${Math.round(score)}%`
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100'
    if (score >= 60) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Scale className="w-8 h-8 text-cyan-400" />
            Compliance Automation Center
          </h2>
          <p className="text-slate-400 mt-1">ARTP Reporting & ANSSI Alignment</p>
        </div>
        <div className="flex items-center gap-3">
          {!data?.latestAssessment && (
            <button
              onClick={handleInitialize}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Initialize Framework
            </button>
          )}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall Compliance Score */}
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 text-sm">Overall Compliance</span>
            <Shield className="w-5 h-5 text-cyan-400" />
          </div>
          <div className={`text-3xl font-bold ${getScoreColor(data?.latestAssessment?.overallScore || 0)}`}>
            {formatScore(data?.latestAssessment?.overallScore || 0)}
          </div>
          <div className={`inline-block mt-2 px-2 py-1 rounded text-xs font-medium ${getScoreBgColor(data?.latestAssessment?.overallScore || 0)}`}>
            {data?.latestAssessment ? 'Based on latest assessment' : 'No assessment yet'}
          </div>
        </div>

        {/* ANSSI Alignment */}
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 text-sm">ANSSI Alignment</span>
            <Award className="w-5 h-5 text-purple-400" />
          </div>
          <div className={`text-3xl font-bold ${getScoreColor(data?.anssiAlignment?.overallAlignment || 0)}`}>
            {formatScore(data?.anssiAlignment?.overallAlignment || 0)}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            {Object.keys(data?.anssiAlignment?.byDomain || {}).length} domains mapped
          </div>
        </div>

        {/* Pending ARTP Submissions */}
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 text-sm">Pending ARTP Reports</span>
            <FileText className="w-5 h-5 text-orange-400" />
          </div>
          <div className="text-3xl font-bold text-white">{data?.pendingSubmissions || 0}</div>
          <div className="mt-2 text-xs text-slate-400">
            Requiring attention
          </div>
        </div>

        {/* Open Gap Findings */}
        <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 text-sm">Open Gap Findings</span>
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
          </div>
          <div className="text-3xl font-bold text-white">{data?.openGaps || 0}</div>
          <div className="mt-2 text-xs text-slate-400">
            Across {data?.summary?.categories?.length || 0} categories
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-800">
        <nav className="flex gap-1">
          {[
            { key: 'overview', label: 'Overview', icon: BarChart3 },
            { key: 'artp', label: 'ARTP Reports', icon: Flag },
            { key: 'anssi', label: 'ANSSI Alignment', icon: Award },
            { key: 'assessments', label: 'Assessments', icon: ClipboardCheck },
            { key: 'gaps', label: 'Gap Analysis', icon: Target }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                selectedTab === tab.key
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {/* Overview Tab */}
        {selectedTab === 'overview' && (
          <div className="space-y-6">
            {/* Framework Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* ARTP Framework Coverage */}
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Flag className="w-5 h-5 text-orange-400" />
                  ARTP Framework Status
                </h3>
                
                {data?.latestAssessment ? (
                  <div className="space-y-4">
                    {/* Score Gauge */}
                    <div className="flex items-center justify-center py-4">
                      <div className="relative w-32 h-32">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                          <circle cx="60" cy="60" r="54" fill="none" stroke="#334155" strokeWidth="8" />
                          <circle 
                            cx="60" cy="60" r="54" fill="none" 
                            stroke={data.latestAssessment.overallScore! >= 80 ? '#22c55e' : 
                                   data.latestAssessment.overallScore! >= 60 ? '#eab308' : '#ef4444'}
                            strokeWidth="8"
                            strokeDasharray={`${(data.latestAssessment.overallScore! / 100) * 339.29} 339.29`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className={`text-2xl font-bold ${getScoreColor(data.latestAssessment.overallScore!)}`}>
                            {Math.round(data.latestAssessment.overviewScore!)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Assessment Stats */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                        <div className="text-xl font-bold text-green-400">{data.latestAssessment.compliantCount}</div>
                        <div className="text-xs text-slate-400">Compliant</div>
                      </div>
                      <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                        <div className="text-xl font-bold text-red-400">{data.latestAssessment.nonCompliantCount}</div>
                        <div className="text-xs text-slate-400">Non-Compliant</div>
                      </div>
                    </div>

                    <div className="text-sm text-slate-400">
                      Last assessed: {formatDate(data.latestAssessment.completedAt || data.latestAssessment.startDate)}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No assessments conducted yet</p>
                    <button
                      onClick={handleInitialize}
                      className="mt-4 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm transition-colors"
                    >
                      Start Assessment
                    </button>
                  </div>
                )}
              </div>

              {/* ANSSI Domain Breakdown */}
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-purple-400" />
                  ANSSI Domain Alignment
                </h3>

                {data?.anssiAlignment && Object.keys(data.ansiAlignment.byDomain).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(data.ansiAlignment.byDomain).map(([domain, scores]: [string, any]) => (
                      <div key={domain} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-300">{domain.replace(/_/g, ' ')}</span>
                          <span className={`font-medium ${getScoreColor(scores.score)}`}>
                            {scores.score}%
                          </span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${
                              scores.score >= 80 ? 'bg-green-500' :
                              scores.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${scores.score}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>{scores.implemented} implemented</span>
                          <span>{scores.total} total</span>
                        </div>
                      </div>
                    ))}

                    {/* Certification Readiness */}
                    <div className="mt-4 pt-4 border-t border-slate-800">
                      <div className="text-sm font-medium text-slate-300 mb-2">Certification Readiness</div>
                      <div className="flex gap-2">
                        {['basic', 'standard', 'advanced'].map((level) => (
                          <div
                            key={level}
                            className={`px-2 py-1 rounded text-xs font-medium capitalize ${
                              data.ansiAlignment.certificationReadiness[level]
                                ? 'bg-green-900/30 text-green-400 border border-green-700'
                                : 'bg-slate-800 text-slate-500 border border-slate-700'
                            }`}
                          >
                            {level}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <Award className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>ANSSI alignment data not available</p>
                    <p className="text-sm mt-1">Initialize framework to load alignment data</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Metrics */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-cyan-400" />
                Compliance Metrics
              </h3>
              
              {data?.metrics && data.metrics.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data.metrics.map((metric) => (
                    <div key={metric.id} className="bg-slate-800/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-300 capitalize">
                          {metric.metricName.replace(/_/g, ' ')}
                        </span>
                        <span className={`flex items-center text-xs ${
                          metric.trend === 'IMPROVING' ? 'text-green-400' :
                          metric.trend === 'DECLINING' ? 'text-red-400' : 'text-slate-400'
                        }`}>
                          {metric.trend === 'IMPROVING' && <TrendingUp className="w-3 h-3 mr-1" />}
                          {metric.trend}
                        </span>
                      </div>
                      <div className="text-2xl font-bold text-white">
                        {typeof metric.currentValue === 'number' 
                          ? metric.unit === '%' 
                            ? `${Math.round(metric.currentValue)}%`
                            : Math.round(metric.currentValue)
                          : metric.currentValue
                        }
                        {metric.targetValue && (
                          <span className="text-sm text-slate-400 ml-2">
                            / {metric.unit === '%' ? `${metric.targetValue}%` : metric.targetValue}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-center py-4">No metrics available</p>
              )}
            </div>
          </div>
        )}

        {/* ARTP Reports Tab */}
        {selectedTab === 'artp' && (
          <ArtpReportsTab />
        )}

        {/* ANSSI Alignment Tab */}
        {selectedTab === 'anssi' && (
          <AnssiAlignmentTab anssiData={data?.anssiAlignment} />
        )}

        {/* Assessments Tab */}
        {selectedTab === 'assessments' && (
          <AssessmentsTab currentAssessment={data?.latestAssessment} onRefresh={fetchDashboardData} />
        )}

        {/* Gap Analysis Tab */}
        {selectedTab === 'gaps' && (
          <GapAnalysisTab openGaps={data?.openGaps} />
        )}
      </div>
    </div>
  )
}

// ============================================================
// Sub-components for each tab
// ============================================================

function ArtpReportsTab() {
  const [submissions, setSubmissions] = useState<ArtpSubmission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSubmissions()
  }, [])

  const fetchSubmissions = async () => {
    try {
      const response = await fetch('/api/compliance?action=artp-submissions')
      if (response.ok) {
        const result = await response.json()
        setSubmissions(result.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch submissions:', error)
    } finally {
      setLoading(false)
    }
  }

  const createSubmission = async (type: string) => {
    try {
      const response = await fetch('/api/compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-artp-submission',
          submissionType: type,
          preparedBy: 'current-user',
          priority: 'STANDARD'
        })
      })
      if (response.ok) {
        alert(`ARTP ${type} submission created!`)
        fetchSubmissions()
      }
    } catch (error) {
      console.error('Failed to create submission:', error)
    }
  }

  const getTypeLabel = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">ARTP Regulatory Submissions</h3>
        <div className="flex gap-2">
          <select 
            onChange={(e) => e.target.value && createSubmission(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
            defaultValue=""
          >
            <option value="" disabled>New Submission</option>
            <option value="INCIDENT_REPORT">Incident Report</option>
            <option value="FRAUD_REPORT">Fraud Report</option>
            <option value="BREACH_NOTIFICATION">Breach Notification</option>
            <option value="QUARTERLY_REPORT">Quarterly Report</option>
            <option value="SELF_ASSESSMENT">Self-Assessment</option>
          </select>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
          </div>
        ) : submissions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Submission #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Deadline</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Created</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {submissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-800/30">
                    <td className="px-6 py-4 text-sm font-mono text-cyan-400">{sub.submissionNumber}</td>
                    <td className="px-6 py-4 text-sm text-slate-300">{getTypeLabel(sub.submissionType)}</td>
                    <td className="px-6 py-4 text-sm text-white max-w-md truncate">{sub.title}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[sub.status] || ''}`}>
                        {sub.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        sub.priority === 'URGENT' ? 'bg-red-900/30 text-red-400' :
                        sub.priority === 'HIGH' ? 'bg-orange-900/30 text-orange-400' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {sub.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300">
                      {sub.deadline ? formatDate(sub.deadline) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-400">{formatDate(sub.createdAt)}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {sub.status === 'DRAFT' && (
                          <>
                            <button 
                              onClick={() => populateReport(sub.id)}
                              className="text-cyan-400 hover:text-cyan-300 text-sm"
                            >
                              Populate
                            </button>
                            <button 
                              onClick={() => submitToArtp(sub.id)}
                              className="text-green-400 hover:text-green-300 text-sm"
                            >
                              Submit
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No ARTP submissions yet</p>
            <p className="text-sm mt-1">Create a new submission to get started</p>
          </div>
        )}
      </div>
    </div>
  )

  async function populateReport(id: string) {
    try {
      const response = await fetch('/api/compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'populate-report', submissionId: id })
      })
      if (response.ok) {
        alert('Report populated with current data!')
        fetchSubmissions()
      }
    } catch (error) {
      console.error('Failed to populate report:', error)
    }
  }

  async function submitToArtp(id: string) {
    if (!confirm('Submit this report to ARTP?')) return
    
    try {
      const response = await fetch('/api/compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit-report', submissionId: id, submittedBy: 'current-user' })
      })
      if (response.ok) {
        alert('Report submitted to ARTP!')
        fetchSubmissions()
      }
    } catch (error) {
      console.error('Failed to submit report:', error)
    }
  }
}

function AnssiAlignmentTab({ anssiData }: { anssiData?: AnssiScore }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overall Score Card */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-purple-400" />
            Overall ANSSI Alignment Score
          </h3>
          
          <div className="flex items-center justify-center py-8">
            <div className="relative w-40 h-40">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                <circle cx="80" cy="80" r="70" fill="none" stroke="#334155" strokeWidth="10" />
                <circle 
                  cx="80" cy="80" r="70" fill="none" 
                  stroke={anssiData?.overallAlignment && anssiData.overallAlignment >= 70 ? '#a855f7' : 
                         anssiData?.overallAlignment && anssiData.overallAlignment >= 50 ? '#eab308' : '#ef4444'}
                  strokeWidth="10"
                  strokeDasharray={`${((anssiData?.overallAlignment || 0) / 100) * 439.82} 439.82`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-white">
                  {Math.round(anssiData?.overallAlignment || 0)}%
                </span>
                <span className="text-sm text-slate-400">Aligned</span>
              </div>
            </div>
          </div>
        </div>

        {/* Domain Details */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
          <h3 className="font-semibold text-lg mb-4">Domain Breakdown</h3>
          
          {anssiData?.byDomain && Object.keys(anssiData.byDomain).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(anssiData.byDomain).map(([domain, scores]: [string, any]) => (
                <div key={domain} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-300 capitalize">
                      {domain.replace(/_/g, ' ').replace(/\b\w/g, l => l.slice(0, 1) + l.slice(1).toLowerCase())}
                    </span>
                    <span className={`text-sm font-medium ${
                      scores.score >= 70 ? 'text-green-400' :
                      scores.score >= 50 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {scores.score}%
                    </span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        scores.score >= 70 ? 'bg-purple-500' :
                        scores.score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${scores.score}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>{scores.implemented} of {scores.total} implemented</span>
                    {scores.partial > 0 && <span>{scores.partial} partial</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-center py-8">No alignment data available</p>
          )}
        </div>
      </div>

      {/* Certification Readiness */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-400" />
          Certification Readiness
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {([
            { level: 'basic', name: 'Basic Level', desc: 'Foundational security practices' },
            { level: 'standard', name: 'Standard Level', desc: 'Industry-standard security posture' },
            { level: 'advanced', name: 'Advanced Level', desc: 'Mature security program with continuous improvement' }
          ] as const).map(({ level, name, desc }) => (
            <div 
              key={level}
              className={`rounded-lg p-4 border ${
                anssiData?.certificationReadiness[level]
                  ? 'bg-green-900/20 border-green-700'
                  : 'bg-slate-800 border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {anssiData?.certificationReadiness[level] ? (
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-500" />
                )}
                <span className="font-medium text-white capitalize">{name}</span>
              </div>
              <p className="text-sm text-slate-400">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ANSSI Domains Reference */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-cyan-400" />
          ANSSI Domains Reference
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { code: 'PSSI', name: 'Security Policy', full: 'Politique de Sécurité des SI' },
            { code: 'EBIOS', name: 'Risk Management', full: 'Méthode de gestion des risques' },
            { code: 'RGS', name: 'General Security Ref.', full: 'Référentiel Général de Sécurité' },
            { code: 'SEC_NUM_CLOUD', name: 'Cloud Security', full: 'Sécurité des Clouds' },
            { code: 'PASSI', name: 'Security Auditors', full: 'Auditeurs de Sécurité des SI' },
            { code: 'DETECTION', name: 'Incident Detection', full: 'Détection des incidents' },
            { code: 'RESPONSE', name: 'Incident Response', full: 'Réponse aux incidents' }
          ].map((domain) => (
            <div key={domain.code} className="bg-slate-800/50 rounded-lg p-3">
              <div className="font-medium text-cyan-400 text-sm">{domain.code}</div>
              <div className="text-white text-sm">{domain.name}</div>
              <div className="text-xs text-slate-500">{domain.full}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function AssessmentsTab({ currentAssessment, onRefresh }: { currentAssessment: Assessment | null; onRefresh: () => void }) {
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAssessments()
  }, [])

  const fetchAssessments = async () => {
    try {
      const response = await fetch('/api/compliance?action=assessments&limit=20')
      if (response.ok) {
        const result = await response.json()
        setAssessments(result.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch assessments:', error)
    } finally {
      setLoading(false)
    }
  }

  const startNewAssessment = async () => {
    // Get first framework ID
    const frameworksResponse = await fetch('/api/compliance?action=frameworks')
    if (frameworksResponse.ok) {
      const { data: frameworks } = await frameworksResponse.json()
      if (frameworks.length > 0) {
        const response = await fetch('/api/compliance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create-assessment',
            frameworkId: frameworks[0].id,
            assessmentType: 'PERIODIC'
          })
        })
        if (response.ok) {
          alert('New assessment started!')
          fetchAssessments()
          onRefresh()
        }
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Compliance Assessments</h3>
        <button
          onClick={startNewAssessment}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Assessment
        </button>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
          </div>
        ) : assessments.length > 0 ? (
          assessments.map((assessment) => (
            <div key={assessment.id} className="bg-slate-900 rounded-xl border border-slate-800 p-6 hover:border-slate-700 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold text-white">
                      {assessment.framework?.displayName || 'Compliance Assessment'}
                    </h4>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[assessment.status] || ''}`}>
                      {assessment.status.replace(/_/g, ' ')}
                    </span>
                    <span className="px-2 py-1 rounded text-xs bg-slate-800 text-slate-300">
                      {assessment.assessmentType.replace(/_/g, ' ')}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div>
                      <div className="text-xs text-slate-400">Overall Score</div>
                      <div className={`text-lg font-bold ${
                        assessment.overallScore !== undefined ? (
                          assessment.overallScore >= 80 ? 'text-green-400' :
                          assessment.overallScore >= 60 ? 'text-yellow-400' : 'text-red-400'
                        ) : 'text-slate-400'
                      }`}>
                        {assessment.overallScore !== undefined ? `${Math.round(assessment.overallScore)}%` : 'In Progress'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Compliant Controls</div>
                      <div className="text-lg font-bold text-green-400">{assessment.compliantCount}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Non-Compliant</div>
                      <div className="text-lg font-bold text-red-400">{assessment.nonCompliantCount}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Started</div>
                      <div className="text-sm text-slate-300">{formatDate(assessment.startDate)}</div>
                    </div>
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-slate-600 mt-1" />
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-slate-400 bg-slate-900 rounded-xl border border-slate-800">
            <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No assessments found</p>
            <p className="text-sm mt-1">Start your first compliance assessment</p>
          </div>
        )}
      </div>
    </div>
  )
}

function GapAnalysisTab({ openGaps }: { openGaps?: number }) {
  const [gapData, setGapData] = useState<GapAnalysis | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchGapAnalysis()
  }, [])

  const fetchGapAnalysis = async () => {
    try {
      const response = await fetch('/api/compliance?action=gap-analysis')
      if (response.ok) {
        const result = await response.json()
        setGapData(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch gap analysis:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
          <div className="text-slate-400 text-sm">Total Gaps</div>
          <div className="text-2xl font-bold text-white">{gapData?.totalGaps || 0}</div>
        </div>
        <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
          <div className="text-slate-400 text-sm">Open Remediations</div>
          <div className="text-2xl font-bold text-orange-400">{gapData?.openRemediations || 0}</div>
        </div>
        <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
          <div className="text-slate-400 text-sm">Overdue Items</div>
          <div className="text-2xl font-bold text-red-400">{gapData?.overdueRemediations || 0}</div>
        </div>
        <div className="bg-slate-900 rounded-xl p-4 border border-slate-800">
          <div className="text-slate-400 text-sm">Avg Remediation Time</div>
          <div className="text-2xl font-bold text-white">{gapData?.averageRemediationTime || 0} days</div>
        </div>
      </div>

      {/* By Severity */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <h3 className="font-semibold text-lg mb-4">Gaps by Severity</h3>
        
        {gapData?.bySeverity && Object.keys(gapData.bySeverity).length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(gapData.bySeverity).map(([severity, count]) => (
              <div key={severity} className={`rounded-lg p-4 border ${severityColors[severity] || ''}`}>
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-sm capitalize">{severity.toLowerCase()}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-400 text-center py-4">No gap data available</p>
        )}
      </div>

      {/* By Category */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <h3 className="font-semibold text-lg mb-4">Gaps by Category</h3>
        
        {gapData?.byCategory && Object.keys(gapData.byCategory).length > 0 ? (
          <div className="space-y-3">
            {Object.entries(gapData.byCategory)
              .sort((a, b) => b[1] - a[1])
              .map(([category, count]) => (
                <div key={category} className="flex items-center gap-4">
                  <div className="w-40 text-sm text-slate-300 truncate">{category.replace(/_/g, ' ')}</div>
                  <div className="flex-1 h-6 bg-slate-800 rounded overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded"
                      style={{ width: `${(count / (gapData!.totalGaps || 1)) * 100}%` }}
                    />
                  </div>
                  <div className="w-10 text-right text-sm font-medium text-white">{count}</div>
                </div>
              ))}
          </div>
        ) : (
          <p className="text-slate-400 text-center py-4">No category breakdown available</p>
        )}
      </div>
    </div>
  )
}
