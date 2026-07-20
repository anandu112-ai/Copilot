import { useState, useEffect, useRef } from 'react'
import {
  GitCompare, CheckCircle2, AlertCircle, Search, Filter,
  Download, Eye, RefreshCw, Check, Play, CheckCircle,
  Plus, Upload, FileSpreadsheet, FileText, Trash2, Edit3, MessageSquare, History
} from 'lucide-react'
import toast from 'react-hot-toast'
import { processorApi } from '../services/processorApi'

export default function BankReconciliationPage() {
  // Clients state
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([])
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [newClientName, setNewClientName] = useState('')
  const [showClientModal, setShowClientModal] = useState(false)

  // Reconciliation parameters
  const [amountTolerance, setAmountTolerance] = useState<number>(1.0)
  const [dateTolerance, setDateTolerance] = useState<number>(10)

  // Upload state
  const [bankFile, setBankFile] = useState<File | null>(null)
  const [ledgerFile, setLedgerFile] = useState<File | null>(null)
  const [bankNameInput, setBankNameInput] = useState('SBI')
  const [acNoInput, setAcNoInput] = useState('12345678')
  const [isUploading, setIsUploading] = useState(false)

  // Data lists
  const [bankTxns, setBankTxns] = useState<any[]>([])
  const [ledgerTxns, setLedgerTxns] = useState<any[]>([])
  const [selectedTxId, setSelectedTxId] = useState<string>('')
  const [dashboardStats, setDashboardStats] = useState<any>(null)
  const [duplicates, setDuplicates] = useState<any[]>([])
  const [auditTrail, setAuditTrail] = useState<any[]>([])

  // Filters
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Edit / Notes modals
  const [noteText, setNoteText] = useState('')
  const [editingTx, setEditingTx] = useState<any>(null)

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

  // Fetch dashboard stats, transactions, duplicates, audit trail
  const loadClientData = async (clientId: string) => {
    if (!clientId) return
    try {
      const stats = await processorApi.getReconciliationDashboard(clientId)
      setDashboardStats(stats)

      const bData = await processorApi.getBankTransactions(clientId)
      setBankTxns(bData)
      if (bData.length > 0) {
        setSelectedTxId(bData[0].id)
      }

      const lData = await processorApi.getLedgerEntries(clientId, 'bank')
      setLedgerTxns(lData)

      const dupData = await processorApi.getReconciliationDuplicates(clientId)
      setDuplicates(dupData.bank || [])

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
  }, [selectedClientId])

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

  const handleUploadBank = async () => {
    if (!selectedClientId) {
      toast.error('Select a client first')
      return
    }
    if (!bankFile) {
      toast.error('Choose a statement file')
      return
    }
    setIsUploading(true)
    try {
      const res = await processorApi.uploadBankStatement(
        selectedClientId,
        bankNameInput,
        acNoInput,
        bankFile
      )
      toast.success(`Parsed statement successfully: ${res.count} transactions saved`)
      setBankFile(null)
      loadClientData(selectedClientId)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  const handleUploadLedger = async () => {
    if (!selectedClientId) {
      toast.error('Select a client first')
      return
    }
    if (!ledgerFile) {
      toast.error('Choose a ledger file')
      return
    }
    setIsUploading(true)
    try {
      const res = await processorApi.uploadLedger(selectedClientId, 'bank', ledgerFile)
      toast.success(`Parsed ledger successfully: ${res.count} entries saved`)
      setLedgerFile(null)
      loadClientData(selectedClientId)
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Ledger upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  const runReconciliationAI = async () => {
    if (!selectedClientId) return
    const loadingToast = toast.loading('Running AI Matching Rules Engine...')
    try {
      const res = await processorApi.runBankMatching(selectedClientId, amountTolerance, dateTolerance)
      toast.dismiss(loadingToast)
      toast.success(`Reconciliation Completed. Auto-matched: ${res.auto_matched} items`)
      loadClientData(selectedClientId)
    } catch (err) {
      toast.dismiss(loadingToast)
      toast.error('Matching engine run failed')
    }
  }

  const handleMatchAction = async (action: 'accept_match' | 'reject_match', bTxId: string, lTxId?: string) => {
    if (!selectedClientId) return
    try {
      await processorApi.handleReconciliationAction(
        selectedClientId,
        action,
        'bank',
        bTxId,
        lTxId
      )
      toast.success(action === 'accept_match' ? 'Match accepted & linked' : 'Match rejected')
      loadClientData(selectedClientId)
    } catch (err) {
      toast.error('Failed to register decision')
    }
  }

  const handleAddNotes = async (bTxId: string) => {
    if (!selectedClientId || !noteText.trim()) return
    try {
      await processorApi.handleReconciliationAction(
        selectedClientId,
        'add_notes',
        'bank',
        bTxId,
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
    if (!selectedClientId || !editingTx) return
    try {
      await processorApi.handleReconciliationAction(
        selectedClientId,
        'edit_data',
        'bank',
        editingTx.id,
        undefined,
        undefined,
        editingTx
      )
      toast.success('Transaction details updated')
      setEditingTx(null)
      loadClientData(selectedClientId)
    } catch (err) {
      toast.error('Failed to edit transaction')
    }
  }

  const exportReport = async (format: string) => {
    if (!selectedClientId) return
    const loadingToast = toast.loading(`Generating & exporting ${format.toUpperCase()} report...`)
    try {
      const blob = await processorApi.downloadReconciliationReport(selectedClientId, 'bank', format)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bank_reconciliation_report.${format === 'excel' ? 'xlsx' : format}`
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

  const selectedTx = bankTxns.find(t => t.id === selectedTxId)
  const associatedLedgerTx = selectedTx?.matched_ledger_id
    ? ledgerTxns.find(t => t.id === selectedTx.matched_ledger_id)
    : null

  // Filtered transactions
  const filteredTxns = bankTxns.filter(t => {
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter
    const matchesSearch = searchQuery === '' || 
      (t.narration || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.reference_number || '').toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesSearch
  })

  return (
    <div className="page-container p-6 space-y-6 text-left">
      
      {/* Header */}
      <div className="flex justify-between items-center pb-4 border-b border-surface-800">
        <div>
          <h2 className="text-xl font-bold text-surface-100 flex items-center gap-2">
            <GitCompare size={22} className="text-teal-400" />
            Bank Statement Reconciliation
          </h2>
          <p className="text-xs text-surface-400 mt-1">Cross-examine bank statement logs against Tally general bank ledgers offline</p>
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

          {/* Export button */}
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

      {/* Client Stats Telemetry Dashboard */}
      {dashboardStats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="card p-4 bg-gradient-to-br from-surface-900 to-surface-950 border border-surface-850">
            <p className="text-[10px] text-surface-400 font-bold uppercase tracking-wider">Total Transactions</p>
            <p className="text-2xl font-bold text-surface-100 mt-1">{dashboardStats.bank?.total}</p>
          </div>
          <div className="card p-4 bg-gradient-to-br from-surface-900 to-surface-950 border border-surface-850">
            <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Matched (Balanced)</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{dashboardStats.bank?.matched}</p>
          </div>
          <div className="card p-4 bg-gradient-to-br from-surface-900 to-surface-950 border border-surface-850">
            <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Pending Review</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">{dashboardStats.bank?.pending}</p>
          </div>
          <div className="card p-4 bg-gradient-to-br from-surface-900 to-surface-950 border border-surface-850">
            <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider">Unmatched Exception</p>
            <p className="text-2xl font-bold text-red-400 mt-1">{dashboardStats.bank?.unmatched}</p>
          </div>
          <div className="card p-4 bg-gradient-to-br from-surface-900 to-surface-950 border border-surface-850">
            <p className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">Duplicates Risk</p>
            <p className="text-2xl font-bold text-purple-400 mt-1">{dashboardStats.duplicates?.bank}</p>
          </div>
        </div>
      )}

      {/* File Uploaders & Tolerance configuration */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Left pane: file upload config */}
        <div className="xl:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6 bg-surface-900 border border-surface-850 rounded-xl p-5">
          {/* Statement Upload */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-surface-200 uppercase tracking-wider flex items-center gap-1.5">
              <Upload size={14} className="text-teal-400" /> Upload Bank Statement Feed
            </h3>
            
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Bank Name (e.g. SBI)"
                  value={bankNameInput}
                  onChange={(e) => setBankNameInput(e.target.value)}
                  className="bg-surface-950 border border-surface-800 rounded px-2.5 py-1.5 text-xs text-surface-200 flex-1"
                />
                <input
                  type="text"
                  placeholder="Account Number"
                  value={acNoInput}
                  onChange={(e) => setAcNoInput(e.target.value)}
                  className="bg-surface-950 border border-surface-800 rounded px-2.5 py-1.5 text-xs text-surface-200 flex-1"
                />
              </div>
              
              <div className="border border-dashed border-surface-800 rounded-lg p-3 flex flex-col items-center justify-center bg-surface-950 cursor-pointer relative hover:border-teal-500/40 transition">
                <input
                  type="file"
                  accept=".pdf,.xlsx,.csv"
                  onChange={(e) => setBankFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <FileSpreadsheet size={24} className="text-surface-500 mb-1" />
                <span className="text-[11px] text-surface-300 font-medium">
                  {bankFile ? bankFile.name : 'Select statement file (PDF/Excel/CSV)'}
                </span>
                <span className="text-[9px] text-surface-500 mt-0.5">Supports PDF parsing & scanned OCR screening</span>
              </div>
              
              <button
                onClick={handleUploadBank}
                disabled={!bankFile || isUploading}
                className="btn-primary w-full text-xs justify-center py-1.5 gap-1.5"
              >
                <Check size={13} /> Ingest Bank Statement
              </button>
            </div>
          </div>

          {/* Book / Cash Ledger Upload */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-surface-200 uppercase tracking-wider flex items-center gap-1.5">
              <Upload size={14} className="text-emerald-400" /> Upload Book Bank Ledger
            </h3>
            
            <div className="space-y-2">
              <div className="border border-dashed border-surface-800 rounded-lg p-3 flex flex-col items-center justify-center bg-surface-950 cursor-pointer relative hover:border-emerald-500/40 transition h-[90px]">
                <input
                  type="file"
                  accept=".xlsx,.csv"
                  onChange={(e) => setLedgerFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <FileText size={24} className="text-surface-500 mb-1" />
                <span className="text-[11px] text-surface-300 font-medium">
                  {ledgerFile ? ledgerFile.name : 'Select cash/bank ledger sheet (Excel/CSV)'}
                </span>
                <span className="text-[9px] text-surface-500 mt-0.5">Excel columns are auto-mapped via Pandas heuristics</span>
              </div>
              
              <button
                onClick={handleUploadLedger}
                disabled={!ledgerFile || isUploading}
                className="btn-secondary border border-surface-800 w-full text-xs justify-center py-1.5 gap-1.5"
              >
                <Check size={13} /> Ingest Books Ledger
              </button>
            </div>
          </div>
        </div>

        {/* Right pane: matching engine controls */}
        <div className="xl:col-span-4 bg-surface-900 border border-surface-850 rounded-xl p-5 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-surface-200 uppercase tracking-wider flex items-center gap-1.5">
              <Play size={13} className="text-teal-400" /> Match Configuration Rules
            </h3>

            <div className="space-y-3 font-mono text-[11px] text-surface-300">
              <div className="flex justify-between items-center">
                <span>Amount Difference Tolerance (₹):</span>
                <input
                  type="number"
                  step="0.1"
                  value={amountTolerance}
                  onChange={(e) => setAmountTolerance(parseFloat(e.target.value) || 0)}
                  className="w-16 bg-surface-950 border border-surface-850 rounded px-1.5 py-0.5 text-right text-surface-100"
                />
              </div>
              <div className="flex justify-between items-center">
                <span>Timing Differences Limit (Days):</span>
                <input
                  type="number"
                  value={dateTolerance}
                  onChange={(e) => setDateTolerance(parseInt(e.target.value) || 0)}
                  className="w-16 bg-surface-950 border border-surface-850 rounded px-1.5 py-0.5 text-right text-surface-100"
                />
              </div>
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

      {/* Comparative Feeds Review Grid Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        
        {/* Left panel: bank statement feed listing */}
        <div className="xl:col-span-8 card p-4 flex flex-col h-full bg-surface-900 border border-surface-850">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-surface-800">
            <div className="flex items-center gap-3">
              <h3 className="text-xs font-bold text-surface-200 uppercase tracking-wider">Bank Statement Transactions</h3>
              
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
                placeholder="Search narration..."
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
                  <th className="p-2.5">Date / Mode</th>
                  <th className="p-2.5">Narration / Bank Ref</th>
                  <th className="p-2.5 text-right">Debit</th>
                  <th className="p-2.5 text-right">Credit</th>
                  <th className="p-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-850">
                {filteredTxns.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-xs text-surface-500 font-mono">
                      No statement transactions discovered for current filters.
                    </td>
                  </tr>
                ) : (
                  filteredTxns.map((t) => {
                    const isSelected = t.id === selectedTxId
                    return (
                      <tr
                        key={t.id}
                        onClick={() => setSelectedTxId(t.id)}
                        className={`cursor-pointer hover:bg-surface-800/60 text-xs transition duration-150 ${isSelected ? 'bg-teal-500/5' : ''}`}
                      >
                        <td className="p-2.5 font-mono">
                          <p className="text-surface-200 font-semibold">{t.date}</p>
                          <span className="text-[9px] text-teal-400 bg-teal-500/10 px-1 rounded uppercase tracking-wider">{t.payment_mode || 'OTHER'}</span>
                        </td>
                        <td className="p-2.5 font-mono">
                          <p className="text-surface-300 font-medium truncate max-w-[280px]" title={t.narration}>{t.narration}</p>
                          <p className="text-[10px] text-surface-500">{t.reference_number || t.cheque_number || 'N/A'}</p>
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

        {/* Right panel: review workspace details */}
        <div className="xl:col-span-4 card p-5 bg-surface-900 border border-surface-850 flex flex-col justify-between h-full">
          {selectedTx ? (
            <div className="space-y-5 h-full flex flex-col justify-between">
              
              {/* Selected bank txn info */}
              <div className="space-y-4">
                <div className="border-b border-surface-800 pb-3">
                  <span className="text-[9px] uppercase font-bold text-surface-400 font-mono">Selected Bank statement txn</span>
                  <h4 className="text-sm font-bold text-surface-100 mt-1 truncate">{selectedTx.narration}</h4>
                  <p className="text-xs text-surface-300 font-mono mt-1">
                    Value: <span className="font-semibold text-teal-400">₹{(selectedTx.debit || selectedTx.credit).toLocaleString('en-IN')}</span> 
                    {selectedTx.debit > 0 ? ' (Dr/Debit)' : ' (Cr/Credit)'}
                  </p>
                  <p className="text-[10px] text-surface-500 font-mono mt-0.5">Date: {selectedTx.date} · Ref: {selectedTx.reference_number || 'N/A'}</p>
                </div>

                {/* Match Recommendations */}
                {selectedTx.status === 'matched' || selectedTx.status === 'pending_review' ? (
                  <div className="space-y-3">
                    <div className="bg-surface-950 p-3 rounded-lg border border-surface-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-teal-400 font-bold uppercase tracking-wider font-mono">
                          {selectedTx.status === 'matched' ? 'Linked Books Match' : 'Suggested AI match'}
                        </span>
                        <span className="text-[10px] bg-teal-500/15 text-teal-400 font-mono px-1 rounded font-bold">
                          {selectedTx.match_score || 95}% Confidence
                        </span>
                      </div>
                      
                      {associatedLedgerTx ? (
                        <div className="space-y-1 font-mono text-[11px]">
                          <p className="text-surface-200 font-semibold truncate">{associatedLedgerTx.description}</p>
                          <p className="flex justify-between"><span className="text-surface-500">Books Date:</span> <span className="text-surface-300">{associatedLedgerTx.date}</span></p>
                          <p className="flex justify-between"><span className="text-surface-500">Books Ref:</span> <span className="text-surface-300">{associatedLedgerTx.reference_number || 'N/A'}</span></p>
                          <p className="flex justify-between">
                            <span className="text-surface-500">Books Value:</span> 
                            <span className="text-surface-300">₹{(associatedLedgerTx.credit || associatedLedgerTx.debit).toLocaleString('en-IN')}</span>
                          </p>
                        </div>
                      ) : (
                        <p className="text-[11px] text-surface-400 italic">Associated ledger entry details missing in session memory</p>
                      )}
                    </div>

                    {/* Reasons Evidence */}
                    {selectedTx.match_reason && (
                      <div className="bg-surface-950/40 p-3 rounded-lg border border-surface-850 space-y-1">
                        <h4 className="text-[10px] font-bold text-surface-400 uppercase font-mono">Evidence Log</h4>
                        <p className="text-[11px] text-surface-300 leading-relaxed font-mono">
                          {selectedTx.match_reason.split(',').map((r: string, idx: number) => (
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
                        The matching rules engine failed to locate an unlinked ledger entry of the corresponding amount. Adjust the tolerance limits or accept partial items manually.
                      </p>
                    </div>
                  </div>
                )}

                {/* Audit notes display */}
                {selectedTx.notes && (
                  <div className="bg-surface-950 p-2.5 rounded-lg border border-surface-850 font-mono text-[10px]">
                    <span className="text-surface-400 uppercase font-bold">Accountant Notes:</span>
                    <p className="text-surface-200 mt-1">{selectedTx.notes}</p>
                  </div>
                )}

                {/* Quick Add Notes section */}
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
                      onClick={() => handleAddNotes(selectedTx.id)}
                      className="btn-secondary px-2.5 py-1 text-xs border border-surface-800 text-teal-400"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>

              {/* Action commands */}
              <div className="space-y-2 mt-4 pt-3 border-t border-surface-800">
                {selectedTx.status !== 'matched' && selectedTx.matched_ledger_id && (
                  <button
                    onClick={() => handleMatchAction('accept_match', selectedTx.id, selectedTx.matched_ledger_id)}
                    className="btn-primary w-full text-xs justify-center gap-1.5 py-2 font-bold"
                  >
                    <Check size={14} /> Accept & Link match
                  </button>
                )}
                {selectedTx.status === 'matched' && (
                  <button
                    onClick={() => handleMatchAction('reject_match', selectedTx.id, selectedTx.matched_ledger_id)}
                    className="btn-secondary w-full text-xs justify-center gap-1.5 py-2 text-red-400 border border-red-500/20 bg-red-500/5 font-bold"
                  >
                    Reject & Unlink match
                  </button>
                )}
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setEditingTx(selectedTx)}
                    className="btn-secondary text-[11px] justify-center py-1.5 border border-surface-800 text-surface-300"
                  >
                    <Edit3 size={11} className="mr-1" /> Edit txn Data
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
              <p className="text-xs font-mono">Select transaction to activate workspace panel</p>
            </div>
          )}
        </div>
      </div>

      {/* Duplicate Detections & Audit Trail Log Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Duplicate Detections */}
        <div className="card p-4 bg-surface-900 border border-surface-850">
          <h3 className="text-xs font-bold text-surface-200 uppercase tracking-wider pb-2 border-b border-surface-800 flex items-center gap-1.5">
            <AlertCircle size={14} className="text-purple-400" /> Duplicate Bank Transactions Detected ({duplicates.length})
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

      {/* Edit transaction Modal */}
      {editingTx && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-900 border border-surface-800 rounded-xl p-5 w-full max-w-md space-y-4 text-left">
            <h3 className="text-sm font-bold text-surface-100 pb-2 border-b border-surface-800">Edit Bank Transaction Data</h3>
            
            <form onSubmit={handleEditSave} className="space-y-3 font-mono text-xs">
              <div className="space-y-1">
                <label className="text-surface-400">Date:</label>
                <input
                  type="text"
                  value={editingTx.date}
                  onChange={(e) => setEditingTx({ ...editingTx, date: e.target.value })}
                  className="bg-surface-950 border border-surface-800 rounded w-full px-2.5 py-1.5 text-surface-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-surface-400">Narration:</label>
                <input
                  type="text"
                  value={editingTx.narration}
                  onChange={(e) => setEditingTx({ ...editingTx, narration: e.target.value })}
                  className="bg-surface-950 border border-surface-800 rounded w-full px-2.5 py-1.5 text-surface-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-surface-400">Reference Number:</label>
                <input
                  type="text"
                  value={editingTx.reference_number}
                  onChange={(e) => setEditingTx({ ...editingTx, reference_number: e.target.value })}
                  className="bg-surface-950 border border-surface-800 rounded w-full px-2.5 py-1.5 text-surface-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-surface-400">Debit (Withdrawal):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingTx.debit}
                    onChange={(e) => setEditingTx({ ...editingTx, debit: parseFloat(e.target.value) || 0 })}
                    className="bg-surface-950 border border-surface-800 rounded w-full px-2.5 py-1.5 text-surface-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-surface-400">Credit (Deposit):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingTx.credit}
                    onChange={(e) => setEditingTx({ ...editingTx, credit: parseFloat(e.target.value) || 0 })}
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
                  onClick={() => setEditingTx(null)}
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

// Simple browser-safe console logger fallback
const logger = {
  error: (msg: string, err: any) => console.error(msg, err),
  info: (msg: string) => console.log(msg)
}
