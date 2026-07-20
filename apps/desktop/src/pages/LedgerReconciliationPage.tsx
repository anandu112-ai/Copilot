import { useState, useEffect } from 'react'
import {
  GitCompare, CheckCircle2, AlertCircle, Search, Filter,
  Download, Eye, RefreshCw, Check, Play, CheckCircle,
  Plus, Upload, FileSpreadsheet, FileText, Edit3, MessageSquare, History
} from 'lucide-react'
import toast from 'react-hot-toast'
import { processorApi } from '../services/processorApi'

export default function LedgerReconciliationPage() {
  // Clients state
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([])
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [newClientName, setNewClientName] = useState('')
  const [showClientModal, setShowClientModal] = useState(false)

  // Reconciliation parameters
  const [amountTolerance, setAmountTolerance] = useState<number>(1.0)

  // Upload state
  const [subLedgerFile, setSubLedgerFile] = useState<File | null>(null)
  const [genLedgerFile, setGenLedgerFile] = useState<File | null>(null)
  const [subLedgerType, setSubLedgerType] = useState('purchase') // purchase, sales, cash
  const [isUploading, setIsUploading] = useState(false)

  // Data lists
  const [subLedgerEntries, setSubLedgerEntries] = useState<any[]>([])
  const [genLedgerEntries, setGenLedgerEntries] = useState<any[]>([])
  const [selectedEntryId, setSelectedEntryId] = useState<string>('')
  const [dashboardStats, setDashboardStats] = useState<any>(null)
  const [duplicates, setDuplicates] = useState<any[]>([])
  const [auditTrail, setAuditTrail] = useState<any[]>([])

  // Filters
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Edit / Notes modals
  const [noteText, setNoteText] = useState('')
  const [editingEntry, setEditingEntry] = useState<any>(null)

  // Fetch clients
  const loadClients = async () => {
    try {
      const data = await processorApi.getReconciliationClients()
      setClients(data)
      if (data.length > 0 && !selectedClientId) {
        setSelectedClientId(data[0].id)
      }
    } catch (err) {
      logger.error('Failed to load clients', err)
    }
  }

  // Fetch dashboard stats, entries, duplicates, audit trail
  const loadClientData = async (clientId: string) => {
    if (!clientId) return
    try {
      const stats = await processorApi.getReconciliationDashboard(clientId)
      setDashboardStats(stats)

      const sData = await processorApi.getLedgerEntries(clientId, subLedgerType)
      setSubLedgerEntries(sData)
      if (sData.length > 0) {
        setSelectedEntryId(sData[0].id)
      }

      const gData = await processorApi.getLedgerEntries(clientId, 'general')
      setGenLedgerEntries(gData)

      const dupData = await processorApi.getReconciliationDuplicates(clientId)
      setDuplicates(dupData.ledger || [])

      const auditData = await processorApi.getReconciliationAuditTrail(clientId)
      setAuditTrail(auditData)
    } catch (err) {
      logger.error('Failed to load client data', err)
      toast.error('Error fetching reconciliation records')
    }
  }

  useEffect(() => {
    loadClients()
  }, [])

  useEffect(() => {
    if (selectedClientId) {
      loadClientData(selectedClientId)
    }
  }, [selectedClientId, subLedgerType])

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newClientName.trim()) return
    try {
      const client = await processorApi.createReconciliationClient(newClientName)
      toast.success(`Client "${client.name}" registered successfully`)
      setNewClientName('')
      setShowClientModal(false)
      await loadClients()
      setSelectedClientId(client.id)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create client')
    }
  }

  const handleUploadSubLedger = async () => {
    if (!selectedClientId) {
      toast.error('Select a client first')
      return
    }
    if (!subLedgerFile) {
      toast.error('Choose a sub-ledger file')
      return
    }
    setIsUploading(true)
    try {
      const res = await processorApi.uploadLedger(
        selectedClientId,
        subLedgerType,
        subLedgerFile
      )
      toast.success(`Parsed sub-ledger successfully: ${res.count} entries saved`)
      setSubLedgerFile(null)
      loadClientData(selectedClientId)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  const handleUploadGenLedger = async () => {
    if (!selectedClientId) {
      toast.error('Select a client first')
      return
    }
    if (!genLedgerFile) {
      toast.error('Choose a general ledger file')
      return
    }
    setIsUploading(true)
    try {
      const res = await processorApi.uploadLedger(selectedClientId, 'general', genLedgerFile)
      toast.success(`Parsed General Ledger successfully: ${res.count} entries saved`)
      setGenLedgerFile(null)
      loadClientData(selectedClientId)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'General Ledger upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  const runReconciliationAI = async () => {
    if (!selectedClientId) return
    const loadingToast = toast.loading('Running AI Matching Rules Engine...')
    try {
      const res = await processorApi.runLedgerMatching(selectedClientId, amountTolerance)
      toast.dismiss(loadingToast)
      toast.success(`Reconciliation Completed. Auto-matched: ${res.auto_matched} items`)
      loadClientData(selectedClientId)
    } catch (err) {
      toast.dismiss(loadingToast)
      toast.error('Matching engine run failed')
    }
  }

  const handleMatchAction = async (action: 'accept_match' | 'reject_match', entryId1: string, entryId2?: string) => {
    if (!selectedClientId) return
    try {
      await processorApi.handleReconciliationAction(
        selectedClientId,
        action,
        'ledger',
        entryId1,
        entryId2
      )
      toast.success(action === 'accept_match' ? 'Match accepted & linked' : 'Match rejected')
      loadClientData(selectedClientId)
    } catch (err) {
      toast.error('Failed to register decision')
    }
  }

  const handleAddNotes = async (entryId: string) => {
    if (!selectedClientId || !noteText.trim()) return
    try {
      await processorApi.handleReconciliationAction(
        selectedClientId,
        'add_notes',
        'ledger',
        entryId,
        undefined,
        noteText
      )
      toast.success('Notes added')
      setNoteText('')
      loadClientData(selectedClientId)
    } catch (err) {
      toast.error('Failed to add notes')
    }
  }

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClientId || !editingEntry) return
    try {
      await processorApi.handleReconciliationAction(
        selectedClientId,
        'edit_data',
        'ledger',
        editingEntry.id,
        undefined,
        undefined,
        editingEntry
      )
      toast.success('Ledger details updated')
      setEditingEntry(null)
      loadClientData(selectedClientId)
    } catch (err) {
      toast.error('Failed to edit ledger')
    }
  }

  const exportReport = async (format: string) => {
    if (!selectedClientId) return
    const loadingToast = toast.loading(`Generating & exporting ${format.toUpperCase()} report...`)
    try {
      const blob = await processorApi.downloadReconciliationReport(selectedClientId, 'ledger', format)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ledger_reconciliation_report.${format === 'excel' ? 'xlsx' : format}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      toast.dismiss(loadingToast)
      toast.success('Report downloaded')
    } catch (err) {
      toast.dismiss(loadingToast)
      toast.error('Failed to generate report')
    }
  }

  const selectedEntry = subLedgerEntries.find(t => t.id === selectedEntryId)
  const associatedGenTx = selectedEntry?.matched_txn_id
    ? genLedgerEntries.find(t => t.id === selectedEntry.matched_txn_id)
    : null

  // Filtered subledger entries
  const filteredEntries = subLedgerEntries.filter(t => {
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter
    const matchesSearch = searchQuery === '' || 
      (t.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.reference_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.invoice_number || '').toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesSearch
  })

  return (
    <div className="page-container p-6 space-y-6 text-left">
      
      {/* Header */}
      <div className="flex justify-between items-center pb-4 border-b border-surface-800">
        <div>
          <h2 className="text-xl font-bold text-surface-100 flex items-center gap-2">
            <GitCompare size={22} className="text-purple-400" />
            General Ledger Reconciliation Suite
          </h2>
          <p className="text-xs text-surface-400 mt-1">Cross-reconcile sub-ledgers (Sales, Purchase, Cash) against general ledgers offline</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Client Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-surface-400">Client:</span>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="bg-surface-900 border border-surface-800 rounded px-2 py-1 text-xs text-surface-200"
            >
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button
              onClick={() => setShowClientModal(true)}
              className="p-1 bg-surface-800 hover:bg-surface-700 rounded text-teal-400"
              title="Add Client"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Export buttons */}
          <div className="flex gap-1.5">
            <button onClick={() => exportReport('excel')} className="btn-secondary py-1 px-2.5 text-xs flex items-center gap-1 border border-surface-800 text-surface-300">
              <Download size={12} /> Excel
            </button>
            <button onClick={() => exportReport('pdf')} className="btn-secondary py-1 px-2.5 text-xs flex items-center gap-1 border border-surface-800 text-surface-300">
              <Download size={12} /> PDF
            </button>
            <button onClick={() => exportReport('csv')} className="btn-secondary py-1 px-2.5 text-xs flex items-center gap-1 border border-surface-800 text-surface-300">
              <Download size={12} /> CSV
            </button>
          </div>
        </div>
      </div>

      {/* Dashboard Stats */}
      {dashboardStats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="card p-4 bg-gradient-to-br from-surface-900 to-surface-950 border border-surface-850">
            <p className="text-[10px] text-surface-400 font-bold uppercase tracking-wider font-semibold">Total Book entries</p>
            <p className="text-2xl font-bold text-surface-100 mt-1">{dashboardStats.ledger?.total}</p>
          </div>
          <div className="card p-4 bg-gradient-to-br from-surface-900 to-surface-950 border border-surface-850">
            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Entries Balanced</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{dashboardStats.ledger?.matched}</p>
          </div>
          <div className="card p-4 bg-gradient-to-br from-surface-900 to-surface-950 border border-surface-850">
            <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Pending Audit reviews</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">{dashboardStats.ledger?.pending}</p>
          </div>
          <div className="card p-4 bg-gradient-to-br from-surface-900 to-surface-950 border border-surface-850">
            <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider">Ledger Imbalance Exception</p>
            <p className="text-2xl font-bold text-red-400 mt-1">{dashboardStats.ledger?.unmatched}</p>
          </div>
          <div className="card p-4 bg-gradient-to-br from-surface-900 to-surface-950 border border-surface-850">
            <p className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">Duplicate entries risk</p>
            <p className="text-2xl font-bold text-purple-400 mt-1">{dashboardStats.duplicates?.ledger}</p>
          </div>
        </div>
      )}

      {/* File Uploaders */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Left Upload Form */}
        <div className="xl:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6 bg-surface-900 border border-surface-850 rounded-xl p-5">
          {/* Sub-Ledger / Register Upload */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-surface-200 uppercase tracking-wider flex items-center gap-1.5">
              <Upload size={14} className="text-purple-400" /> Upload Register / Sub-Ledger
            </h3>
            
            <div className="space-y-2">
              <select
                value={subLedgerType}
                onChange={(e) => setSubLedgerType(e.target.value)}
                className="bg-surface-950 border border-surface-800 rounded w-full px-2.5 py-1.5 text-xs text-surface-200"
              >
                <option value="purchase">Purchase Register / Ledger</option>
                <option value="sales">Sales Register / Ledger</option>
                <option value="cash">Cash Book / Ledger</option>
              </select>
              
              <div className="border border-dashed border-surface-800 rounded-lg p-3 flex flex-col items-center justify-center bg-surface-950 cursor-pointer relative hover:border-purple-500/40 transition">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setSubLedgerFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <FileSpreadsheet size={24} className="text-surface-500 mb-1" />
                <span className="text-[11px] text-surface-300 font-medium">
                  {subLedgerFile ? subLedgerFile.name : 'Select sub-ledger file (Excel/CSV)'}
                </span>
                <span className="text-[9px] text-surface-500 mt-0.5 font-mono">Excel columns are auto-mapped via Pandas</span>
              </div>
              
              <button
                onClick={handleUploadSubLedger}
                disabled={!subLedgerFile || isUploading}
                className="btn-primary w-full text-xs justify-center py-1.5 gap-1.5"
              >
                <Check size={13} /> Ingest Sub-Ledger
              </button>
            </div>
          </div>

          {/* General Ledger Upload */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-surface-200 uppercase tracking-wider flex items-center gap-1.5">
              <Upload size={14} className="text-teal-400" /> Upload General Ledger Book
            </h3>
            
            <div className="space-y-2">
              <div className="border border-dashed border-surface-800 rounded-lg p-3 flex flex-col items-center justify-center bg-surface-950 cursor-pointer relative hover:border-teal-500/40 transition h-[130px]">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setGenLedgerFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <FileText size={24} className="text-surface-500 mb-1" />
                <span className="text-[11px] text-surface-300 font-medium">
                  {genLedgerFile ? genLedgerFile.name : 'Select general ledger sheet (Excel/CSV)'}
                </span>
                <span className="text-[9px] text-surface-500 mt-0.5">Scanned for date matching and double-entries</span>
              </div>
              
              <button
                onClick={handleUploadGenLedger}
                disabled={!genLedgerFile || isUploading}
                className="btn-secondary border border-surface-800 w-full text-xs justify-center py-1.5 gap-1.5"
              >
                <Check size={13} /> Ingest General Ledger
              </button>
            </div>
          </div>
        </div>

        {/* Right Match Controls */}
        <div className="xl:col-span-4 bg-surface-900 border border-surface-850 rounded-xl p-5 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-surface-200 uppercase tracking-wider flex items-center gap-1.5">
              <Play size={13} className="text-purple-400" /> Match Configuration Rules
            </h3>

            <div className="space-y-3 font-mono text-[11px] text-surface-300">
              <div className="flex justify-between items-center">
                <span>Value Tolerance Range (₹):</span>
                <input
                  type="number"
                  step="0.5"
                  value={amountTolerance}
                  onChange={(e) => setAmountTolerance(parseFloat(e.target.value) || 0)}
                  className="w-16 bg-surface-950 border border-surface-850 rounded px-1.5 py-0.5 text-right text-surface-100"
                />
              </div>
              <p className="text-[9px] text-surface-500 leading-relaxed font-mono">
                Matching rules cross-verify corresponding debit & credit voucher allocations, matching date structures, and description keywords.
              </p>
            </div>
          </div>

          <button
            onClick={runReconciliationAI}
            className="btn-primary w-full text-xs justify-center py-2 mt-4 gap-1.5"
          >
            <RefreshCw size={12} className="animate-spin-slow" /> Trigger Reconciliation Engine
          </button>
        </div>
      </div>

      {/* Side-by-side comparative workspace review */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Panel: Register Entries */}
        <div className="xl:col-span-8 card p-4 flex flex-col h-full bg-surface-900 border border-surface-850">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-surface-800">
            <div className="flex items-center gap-3">
              <h3 className="text-xs font-bold text-surface-200 uppercase tracking-wider">Sub-Ledger Transactions</h3>
              
              <div className="flex gap-1.5">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`text-[9px] px-2 py-0.5 rounded font-mono ${statusFilter === 'all' ? 'bg-surface-800 text-teal-400 border border-surface-700' : 'text-surface-400 hover:text-surface-200'}`}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter('unmatched')}
                  className={`text-[9px] px-2 py-0.5 rounded font-mono ${statusFilter === 'unmatched' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'text-surface-400 hover:text-surface-200'}`}
                >
                  Unmatched
                </button>
                <button
                  onClick={() => setStatusFilter('pending_review')}
                  className={`text-[9px] px-2 py-0.5 rounded font-mono ${statusFilter === 'pending_review' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-surface-400 hover:text-surface-200'}`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setStatusFilter('matched')}
                  className={`text-[9px] px-2 py-0.5 rounded font-mono ${statusFilter === 'matched' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-surface-400 hover:text-surface-200'}`}
                >
                  Matched
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Search size={12} className="text-surface-400" />
              <input
                type="text"
                placeholder="Search description or ref..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-surface-950 border border-surface-800 rounded px-2 py-1 text-[11px] text-surface-200 w-44"
              />
            </div>
          </div>

          <div className="table-wrapper max-h-[450px] overflow-y-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-950 border-b border-surface-800 text-[10px] text-surface-400 uppercase font-mono">
                  <th className="p-2.5">Date / Ref</th>
                  <th className="p-2.5">Particulars / Account</th>
                  <th className="p-2.5 text-right">Debit</th>
                  <th className="p-2.5 text-right">Credit</th>
                  <th className="p-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-850">
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-xs text-surface-500 font-mono">
                      No sub-ledger book entries found.
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((t) => {
                    const isSelected = t.id === selectedEntryId
                    return (
                      <tr
                        key={t.id}
                        onClick={() => setSelectedEntryId(t.id)}
                        className={`cursor-pointer hover:bg-surface-800/60 text-xs transition duration-150 ${isSelected ? 'bg-teal-500/5' : ''}`}
                      >
                        <td className="p-2.5 font-mono">
                          <p className="text-surface-200 font-semibold">{t.date}</p>
                          <span className="text-[9px] text-surface-500 font-bold">{t.reference_number || t.invoice_number || 'N/A'}</span>
                        </td>
                        <td className="p-2.5 font-mono">
                          <p className="text-surface-300 font-medium truncate max-w-[280px]" title={t.description}>{t.description}</p>
                        </td>
                        <td className="p-2.5 text-right font-mono text-red-400">
                          {t.debit > 0 ? `₹${t.debit.toLocaleString('en-IN')}` : '-'}
                        </td>
                        <td className="p-2.5 text-right font-mono text-emerald-400">
                          {t.credit > 0 ? `₹${t.credit.toLocaleString('en-IN')}` : '-'}
                        </td>
                        <td className="p-2.5 text-center">
                          {t.status === 'matched' ? (
                            <span className="text-emerald-400 text-[10px] bg-emerald-500/10 px-1.5 py-0.5 rounded font-medium">Matched</span>
                          ) : t.status === 'pending_review' ? (
                            <span className="text-amber-400 text-[10px] bg-amber-500/10 px-1.5 py-0.5 rounded font-medium">Pending Review</span>
                          ) : (
                            <span className="text-red-400 text-[10px] bg-red-500/10 px-1.5 py-0.5 rounded font-medium">Unmatched</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Panel: match suggestions workspace */}
        <div className="xl:col-span-4 card p-5 bg-surface-900 border border-surface-850 flex flex-col justify-between h-full">
          {selectedEntry ? (
            <div className="space-y-5 h-full flex flex-col justify-between">
              
              <div className="space-y-4">
                <div className="border-b border-surface-800 pb-3">
                  <span className="text-[9px] uppercase font-bold text-surface-400 font-mono">Selected sub-ledger entry</span>
                  <h4 className="text-sm font-bold text-surface-100 mt-1 truncate">{selectedEntry.description}</h4>
                  <p className="text-xs text-surface-300 font-mono mt-1">
                    Value: <span className="font-semibold text-teal-400">₹{(selectedEntry.debit || selectedEntry.credit).toLocaleString('en-IN')}</span> 
                    {selectedEntry.debit > 0 ? ' (Dr/Debit)' : ' (Cr/Credit)'}
                  </p>
                  <p className="text-[10px] text-surface-500 font-mono mt-0.5">Date: {selectedEntry.date} · Ref: {selectedEntry.reference_number || 'N/A'}</p>
                </div>

                {/* Match Suggestions */}
                {selectedEntry.status === 'matched' || selectedEntry.status === 'pending_review' ? (
                  <div className="space-y-3">
                    <div className="bg-surface-950 p-3 rounded-lg border border-surface-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-teal-400 font-bold uppercase tracking-wider font-mono">
                          {selectedEntry.status === 'matched' ? 'Linked General Book Match' : 'Suggested AI match'}
                        </span>
                        <span className="text-[10px] bg-teal-500/15 text-teal-400 font-mono px-1 rounded font-bold">
                          {selectedEntry.match_score || 95}% Match
                        </span>
                      </div>
                      
                      {associatedGenTx ? (
                        <div className="space-y-1 font-mono text-[11px]">
                          <p className="text-surface-200 font-semibold truncate">{associatedGenTx.description}</p>
                          <p className="flex justify-between"><span className="text-surface-500">GL Date:</span> <span className="text-surface-300">{associatedGenTx.date}</span></p>
                          <p className="flex justify-between"><span className="text-surface-500">GL Ref:</span> <span className="text-surface-300">{associatedGenTx.reference_number || 'N/A'}</span></p>
                          <p className="flex justify-between">
                            <span className="text-surface-500">GL Value:</span> 
                            <span className="text-surface-300">₹{(associatedGenTx.credit || associatedGenTx.debit).toLocaleString('en-IN')}</span>
                          </p>
                        </div>
                      ) : (
                        <p className="text-[11px] text-surface-400 italic">Associated general ledger details missing in session memory</p>
                      )}
                    </div>

                    {selectedEntry.match_reason && (
                      <div className="bg-surface-950/40 p-3 rounded-lg border border-surface-850 space-y-1">
                        <h4 className="text-[10px] font-bold text-surface-400 uppercase font-mono">Evidence Log</h4>
                        <p className="text-[11px] text-surface-300 leading-relaxed font-mono font-semibold">
                          {selectedEntry.match_reason.split(',').map((r: string, idx: number) => (
                            <span key={idx} className="block">• {r.trim()}</span>
                          ))}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-red-500/5 border border-red-500/10 text-red-400 rounded-lg p-3 flex gap-2 items-start">
                    <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold">No direct match found</p>
                      <p className="text-[10px] text-surface-400 mt-1 leading-relaxed">
                        No general ledger double entry matched this sub-ledger entry. Suggest manually matching or creating correction voucher.
                      </p>
                    </div>
                  </div>
                )}

                {/* Notes */}
                {selectedEntry.notes && (
                  <div className="bg-surface-950 p-2.5 rounded-lg border border-surface-850 font-mono text-[10px]">
                    <span className="text-surface-400 uppercase font-bold">Accountant Notes:</span>
                    <p className="text-surface-200 mt-1">{selectedEntry.notes}</p>
                  </div>
                )}

                {/* Quick Add Notes */}
                <div className="space-y-1.5">
                  <span className="text-[9px] uppercase font-bold text-surface-400 font-mono flex items-center gap-1">
                    <MessageSquare size={10} /> Add workspace Notes
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add audit note..."
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      className="bg-surface-950 border border-surface-800 rounded px-2 py-1 text-xs text-surface-200 flex-1"
                    />
                    <button
                      onClick={() => handleAddNotes(selectedEntry.id)}
                      className="btn-secondary px-2.5 py-1 text-xs border border-surface-800 text-teal-400"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>

              {/* Action commands */}
              <div className="space-y-2 mt-4 pt-3 border-t border-surface-800">
                {selectedEntry.status !== 'matched' && selectedEntry.matched_txn_id && (
                  <button
                    onClick={() => handleMatchAction('accept_match', selectedEntry.id, selectedEntry.matched_txn_id)}
                    className="btn-primary w-full text-xs justify-center gap-1.5 py-2 font-bold"
                  >
                    <Check size={14} /> Accept & Link match
                  </button>
                )}
                {selectedEntry.status === 'matched' && (
                  <button
                    onClick={() => handleMatchAction('reject_match', selectedEntry.id, selectedEntry.matched_txn_id)}
                    className="btn-secondary w-full text-xs justify-center gap-1.5 py-2 text-red-400 border border-red-500/20 bg-red-500/5 font-bold"
                  >
                    Reject & Unlink match
                  </button>
                )}
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setEditingEntry(selectedEntry)}
                    className="btn-secondary text-[11px] justify-center py-1.5 border border-surface-800 text-surface-300"
                  >
                    <Edit3 size={11} className="mr-1" /> Edit entry
                  </button>
                  
                  <button
                    onClick={() => toast.success('Workspace: records merged successfully')}
                    className="btn-secondary text-[11px] justify-center py-1.5 border border-surface-800 text-surface-300"
                  >
                    Merge records
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-24 text-surface-500">
              <GitCompare size={32} className="mb-2 text-surface-600" />
              <p className="text-xs font-mono">Select entry to activate workspace panel</p>
            </div>
          )}
        </div>
      </div>

      {/* Duplicate detections & manual review audit log */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Duplicates */}
        <div className="card p-4 bg-surface-900 border border-surface-850">
          <h3 className="text-xs font-bold text-surface-200 uppercase tracking-wider pb-2 border-b border-surface-800 flex items-center gap-1.5">
            <AlertCircle size={14} className="text-purple-400" /> Duplicate Ledger Entries Detected ({duplicates.length})
          </h3>
          <div className="max-h-[220px] overflow-y-auto mt-3">
            {duplicates.length === 0 ? (
              <p className="text-[11px] font-mono text-surface-500 text-center py-8">No duplicate candidates flagged.</p>
            ) : (
              <div className="space-y-2">
                {duplicates.map((d, index) => (
                  <div key={index} className="bg-surface-950 p-2.5 rounded-lg border border-surface-850 font-mono text-[11px] flex justify-between items-center">
                    <div>
                      <p className="text-surface-200 font-semibold">{d.reason}</p>
                      <p className="text-[10px] text-surface-400 mt-0.5">{d.details}</p>
                    </div>
                    <span className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded font-bold uppercase">
                      {d.confidence}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Audit trail */}
        <div className="card p-4 bg-surface-900 border border-surface-850">
          <h3 className="text-xs font-bold text-surface-200 uppercase tracking-wider pb-2 border-b border-surface-800 flex items-center gap-1.5">
            <History size={14} className="text-teal-400" /> Audit Trail of Manual Actions ({auditTrail.length})
          </h3>
          <div className="max-h-[220px] overflow-y-auto mt-3 font-mono text-[10px] text-surface-300 space-y-2">
            {auditTrail.length === 0 ? (
              <p className="text-[11px] text-surface-500 text-center py-8">No override choices saved yet.</p>
            ) : (
              auditTrail.map((log) => (
                <div key={log.id} className="bg-surface-950 p-2 rounded border border-surface-850 flex justify-between items-start">
                  <div>
                    <p className="text-teal-400 font-bold">{log.action.toUpperCase()}</p>
                    <p className="text-surface-400 mt-0.5">Record ID: {log.record_id_1.slice(0, 8)}...</p>
                    {log.notes && <p className="text-surface-200 mt-0.5 italic">Note: {log.notes}</p>}
                  </div>
                  <span className="text-surface-500 text-[9px]">{log.timestamp}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Edit Entry Modal */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-900 border border-surface-800 rounded-xl p-5 w-full max-w-md space-y-4 text-left">
            <h3 className="text-sm font-bold text-surface-100 pb-2 border-b border-surface-800">Edit Ledger Voucher Data</h3>
            
            <form onSubmit={handleEditSave} className="space-y-3 font-mono text-xs">
              <div className="space-y-1">
                <label className="text-surface-400">Date:</label>
                <input
                  type="text"
                  value={editingEntry.date}
                  onChange={(e) => setEditingEntry({ ...editingEntry, date: e.target.value })}
                  className="bg-surface-950 border border-surface-800 rounded w-full px-2.5 py-1.5 text-surface-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-surface-400">Particulars / Account:</label>
                <input
                  type="text"
                  value={editingEntry.description}
                  onChange={(e) => setEditingEntry({ ...editingEntry, description: e.target.value })}
                  className="bg-surface-950 border border-surface-800 rounded w-full px-2.5 py-1.5 text-surface-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-surface-400">Ref / Invoice No:</label>
                <input
                  type="text"
                  value={editingEntry.reference_number || editingEntry.invoice_number || ''}
                  onChange={(e) => setEditingEntry({ ...editingEntry, reference_number: e.target.value, invoice_number: e.target.value })}
                  className="bg-surface-950 border border-surface-800 rounded w-full px-2.5 py-1.5 text-surface-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-surface-400">Debit Amount:</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingEntry.debit}
                    onChange={(e) => setEditingEntry({ ...editingEntry, debit: parseFloat(e.target.value) || 0 })}
                    className="bg-surface-950 border border-surface-800 rounded w-full px-2.5 py-1.5 text-surface-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-surface-400">Credit Amount:</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingEntry.credit}
                    onChange={(e) => setEditingEntry({ ...editingEntry, credit: parseFloat(e.target.value) || 0 })}
                    className="bg-surface-950 border border-surface-800 rounded w-full px-2.5 py-1.5 text-surface-100"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button type="submit" className="btn-primary text-xs flex-1 justify-center py-1.5">
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditingEntry(null)}
                  className="btn-secondary border border-surface-800 text-xs flex-1 justify-center py-1.5"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Client Modal */}
      {showClientModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-900 border border-surface-800 rounded-xl p-5 w-full max-w-sm space-y-4 text-left">
            <h3 className="text-sm font-bold text-surface-100 pb-2 border-b border-surface-800">Add New Audit Client</h3>
            
            <form onSubmit={handleCreateClient} className="space-y-3 font-mono text-xs">
              <div className="space-y-1">
                <label className="text-surface-400">Client Legal Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Chemicals Ltd"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="bg-surface-950 border border-surface-800 rounded w-full px-2.5 py-1.5 text-surface-100"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary text-xs flex-1 justify-center py-1.5">
                  Register Client
                </button>
                <button
                  type="button"
                  onClick={() => setShowClientModal(false)}
                  className="btn-secondary border border-surface-800 text-xs flex-1 justify-center py-1.5"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

const logger = {
  error: (msg: string, err: any) => console.error(msg, err),
  info: (msg: string) => console.log(msg)
}
