import React, { useState, useEffect, useCallback } from 'react'
import {
  Shield, AlertTriangle, AlertCircle, Info, CheckCircle2, Search,
  Filter, Download, Eye, RefreshCw, Sparkles, ArrowUpRight, ChevronRight,
  ChevronDown, X, BookOpen, Zap, TrendingUp, Users, Building2,
  Settings2, Plus, Trash2, ToggleLeft, ToggleRight, FileSpreadsheet,
  FileText, BarChart3, Target, ShieldAlert, GitBranch, Clock, CheckSquare,
  Database, AlertOctagon, Layers, Activity, ChevronDown as CaretDown
} from 'lucide-react'
import toast from 'react-hot-toast'
import { processorApi } from '../services/processorApi'

// ── Types ─────────────────────────────────────────────────────────────────────

type Severity = 'Critical' | 'High' | 'Medium' | 'Low'
type TabId = 'findings' | 'vendors' | 'rules' | 'analytics'

interface Finding {
  id: string
  title: string
  category: string
  severity: Severity
  status: 'Open' | 'Resolved'
  description: string
  evidence: string
  legal_reference: string
  recommended_action: string
  impact_amount: number
  risk_score: number
  notes: string
  detected_at: string
}

interface DashStats {
  compliance_score: number
  total_findings: number
  open_findings: number
  critical_count: number
  high_count: number
  medium_count: number
  low_count: number
  total_impact_amount: number
  gst_unmatched_count: number
  bank_unmatched_count: number
  duplicate_count: number
}

interface AuditRule {
  id: string
  name: string
  description: string
  target_field: string
  condition_operator: string
  condition_value: string
  severity: string
  is_enabled: number
}

interface VendorProfile {
  vendor_name: string
  gstin: string
  invoice_count: number
  average_value: number
  total_value: number
  risk_score: number
  risk_level: string
  risk_reasons: string[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const SEV_CONFIG: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode }> = {
  Critical: {
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    icon: <AlertOctagon size={14} className="text-red-400" />,
  },
  High: {
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    icon: <AlertTriangle size={14} className="text-orange-400" />,
  },
  Medium: {
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    icon: <AlertCircle size={14} className="text-amber-400" />,
  },
  Low: {
    color: 'text-sky-400',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/30',
    icon: <Info size={14} className="text-sky-400" />,
  },
}

const formatINR = (n: number) =>
  `₹${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`

// ── Risk Score Ring ───────────────────────────────────────────────────────────

function ScoreRing({ score, size = 64 }: { score: number; size?: number }) {
  const r = (size - 10) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444'
  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e293b" strokeWidth={8} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={8}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" dy=".35em" textAnchor="middle" fill={color} fontSize={size * 0.22} fontWeight="bold">
        {score}
      </text>
    </svg>
  )
}

// ── Finding Detail Panel ──────────────────────────────────────────────────────

function FindingDetail({ finding, onClose, onResolve }: {
  finding: Finding
  onClose: () => void
  onResolve: (id: string, action: 'resolve' | 'reopen') => void
}) {
  const cfg = SEV_CONFIG[finding.severity] || SEV_CONFIG.Low
  return (
    <div className="flex flex-col h-full bg-surface-900 border-l border-surface-700">
      {/* Header */}
      <div className={`px-5 py-4 border-b border-surface-700 ${cfg.bg}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {cfg.icon}
            <span className={`text-[10px] font-black uppercase tracking-widest ${cfg.color}`}>
              {finding.severity}
            </span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-surface-700 text-surface-500 hover:text-surface-300 transition-colors flex-shrink-0">
            <X size={14} />
          </button>
        </div>
        <h3 className="text-sm font-bold text-surface-100 mt-2 leading-snug">{finding.title}</h3>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-[10px] text-surface-500 bg-surface-800 px-2 py-0.5 rounded font-mono">
            {finding.category}
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
            finding.status === 'Open'
              ? 'text-amber-400 border-amber-500/30 bg-amber-500/10'
              : 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
          }`}>
            {finding.status}
          </span>
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Risk Score */}
        <div className="flex items-center gap-4">
          <ScoreRing score={Math.round(finding.risk_score)} size={56} />
          <div>
            <div className="text-[10px] text-surface-500 uppercase tracking-wider font-bold">Risk Score</div>
            <div className="text-xs text-surface-300 mt-0.5">
              Impact: <span className="font-bold text-red-400">{formatINR(finding.impact_amount)}</span>
            </div>
            <div className="text-[10px] text-surface-500 mt-0.5">
              Detected: {new Date(finding.detected_at).toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* Description */}
        <div>
          <div className="text-[10px] text-surface-500 uppercase tracking-wider font-bold mb-2">
            Description
          </div>
          <p className="text-xs text-surface-300 leading-relaxed">{finding.description}</p>
        </div>

        {/* Evidence */}
        {finding.evidence && (
          <div>
            <div className="text-[10px] text-surface-500 uppercase tracking-wider font-bold mb-2 flex items-center gap-1.5">
              <Database size={11} /> Evidence
            </div>
            <div className="bg-surface-800 border border-surface-700 rounded-lg p-3">
              <p className="text-[11px] text-surface-300 font-mono leading-relaxed whitespace-pre-wrap">
                {finding.evidence}
              </p>
            </div>
          </div>
        )}

        {/* Legal Reference */}
        {finding.legal_reference && (
          <div>
            <div className="text-[10px] text-surface-500 uppercase tracking-wider font-bold mb-2 flex items-center gap-1.5">
              <BookOpen size={11} /> Statutory Reference
            </div>
            <div className="bg-brand-500/5 border border-brand-500/20 rounded-lg px-3 py-2">
              <p className="text-[11px] text-brand-400">{finding.legal_reference}</p>
            </div>
          </div>
        )}

        {/* Recommended Action */}
        {finding.recommended_action && (
          <div>
            <div className="text-[10px] text-surface-500 uppercase tracking-wider font-bold mb-2 flex items-center gap-1.5">
              <CheckSquare size={11} /> Recommended Action
            </div>
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-3 py-2.5">
              <p className="text-[11px] text-emerald-400 leading-relaxed">{finding.recommended_action}</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="px-5 py-3 border-t border-surface-700 flex gap-2">
        {finding.status === 'Open' ? (
          <button
            onClick={() => onResolve(finding.id, 'resolve')}
            className="btn-primary text-xs py-1.5 px-3 gap-1.5 flex-1"
          >
            <CheckCircle2 size={12} /> Mark Resolved
          </button>
        ) : (
          <button
            onClick={() => onResolve(finding.id, 'reopen')}
            className="btn-secondary text-xs py-1.5 px-3 gap-1.5 flex-1"
          >
            <RefreshCw size={12} /> Reopen Finding
          </button>
        )}
      </div>
    </div>
  )
}

// ── Audit Rules Manager ───────────────────────────────────────────────────────

function RulesManager() {
  const [rules, setRules] = useState<AuditRule[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '', description: '', target_field: 'debit',
    condition_operator: '>', condition_value: '', severity: 'High'
  })

  const loadRules = async () => {
    try {
      const data = await processorApi.getAuditRules()
      setRules(data)
    } catch {
      toast.error('Failed to load rules')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadRules() }, [])

  const toggleRule = async (rule: AuditRule) => {
    await processorApi.updateAuditRule(rule.id, undefined, undefined, undefined, rule.is_enabled ? 0 : 1)
    loadRules()
  }

  const deleteRule = async (id: string) => {
    await processorApi.deleteAuditRule(id)
    toast.success('Rule deleted')
    loadRules()
  }

  const createRule = async () => {
    if (!form.name || !form.condition_value) {
      toast.error('Name and threshold value are required')
      return
    }
    try {
      await processorApi.createAuditRule(
        form.name, form.description, form.target_field,
        form.condition_operator, form.condition_value, form.severity
      )
      toast.success('Custom rule created')
      setShowForm(false)
      setForm({ name: '', description: '', target_field: 'debit', condition_operator: '>', condition_value: '', severity: 'High' })
      loadRules()
    } catch {
      toast.error('Failed to create rule — name may already exist')
    }
  }

  const SEV_COLORS: Record<string, string> = {
    Critical: 'text-red-400', High: 'text-orange-400',
    Medium: 'text-amber-400', Low: 'text-sky-400'
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-surface-100">Custom Learning Rules</h3>
          <p className="text-[11px] text-surface-500 mt-0.5">
            Configure rules that trigger audit alerts — no code changes required.
          </p>
        </div>
        <button onClick={() => setShowForm(v => !v)} className="btn-primary text-xs py-1.5 px-3 gap-1.5">
          <Plus size={12} /> Add Rule
        </button>
      </div>

      {/* New Rule Form */}
      {showForm && (
        <div className="card border border-brand-500/30 bg-brand-500/5 p-4 space-y-3">
          <h4 className="text-xs font-bold text-brand-400 flex items-center gap-1.5"><Zap size={12} /> New Custom Audit Rule</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-surface-500 font-bold uppercase tracking-wider block mb-1">Rule Name *</label>
              <input
                className="input text-xs py-1.5 w-full"
                placeholder="e.g. Block Large Sundry Payments"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-[10px] text-surface-500 font-bold uppercase tracking-wider block mb-1">Severity</label>
              <select className="input text-xs py-1.5 w-full" value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}>
                {['Critical', 'High', 'Medium', 'Low'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-surface-500 font-bold uppercase tracking-wider block mb-1">Target Field</label>
              <select className="input text-xs py-1.5 w-full" value={form.target_field} onChange={e => setForm(f => ({ ...f, target_field: e.target.value }))}>
                <option value="debit">Payment Amount (debit)</option>
                <option value="daily_payment_count">Daily Payments to Same Vendor</option>
              </select>
            </div>
            <div className="flex gap-2">
              <div className="w-24">
                <label className="text-[10px] text-surface-500 font-bold uppercase tracking-wider block mb-1">Operator</label>
                <select className="input text-xs py-1.5 w-full" value={form.condition_operator} onChange={e => setForm(f => ({ ...f, condition_operator: e.target.value }))}>
                  <option value=">">&gt; Greater Than</option>
                  <option value=">=">&gt;= At Least</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-surface-500 font-bold uppercase tracking-wider block mb-1">Threshold Value *</label>
                <input
                  className="input text-xs py-1.5 w-full"
                  placeholder="e.g. 500000"
                  value={form.condition_value}
                  onChange={e => setForm(f => ({ ...f, condition_value: e.target.value }))}
                />
              </div>
            </div>
            <div className="col-span-2">
              <label className="text-[10px] text-surface-500 font-bold uppercase tracking-wider block mb-1">Description</label>
              <input
                className="input text-xs py-1.5 w-full"
                placeholder="e.g. Flag all payments above ₹5,00,000 for review"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={createRule} className="btn-primary text-xs py-1.5 px-3">Save Rule</button>
            <button onClick={() => setShowForm(false)} className="btn-secondary text-xs py-1.5 px-3">Cancel</button>
          </div>
        </div>
      )}

      {/* Rules List */}
      {loading ? (
        <div className="text-center py-10 text-surface-500 text-xs">Loading rules...</div>
      ) : (
        <div className="space-y-2">
          {rules.map(rule => (
            <div key={rule.id} className={`card p-4 flex items-start gap-4 transition-opacity ${rule.is_enabled ? '' : 'opacity-40'}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-bold text-surface-100">{rule.name}</span>
                  <span className={`text-[10px] font-bold ${SEV_COLORS[rule.severity] || 'text-surface-400'}`}>
                    {rule.severity}
                  </span>
                </div>
                <p className="text-[11px] text-surface-500">{rule.description}</p>
                <div className="flex gap-3 mt-1.5">
                  <span className="text-[10px] font-mono text-surface-600 bg-surface-800 px-1.5 py-0.5 rounded">
                    {rule.target_field} {rule.condition_operator} {rule.condition_value}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => toggleRule(rule)}
                  className="text-surface-500 hover:text-brand-400 transition-colors"
                  title={rule.is_enabled ? 'Disable rule' : 'Enable rule'}
                >
                  {rule.is_enabled ? <ToggleRight size={18} className="text-brand-400" /> : <ToggleLeft size={18} />}
                </button>
                <button
                  onClick={() => deleteRule(rule.id)}
                  className="text-surface-600 hover:text-red-400 transition-colors"
                  title="Delete rule"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Vendor Profiles Panel ─────────────────────────────────────────────────────

function VendorProfiles({ clientId }: { clientId: string }) {
  const [profiles, setProfiles] = useState<VendorProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    if (!clientId) return
    processorApi.getVendorProfiles(clientId)
      .then(setProfiles)
      .catch(() => toast.error('Failed to load vendor profiles'))
      .finally(() => setLoading(false))
  }, [clientId])

  const RISK_COLORS: Record<string, string> = {
    High: 'text-red-400 bg-red-500/10 border-red-500/30',
    Medium: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    Low: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  }

  if (loading) return <div className="p-10 text-center text-surface-500 text-xs">Generating vendor profiles...</div>
  if (!profiles.length) return (
    <div className="p-10 text-center text-surface-500 text-xs">
      <Users size={28} className="mx-auto mb-3 opacity-30" />
      No vendor data found for this client. Upload GST invoices or ledger exports first.
    </div>
  )

  return (
    <div className="p-6 space-y-3">
      <h3 className="text-sm font-bold text-surface-100">Vendor Intelligence Profiles</h3>
      <p className="text-[11px] text-surface-500">
        {profiles.length} vendors profiled — sorted by risk score descending.
      </p>
      <div className="space-y-2">
        {[...profiles].sort((a, b) => b.risk_score - a.risk_score).map(v => (
          <div key={v.vendor_name} className="card p-4">
            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => setExpanded(expanded === v.vendor_name ? null : v.vendor_name)}
            >
              <div className="w-8 h-8 rounded-lg bg-surface-800 border border-surface-700 flex items-center justify-center flex-shrink-0">
                <Building2 size={14} className="text-surface-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-surface-200 truncate">{v.vendor_name}</div>
                <div className="text-[10px] text-surface-500 font-mono">{v.gstin || 'No GSTIN'}</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${RISK_COLORS[v.risk_level] || 'text-surface-400'}`}>
                  {v.risk_level} Risk
                </span>
                <ScoreRing score={Math.round(v.risk_score)} size={32} />
                {expanded === v.vendor_name ? <ChevronDown size={12} className="text-surface-500" /> : <ChevronRight size={12} className="text-surface-500" />}
              </div>
            </div>
            {expanded === v.vendor_name && (
              <div className="mt-3 pt-3 border-t border-surface-700 grid grid-cols-3 gap-3">
                <div>
                  <div className="text-[10px] text-surface-500 uppercase tracking-wider font-bold mb-0.5">Invoices</div>
                  <div className="text-sm font-bold text-surface-200">{v.invoice_count}</div>
                </div>
                <div>
                  <div className="text-[10px] text-surface-500 uppercase tracking-wider font-bold mb-0.5">Total Value</div>
                  <div className="text-sm font-bold text-surface-200">{formatINR(v.total_value)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-surface-500 uppercase tracking-wider font-bold mb-0.5">Avg Invoice</div>
                  <div className="text-sm font-bold text-surface-200">{formatINR(v.average_value)}</div>
                </div>
                {v.risk_reasons.length > 0 && (
                  <div className="col-span-3">
                    <div className="text-[10px] text-surface-500 uppercase tracking-wider font-bold mb-1.5">Risk Factors</div>
                    <div className="flex flex-wrap gap-1.5">
                      {v.risk_reasons.map(r => (
                        <span key={r} className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Analytics Tab ─────────────────────────────────────────────────────────────

function AnalyticsTab({ stats }: { stats: DashStats | null }) {
  if (!stats) return <div className="p-10 text-center text-surface-500 text-xs">Run an audit scan to see analytics.</div>

  const breakdown = [
    { label: 'Critical', count: stats.critical_count, color: 'bg-red-500', width: (stats.critical_count / (stats.open_findings || 1)) * 100 },
    { label: 'High', count: stats.high_count, color: 'bg-orange-500', width: (stats.high_count / (stats.open_findings || 1)) * 100 },
    { label: 'Medium', count: stats.medium_count, color: 'bg-amber-500', width: (stats.medium_count / (stats.open_findings || 1)) * 100 },
    { label: 'Low', count: stats.low_count, color: 'bg-sky-500', width: (stats.low_count / (stats.open_findings || 1)) * 100 },
  ]

  return (
    <div className="p-6 space-y-6">
      <h3 className="text-sm font-bold text-surface-100 flex items-center gap-2">
        <Activity size={14} className="text-brand-400" /> Audit Analytics Dashboard
      </h3>

      {/* Compliance Meter */}
      <div className="card p-5">
        <div className="flex items-center gap-6">
          <ScoreRing score={stats.compliance_score} size={80} />
          <div>
            <div className="text-[10px] text-surface-500 uppercase tracking-wider font-bold">Compliance Health Score</div>
            <div className="text-2xl font-black text-surface-100 mt-1">{stats.compliance_score} / 100</div>
            <div className={`text-xs font-bold mt-0.5 ${
              stats.compliance_score >= 75 ? 'text-emerald-400' :
              stats.compliance_score >= 50 ? 'text-amber-400' : 'text-red-400'
            }`}>
              {stats.compliance_score >= 75 ? 'High Compliance' : stats.compliance_score >= 50 ? 'Moderate Risk' : 'Critical Risk'}
            </div>
          </div>
        </div>
      </div>

      {/* Severity Breakdown */}
      <div className="card p-5">
        <div className="text-[10px] text-surface-500 uppercase tracking-wider font-bold mb-4">Finding Severity Breakdown</div>
        <div className="space-y-3">
          {breakdown.map(b => (
            <div key={b.label} className="flex items-center gap-3">
              <span className="text-[11px] text-surface-400 w-14 font-bold">{b.label}</span>
              <div className="flex-1 h-2 bg-surface-800 rounded-full overflow-hidden">
                <div className={`h-2 rounded-full transition-all ${b.color}`} style={{ width: `${b.width}%` }} />
              </div>
              <span className="text-[11px] text-surface-300 font-mono w-6 text-right">{b.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Total Tax Exposure', val: formatINR(stats.total_impact_amount), icon: <TrendingUp size={14} />, col: 'text-red-400' },
          { label: 'Duplicate Findings', val: stats.duplicate_count, icon: <Layers size={14} />, col: 'text-amber-400' },
          { label: 'GST Unmatched', val: stats.gst_unmatched_count, icon: <GitBranch size={14} />, col: 'text-orange-400' },
          { label: 'Bank Unreconciled', val: stats.bank_unmatched_count, icon: <Database size={14} />, col: 'text-purple-400' },
        ].map(c => (
          <div key={c.label} className="card p-4 flex items-center gap-3">
            <div className={`${c.col} opacity-70`}>{c.icon}</div>
            <div>
              <div className="text-[10px] text-surface-500 uppercase tracking-wider font-bold">{c.label}</div>
              <div className={`text-lg font-black ${c.col}`}>{c.val}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AuditIntelligencePage() {
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const activeClientObj = clients.find(c => c.id === selectedClientId)
  const clientId = selectedClientId

  useEffect(() => {
    processorApi.getReconciliationClients()
      .then(data => {
        setClients(data)
        if (data.length > 0) setSelectedClientId(data[0].id)
      })
      .catch(() => {})
  }, [])

  const [tab, setTab] = useState<TabId>('findings')
  const [findings, setFindings] = useState<Finding[]>([])
  const [stats, setStats] = useState<DashStats | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)

  // Filters
  const [searchQ, setSearchQ] = useState('')
  const [filterSeverity, setFilterSeverity] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const selectedFinding = findings.find(f => f.id === selectedId) || null

  const loadStats = useCallback(async () => {
    if (!clientId) return
    try {
      const s = await processorApi.getAuditDashboardStats(clientId)
      setStats(s)
    } catch { /* Server may not be running */ }
  }, [clientId])

  const loadFindings = useCallback(async () => {
    if (!clientId) return
    try {
      const data = await processorApi.getAuditFindings(
        clientId,
        filterSeverity !== 'all' ? filterSeverity : undefined,
        filterCategory !== 'all' ? filterCategory : undefined,
        filterStatus !== 'all' ? filterStatus : undefined,
        searchQ || undefined
      )
      setFindings(data)
    } catch { /* Server may not be running */ }
  }, [clientId, filterSeverity, filterCategory, filterStatus, searchQ])

  useEffect(() => { loadFindings(); loadStats() }, [loadFindings, loadStats])

  const runScan = async () => {
    if (!clientId) {
      toast.error('Please select a client first')
      return
    }
    setIsScanning(true)
    const t = toast.loading('Running AI Audit Intelligence scan...')
    try {
      const result = await processorApi.runAuditScan(clientId)
      toast.dismiss(t)
      toast.success(`Scan complete — ${result.count} findings generated`)
      await loadFindings()
      await loadStats()
    } catch {
      toast.dismiss(t)
      toast.error('Audit scan failed — ensure the backend is running')
    } finally {
      setIsScanning(false)
    }
  }

  const handleResolve = async (id: string, action: 'resolve' | 'reopen') => {
    try {
      await processorApi.handleAuditAction(id, action)
      toast.success(`Finding ${action === 'resolve' ? 'resolved' : 'reopened'}`)
      await loadFindings()
      await loadStats()
      if (action === 'resolve') setSelectedId(null)
    } catch {
      toast.error('Action failed')
    }
  }

  const downloadReport = async (fmt: 'excel' | 'pdf' | 'csv') => {
    if (!clientId) { toast.error('Select a client first'); return }
    const t = toast.loading(`Generating ${fmt.toUpperCase()} report...`)
    try {
      const blob = await processorApi.downloadAuditReport(clientId, fmt)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit_report.${fmt === 'excel' ? 'xlsx' : fmt}`
      a.click()
      URL.revokeObjectURL(url)
      toast.dismiss(t)
      toast.success('Report downloaded')
    } catch {
      toast.dismiss(t)
      toast.error('Export failed')
    }
  }

  const categories = [...new Set(findings.map(f => f.category))].sort()

  const TABS: { id: TabId; label: string; count?: number }[] = [
    { id: 'findings', label: 'Observations', count: findings.length },
    { id: 'analytics', label: 'Analytics' },
    { id: 'vendors', label: 'Vendor Profiles' },
    { id: 'rules', label: 'Learning Rules' },
  ]

  return (
    <div className="flex flex-col h-[calc(100vh-var(--topbar-height))] p-0 overflow-hidden">

      {/* ── Top Bar ─────────────────────────────────────────────────────── */}
      <div className="bg-surface-900 border-b border-surface-700 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-sm font-black text-surface-100 flex items-center gap-2 uppercase tracking-wider">
            <Shield size={16} className="text-brand-500" />
            AI Audit Intelligence
          </h2>
          <p className="text-[10px] text-surface-500 mt-0.5">
            {clientId
              ? `Analyzing: ${activeClientObj?.name || clientId}`
              : 'Select a client to begin auditing'} · Local Private Sandbox
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {/* Client Selector */}
          {clients.length > 0 && (
            <select
              className="input text-xs py-1.5 px-3 pr-7"
              value={selectedClientId}
              onChange={e => setSelectedClientId(e.target.value)}
            >
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
          <button onClick={() => downloadReport('excel')} className="btn-secondary text-xs py-1 px-2.5 border border-surface-700 gap-1">
            <FileSpreadsheet size={12} /> Excel
          </button>
          <button onClick={() => downloadReport('pdf')} className="btn-secondary text-xs py-1 px-2.5 border border-surface-700 gap-1">
            <FileText size={12} /> PDF
          </button>
          <button onClick={() => downloadReport('csv')} className="btn-secondary text-xs py-1 px-2.5 border border-surface-700 gap-1">
            <BarChart3 size={12} /> CSV
          </button>
          <button
            onClick={runScan}
            disabled={isScanning || !clientId}
            className="btn-primary text-xs py-1.5 px-4 gap-1.5"
          >
            <Sparkles size={12} className={isScanning ? 'animate-spin' : ''} />
            {isScanning ? 'Scanning...' : 'Run AI Audit Scan'}
          </button>
        </div>
      </div>

      {/* ── Scoreboard ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-3 px-6 py-4 bg-surface-900/30 border-b border-surface-700 flex-shrink-0">
        {[
          {
            label: 'Compliance Score', val: stats ? `${stats.compliance_score}/100` : '—',
            sub: stats ? (stats.compliance_score >= 75 ? 'High Health' : stats.compliance_score >= 50 ? 'Moderate Risk' : 'Critical') : 'Run scan',
            color: stats ? (stats.compliance_score >= 75 ? 'text-emerald-400' : stats.compliance_score >= 50 ? 'text-amber-400' : 'text-red-400') : 'text-surface-500'
          },
          { label: 'Critical Flags', val: stats?.critical_count ?? '—', sub: 'Needs immediate action', color: 'text-red-400' },
          { label: 'High / Medium', val: stats ? `${stats.high_count + stats.medium_count}` : '—', sub: 'Review & verify', color: 'text-amber-400' },
          { label: 'Total Exposure', val: stats ? formatINR(stats.total_impact_amount) : '—', sub: 'Potential tax impact', color: 'text-brand-400' },
          { label: 'Open Findings', val: stats?.open_findings ?? '—', sub: 'Pending resolution', color: 'text-surface-300' },
        ].map(c => (
          <div key={c.label} className="card p-3 flex flex-col justify-between">
            <span className="text-[9px] text-surface-500 uppercase font-bold tracking-wider">{c.label}</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className={`text-xl font-black ${c.color}`}>{c.val}</span>
              <span className={`text-[9px] ${c.color} bg-current/10 px-1 rounded font-semibold opacity-80`}>{c.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className="px-6 border-b border-surface-700 bg-surface-900/10 flex flex-shrink-0">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
              tab === t.id
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-surface-500 hover:text-surface-300'
            }`}
          >
            {t.label}
            {t.count !== undefined && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                tab === t.id ? 'bg-brand-500/20 text-brand-400' : 'bg-surface-800 text-surface-500'
              }`}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex">

        {/* Findings Tab */}
        {tab === 'findings' && (
          <>
            {/* Left: Filters + List */}
            <div className="flex flex-col w-[420px] flex-shrink-0 border-r border-surface-700 overflow-hidden">
              {/* Filter Bar */}
              <div className="p-3 border-b border-surface-700 bg-surface-900/50 space-y-2 flex-shrink-0">
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-surface-500" />
                  <input
                    className="input text-xs pl-7 py-1.5 w-full"
                    placeholder="Search findings, categories..."
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <select className="input text-[11px] py-1 flex-1" value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}>
                    <option value="all">All Severities</option>
                    {['Critical','High','Medium','Low'].map(s => <option key={s}>{s}</option>)}
                  </select>
                  <select className="input text-[11px] py-1 flex-1" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="all">All Statuses</option>
                    <option value="Open">Open</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>
                {categories.length > 0 && (
                  <select className="input text-[11px] py-1 w-full" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                    <option value="all">All Categories</option>
                    {categories.map(c => <option key={c}>{c}</option>)}
                  </select>
                )}
              </div>

              {/* Findings List */}
              <div className="flex-1 overflow-y-auto">
                {findings.length === 0 ? (
                  <div className="p-8 text-center">
                    <ShieldAlert size={28} className="mx-auto mb-3 text-surface-600" />
                    <p className="text-xs text-surface-500">No findings found.</p>
                    <p className="text-[11px] text-surface-600 mt-1">
                      {clientId ? 'Run an AI Audit Scan to generate observations.' : 'Select a client first.'}
                    </p>
                  </div>
                ) : (
                  findings.map(f => {
                    const cfg = SEV_CONFIG[f.severity] || SEV_CONFIG.Low
                    const isSelected = f.id === selectedId
                    return (
                      <div
                        key={f.id}
                        onClick={() => setSelectedId(isSelected ? null : f.id)}
                        className={`px-4 py-3 border-b border-surface-800 cursor-pointer transition-colors flex gap-3 ${
                          isSelected ? 'bg-brand-500/10 border-l-2 border-l-brand-500' : 'hover:bg-surface-800/60'
                        }`}
                      >
                        <div className={`mt-0.5 flex-shrink-0 w-1.5 h-1.5 rounded-full mt-2 ${
                          f.severity === 'Critical' ? 'bg-red-500' :
                          f.severity === 'High' ? 'bg-orange-500' :
                          f.severity === 'Medium' ? 'bg-amber-500' : 'bg-sky-500'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`text-[9px] font-black uppercase ${cfg.color}`}>{f.severity}</span>
                            <span className="text-[9px] text-surface-600 bg-surface-800 px-1.5 py-0.5 rounded">{f.category}</span>
                            {f.status === 'Resolved' && (
                              <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">✓ Resolved</span>
                            )}
                          </div>
                          <p className="text-xs text-surface-200 font-medium leading-snug line-clamp-2">{f.title}</p>
                          {f.impact_amount > 0 && (
                            <p className="text-[10px] text-red-400 mt-1 font-mono">
                              Impact: {formatINR(f.impact_amount)}
                            </p>
                          )}
                        </div>
                        <div className="flex-shrink-0 self-center">
                          <ScoreRing score={Math.round(f.risk_score)} size={30} />
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Right: Detail Panel */}
            <div className="flex-1 overflow-hidden">
              {selectedFinding ? (
                <FindingDetail
                  finding={selectedFinding}
                  onClose={() => setSelectedId(null)}
                  onResolve={handleResolve}
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center px-8">
                  <div className="w-16 h-16 rounded-2xl bg-surface-800 border border-surface-700 flex items-center justify-center mb-4">
                    <Target size={24} className="text-surface-500" />
                  </div>
                  <h3 className="text-sm font-bold text-surface-300">Select a Finding</h3>
                  <p className="text-[11px] text-surface-500 mt-1.5 max-w-xs">
                    Click any observation in the list to view detailed evidence, statutory references, and recommended remediation steps.
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Analytics Tab */}
        {tab === 'analytics' && (
          <div className="flex-1 overflow-y-auto">
            <AnalyticsTab stats={stats} />
          </div>
        )}

        {/* Vendor Profiles Tab */}
        {tab === 'vendors' && (
          <div className="flex-1 overflow-y-auto">
            <VendorProfiles clientId={clientId} />
          </div>
        )}

        {/* Rules Tab */}
        {tab === 'rules' && (
          <div className="flex-1 overflow-y-auto">
            <RulesManager />
          </div>
        )}
      </div>
    </div>
  )
}
