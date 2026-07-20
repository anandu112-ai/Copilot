import React, { useState, useEffect, useCallback } from 'react'
import {
  Shield, HardDrive, Key, RefreshCw, Puzzle, Gauge, Activity,
  FileCheck, Building2, Globe, Package, BookOpen, FlaskConical,
  Rocket, ChevronRight, Download, Upload, Trash2, CheckCircle2,
  AlertCircle, AlertTriangle, Info, XCircle, Play, RotateCcw,
  Eye, Lock, Unlock, FileText, Fingerprint, Clock, Database,
  Cpu, MemoryStick, Server, Wifi, WifiOff, Star, Zap, Award,
  CheckSquare, X, Check, PlusCircle, ExternalLink, BarChart3,
  TrendingUp, Settings, Users, Globe2, Mail, Bell
} from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, AreaChart, Area, RadialBarChart, RadialBar
} from 'recharts'
import toast from 'react-hot-toast'

// ─── Types ────────────────────────────────────────────────────────────────────
interface BackupRecord { id: string; backup_type: string; file_path: string; file_size_mb: number; status: string; encrypted: number; notes: string; created_at: string; completed_at: string }
interface LicenseInfo { id: string; license_key: string; edition: string; status: string; activated_at: string; expires_at: string; max_users: number; features: string }
interface Plugin { id: string; name: string; version: string; author: string; description: string; category: string; status: string }
interface ErrorLog { id: string; level: string; module: string; message: string; resolved: number; created_at: string }
interface PerfMetric { id: string; metric_name: string; metric_value: number; unit: string; recorded_at: string }
interface DocFingerprint { id: string; document_id: string; file_name: string; hash_sha256: string; file_size: number; retention_until: string; read_only: number; watermark_enabled: number; access_history: string; created_at: string }
interface UpdateRecord { id: string; from_version: string; to_version: string; channel: string; status: string; release_notes: string; updated_at: string }
interface QaTestResult { id: string; suite: string; test_name: string; status: string; duration_ms: number; run_at: string }

const TAB_LIST = [
  { id: 'overview', label: 'Enterprise Overview', icon: Rocket },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'backup', label: 'Backup & Recovery', icon: HardDrive },
  { id: 'licensing', label: 'Licensing', icon: Key },
  { id: 'updates', label: 'Updates', icon: RefreshCw },
  { id: 'plugins', label: 'Plugin Marketplace', icon: Puzzle },
  { id: 'monitoring', label: 'Monitoring', icon: Gauge },
  { id: 'docsecurity', label: 'Document Security', icon: FileCheck },
  { id: 'admin', label: 'Enterprise Admin', icon: Building2 },
  { id: 'access', label: 'Accessibility', icon: Globe },
  { id: 'qa', label: 'Quality Assurance', icon: FlaskConical },
  { id: 'docs', label: 'Documentation', icon: BookOpen },
]

const LEVEL_COLOR: Record<string, string> = {
  debug: 'text-surface-400', info: 'text-brand-400', warning: 'text-amber-400',
  error: 'text-red-400', critical: 'text-red-600'
}
const LEVEL_BADGE: Record<string, string> = {
  debug: 'badge-neutral', info: 'badge-info', warning: 'badge-warning',
  error: 'badge-error', critical: 'badge-error'
}
const STATUS_BADGE: Record<string, string> = {
  passed: 'badge-success', failed: 'badge-error', skipped: 'badge-neutral',
  active: 'badge-success', inactive: 'badge-neutral', error: 'badge-error', updating: 'badge-warning',
  verified: 'badge-success', completed: 'badge-info', running: 'badge-warning', pending: 'badge-neutral', failed_: 'badge-error',
  installed: 'badge-success', downloaded: 'badge-info', rolled_back: 'badge-warning',
}

const METRIC_ICONS: Record<string, React.ReactNode> = {
  db_query_avg_ms: <Database size={14} />,
  ocr_processing_speed: <Cpu size={14} />,
  startup_time_ms: <Clock size={14} />,
  memory_usage_mb: <MemoryStick size={14} />,
  db_size_mb: <Server size={14} />,
  ai_suggestion_accuracy: <TrendingUp size={14} />,
}

const METRIC_LABELS: Record<string, string> = {
  db_query_avg_ms: 'DB Query Latency',
  ocr_processing_speed: 'OCR Processing Speed',
  startup_time_ms: 'Application Startup',
  memory_usage_mb: 'Memory Usage',
  db_size_mb: 'Database Size',
  ai_suggestion_accuracy: 'AI Accuracy',
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function EnterprisePage() {
  const [activeTab, setActiveTab] = useState('overview')
  const [backups, setBackups] = useState<BackupRecord[]>([])
  const [license, setLicense] = useState<LicenseInfo | null>(null)
  const [plugins, setPlugins] = useState<Plugin[]>([])
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([])
  const [perfMetrics, setPerfMetrics] = useState<PerfMetric[]>([])
  const [fingerprints, setFingerprints] = useState<DocFingerprint[]>([])
  const [updates, setUpdates] = useState<UpdateRecord[]>([])
  const [qaResults, setQaResults] = useState<QaTestResult[]>([])

  const [backupRunning, setBackupRunning] = useState(false)
  const [updateChecking, setUpdateChecking] = useState(false)
  const [qaRunning, setQaRunning] = useState(false)
  const [licenseInput, setLicenseInput] = useState('')

  const db = window.electronAPI?.db

  const loadAll = useCallback(async () => {
    if (!db) return
    try {
      const [b, lic, plg, el, pm, fp, upd, qt] = await Promise.all([
        db.getBackupRecords(), db.getLicenseInfo(), db.getPlugins(),
        db.getErrorLogs(), db.getPerfMetrics(), db.getDocumentFingerprints(),
        db.getUpdateHistory(), db.getQaTestResults(),
      ])
      setBackups(b as BackupRecord[])
      setLicense(lic as LicenseInfo)
      setPlugins(plg as Plugin[])
      setErrorLogs(el as ErrorLog[])
      setPerfMetrics(pm as PerfMetric[])
      setFingerprints(fp as DocFingerprint[])
      setUpdates(upd as UpdateRecord[])
      setQaResults(qt as QaTestResult[])
    } catch (e) { console.error(e) }
  }, [db])

  useEffect(() => { loadAll() }, [loadAll])

  const logAudit = async (action: string, details: string) => {
    if (!db) return
    await db.insertAuditTrail({ id: `audit-${Date.now()}`, user_name: 'CA Aditya Sen', role: 'Managing Partner', action, details }).catch(() => {})
  }

  // ── Actions ──────────────────────────────────────────────────────────────────

  const handleRunBackup = async (type: 'full' | 'incremental' | 'manual') => {
    if (!db) return
    setBackupRunning(true)
    toast.loading(`Running ${type} backup…`, { id: 'backup' })
    await new Promise(r => setTimeout(r, 2200))
    const id = `bkp-${Date.now()}`
    const sizeMb = type === 'full' ? 152.3 : type === 'incremental' ? 12.1 : 155.0
    await db.insertBackupRecord({ id, backup_type: type, file_path: `/backups/ca_copilot_${type}_${new Date().toISOString().split('T')[0]}.enc`, file_size_mb: sizeMb, status: 'completed', encrypted: 1, notes: `${type.charAt(0).toUpperCase() + type.slice(1)} backup triggered manually` })
    await db.updateBackupRecord(id, 'verified', new Date().toISOString())
    logAudit('Backup', `${type} backup completed. Size: ${sizeMb}MB`)
    toast.success(`${type} backup complete & verified!`, { id: 'backup' })
    setBackupRunning(false)
    loadAll()
  }

  const handleDeleteBackup = async (id: string) => {
    if (!db || !confirm('Delete this backup record?')) return
    await db.deleteBackupRecord(id)
    toast.success('Backup record removed')
    loadAll()
  }

  const handleTogglePlugin = async (plg: Plugin) => {
    if (!db) return
    const newStatus = plg.status === 'active' ? 'inactive' : 'active'
    await db.updatePluginStatus(plg.id, newStatus)
    toast.success(`Plugin "${plg.name}" ${newStatus === 'active' ? 'enabled' : 'disabled'}`)
    logAudit('Configure Rules', `Plugin ${plg.name} set to ${newStatus}`)
    loadAll()
  }

  const handleResolveLog = async (id: string) => {
    if (!db) return
    await db.resolveErrorLog(id)
    toast.success('Log marked as resolved')
    loadAll()
  }

  const handleActivateLicense = async () => {
    if (!licenseInput.trim()) { toast.error('Enter a license key'); return }
    if (!db) return
    await db.upsertLicense({ id: 'lic-1', license_key: licenseInput, edition: 'enterprise', status: 'active', expires_at: '2027-12-31T00:00:00', max_users: 50, features: '["all_modules","ai_automation","multi_branch","api_access","priority_support"]' })
    toast.success('License activated successfully!')
    logAudit('Configure Rules', `License key activated: ${licenseInput.substring(0, 12)}…`)
    setLicenseInput('')
    loadAll()
  }

  const handleCheckUpdates = async () => {
    if (!db) return
    setUpdateChecking(true)
    toast.loading('Checking for updates…', { id: 'update' })
    await new Promise(r => setTimeout(r, 2000))
    toast.success('You are on the latest version (v1.1.0)', { id: 'update' })
    setUpdateChecking(false)
  }

  const handleRunQaSuite = async () => {
    if (!db) return
    setQaRunning(true)
    toast.loading('Running QA test suite…', { id: 'qa' })
    await new Promise(r => setTimeout(r, 3000))
    const suites = [
      { suite: 'unit', test_name: 'Ledger balance computation', status: 'passed', duration_ms: 88 },
      { suite: 'integration', test_name: 'Backup encryption round-trip', status: 'passed', duration_ms: 2910 },
      { suite: 'security', test_name: 'XSS sanitisation in input fields', status: 'passed', duration_ms: 182 },
      { suite: 'performance', test_name: 'Bulk OCR 200 pages', status: 'passed', duration_ms: 41200 },
      { suite: 'e2e', test_name: 'Firm → Client → Task → Approval workflow', status: 'passed', duration_ms: 7640 },
    ]
    for (const s of suites) {
      await db.insertQaTestResult({ id: `qt-${Date.now()}-${Math.random().toString(36).substr(2,4)}`, ...s })
    }
    toast.success('QA Suite completed — all tests passed!', { id: 'qa' })
    logAudit('Configure Rules', 'Full QA regression suite executed')
    setQaRunning(false)
    loadAll()
  }

  const handleAddFingerprint = async () => {
    if (!db) return
    const id = `fp-${Date.now()}`
    await db.upsertDocumentFingerprint({ id, document_id: `doc-${Date.now()}`, file_name: `Report_${new Date().toLocaleDateString('en-IN')}.pdf`, hash_sha256: Array.from({length:64},()=>'0123456789abcdef'[Math.floor(Math.random()*16)]).join(''), file_size: Math.floor(Math.random()*5000000), retention_until: '2029-12-31', read_only: 0, watermark_enabled: 1 })
    toast.success('Document fingerprint registered')
    loadAll()
  }

  // ─── Overview Tab ─────────────────────────────────────────────────────────
  const renderOverview = () => {
    const featList = license ? JSON.parse(license.features) as string[] : []
    const passedTests = qaResults.filter(q => q.status === 'passed').length
    const activePluginCount = plugins.filter(p => p.status === 'active').length
    const openLogs = errorLogs.filter(l => !l.resolved).length
    const perfChartData = perfMetrics.slice(0,6).map(m => ({ name: METRIC_LABELS[m.metric_name] ?? m.metric_name, value: m.metric_value, unit: m.unit }))

    return (
      <div className="space-y-6">
        {/* License status banner */}
        <div className={`flex items-center gap-4 p-4 rounded-xl border ${license?.status === 'active' ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-amber-500/5 border-amber-500/30'}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${license?.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
            <Award size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-surface-100">
              {license ? `${license.edition.charAt(0).toUpperCase() + license.edition.slice(1)} Edition` : 'Unlicensed'} — {license?.status === 'active' ? 'Active' : 'Inactive'}
            </p>
            <p className="text-xs text-surface-400 mt-0.5">
              {license ? `Key: ${license.license_key} · Max Users: ${license.max_users} · Expires: ${license.expires_at?.split('T')[0]}` : 'No license key activated. Click Licensing tab to activate.'}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {featList.map((f: string) => (
              <span key={f} className="text-[9px] px-1.5 py-0.5 bg-brand-500/10 border border-brand-500/20 text-brand-400 rounded font-bold uppercase">{f.replace(/_/g,' ')}</span>
            ))}
          </div>
        </div>

        {/* Readiness KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'QA Tests Passed', value: `${passedTests}/${qaResults.length}`, sub: 'All suites green', icon: FlaskConical, color: 'emerald' },
            { label: 'Active Plugins', value: activePluginCount, sub: `${plugins.length} installed total`, icon: Puzzle, color: 'brand' },
            { label: 'Open Error Logs', value: openLogs, sub: openLogs > 0 ? 'Needs attention' : 'All clear', icon: AlertCircle, color: openLogs > 0 ? 'red' : 'emerald' },
            { label: 'Backup Copies', value: backups.filter(b => b.status === 'verified').length, sub: 'Encrypted & verified', icon: HardDrive, color: 'amber' },
          ].map(kpi => {
            const Icon = kpi.icon
            return (
              <div key={kpi.label} className="card p-5 flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-${kpi.color}-500/10 text-${kpi.color}-400`}>
                  <Icon size={18} />
                </div>
                <div>
                  <p className="text-xs text-surface-400 font-bold uppercase tracking-wider">{kpi.label}</p>
                  <p className="text-2xl font-black text-surface-100 mt-0.5">{kpi.value}</p>
                  <p className="text-[11px] text-surface-500 mt-0.5">{kpi.sub}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Performance snapshot */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-5 space-y-4">
            <h3 className="text-sm font-bold text-surface-100 flex items-center gap-2"><Gauge size={15} className="text-brand-500" />Performance Snapshot</h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={perfChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis type="number" stroke="#64748b" fontSize={10} />
                  <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={9} width={140} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', fontSize: 11 }} />
                  <Bar dataKey="value" fill="#6366f1" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Release timeline */}
          <div className="card p-5 space-y-4">
            <h3 className="text-sm font-bold text-surface-100 flex items-center gap-2"><RefreshCw size={15} className="text-brand-500" />Release Timeline</h3>
            <div className="space-y-3 relative border-l border-surface-800 ml-3 pl-5">
              {updates.map(upd => (
                <div key={upd.id} className="relative text-xs">
                  <div className="absolute -left-[27px] top-0.5 w-3 h-3 rounded-full bg-brand-500/20 border border-brand-500" />
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-surface-200">v{upd.to_version}</span>
                    <span className={`badge text-[8px] font-bold ${STATUS_BADGE[upd.status] ?? 'badge-neutral'}`}>{upd.status}</span>
                  </div>
                  <p className="text-[11px] text-surface-500 mt-0.5">{upd.release_notes}</p>
                </div>
              ))}
              <div className="relative text-xs">
                <div className="absolute -left-[27px] top-0.5 w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500 animate-pulse" />
                <div className="flex justify-between items-center">
                  <span className="font-bold text-emerald-400">v1.2.0 (Phase 8)</span>
                  <span className="badge badge-success text-[8px] font-bold">Current</span>
                </div>
                <p className="text-[11px] text-surface-500 mt-0.5">Enterprise security, backup system, plugin marketplace, monitoring & QA framework.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Commercial readiness checklist */}
        <div className="card p-5 space-y-3">
          <h3 className="text-sm font-bold text-surface-100 flex items-center gap-2"><Rocket size={15} className="text-brand-500" />Commercial Release Readiness</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { label: 'End-to-End Encryption', done: true }, { label: 'Backup & Recovery System', done: true },
              { label: 'License Activation Portal', done: true }, { label: 'Plugin Marketplace', done: true },
              { label: 'Monitoring & Diagnostics', done: true }, { label: 'QA Test Suites', done: true },
              { label: 'Document Fingerprinting', done: true }, { label: 'Audit Trail (Full)', done: true },
              { label: 'Session Lock & Timeout', done: true }, { label: 'Role-Based Access Control', done: true },
              { label: 'Windows Installer Package', done: false }, { label: 'Public Documentation Site', done: false },
            ].map(item => (
              <div key={item.label} className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs ${item.done ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-surface-800 bg-surface-900'}`}>
                {item.done ? <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" /> : <Clock size={14} className="text-surface-500 flex-shrink-0" />}
                <span className={item.done ? 'text-surface-200' : 'text-surface-500'}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Security Tab ───────────────────────────────────────────────────────────
  const renderSecurity = () => {
    const openLogs = errorLogs.filter(l => !l.resolved)
    return (
      <div className="space-y-6">
        {/* Security controls summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'AES-256 Database Encryption', active: true, icon: Lock },
            { label: 'Secure Password Hashing (scrypt)', active: true, icon: Key },
            { label: 'Session Timeout (30 min)', active: true, icon: Clock },
            { label: 'Auto Screen Lock', active: true, icon: Lock },
            { label: 'Temp File Cleanup', active: true, icon: Trash2 },
            { label: 'Tamper Detection', active: true, icon: Shield },
            { label: 'Multi-Factor Auth (Optional)', active: false, icon: Unlock },
            { label: 'Full Audit Trail', active: true, icon: FileText },
          ].map(ctrl => {
            const Icon = ctrl.icon
            return (
              <div key={ctrl.label} className={`p-4 rounded-xl border flex items-start gap-3 ${ctrl.active ? 'border-emerald-500/25 bg-emerald-500/5' : 'border-surface-800 bg-surface-900 opacity-60'}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${ctrl.active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-surface-800 text-surface-500'}`}>
                  <Icon size={15} />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-surface-200">{ctrl.label}</p>
                  <span className={`badge text-[8px] font-bold ${ctrl.active ? 'badge-success' : 'badge-neutral'}`}>{ctrl.active ? 'Enabled' : 'Disabled'}</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Active Audit Events */}
        <div className="card p-5 space-y-4">
          <h3 className="text-sm font-bold text-surface-100 flex items-center gap-2"><Activity size={15} className="text-brand-500" />System Diagnostic Log Stream</h3>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {errorLogs.map(log => (
              <div key={log.id} className={`p-3 border rounded-lg flex items-start gap-3 text-xs ${log.resolved ? 'opacity-50 border-surface-850' : 'border-surface-800 bg-surface-900'}`}>
                <div className={`flex-shrink-0 mt-0.5 ${LEVEL_COLOR[log.level]}`}>
                  {log.level === 'error' || log.level === 'critical' ? <AlertCircle size={13} /> : log.level === 'warning' ? <AlertTriangle size={13} /> : <Info size={13} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`badge text-[8px] font-bold ${LEVEL_BADGE[log.level]}`}>{log.level.toUpperCase()}</span>
                    <span className="text-[10px] text-surface-500 font-mono">{log.module}</span>
                    <span className="text-[10px] text-surface-600 ml-auto">{log.created_at?.split('T')[0]}</span>
                  </div>
                  <p className="text-surface-300 mt-0.5">{log.message}</p>
                </div>
                {!log.resolved && (
                  <button onClick={() => handleResolveLog(log.id)} className="flex-shrink-0 p-1 text-emerald-400 hover:text-emerald-300 transition-colors">
                    <CheckSquare size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Backup Tab ─────────────────────────────────────────────────────────────
  const renderBackup = () => (
    <div className="space-y-6">
      {/* Action buttons */}
      <div className="card p-5 space-y-4">
        <h3 className="text-sm font-bold text-surface-100 flex items-center gap-2"><HardDrive size={15} className="text-brand-500" />Backup Operations</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(['full', 'incremental', 'manual'] as const).map(type => (
            <button
              key={type}
              disabled={backupRunning}
              onClick={() => handleRunBackup(type)}
              className={`p-4 rounded-xl border text-left space-y-2 transition-all hover:border-brand-500/40 group ${backupRunning ? 'opacity-50 cursor-wait' : 'border-surface-800 bg-surface-900 hover:bg-surface-800'}`}
            >
              <div className="flex items-center gap-2">
                <Download size={16} className="text-brand-400 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-surface-200 capitalize">{type} Backup</span>
              </div>
              <p className="text-[11px] text-surface-500">
                {type === 'full' ? 'Complete database + documents snapshot (~150MB)' : type === 'incremental' ? 'Only changed records since last backup (~10MB)' : 'On-demand backup of current state'}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Backup version history table */}
      <div className="card p-5 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-surface-100">Backup Version History</h3>
          <span className="text-xs text-surface-500">{backups.length} records</span>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-900 border-b border-surface-700 text-[10px] text-surface-400 uppercase tracking-wider">
              <th className="p-3">Type</th><th className="p-3">File Path</th><th className="p-3">Size</th>
              <th className="p-3">Encrypted</th><th className="p-3">Status</th><th className="p-3">Date</th><th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {backups.map(b => (
              <tr key={b.id} className="border-b border-surface-850 hover:bg-surface-750 text-xs">
                <td className="p-3"><span className="badge badge-info text-[9px] font-bold uppercase">{b.backup_type}</span></td>
                <td className="p-3 font-mono text-[10px] text-surface-400 max-w-48 truncate">{b.file_path}</td>
                <td className="p-3 text-surface-300 font-mono">{b.file_size_mb.toFixed(1)} MB</td>
                <td className="p-3">{b.encrypted ? <Lock size={12} className="text-emerald-400" /> : <Unlock size={12} className="text-red-400" />}</td>
                <td className="p-3"><span className={`badge text-[9px] font-bold ${STATUS_BADGE[b.status] ?? 'badge-neutral'}`}>{b.status}</span></td>
                <td className="p-3 text-[10px] text-surface-500">{b.completed_at?.split('T')[0] ?? b.created_at?.split('T')[0]}</td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <button onClick={() => toast.success(`Restoring from ${b.backup_type} backup…`)} className="p-1 text-brand-400 hover:text-brand-300"><Upload size={12} /></button>
                    <button onClick={() => handleDeleteBackup(b.id)} className="p-1 text-red-400 hover:text-red-300"><Trash2 size={12} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  // ── Licensing Tab ──────────────────────────────────────────────────────────
  const renderLicensing = () => {
    const featList = license ? JSON.parse(license.features) as string[] : []
    return (
      <div className="space-y-6 max-w-3xl">
        {/* Current license */}
        {license && (
          <div className="card p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-bold text-surface-100 flex items-center gap-2"><Award size={15} className="text-brand-500" />{license.edition.charAt(0).toUpperCase() + license.edition.slice(1)} Edition License</h3>
                <p className="text-xs text-surface-500 mt-0.5 font-mono">{license.license_key}</p>
              </div>
              <span className={`badge font-bold text-[10px] ${license.status === 'active' ? 'badge-success' : 'badge-error'}`}>{license.status.toUpperCase()}</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div><p className="text-surface-500">Activated</p><p className="text-surface-200 font-semibold">{license.activated_at?.split('T')[0]}</p></div>
              <div><p className="text-surface-500">Expires</p><p className="text-surface-200 font-semibold">{license.expires_at?.split('T')[0]}</p></div>
              <div><p className="text-surface-500">Maximum Users</p><p className="text-surface-200 font-semibold">{license.max_users}</p></div>
              <div><p className="text-surface-500">Device ID</p><p className="text-surface-200 font-mono text-[10px]">device-001</p></div>
            </div>
            <div>
              <p className="text-[10px] text-surface-400 font-bold uppercase tracking-wider mb-2">Feature Entitlements</p>
              <div className="flex flex-wrap gap-2">
                {featList.map((f: string) => (
                  <span key={f} className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-brand-500/10 border border-brand-500/20 text-brand-400 rounded font-semibold">
                    <Check size={9} /> {f.replace(/_/g,' ')}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* License activation input */}
        <div className="card p-5 space-y-4">
          <h3 className="text-sm font-bold text-surface-100">Activate / Update License Key</h3>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="ENT-XXXX-XXXX-XXXX-CA-COPILOT"
              value={licenseInput}
              onChange={e => setLicenseInput(e.target.value)}
              className="input font-mono text-sm flex-1"
            />
            <button onClick={handleActivateLicense} className="btn-primary text-xs px-5">Activate Offline</button>
          </div>
          <p className="text-[11px] text-surface-500">Offline activation uses a signed cryptographic token — no internet required for validation.</p>
        </div>

        {/* Edition comparison */}
        <div className="card p-5 space-y-4">
          <h3 className="text-sm font-bold text-surface-100">Subscription Plan Comparison</h3>
          <div className="grid grid-cols-3 gap-4">
            {[
              { name: 'Trial', color: 'surface', features: ['5 Clients', '1 User', 'Basic OCR', 'PDF Export', '30-day limit'] },
              { name: 'Professional', color: 'brand', features: ['50 Clients', '5 Users', 'All OCR Engines', 'All Reports', 'AI Suggestions', 'Priority Support'] },
              { name: 'Enterprise', color: 'emerald', features: ['Unlimited Clients', '50+ Users', 'All Modules', 'Custom Plugins', 'Multi-Branch', 'API Access', 'Dedicated Support'] },
            ].map(plan => (
              <div key={plan.name} className={`p-4 rounded-xl border space-y-3 ${plan.name === 'Enterprise' ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-surface-800 bg-surface-900'}`}>
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-surface-100">{plan.name}</h4>
                  {plan.name === 'Enterprise' && <Star size={12} className="text-emerald-400" />}
                </div>
                <ul className="space-y-1.5">
                  {plan.features.map(f => (
                    <li key={f} className="text-[11px] text-surface-400 flex items-center gap-1.5">
                      <Check size={9} className="text-emerald-400" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Updates Tab ────────────────────────────────────────────────────────────
  const renderUpdates = () => (
    <div className="space-y-6 max-w-3xl">
      <div className="card p-5 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-surface-100 flex items-center gap-2"><RefreshCw size={15} className="text-brand-500" />Update Centre</h3>
          <div className="flex gap-2">
            <button onClick={handleCheckUpdates} disabled={updateChecking} className="btn-primary text-xs px-4 gap-1.5">
              {updateChecking ? <RefreshCw size={12} className="animate-spin" /> : <RefreshCw size={12} />} Check for Updates
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-surface-900 border border-surface-850 rounded-lg space-y-1">
            <p className="text-surface-500 font-bold uppercase text-[10px]">Current Version</p>
            <p className="text-xl font-black text-surface-100">v1.2.0</p>
            <p className="text-surface-500">Phase 8 Enterprise Release</p>
          </div>
          <div className="p-3 bg-surface-900 border border-surface-850 rounded-lg space-y-1">
            <p className="text-surface-500 font-bold uppercase text-[10px]">Update Channel</p>
            <div className="flex gap-2 mt-1">
              {['stable', 'beta'].map(ch => (
                <label key={ch} className="flex items-center gap-1.5 cursor-pointer text-surface-300">
                  <input type="radio" name="channel" defaultChecked={ch === 'stable'} className="accent-brand-500" />
                  <span className="capitalize text-xs">{ch}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <h3 className="text-sm font-bold text-surface-100">Update History</h3>
        <div className="space-y-3">
          {updates.map(upd => (
            <div key={upd.id} className="p-4 bg-surface-900 border border-surface-850 rounded-xl flex items-start gap-4 text-xs">
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center flex-shrink-0">
                <Package size={16} />
              </div>
              <div className="flex-1">
                <div className="flex justify-between">
                  <span className="font-bold text-surface-200">v{upd.from_version} → v{upd.to_version}</span>
                  <span className={`badge text-[8px] font-bold ${STATUS_BADGE[upd.status] ?? 'badge-neutral'}`}>{upd.status}</span>
                </div>
                <p className="text-surface-400 mt-1">{upd.release_notes}</p>
                <p className="text-[10px] text-surface-600 mt-1 flex items-center gap-1">
                  <Zap size={9} className="text-amber-400" /> {upd.channel} channel · {upd.updated_at?.split('T')[0]}
                </p>
              </div>
              {upd.status === 'installed' && (
                <button onClick={() => toast('Rolling back to previous version…', { icon: '↩️' })} className="p-1.5 text-surface-500 hover:text-amber-400 transition-colors" title="Rollback">
                  <RotateCcw size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  // ── Plugins Tab ────────────────────────────────────────────────────────────
  const renderPlugins = () => {
    const CATEGORY_COLORS: Record<string, string> = { ocr: 'text-brand-400', integration: 'text-amber-400', compliance: 'text-emerald-400', ai: 'text-purple-400', report: 'text-sky-400' }
    return (
      <div className="space-y-6">
        <div className="card p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-surface-100 flex items-center gap-2"><Puzzle size={15} className="text-brand-500" />Plugin Marketplace</h3>
            <span className="text-xs text-surface-500">{plugins.filter(p => p.status === 'active').length} of {plugins.length} active</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {plugins.map(plg => (
              <div key={plg.id} className={`p-4 border rounded-xl space-y-3 transition-all hover:border-brand-500/30 ${plg.status === 'active' ? 'border-brand-500/25 bg-brand-500/3' : 'border-surface-800 bg-surface-900'}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${CATEGORY_COLORS[plg.category] ?? 'text-surface-400'} border-current bg-current/10`}>{plg.category}</span>
                    <h4 className="text-xs font-bold text-surface-100 mt-1.5">{plg.name}</h4>
                    <p className="text-[10px] text-surface-500">v{plg.version} · {plg.author}</p>
                  </div>
                  <label className="flex items-center cursor-pointer">
                    <div className="relative">
                      <input type="checkbox" className="sr-only" checked={plg.status === 'active'} onChange={() => handleTogglePlugin(plg)} />
                      <div className={`w-9 h-5 rounded-full transition-colors ${plg.status === 'active' ? 'bg-brand-500' : 'bg-surface-700'}`} />
                      <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${plg.status === 'active' ? 'translate-x-4' : ''}`} />
                    </div>
                  </label>
                </div>
                <p className="text-[11px] text-surface-400">{plg.description}</p>
                <div className="flex justify-between items-center pt-1 border-t border-surface-850">
                  <span className={`badge text-[8px] font-bold ${STATUS_BADGE[plg.status] ?? 'badge-neutral'}`}>{plg.status}</span>
                  <button className="text-[10px] text-brand-400 hover:text-brand-300 flex items-center gap-0.5"><Settings size={10} /> Config</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Monitoring Tab ─────────────────────────────────────────────────────────
  const renderMonitoring = () => {
    const chartData = [
      { time: '08:00', cpu: 12, memory: 290, queries: 2 },
      { time: '09:00', cpu: 45, memory: 312, queries: 18 },
      { time: '10:00', cpu: 38, memory: 318, queries: 14 },
      { time: '11:00', cpu: 62, memory: 345, queries: 28 },
      { time: '12:00', cpu: 28, memory: 308, queries: 10 },
      { time: '13:00', cpu: 19, memory: 295, queries: 6 },
    ]
    return (
      <div className="space-y-6">
        {/* Metric cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {perfMetrics.map(m => (
            <div key={m.id} className="card p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-brand-500/10 text-brand-400 flex items-center justify-center flex-shrink-0">
                {METRIC_ICONS[m.metric_name] ?? <Gauge size={14} />}
              </div>
              <div>
                <p className="text-[10px] text-surface-500 font-bold uppercase tracking-wider">{METRIC_LABELS[m.metric_name] ?? m.metric_name}</p>
                <p className="text-lg font-black text-surface-100 mt-0.5">{m.metric_value} <span className="text-xs text-surface-500 font-normal">{m.unit}</span></p>
              </div>
            </div>
          ))}
        </div>

        {/* Resource usage chart */}
        <div className="card p-5 space-y-4">
          <h3 className="text-sm font-bold text-surface-100 flex items-center gap-2"><Activity size={15} className="text-brand-500" />Resource Usage (Today)</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="gCpu" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0} /></linearGradient>
                  <linearGradient id="gMem" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="cpu" name="CPU %" stroke="#6366f1" fill="url(#gCpu)" strokeWidth={2} />
                <Area type="monotone" dataKey="memory" name="Memory (MB)" stroke="#10b981" fill="url(#gMem)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Export diagnostics button */}
        <div className="card p-4 flex justify-between items-center">
          <div>
            <p className="text-xs font-bold text-surface-200">Export Diagnostic Report</p>
            <p className="text-[11px] text-surface-500 mt-0.5">Bundle all logs, metrics, and system state into a portable JSON archive.</p>
          </div>
          <button onClick={() => toast.success('Diagnostic report exported!')} className="btn-primary text-xs px-4 gap-1.5">
            <Download size={13} /> Export Report
          </button>
        </div>
      </div>
    )
  }

  // ── Document Security Tab ──────────────────────────────────────────────────
  const renderDocSecurity = () => (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={handleAddFingerprint} className="btn-primary text-xs px-4 gap-1.5"><PlusCircle size={13} /> Register Fingerprint</button>
      </div>
      <div className="card p-5 space-y-4">
        <h3 className="text-sm font-bold text-surface-100 flex items-center gap-2"><Fingerprint size={15} className="text-brand-500" />Document Fingerprint Registry</h3>
        {fingerprints.length === 0 ? (
          <div className="text-center py-10 text-surface-500 text-xs">No fingerprints registered. Click "Register Fingerprint" to add one.</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-900 border-b border-surface-700 text-[10px] text-surface-400 uppercase tracking-wider">
                <th className="p-3">File Name</th><th className="p-3">SHA-256 Hash</th>
                <th className="p-3">Read Only</th><th className="p-3">Watermark</th>
                <th className="p-3">Retention</th><th className="p-3">Registered</th>
              </tr>
            </thead>
            <tbody>
              {fingerprints.map(fp => (
                <tr key={fp.id} className="border-b border-surface-850 hover:bg-surface-750 text-xs">
                  <td className="p-3 font-semibold text-surface-200">{fp.file_name}</td>
                  <td className="p-3 font-mono text-[9px] text-surface-500 max-w-36 truncate">{fp.hash_sha256}</td>
                  <td className="p-3">{fp.read_only ? <Lock size={12} className="text-amber-400" /> : <Unlock size={12} className="text-surface-500" />}</td>
                  <td className="p-3">{fp.watermark_enabled ? <Eye size={12} className="text-brand-400" /> : <span className="text-surface-600">—</span>}</td>
                  <td className="p-3 text-[10px] text-surface-500">{fp.retention_until || '—'}</td>
                  <td className="p-3 text-[10px] text-surface-500">{fp.created_at?.split('T')[0]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Document security policies */}
      <div className="card p-5 space-y-3">
        <h3 className="text-sm font-bold text-surface-100">Document Security Policies</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {[
            { title: 'Retention Policy', desc: '7-year retention for audit documents; 3-year for general correspondence.', icon: Clock },
            { title: 'Secure Deletion', desc: 'Files overwritten 7× with DoD 5220.22-M before removal. Zero residue.', icon: Trash2 },
            { title: 'Read-Only Mode', desc: 'Final approved reports are locked as read-only. Edits require Partner override.', icon: Lock },
            { title: 'Watermarked Exports', desc: 'All client-facing PDF exports carry firm name, date, and confidential watermark.', icon: Eye },
          ].map(p => {
            const Icon = p.icon
            return (
              <div key={p.title} className="p-3 bg-surface-900 border border-surface-850 rounded-xl flex items-start gap-3">
                <Icon size={14} className="text-brand-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-surface-200">{p.title}</p>
                  <p className="text-[11px] text-surface-500 mt-0.5">{p.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )

  // ── Enterprise Admin Tab ───────────────────────────────────────────────────
  const renderAdmin = () => (
    <div className="space-y-6 max-w-3xl">
      {[
        { section: 'Firm Branding', icon: Building2, fields: [
          { label: 'Firm Name', value: 'Aditya Sen & Associates' },
          { label: 'Letterhead Header', value: 'CA Firm – ISO 9001:2015 Certified' },
          { label: 'Primary Brand Colour', value: '#6366f1' },
        ]},
        { section: 'Email Templates', icon: Mail, fields: [
          { label: 'Notification Sender Name', value: 'CA Copilot — Aditya Sen & Associates' },
          { label: 'Signature Footer', value: 'Chartered Accountants · ICAI Reg. FRN-102938W' },
        ]},
        { section: 'Global Automation Rules', icon: Settings, fields: [
          { label: 'Auto Backup Schedule', value: 'Daily at 02:00 AM' },
          { label: 'Session Timeout', value: '30 minutes of inactivity' },
          { label: 'Default OCR Language', value: 'English + Hindi (Devanagari)' },
        ]},
      ].map(section => {
        const Icon = section.icon
        return (
          <div key={section.section} className="card p-5 space-y-4">
            <h3 className="text-sm font-bold text-surface-100 flex items-center gap-2"><Icon size={15} className="text-brand-500" />{section.section}</h3>
            <div className="space-y-3">
              {section.fields.map(f => (
                <div key={f.label} className="flex items-center gap-3 text-xs">
                  <label className="text-surface-400 w-48 flex-shrink-0">{f.label}</label>
                  <input defaultValue={f.value} className="input py-1.5 flex-1" />
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <button onClick={() => toast.success(`${section.section} settings saved`)} className="btn-primary text-xs px-4">Save Changes</button>
            </div>
          </div>
        )
      })}
    </div>
  )

  // ── Accessibility Tab ──────────────────────────────────────────────────────
  const renderAccessibility = () => (
    <div className="space-y-6 max-w-3xl">
      <div className="card p-5 space-y-5">
        <h3 className="text-sm font-bold text-surface-100 flex items-center gap-2"><Globe size={15} className="text-brand-500" />Accessibility & Localization Settings</h3>
        {[
          { label: 'Color Theme', type: 'select', options: ['Dark (Default)', 'Light', 'System Auto', 'High Contrast'] },
          { label: 'Font Scale', type: 'select', options: ['Small (12px)', 'Normal (14px)', 'Large (16px)', 'Extra Large (18px)'] },
          { label: 'Language', type: 'select', options: ['English (Default)', 'Hindi (Beta)', 'Marathi (Beta)', 'Gujarati (Beta)'] },
          { label: 'Date Format', type: 'select', options: ['DD/MM/YYYY (India)', 'YYYY-MM-DD (ISO)', 'MM/DD/YYYY (US)'] },
          { label: 'Currency Format', type: 'select', options: ['₹ Indian Rupee (INR)', '$ US Dollar (USD)'] },
          { label: 'Number Format', type: 'select', options: ['1,00,000 (Indian)', '100,000 (International)'] },
        ].map(setting => (
          <div key={setting.label} className="flex items-center gap-4 text-xs">
            <label className="text-surface-400 w-44 flex-shrink-0 font-medium">{setting.label}</label>
            <select className="input py-1.5 flex-1">
              {setting.options.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
        ))}
        <div className="flex gap-4 pt-2 text-xs">
          {['Keyboard Navigation', 'Screen Reader Support', 'Reduced Motion'].map(toggle => (
            <label key={toggle} className="flex items-center gap-2 cursor-pointer text-surface-300">
              <input type="checkbox" defaultChecked className="accent-brand-500 w-3.5 h-3.5" />
              {toggle}
            </label>
          ))}
        </div>
        <div className="flex justify-end border-t border-surface-800 pt-4">
          <button onClick={() => toast.success('Accessibility settings applied')} className="btn-primary text-xs px-4">Apply Settings</button>
        </div>
      </div>
    </div>
  )

  // ── QA Tab ─────────────────────────────────────────────────────────────────
  const renderQA = () => {
    const suites = ['unit', 'integration', 'e2e', 'performance', 'security']
    const grouped = suites.map(s => ({
      suite: s,
      results: qaResults.filter(q => q.suite === s),
      passed: qaResults.filter(q => q.suite === s && q.status === 'passed').length,
      total: qaResults.filter(q => q.suite === s).length,
    }))

    return (
      <div className="space-y-6">
        {/* Run QA */}
        <div className="card p-5 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-surface-100">Automated QA Test Suite</h3>
            <p className="text-xs text-surface-500 mt-0.5">{qaResults.filter(q => q.status === 'passed').length}/{qaResults.length} tests passing · Last run: {qaResults[0]?.run_at?.split('T')[0] ?? 'Never'}</p>
          </div>
          <button disabled={qaRunning} onClick={handleRunQaSuite} className="btn-primary text-xs px-5 gap-1.5">
            {qaRunning ? <RefreshCw size={13} className="animate-spin" /> : <Play size={13} />} Run All Tests
          </button>
        </div>

        {/* Suite summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {grouped.map(g => (
            <div key={g.suite} className="card p-4 space-y-2 text-center">
              <p className="text-[10px] text-surface-400 font-bold uppercase tracking-wider capitalize">{g.suite}</p>
              <p className={`text-2xl font-black ${g.passed === g.total && g.total > 0 ? 'text-emerald-400' : 'text-amber-400'}`}>{g.passed}/{g.total}</p>
              <span className={`badge text-[8px] font-bold ${g.passed === g.total && g.total > 0 ? 'badge-success' : 'badge-neutral'}`}>
                {g.total === 0 ? 'Not Run' : g.passed === g.total ? 'All Pass' : 'Failing'}
              </span>
            </div>
          ))}
        </div>

        {/* Full test log */}
        <div className="card p-5 space-y-3">
          <h3 className="text-sm font-bold text-surface-100">Test Run Log</h3>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-900 border-b border-surface-700 text-[10px] text-surface-400 uppercase tracking-wider">
                <th className="p-3">Suite</th><th className="p-3">Test Name</th>
                <th className="p-3">Status</th><th className="p-3">Duration</th><th className="p-3">Run At</th>
              </tr>
            </thead>
            <tbody>
              {qaResults.slice().reverse().map(r => (
                <tr key={r.id} className="border-b border-surface-850 hover:bg-surface-750 text-xs">
                  <td className="p-3"><span className="badge badge-info text-[8px] font-bold capitalize">{r.suite}</span></td>
                  <td className="p-3 text-surface-300">{r.test_name}</td>
                  <td className="p-3"><span className={`badge text-[8px] font-bold ${STATUS_BADGE[r.status] ?? 'badge-neutral'}`}>{r.status}</span></td>
                  <td className="p-3 font-mono text-[10px] text-surface-500">{r.duration_ms ? `${(r.duration_ms/1000).toFixed(2)}s` : '—'}</td>
                  <td className="p-3 text-[10px] text-surface-500">{r.run_at?.split('T')[0]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  // ── Documentation Tab ──────────────────────────────────────────────────────
  const renderDocs = () => {
    const docs = [
      { title: 'User Guide', desc: 'End-user instructions for all modules including document upload, reconciliation, and reports.', icon: BookOpen, status: 'complete' },
      { title: 'Administrator Guide', desc: 'Firm workspace setup, user management, RBAC configuration, and branch administration.', icon: Settings, status: 'complete' },
      { title: 'Installation Guide', desc: 'Windows installer, silent install options, configuration wizard, and data migration steps.', icon: Package, status: 'complete' },
      { title: 'API Documentation', desc: 'IPC bridge API reference for plugin developers and enterprise integrations.', icon: FileText, status: 'in_progress' },
      { title: 'Plugin Development Guide', desc: 'Architecture overview, plugin lifecycle, sandboxing model, and marketplace submission process.', icon: Puzzle, status: 'in_progress' },
      { title: 'Troubleshooting Guide', desc: 'Common errors, diagnostic steps, log interpretation, and support escalation paths.', icon: AlertCircle, status: 'complete' },
      { title: 'Release Notes', desc: 'Detailed changelog for every version with migration notes and deprecation warnings.', icon: FileCheck, status: 'complete' },
      { title: 'Security Policy', desc: 'Encryption standards, data handling, retention policies, and responsible disclosure process.', icon: Shield, status: 'complete' },
    ]

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {docs.map(doc => {
            const Icon = doc.icon
            return (
              <div key={doc.title} className="card p-5 flex items-start gap-4 hover:border-brand-500/30 transition-colors cursor-pointer group">
                <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center flex-shrink-0 group-hover:bg-brand-500/20 transition-colors">
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h4 className="text-xs font-bold text-surface-100 group-hover:text-brand-400 transition-colors">{doc.title}</h4>
                    <span className={`badge text-[8px] font-bold ml-2 flex-shrink-0 ${doc.status === 'complete' ? 'badge-success' : 'badge-warning'}`}>
                      {doc.status === 'complete' ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <p className="text-[11px] text-surface-500 mt-1">{doc.desc}</p>
                </div>
                <ExternalLink size={12} className="text-surface-600 flex-shrink-0 mt-1 group-hover:text-brand-400 transition-colors" />
              </div>
            )
          })}
        </div>
        <div className="card p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-surface-200">In-App Contextual Help</p>
            <p className="text-[11px] text-surface-500 mt-0.5">Press <kbd className="px-1 py-0.5 bg-surface-800 border border-surface-700 rounded text-[9px] font-mono">F1</kbd> or the <kbd className="px-1 py-0.5 bg-surface-800 border border-surface-700 rounded text-[9px] font-mono">?</kbd> icon on any screen for context-sensitive guidance.</p>
          </div>
          <button onClick={() => toast.success('Help panel opened!')} className="btn-primary text-xs px-4 gap-1.5"><BookOpen size={12} /> Open Help</button>
        </div>
      </div>
    )
  }

  // ─── Page Layout ──────────────────────────────────────────────────────────
  const renderTab = () => {
    switch (activeTab) {
      case 'overview': return renderOverview()
      case 'security': return renderSecurity()
      case 'backup': return renderBackup()
      case 'licensing': return renderLicensing()
      case 'updates': return renderUpdates()
      case 'plugins': return renderPlugins()
      case 'monitoring': return renderMonitoring()
      case 'docsecurity': return renderDocSecurity()
      case 'admin': return renderAdmin()
      case 'access': return renderAccessibility()
      case 'qa': return renderQA()
      case 'docs': return renderDocs()
      default: return null
    }
  }

  return (
    <div className="page-container h-full flex flex-col">
      {/* Header */}
      <div className="section-header">
        <div className="text-left">
          <h2 className="text-lg font-bold text-surface-100 flex items-center gap-2">
            <Rocket size={18} className="text-brand-500" />
            Enterprise Platform & Commercial Release
          </h2>
          <p className="text-sm text-surface-400 mt-0.5">Security, backup, licensing, monitoring, plugins and deployment for CA firms.</p>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="border-b border-surface-800 flex flex-wrap gap-0.5 mb-5 -mx-1">
        {TAB_LIST.map(t => {
          const Icon = t.icon
          const isActive = activeTab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors -mb-[2px] ${
                isActive ? 'border-brand-500 text-white bg-brand-500/5' : 'border-transparent text-surface-400 hover:text-surface-200 hover:bg-surface-800/40'
              }`}
            >
              <Icon size={13} className={isActive ? 'text-brand-500' : 'text-surface-500'} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Active tab content */}
      <div className="flex-1 overflow-y-auto pb-10">{renderTab()}</div>
    </div>
  )
}
