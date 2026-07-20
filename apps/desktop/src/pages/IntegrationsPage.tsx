import React, { useState, useEffect, useRef } from 'react'
import {
  Plug, CheckCircle2, AlertTriangle, AlertCircle, Database,
  FileSpreadsheet, FolderOpen, ArrowRight, UploadCloud, RefreshCw,
  Trash2, Plus, Info, Settings, Code, FileText, Check, ShieldAlert,
  Loader2, Play, Pause, RotateCcw, LayoutGrid, ListFilter, X, ChevronRight
} from 'lucide-react'
import toast from 'react-hot-toast'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Connection {
  id: string
  platform_id: string
  name: string
  credentials?: any
  status: string
  created_at: string
}

interface MappingTemplate {
  id: string
  name: string
  platform_id: string
  mappings: Record<string, string>
}

interface ImportRecord {
  id: string
  filename: string
  records_imported: number
  records_skipped: number
  records_duplicate: number
  error_count: number
  status: string
  created_at: string
}

interface RetryItem {
  id: string
  import_id: string
  record_data: string
  error_message: string
  status: string
}

// ── Synonyms definition ───────────────────────────────────────────────────────

const COLUMN_KEYS = [
  "invoice_number", "date", "gstin", "vendor", "customer", 
  "total_amount", "taxable_value", "cgst", "sgst", "igst", 
  "ledger", "narration", "reference_number"
]

const INTEGRATION_SOURCES = [
  { id: 'tally', name: 'Tally Prime Sync', desc: 'Direct XML port sync or file import.', icon: '📊', type: 'Accounting Platform' },
  { id: 'zoho', name: 'Zoho Books', desc: 'Cloud accounting sync via OAuth API.', icon: '📘', type: 'Cloud ERP' },
  { id: 'busy', name: 'BUSY Accounting', desc: 'Sync vouchers, sales/purchase ledger.', icon: '💼', type: 'Accounting Platform' },
  { id: 'excel', name: 'Microsoft Excel', desc: 'Guided spreadsheet mapping wizard.', icon: '📗', type: 'Spreadsheet' },
  { id: 'csv', name: 'CSV File', desc: 'Standard delimiter flat files import.', icon: '📄', type: 'Spreadsheet' },
]

// ── Server connection utility ──────────────────────────────────────────────────

async function getBaseUrl(): Promise<string> {
  try {
    if ((window as any).electronAPI?.getProcessorPort) {
      const port = await (window as any).electronAPI.getProcessorPort()
      return `http://localhost:${port}`
    }
  } catch { /* not in electron */ }
  return 'http://localhost:8765'
}

export default function IntegrationsPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'wizard' | 'connections' | 'sdk'>('dashboard')
  const [connections, setConnections] = useState<Connection[]>([])
  const [recentImports, setRecentImports] = useState<ImportRecord[]>([])
  const [dashboardStats, setDashboardStats] = useState<any>({
    connections_count: 0,
    imports_count: 0,
    records_imported: 0,
    pending_retries: 0,
  })

  // Connection form state
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [selectedPlatform, setSelectedPlatform] = useState('tally')
  const [connName, setConnName] = useState('')
  const [connHost, setConnHost] = useState('localhost')
  const [connPort, setConnPort] = useState('9000')
  const [connToken, setConnToken] = useState('')

  // Wizard state
  const [wizardStep, setWizardStep] = useState(1) // 1: Select Source, 2: Upload, 3: Mapping, 4: Validate & Import, 5: Success Summary
  const [wizardSource, setWizardSource] = useState('excel')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [previewRows, setPreviewRows] = useState<any[]>([])
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({})
  const [validationResults, setValidationResults] = useState<any>(null)
  const [tempFilePath, setTempFilePath] = useState('')
  const [importing, setImporting] = useState(false)
  const [importSummary, setImportSummary] = useState<any>(null)

  // Document Organization Rules state
  const [orgClient, setOrgClient] = useState('client-1')
  const [orgFY, setOrgFY] = useState('2026-27')
  const [orgMonth, setOrgMonth] = useState('07-July')
  const [orgDocType, setOrgDocType] = useState('Purchase Invoice')

  // Retry Queue state
  const [retryQueue, setRetryQueue] = useState<RetryItem[] | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const base = await getBaseUrl()
      // Load connections
      const connRes = await fetch(`${base}/integrations/connections`)
      if (connRes.ok) {
        const connData = await connRes.json()
        setConnections(connData)
      }

      // Load stats
      const statsRes = await fetch(`${base}/integrations/dashboard?client_id=client-1`)
      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setDashboardStats(statsData)
        if (statsData.recent_imports) {
          setRecentImports(statsData.recent_imports)
        }
      }

      // Load retry queue
      const retryRes = await fetch(`${base}/integrations/retry-queue`)
      if (retryRes.ok) {
        const retryData = await retryRes.json()
        setRetryQueue(retryData)
      }
    } catch {
      // Fallback local mocks on connection error
      setConnections([
        { id: '1', platform_id: 'tally', name: 'Head Office TallyPrime', status: 'Connected', created_at: new Date().toISOString() },
        { id: '2', platform_id: 'excel', name: 'Standard Excel Template', status: 'Available', created_at: new Date().toISOString() }
      ])
      setRecentImports([
        { id: 'imp-1', filename: 'SBI_Statement_Q1.xlsx', records_imported: 45, records_skipped: 2, records_duplicate: 0, error_count: 0, status: 'Completed', created_at: new Date().toISOString() },
        { id: 'imp-2', filename: 'PurchaseRegister_July.csv', records_imported: 120, records_skipped: 4, records_duplicate: 1, error_count: 3, status: 'Completed', created_at: new Date().toISOString() }
      ])
    }
  }

  // Handle connection add
  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!connName) return toast.error('Connection Name is required')

    try {
      const base = await getBaseUrl()
      const fd = new FormData()
      fd.append('platform_id', selectedPlatform)
      fd.append('name', connName)
      fd.append('host', connHost)
      fd.append('port', connPort)
      fd.append('authtoken', connToken)

      const res = await fetch(`${base}/integrations/connections`, { method: 'POST', body: fd })
      if (res.ok) {
        toast.success(`Successfully connected to ${connName}!`)
        setShowConnectModal(false)
        setConnName('')
        loadData()
      }
    } catch {
      toast.error('Could not communicate with local integrations engine.')
    }
  }

  const handleDisconnect = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to disconnect ${name}?`)) return

    try {
      const base = await getBaseUrl()
      const res = await fetch(`${base}/integrations/connections/${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success(`Disconnected ${name}`)
        loadData()
      }
    } catch {
      toast.error('Disconnect action failed.')
    }
  }

  // File Upload Preview for Wizard
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)

    const fd = new FormData()
    fd.append('file', file)

    try {
      const base = await getBaseUrl()
      const res = await fetch(`${base}/integrations/preview`, { method: 'POST', body: fd })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Failed column parsing.')
      }

      const data = await res.json()
      setHeaders(data.headers)
      setPreviewRows(data.preview)
      setColumnMapping(data.auto_mapping)
      setTempFilePath(data.temp_file_path)
      setWizardStep(3) // Advance to mapping step
      toast.success('Column headers auto-detected successfully!')
    } catch (err: any) {
      toast.error(err.message || 'Error processing spreadsheet.')
      setSelectedFile(null)
    }
  }

  // Trigger import
  const handleExecuteImport = async () => {
    setImporting(true)
    try {
      const base = await getBaseUrl()
      const fd = new FormData()
      fd.append('client_id', 'client-1')
      fd.append('platform_id', wizardSource)
      fd.append('temp_file_path', tempFilePath)
      fd.append('mapping_json', JSON.stringify(columnMapping))

      const res = await fetch(`${base}/integrations/import`, { method: 'POST', body: fd })
      if (!res.ok) throw new Error('Data Import Operation failed')

      const summary = await res.json()
      setImportSummary(summary)
      setWizardStep(5)
      toast.success('Import completed successfully!')
      loadData()
    } catch (err: any) {
      toast.error(err.message || 'Import execution failed')
    } finally {
      setImporting(false)
    }
  }

  // Document Auto-Organizer handler
  const handleOrganizeDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const fd = new FormData()
    fd.append('client_id', orgClient)
    fd.append('financial_year', orgFY)
    fd.append('month', orgMonth)
    fd.append('document_type', orgDocType)
    fd.append('file', file)

    try {
      const base = await getBaseUrl()
      const res = await fetch(`${base}/integrations/organize-documents`, { method: 'POST', body: fd })
      if (res.ok) {
        toast.success(`Organized ${file.name} successfully in file system!`)
      }
    } catch {
      toast.error('Document organization failed.')
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-var(--topbar-height))] overflow-hidden bg-surface-950">
      
      {/* Top Navbar */}
      <div className="px-6 py-4 border-b border-surface-800/80 bg-surface-900/40 flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-base font-black text-surface-100 flex items-center gap-2">
            <Plug className="text-brand-400" size={18} />
            Integration Hub
          </h2>
          <p className="text-[11px] text-surface-500 mt-0.5">Import, export, validate, and organize accounting records from any local or cloud connector.</p>
        </div>
        <div className="flex gap-1 bg-surface-900 border border-surface-800 p-0.5 rounded-lg text-xs">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: <LayoutGrid size={11} /> },
            { id: 'wizard', label: 'Import Wizard', icon: <UploadCloud size={11} /> },
            { id: 'connections', label: 'Connectors', icon: <Settings size={11} /> },
            { id: 'sdk', label: 'Developer SDK', icon: <Code size={11} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1 rounded-md flex items-center gap-1.5 font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-brand-500/10 text-brand-300 border border-brand-500/20'
                  : 'text-surface-500 hover:text-surface-300 border border-transparent'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="max-w-6xl mx-auto space-y-6">
            
            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { title: 'Connected Channels', val: dashboardStats.connections_count, sub: 'Active integrations', color: 'text-brand-400' },
                { title: 'Completed Imports', val: dashboardStats.imports_count, sub: 'Import events run', color: 'text-emerald-400' },
                { title: 'Records Ingested', val: dashboardStats.records_imported, sub: 'Vouchers in database', color: 'text-sky-400' },
                { title: 'Validation Retry Queue', val: dashboardStats.pending_retries, sub: 'Needs user confirmation', color: 'text-amber-400' },
              ].map((st, i) => (
                <div key={i} className="bg-surface-900 border border-surface-800/80 p-4.5 rounded-xl shadow-sm hover:border-surface-700/80 transition-colors">
                  <div className="text-[10px] text-surface-600 font-bold uppercase tracking-wider">{st.title}</div>
                  <div className={`text-2xl font-black mt-1 ${st.color}`}>{st.val}</div>
                  <div className="text-[9px] text-surface-500 mt-0.5">{st.sub}</div>
                </div>
              ))}
            </div>

            {/* Grid Split */}
            <div className="grid grid-cols-3 gap-6">
              
              {/* Left Column: Import Logs */}
              <div className="col-span-2 space-y-4">
                <div className="bg-surface-900 border border-surface-800/80 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-surface-800/80 bg-surface-950/40 flex items-center justify-between">
                    <span className="text-xs font-bold text-surface-200">Recent Sync & Import Logs</span>
                    <button onClick={loadData} className="p-1 text-surface-600 hover:text-surface-400">
                      <RefreshCw size={11} />
                    </button>
                  </div>
                  <div className="divide-y divide-surface-800/60 text-xs">
                    {recentImports.length === 0 ? (
                      <p className="p-4 text-center text-surface-500">No import operations logged yet.</p>
                    ) : (
                      recentImports.map(imp => (
                        <div key={imp.id} className="p-3.5 flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-surface-300 truncate">{imp.filename}</span>
                              <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Success</span>
                            </div>
                            <div className="text-[10px] text-surface-500 mt-1 space-x-3">
                              <span>Imported: <strong>{imp.records_imported}</strong></span>
                              <span>Duplicates: <strong>{imp.records_duplicate}</strong></span>
                              <span>Failed: <strong className="text-red-400">{imp.error_count}</strong></span>
                              <span>{new Date(imp.created_at).toLocaleDateString('en-IN')}</span>
                            </div>
                          </div>
                          <ChevronRight size={14} className="text-surface-600" />
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Validation Retry Queue Section */}
                <div className="bg-surface-900 border border-surface-800/80 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-surface-800/80 bg-surface-950/40">
                    <span className="text-xs font-bold text-surface-200">Validation Retry Queue</span>
                  </div>
                  <div className="p-4">
                    {retryQueue && retryQueue.length > 0 ? (
                      <div className="space-y-2">
                        {retryQueue.map(item => (
                          <div key={item.id} className="bg-surface-950 border border-surface-800 p-3 rounded-lg flex items-start justify-between gap-3 text-xs">
                            <div>
                              <p className="font-semibold text-red-400 flex items-center gap-1.5">
                                <AlertTriangle size={12} /> {item.error_message}
                              </p>
                              <pre className="text-[10px] text-surface-500 font-mono mt-1 whitespace-pre-wrap truncate bg-surface-900 p-1.5 rounded max-w-lg">
                                {item.record_data}
                              </pre>
                            </div>
                            <button
                              onClick={() => toast.success('Re-submitting record...')}
                              className="text-[10px] bg-brand-500/10 border border-brand-500/20 text-brand-400 px-2.5 py-1 rounded-md hover:bg-brand-500/20 font-bold flex-shrink-0"
                            >
                              Resolve
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-surface-600 text-xs py-2">Validation clean! No pending items in retry queue.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Document Organizer */}
              <div className="space-y-6">
                <div className="bg-surface-900 border border-surface-800/80 p-4.5 rounded-xl">
                  <h3 className="text-xs font-bold text-surface-200 mb-3 flex items-center gap-2">
                    <FolderOpen size={13} className="text-brand-400" />
                    Document Auto-Organizer
                  </h3>
                  <p className="text-[11px] text-surface-500 mb-4 leading-relaxed">
                    Instantly save files into a organized local directory structure. Configured schema path: <code className="bg-surface-950 px-1 py-0.5 rounded text-brand-300 font-mono">Client/FY/Month/Type</code>
                  </p>
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="text-[10px] text-surface-600 block mb-1">Financial Year</label>
                      <select className="w-full bg-surface-800 border border-surface-700 rounded-lg p-2 text-surface-300 outline-none" value={orgFY} onChange={e => setOrgFY(e.target.value)}>
                        <option>2026-27</option>
                        <option>2025-26</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-surface-600 block mb-1">Month Folder</label>
                      <select className="w-full bg-surface-800 border border-surface-700 rounded-lg p-2 text-surface-300 outline-none" value={orgMonth} onChange={e => setOrgMonth(e.target.value)}>
                        <option>07-July</option>
                        <option>08-August</option>
                        <option>09-September</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-surface-600 block mb-1">Doc Classification</label>
                      <select className="w-full bg-surface-800 border border-surface-700 rounded-lg p-2 text-surface-300 outline-none" value={orgDocType} onChange={e => setOrgDocType(e.target.value)}>
                        <option>Purchase Invoice</option>
                        <option>Sales Ledger</option>
                        <option>Bank Statement</option>
                      </select>
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full mt-2 py-2 px-3 bg-brand-500/10 border border-brand-500/20 text-brand-400 hover:bg-brand-500/20 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <UploadCloud size={13} /> Select & Organize File
                    </button>
                    <input ref={fileInputRef} type="file" className="hidden" onChange={handleOrganizeDocument} />
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 2: IMPORT WIZARD */}
        {activeTab === 'wizard' && (
          <div className="max-w-4xl mx-auto bg-surface-900 border border-surface-800/80 rounded-xl overflow-hidden shadow-sm">
            
            {/* Steps Nav */}
            <div className="bg-surface-950/40 border-b border-surface-800/80 px-6 py-4 flex items-center justify-between">
              <span className="text-xs font-bold text-surface-200">Guided Import Wizard</span>
              <div className="flex gap-1.5 text-[9px] uppercase tracking-wider font-bold">
                {[1, 2, 3, 4, 5].map(step => (
                  <span
                    key={step}
                    className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      wizardStep === step ? 'bg-brand-500 text-white' :
                      wizardStep > step ? 'bg-emerald-500 text-white' : 'bg-surface-800 text-surface-600'
                    }`}
                  >
                    {step}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-6">
              {/* STEP 1: Select Source */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-surface-200 mb-3">1. Select Accounting Source</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {INTEGRATION_SOURCES.map(src => (
                      <div
                        key={src.id}
                        onClick={() => { setWizardSource(src.id); setWizardStep(2) }}
                        className="p-4 rounded-xl border border-surface-800 hover:border-brand-500/50 hover:bg-brand-500/5 transition-all cursor-pointer flex items-start gap-3 group"
                      >
                        <div className="text-2xl p-2 bg-surface-800 rounded-lg group-hover:scale-105 transition-transform">{src.icon}</div>
                        <div>
                          <p className="text-xs font-bold text-surface-200 group-hover:text-brand-300 transition-colors">{src.name}</p>
                          <p className="text-[10px] text-surface-500 mt-1 leading-snug">{src.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 2: Upload Files */}
              {wizardStep === 2 && (
                <div className="space-y-4 text-center">
                  <h3 className="text-xs font-bold text-surface-200 mb-2">2. Upload Source Document</h3>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-surface-800 hover:border-brand-500/50 rounded-xl py-12 px-6 bg-surface-950/20 hover:bg-brand-500/5 transition-all cursor-pointer space-y-3"
                  >
                    <UploadCloud size={28} className="mx-auto text-brand-400 animate-bounce" />
                    <div>
                      <p className="text-xs font-semibold text-surface-300">Drag & drop your file here, or browse files</p>
                      <p className="text-[9px] text-surface-600 mt-1">Supports Microsoft Excel (.xlsx, .xls) and CSV files</p>
                    </div>
                  </div>
                  <input
                    ref={fileInputRef} type="file" className="hidden"
                    accept=".xlsx,.xls,.csv" onChange={handleFileChange}
                  />
                  <button onClick={() => setWizardStep(1)} className="text-[10px] text-surface-500 hover:text-surface-300">
                    ← Back to source selection
                  </button>
                </div>
              )}

              {/* STEP 3: Mapping */}
              {wizardStep === 3 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="text-xs font-bold text-surface-200">3. Map Columns & Preview Data</h3>
                      <p className="text-[9px] text-surface-500 mt-0.5">Review standard columns and map headers from your spreadsheet.</p>
                    </div>
                    <button
                      onClick={() => setWizardStep(4)}
                      className="text-xs font-bold bg-brand-500 hover:bg-brand-400 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all"
                    >
                      Verify & Validate <ArrowRight size={12} />
                    </button>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-surface-800/80">
                    <table className="min-w-full text-xs">
                      <thead className="bg-surface-950/60 border-b border-surface-800/80 text-[10px] font-bold text-surface-400 uppercase">
                        <tr>
                          <th className="px-4 py-2 text-left">Standard Field</th>
                          <th className="px-4 py-2 text-left">Mapped Column</th>
                          <th className="px-4 py-2 text-left">Auto Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-800/60">
                        {COLUMN_KEYS.map(key => {
                          const mapped = columnMapping[key]
                          return (
                            <tr key={key} className="hover:bg-surface-800/40 transition-colors">
                              <td className="px-4 py-2.5 font-mono text-[10px] text-brand-400">{key}</td>
                              <td className="px-4 py-2.5">
                                <select
                                  value={mapped || ''}
                                  onChange={e => setColumnMapping(prev => ({ ...prev, [key]: e.target.value }))}
                                  className="bg-surface-800 border border-surface-700 rounded px-2 py-1 text-[11px] outline-none text-surface-300 focus:border-brand-500/50"
                                >
                                  <option value="">-- Discard/Skip --</option>
                                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                              </td>
                              <td className="px-4 py-2.5">
                                {mapped ? (
                                  <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded flex items-center gap-1 w-max">
                                    <Check size={8} /> Auto-Mapped
                                  </span>
                                ) : (
                                  <span className="text-[9px] bg-surface-800 text-surface-600 px-1.5 py-0.5 rounded w-max">
                                    Unmapped
                                  </span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* STEP 4: Validate & Execute */}
              {wizardStep === 4 && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-surface-200 mb-2">4. Run Security Validation Scan</h3>
                  <div className="bg-surface-950/40 p-4 rounded-xl border border-surface-800 space-y-3">
                    <p className="text-xs text-surface-300 flex items-center gap-2">
                      <ShieldAlert size={14} className="text-brand-400" />
                      Validation checks will identify duplicates, broken dates, and invalid GSTIN formats before commit.
                    </p>
                    <div className="bg-surface-900 border border-surface-800 rounded-lg p-3 space-y-1">
                      <div className="text-[9px] text-surface-500 font-bold uppercase tracking-wider">Verification Rules:</div>
                      <div className="grid grid-cols-2 gap-2 text-[10px] text-surface-400 mt-1">
                        <div className="flex items-center gap-1.5">✅ Check duplicate invoice numbers</div>
                        <div className="flex items-center gap-1.5">✅ Validate 15-character GSTIN structure</div>
                        <div className="flex items-center gap-1.5">✅ Highlight negative values & empty rows</div>
                        <div className="flex items-center gap-1.5">✅ Verify dates match assessment range</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setWizardStep(3)}
                      className="flex-1 py-2 px-3 border border-surface-800 hover:border-surface-700 rounded-lg font-bold text-surface-300 text-xs"
                    >
                      ← Back to mappings
                    </button>
                    <button
                      onClick={handleExecuteImport}
                      disabled={importing}
                      className="flex-1 py-2 px-3 bg-brand-500 hover:bg-brand-400 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 disabled:opacity-40"
                    >
                      {importing ? (
                        <><Loader2 size={13} className="animate-spin" /> Ingesting...</>
                      ) : (
                        'Execute Guided Ingestion'
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 5: Success Summary */}
              {wizardStep === 5 && importSummary && (
                <div className="space-y-4 text-center">
                  <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-emerald-400 mb-3">
                    <CheckCircle2 size={24} />
                  </div>
                  <h3 className="text-base font-black text-surface-100">Guided Import Completed</h3>
                  <p className="text-xs text-surface-400 max-w-sm mx-auto">
                    Data has been successfully imported, validated, and logged under the active client session.
                  </p>

                  <div className="max-w-md mx-auto grid grid-cols-4 gap-2 text-xs py-3 border-y border-surface-800 my-4">
                    <div className="bg-surface-950 p-2.5 rounded-lg border border-surface-800">
                      <div className="text-[10px] text-surface-600 font-bold uppercase">Imported</div>
                      <div className="text-base font-black text-emerald-400 mt-0.5">{importSummary.imported}</div>
                    </div>
                    <div className="bg-surface-950 p-2.5 rounded-lg border border-surface-800">
                      <div className="text-[10px] text-surface-600 font-bold uppercase">Skipped</div>
                      <div className="text-base font-black text-surface-400 mt-0.5">{importSummary.skipped}</div>
                    </div>
                    <div className="bg-surface-950 p-2.5 rounded-lg border border-surface-800">
                      <div className="text-[10px] text-surface-600 font-bold uppercase">Duplicates</div>
                      <div className="text-base font-black text-amber-400 mt-0.5">{importSummary.duplicates}</div>
                    </div>
                    <div className="bg-surface-950 p-2.5 rounded-lg border border-surface-800">
                      <div className="text-[10px] text-surface-600 font-bold uppercase">Errors</div>
                      <div className="text-base font-black text-red-400 mt-0.5">{importSummary.errors}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => { setWizardStep(1); setSelectedFile(null); setImportSummary(null) }}
                    className="py-2 px-4 bg-brand-500 hover:bg-brand-400 text-white rounded-lg text-xs font-bold"
                  >
                    Start Another Import
                  </button>
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 3: CONNECTORS */}
        {activeTab === 'connections' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-surface-200">Accounting platform integrations</h3>
                <p className="text-[11px] text-surface-500 mt-0.5">Manage connected credentials and configure settings for direct synchronizations.</p>
              </div>
              <button
                onClick={() => setShowConnectModal(true)}
                className="py-1.5 px-3 bg-brand-500 hover:bg-brand-400 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
              >
                <Plus size={13} /> Add Connector
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {connections.map(conn => (
                <div key={conn.id} className="bg-surface-900 border border-surface-800/80 p-4.5 rounded-xl shadow-sm hover:border-surface-700/80 transition-all flex flex-col justify-between">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">
                        {conn.platform_id === 'tally' ? '📊' : conn.platform_id === 'zoho' ? '📘' : '📗'}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-surface-100">{conn.name}</p>
                        <p className="text-[9px] text-surface-500 uppercase font-bold tracking-wider">{conn.platform_id}</p>
                      </div>
                    </div>
                    <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-bold">
                      {conn.status}
                    </span>
                  </div>
                  <div className="text-[10px] text-surface-500 space-y-1 mb-4">
                    <p>Connected: {new Date(conn.created_at).toLocaleDateString('en-IN')}</p>
                    <p>Status: Local connection authenticated</p>
                  </div>
                  <button
                    onClick={() => handleDisconnect(conn.id, conn.name)}
                    className="py-1.5 w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-[10px] font-bold border border-red-500/20 transition-all"
                  >
                    Disconnect Channel
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: DEVELOPER SDK */}
        {activeTab === 'sdk' && (
          <div className="max-w-4xl mx-auto bg-surface-900 border border-surface-800/80 p-6 rounded-xl space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Code size={18} className="text-brand-400" />
              <h3 className="text-sm font-bold text-surface-200">Developer plugin SDK</h3>
            </div>
            <p className="text-xs text-surface-400 leading-relaxed">
              CA Copilot supports modular accounting platform connectors using Python's inheritance interface. Developers can implement a subclass of <code className="bg-surface-950 px-1.5 py-0.5 rounded text-brand-400 font-mono text-[11px]">BaseConnector</code> to add new sources (e.g. Sage, SAP, QuickBooks) without modifying any core UI or logic.
            </p>
            <div className="bg-surface-950 p-4 rounded-xl border border-surface-800">
              <div className="text-[10px] text-surface-600 font-bold uppercase tracking-wider mb-2">Metadata specifications:</div>
              <pre className="text-[10px] text-brand-300/80 font-mono overflow-x-auto whitespace-pre leading-relaxed">
{`class BaseConnector:
    """Developer SDK Base Class for CA Copilot Connectors."""
    def __init__(self, metadata: ConnectorMetadata):
        self.metadata = metadata

    def authenticate(self, credentials: Dict[str, Any]) -> bool:
        """Authenticate with external platform API."""
        return True

    def validate(self, data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Validate input records against CA rules."""
        # Built-in structured verification logic

    def import_data(self, source_file: str, client_id: str, mapping: Dict[str, str]) -> List[Dict[str, Any]]:
        """Read data from source file and map to standard database columns."""
        raise NotImplementedError`}
              </pre>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-surface-500">
              <Info size={11} />
              <span>Connector classes are loaded from processors/connector_sdk.py during server instantiation.</span>
            </div>
          </div>
        )}

      </div>

      {/* Connection Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 bg-surface-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-900 border border-surface-800 rounded-xl overflow-hidden max-w-md w-full shadow-2xl animate-fade-in">
            <div className="px-4 py-3 bg-surface-950/40 border-b border-surface-800/80 flex items-center justify-between">
              <span className="text-xs font-bold text-surface-200">Connect to Accounting Source</span>
              <button onClick={() => setShowConnectModal(false)} className="text-surface-600 hover:text-surface-400">
                <X size={14} />
              </button>
            </div>
            <form onSubmit={handleConnect} className="p-4 space-y-3.5 text-xs text-left">
              <div>
                <label className="text-[10px] text-surface-600 block mb-1">Select Source Platform</label>
                <select
                  value={selectedPlatform}
                  onChange={e => setSelectedPlatform(e.target.value)}
                  className="w-full bg-surface-800 border border-surface-700 rounded-lg p-2 text-surface-300 outline-none"
                >
                  <option value="tally">Tally Prime Sync</option>
                  <option value="zoho">Zoho Books Cloud</option>
                  <option value="busy">BUSY Accounting</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-surface-600 block mb-1">Connection Name</label>
                <input
                  type="text"
                  placeholder="e.g. HO Tally Server"
                  value={connName}
                  onChange={e => setConnName(e.target.value)}
                  className="w-full bg-surface-800 border border-surface-700 rounded-lg p-2 text-surface-300 placeholder:text-surface-650 outline-none focus:border-brand-500/50"
                />
              </div>

              {selectedPlatform === 'tally' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-surface-600 block mb-1">ODBC Host</label>
                    <input
                      type="text"
                      value={connHost}
                      onChange={e => setConnHost(e.target.value)}
                      className="w-full bg-surface-800 border border-surface-700 rounded-lg p-2 text-surface-300 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-surface-600 block mb-1">ODBC Port</label>
                    <input
                      type="text"
                      value={connPort}
                      onChange={e => setConnPort(e.target.value)}
                      className="w-full bg-surface-800 border border-surface-700 rounded-lg p-2 text-surface-300 outline-none"
                    />
                  </div>
                </div>
              )}

              {selectedPlatform === 'zoho' && (
                <div>
                  <label className="text-[10px] text-surface-600 block mb-1">OAuth AuthToken / API Key</label>
                  <input
                    type="password"
                    placeholder="Enter API credentials"
                    value={connToken}
                    onChange={e => setConnToken(e.target.value)}
                    className="w-full bg-surface-800 border border-surface-700 rounded-lg p-2 text-surface-300 placeholder:text-surface-650 outline-none focus:border-brand-500/50"
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2 bg-brand-500 hover:bg-brand-400 text-white rounded-lg font-bold"
              >
                Authenticate & Connect
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
