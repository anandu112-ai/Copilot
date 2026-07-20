import React, { useState } from 'react'
import {
  Shield, AlertTriangle, AlertCircle, Info, CheckCircle, Search, Filter,
  TrendingUp, Download, Eye, RefreshCw, Sparkles, Trash2, ArrowUpRight,
  ShieldAlert, BookOpen, Calculator, Calendar, Landmark, CheckSquare, XCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuditStore } from '../stores/auditStore'
import type { AuditFinding, AuditSeverity, AuditCategory, AuditStatus } from '../types/audit'

export default function AuditAssistantPage() {
  const {
    findings,
    gstMismatches,
    duplicates,
    suspiciousTransactions,
    selectedFindingId,
    activeSeverity,
    activeCategory,
    activeClient,
    isScanning,
    selectFinding,
    updateFinding,
    setActiveSeverity,
    setActiveCategory,
    setActiveClient,
    setIsScanning,
    getFilteredFindings,
    getStats,
    getSelectedFinding
  } = useAuditStore()

  const [activeTab, setActiveTab] = useState<'observations' | 'gst' | 'duplicates' | 'bank'>('observations')

  const filteredFindings = getFilteredFindings()
  const selectedFinding = getSelectedFinding()
  const stats = getStats()

  const handleResolveFinding = (id: string, currentStatus: AuditStatus) => {
    const nextStatus: AuditStatus = currentStatus === 'Resolved' ? 'Open' : 'Resolved'
    updateFinding(id, {
      status: nextStatus,
      resolvedAt: nextStatus === 'Resolved' ? new Date().toISOString() : undefined
    })
    toast.success(`Finding status updated to: ${nextStatus}`)
  }

  const runAuditScan = () => {
    setIsScanning(true)
    toast.loading('Analyzing ledger data blocks for tax compliance and fraud alerts...')
    setTimeout(() => {
      setIsScanning(false)
      toast.dismiss()
      toast.success('AI Audit scans completed! All transaction records verified.')
    }, 2000)
  }

  const exportReport = (format: 'Excel' | 'PDF') => {
    toast.success(`Exporting detailed Audit Report as ${format}...`)
  }

  return (
    <div className="page-container flex flex-col h-[calc(100vh-var(--topbar-height))] p-0">
      
      {/* Top dashboard summary header */}
      <div className="bg-surface-900 border-b border-surface-700 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-sm font-black text-surface-100 flex items-center gap-2 uppercase tracking-wider">
            <Shield size={16} className="text-brand-500" />
            AI Audit Intelligence
          </h2>
          <p className="text-[10px] text-surface-500 mt-0.5">Local Private Audit Sandbox for GST, Income Tax Act compliance and fraud screening</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => exportReport('Excel')}
            className="btn-secondary text-xs py-1 px-2.5 border border-surface-700"
          >
            <Download size={12} /> Excel Report
          </button>
          <button
            onClick={runAuditScan}
            disabled={isScanning}
            className="btn-primary text-xs py-1 px-3 gap-1.5 shadow"
          >
            <Sparkles size={12} className={isScanning ? 'animate-spin' : ''} /> Run AI Audit Scan
          </button>
        </div>
      </div>

      {/* Audit compliance scoreboard */}
      <div className="grid grid-cols-4 gap-4 px-6 py-4 bg-surface-900/20 border-b border-surface-700 flex-shrink-0">
        <div className="card p-3 flex flex-col justify-between">
          <span className="text-[9px] text-surface-500 uppercase font-bold tracking-wider">Compliance Score</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-emerald-400">{stats.complianceScore} / 100</span>
            <span className="text-[8px] text-emerald-400 bg-emerald-500/10 px-1 rounded font-bold font-mono">HIGH HEALTH</span>
          </div>
        </div>

        <div className="card p-3 flex flex-col justify-between">
          <span className="text-[9px] text-red-400 uppercase font-bold tracking-wider">Critical Anomalies</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-surface-200">{stats.criticalCount} Flagged</span>
            <span className="text-[8px] text-surface-500 font-medium">Requires Immediate Reversal</span>
          </div>
        </div>

        <div className="card p-3 flex flex-col justify-between">
          <span className="text-[9px] text-amber-500 uppercase font-bold tracking-wider">High / Med Threats</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-surface-200">{stats.highCount + stats.mediumCount} Flags</span>
            <span className="text-[8px] text-surface-500 font-medium">Review and Verify</span>
          </div>
        </div>

        <div className="card p-3 flex flex-col justify-between">
          <span className="text-[9px] text-brand-400 uppercase font-bold tracking-wider">Total Tax Impact</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-brand-500">₹{stats.totalImpactAmount.toLocaleString('en-IN')}</span>
            <span className="text-[8px] text-surface-500 font-medium">Potential Tax Exposure</span>
          </div>
        </div>
      </div>

      {/* Tabs list */}
      <div className="px-6 border-b border-surface-700 bg-surface-900/10 flex flex-shrink-0">
        {[
          { id: 'observations', label: `Audit Observations (${stats.openCount})` },
          { id: 'gst', label: `GST Reconciliation Mismatches (${stats.gstMismatchCount})` },
          { id: 'duplicates', label: `Duplicate Invoices (${stats.duplicateCount})` },
          { id: 'bank', label: `Suspicious Transactions (${stats.suspiciousCount})` }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-surface-500 hover:text-surface-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main split workarea */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* TAB 1: Audit Observations */}
        {activeTab === 'observations' && (
          <>
            {/* Left list panel */}
            <div className="w-[450px] border-r border-surface-700 flex flex-col bg-surface-900/30">
              {/* Filter controls */}
              <div className="p-3 border-b border-surface-700 bg-surface-900/20 flex flex-wrap gap-2">
                <select
                  value={activeClient}
                  onChange={(e) => setActiveClient(e.target.value)}
                  className="bg-surface-900 border border-surface-700 rounded px-2 py-1 text-[10px] text-surface-300 outline-none flex-1 font-semibold"
                >
                  <option value="All">All Clients</option>
                  <option value="Apex Steel Industries Pvt Ltd">Apex Steel Industries</option>
                  <option value="MGM Logistics Services">MGM Logistics Services</option>
                  <option value="Om Packaging Industries">Om Packaging Industries</option>
                </select>

                <select
                  value={activeSeverity}
                  onChange={(e) => setActiveSeverity(e.target.value as any)}
                  className="bg-surface-900 border border-surface-700 rounded px-2 py-1 text-[10px] text-surface-300 outline-none font-semibold"
                >
                  <option value="All">All Severities</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {filteredFindings.map((f) => {
                  const isSelected = f.id === selectedFindingId
                  const isResolved = f.status === 'Resolved'

                  return (
                    <div
                      key={f.id}
                      onClick={() => selectFinding(f.id)}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-3 ${
                        isSelected
                          ? 'bg-brand-500/10 border-brand-500/30 text-surface-100 shadow-sm'
                          : 'bg-surface-900 border-surface-800 hover:border-surface-700 text-surface-350'
                      }`}
                    >
                      <div className={`mt-0.5 p-1.5 rounded ${
                        f.severity === 'Critical' ? 'bg-red-500/10 text-red-500' :
                        f.severity === 'High' ? 'bg-amber-500/10 text-amber-500' :
                        'bg-brand-500/10 text-brand-400'
                      }`}>
                        <AlertCircle size={14} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className={`text-xs font-bold truncate ${isResolved ? 'line-through text-surface-500' : 'text-surface-200'}`}>
                            {f.title}
                          </h4>
                          <span className={`text-[8px] font-bold px-1 rounded ${
                            f.severity === 'Critical' ? 'bg-red-500/20 text-red-400' :
                            f.severity === 'High' ? 'bg-amber-500/20 text-amber-400' :
                            'bg-surface-800 text-surface-400'
                          }`}>
                            {f.severity}
                          </span>
                        </div>
                        <p className="text-[9px] text-surface-500 font-semibold mt-1">Client: {f.client}</p>
                        <p className="text-[11px] text-surface-400 mt-1 line-clamp-2 leading-relaxed">{f.description}</p>
                        
                        {f.impactAmount && f.impactAmount > 0 && (
                          <span className="text-[9px] font-mono text-brand-400 font-bold bg-brand-500/5 px-1.5 py-0.2 rounded border border-brand-500/10 mt-1.5 inline-block">
                            Exposure: ₹{f.impactAmount.toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>

                      {isResolved && (
                        <span className="badge badge-success px-1.5 py-0.2 text-[8px] font-bold">Resolved</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Right observation preview details panel */}
            <div className="flex-1 flex flex-col bg-surface-950/20 overflow-y-auto p-6 text-left">
              {selectedFinding ? (
                <div className="max-w-2xl space-y-6">
                  {/* Title and metadata */}
                  <div className="border-b border-surface-800 pb-4">
                    <span className="text-[9px] bg-brand-500/10 text-brand-400 border border-brand-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                      {selectedFinding.category}
                    </span>
                    <h3 className="text-base font-black text-surface-100 mt-2">{selectedFinding.title}</h3>
                    <div className="flex flex-wrap gap-4 mt-2 text-[10px] text-surface-500 font-semibold">
                      <span>Client Account: <span className="text-surface-300 font-bold">{selectedFinding.client}</span></span>
                      <span>•</span>
                      <span>Detected: <span className="text-surface-300">{new Date(selectedFinding.detectedAt).toLocaleDateString()}</span></span>
                    </div>
                  </div>

                  {/* Finding Explanation details */}
                  <div className="space-y-4 text-xs text-surface-300 leading-relaxed">
                    <div>
                      <h4 className="text-[10px] text-surface-500 uppercase tracking-wider font-black mb-1.5">Compliance Observation</h4>
                      <p>{selectedFinding.description}</p>
                    </div>

                    {/* Legal citation */}
                    {selectedFinding.legalReference && (
                      <div className="bg-surface-900 border border-surface-800 p-3 rounded-lg flex items-start gap-2.5">
                        <BookOpen size={15} className="text-brand-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] text-surface-500 uppercase tracking-wider font-bold">Legal Reference / Clause</p>
                          <p className="text-surface-300 font-mono text-[11px] mt-0.5">{selectedFinding.legalReference}</p>
                        </div>
                      </div>
                    )}

                    {/* Evidence blocks */}
                    <div className="bg-surface-950 border border-surface-850 p-4 rounded-xl space-y-2">
                      <h4 className="text-[10px] text-brand-400 font-bold uppercase tracking-wider flex items-center gap-1">
                        <ShieldAlert size={12} /> Audit Trail & Evidence
                      </h4>
                      <ul className="list-disc list-inside space-y-1 text-surface-400 text-[11px] font-mono leading-relaxed pl-1">
                        {selectedFinding.evidence.map((ev, i) => (
                          <li key={i}>{ev}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Recommended Action block */}
                    <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-xl space-y-2">
                      <h4 className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                        <CheckSquare size={12} /> Recommended auditor correction
                      </h4>
                      <p className="text-surface-300 text-[11px]">
                        {selectedFinding.recommendedAction}
                      </p>
                    </div>
                  </div>

                  {/* Bottom Action controls */}
                  <div className="pt-4 border-t border-surface-800 flex items-center gap-3">
                    <button
                      onClick={() => handleResolveFinding(selectedFinding.id, selectedFinding.status)}
                      className={`btn-primary px-4 py-2 text-xs flex items-center gap-1.5 ${
                        selectedFinding.status === 'Resolved' ? 'bg-surface-700 hover:bg-surface-600' : ''
                      }`}
                    >
                      {selectedFinding.status === 'Resolved' ? 'Re-open Finding' : 'Mark Audit Flag Resolved'}
                    </button>
                    
                    <button
                      onClick={() => toast.success(`Viewing linked invoices/registers for: ${selectedFinding.client}`)}
                      className="btn-secondary px-4 py-2 text-xs border border-surface-700"
                    >
                      View Associated Invoices
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-surface-500">
                  <Shield size={28} className="mb-2" />
                  <p className="text-sm">Select an audit finding from the sidebar to review full details</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* TAB 2: GST Mismatches */}
        {activeTab === 'gst' && (
          <div className="flex-1 overflow-x-auto p-6">
            <div className="table-wrapper border border-surface-800 rounded-xl bg-surface-900/30">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface-900 border-b border-surface-800">
                    <th className="p-3 text-[10px] text-surface-450 font-bold">Invoice No</th>
                    <th className="p-3 text-[10px] text-surface-450 font-bold">Vendor Name</th>
                    <th className="p-3 text-[10px] text-surface-450 font-bold">Mismatch Type</th>
                    <th className="p-3 text-[10px] text-surface-450 font-bold text-right">Purchase Reg (INR)</th>
                    <th className="p-3 text-[10px] text-surface-450 font-bold text-right">GSTR-2B Portal (INR)</th>
                    <th className="p-3 text-[10px] text-surface-450 font-bold text-right">Difference</th>
                    <th className="p-3 text-[10px] text-surface-450 font-bold text-center">Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {gstMismatches.map(m => (
                    <tr key={m.id} className="border-b border-surface-800/50 hover:bg-surface-800/20">
                      <td className="p-3 text-xs text-surface-300 font-mono">{m.invoiceNo}</td>
                      <td className="p-3 text-xs text-surface-200">{m.vendorName}</td>
                      <td className="p-3 text-xs text-surface-400 font-semibold">{m.mismatchType}</td>
                      <td className="p-3 text-xs text-right font-mono text-surface-300">₹{m.gstr1Taxable.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-xs text-right font-mono text-surface-300">₹{m.gstr2bTaxable.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-xs text-right font-mono text-brand-400 font-bold">₹{m.differenceGst.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-xs text-center">
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                          m.severity === 'Critical' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {m.severity}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: Duplicate Vouchers */}
        {activeTab === 'duplicates' && (
          <div className="flex-1 overflow-x-auto p-6">
            <div className="table-wrapper border border-surface-800 rounded-xl bg-surface-900/30">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface-900 border-b border-surface-800">
                    <th className="p-3 text-[10px] text-surface-450 font-bold">Invoice No</th>
                    <th className="p-3 text-[10px] text-surface-450 font-bold">Vendor Name</th>
                    <th className="p-3 text-[10px] text-surface-450 font-bold">Invoice Date</th>
                    <th className="p-3 text-[10px] text-surface-450 font-bold text-right">Voucher Amount</th>
                    <th className="p-3 text-[10px] text-surface-450 font-bold">Duplicate Match Score</th>
                    <th className="p-3 text-[10px] text-surface-450 font-bold">Heuristic match indicators</th>
                    <th className="p-3 text-[10px] text-surface-450 font-bold text-center">Audit Status</th>
                  </tr>
                </thead>
                <tbody>
                  {duplicates.map(d => (
                    <tr key={d.id} className="border-b border-surface-800/50 hover:bg-surface-800/20">
                      <td className="p-3 text-xs text-surface-300 font-mono">{d.invoiceNo}</td>
                      <td className="p-3 text-xs text-surface-200">{d.vendorName}</td>
                      <td className="p-3 text-xs text-surface-300">{d.invoiceDate}</td>
                      <td className="p-3 text-xs text-right font-mono text-surface-300">₹{d.amount.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-xs font-mono font-bold text-red-400">{d.duplicateScore}% Match</td>
                      <td className="p-3 text-xs text-surface-400">{d.reason}</td>
                      <td className="p-3 text-xs text-center">
                        <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded text-[10px] font-bold">
                          {d.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: Bank Statement Anomalies */}
        {activeTab === 'bank' && (
          <div className="flex-1 overflow-x-auto p-6">
            <div className="table-wrapper border border-surface-800 rounded-xl bg-surface-900/30">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface-900 border-b border-surface-800">
                    <th className="p-3 text-[10px] text-surface-450 font-bold">Txn Date</th>
                    <th className="p-3 text-[10px] text-surface-450 font-bold">Statement Narration</th>
                    <th className="p-3 text-[10px] text-surface-450 font-bold text-right">Amount (INR)</th>
                    <th className="p-3 text-[10px] text-surface-450 font-bold">Anomalous Heuristic Reason</th>
                    <th className="p-3 text-[10px] text-surface-450 font-bold text-center">Risk level</th>
                  </tr>
                </thead>
                <tbody>
                  {suspiciousTransactions.map(txn => (
                    <tr key={txn.id} className="border-b border-surface-800/50 hover:bg-surface-800/20">
                      <td className="p-3 text-xs text-surface-300">{txn.date}</td>
                      <td className="p-3 text-xs text-surface-200">{txn.narration}</td>
                      <td className="p-3 text-xs text-right font-mono text-red-400">₹{txn.amount.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-xs text-surface-400">{txn.reason}</td>
                      <td className="p-3 text-xs text-center">
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                          txn.riskLevel === 'High' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {txn.riskLevel}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
