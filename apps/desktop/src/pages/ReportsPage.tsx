import { useState } from 'react'
import {
  BarChart3, FileText, Download, CheckCircle, Search, Filter,
  TrendingUp, RefreshCw, FileSpreadsheet, Eye, Plus, Sparkles
} from 'lucide-react'
import toast from 'react-hot-toast'

interface AuditReport {
  id: string
  title: string
  client: string
  fy: string
  generatedAt: string
  type: 'Tax Audit (3CD)' | 'GST Reconciliation (GSTR-9)' | 'ITC Verification' | 'Bank Audit'
  status: 'Completed' | 'Drafting'
  hasExcel: boolean
  hasPdf: boolean
}

const mockReports: AuditReport[] = [
  {
    id: 'rep-1',
    title: 'GSTR-9 Reconciler Certificate - Apex Steel',
    client: 'Apex Steel Industries Pvt Ltd',
    fy: 'FY 2025-26',
    generatedAt: '10 mins ago',
    type: 'GST Reconciliation (GSTR-9)',
    status: 'Completed',
    hasExcel: true,
    hasPdf: true
  },
  {
    id: 'rep-2',
    title: 'Form 3CD Tax Audit Statement - MGM',
    client: 'MGM Logistics Services',
    fy: 'FY 2025-26',
    generatedAt: '3 hours ago',
    type: 'Tax Audit (3CD)',
    status: 'Completed',
    hasExcel: true,
    hasPdf: true
  },
  {
    id: 'rep-3',
    title: 'ITC Offset verification - Om Packaging',
    client: 'Om Packaging Industries',
    fy: 'FY 2026-27',
    generatedAt: 'Yesterday',
    type: 'ITC Verification',
    status: 'Completed',
    hasExcel: false,
    hasPdf: true
  },
  {
    id: 'rep-4',
    title: 'SBI Bank Reconciliation Summary - Apex Steel',
    client: 'Apex Steel Industries Pvt Ltd',
    fy: 'FY 2026-27',
    generatedAt: '3 days ago',
    type: 'Bank Audit',
    status: 'Completed',
    hasExcel: true,
    hasPdf: true
  }
]

export default function ReportsPage() {
  const [reports, setReports] = useState<AuditReport[]>(mockReports)
  const [selectedReportId, setSelectedReportId] = useState<string>('rep-1')
  
  // Form state
  const [reportType, setReportType] = useState<'Tax Audit (3CD)' | 'GST Reconciliation (GSTR-9)' | 'ITC Verification' | 'Bank Audit'>('Tax Audit (3CD)')
  const [clientName, setClientName] = useState('Apex Steel Industries Pvt Ltd')
  const [fyYear, setFyYear] = useState('FY 2025-26')

  const selectedReport = reports.find(r => r.id === selectedReportId)

  const handleGenerateReport = (e: React.FormEvent) => {
    e.preventDefault()
    toast.loading('AI Drafting audit report from local databases...')

    setTimeout(() => {
      toast.dismiss()
      const newReport: AuditReport = {
        id: `rep-${Date.now()}`,
        title: `${reportType.replace(' (3CD)', '').replace(' (GSTR-9)', '')} Report - ${clientName.split(' ')[0]}`,
        client: clientName,
        fy: fyYear,
        generatedAt: 'Just now',
        type: reportType,
        status: 'Completed',
        hasExcel: true,
        hasPdf: true
      }
      setReports([newReport, ...reports])
      setSelectedReportId(newReport.id)
      toast.success('Audit Report generated successfully!')
    }, 2000)
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="section-header">
        <div>
          <h2 className="text-lg font-bold text-surface-100 flex items-center gap-2">
            <BarChart3 size={18} className="text-brand-500" />
            Audit Reports & Analytics
          </h2>
          <p className="text-sm text-surface-400 mt-0.5 font-medium">Generate certified tax compliance worksheets and PDF/Excel files locally</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Side: Report Generator Form & Report History */}
        <div className="xl:col-span-5 flex flex-col gap-4">
          
          {/* Report Generator Card */}
          <div className="card p-5 text-left space-y-4">
            <h3 className="text-xs font-bold text-surface-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={14} className="text-brand-400" />
              Generate Audit Report
            </h3>
            
            <form onSubmit={handleGenerateReport} className="space-y-3">
              <div>
                <label className="text-[10px] text-surface-400 uppercase tracking-wider block font-bold mb-1">Report Specification</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as any)}
                  className="input py-2"
                >
                  <option value="Tax Audit (3CD)">Form 3CD Tax Audit Statement</option>
                  <option value="GST Reconciliation (GSTR-9)">GST Reconciliation (GSTR-9 Reconciler)</option>
                  <option value="ITC Verification">ITC Verification Certificate</option>
                  <option value="Bank Audit">Bank Reconciliation Audit Statement</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-surface-400 uppercase tracking-wider block font-bold mb-1">Client Profile</label>
                  <select
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="input py-2"
                  >
                    <option value="Apex Steel Industries Pvt Ltd">Apex Steel Industries</option>
                    <option value="MGM Logistics Services">MGM Logistics Services</option>
                    <option value="Om Packaging Industries">Om Packaging Industries</option>
                    <option value="TechVibe Solution Hub LLP">TechVibe Solution Hub</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-surface-400 uppercase tracking-wider block font-bold mb-1">Fiscal Year</label>
                  <select
                    value={fyYear}
                    onChange={(e) => setFyYear(e.target.value)}
                    className="input py-2"
                  >
                    <option value="FY 2025-26">FY 2025-26</option>
                    <option value="FY 2026-27">FY 2026-27</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="btn-primary w-full text-xs justify-center gap-1.5 mt-2"
              >
                <Sparkles size={13} /> Compile Local Report Draft
              </button>
            </form>
          </div>

          {/* Report History */}
          <div className="card p-4 flex-1 flex flex-col min-h-[250px]">
            <h3 className="text-xs font-bold text-surface-400 uppercase tracking-wider mb-3 pb-2 border-b border-surface-800 text-left">
              Draft History Log
            </h3>
            
            <div className="space-y-2 flex-1 overflow-y-auto max-h-[300px]">
              {reports.map((report) => {
                const isSelected = report.id === selectedReportId
                return (
                  <div
                    key={report.id}
                    onClick={() => setSelectedReportId(report.id)}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-brand-500/10 border-brand-500/40 text-surface-100 shadow-sm'
                        : 'bg-surface-900 border-surface-800 hover:border-surface-700 text-surface-300'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate text-surface-200">{report.title}</p>
                      <p className="text-[9px] text-surface-500 font-mono mt-0.5">{report.fy} · {report.type}</p>
                    </div>
                    <span className="text-[9px] text-surface-500 font-mono flex-shrink-0 ml-2">{report.generatedAt}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Right Side: Document Preview Pane */}
        <div className="xl:col-span-7 flex flex-col">
          <div className="card p-5 flex flex-col h-full min-h-[500px] justify-between">
            {selectedReport ? (
              <>
                {/* Preview Toolbar */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-surface-800 pb-3 mb-4 gap-3">
                  <div className="text-left">
                    <h3 className="text-sm font-bold text-surface-100 truncate">{selectedReport.title}</h3>
                    <p className="text-xs text-surface-500 mt-0.5">Format: <span className="text-surface-300 font-semibold">{selectedReport.type}</span></p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {selectedReport.hasPdf && (
                      <button
                        onClick={() => toast.success('Exporting report as PDF...')}
                        className="btn-secondary px-3 py-1.5 text-xs gap-1.5 border border-surface-700"
                      >
                        <Download size={13} /> Export PDF
                      </button>
                    )}
                    {selectedReport.hasExcel && (
                      <button
                        onClick={() => toast.success('Exporting report as Excel spreadsheet...')}
                        className="btn-secondary px-3 py-1.5 text-xs gap-1.5 border border-surface-700"
                      >
                        <Download size={13} /> Export Excel
                      </button>
                    )}
                  </div>
                </div>

                {/* Simulated Document Preview Page */}
                <div className="flex-1 bg-white dark:bg-surface-950 p-6 rounded-xl border border-surface-200 dark:border-surface-800 text-left font-serif shadow-inner overflow-y-auto max-h-[400px]">
                  <div className="space-y-6 text-slate-800 dark:text-slate-200">
                    {/* Document Header */}
                    <div className="text-center space-y-1.5 border-b-2 border-slate-900 dark:border-slate-300 pb-4">
                      <h4 className="text-base font-bold uppercase tracking-wider text-slate-900 dark:text-white">Audit Reconciler Draft Certificate</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-sans">Prepared by: CA COPILOT ASSISTANT · Local Audit Agent v1.0.0</p>
                    </div>

                    {/* Section 1 */}
                    <div className="space-y-2 text-xs">
                      <h5 className="font-bold text-slate-900 dark:text-white font-sans uppercase text-[10px]">1. Client Account Specifications</h5>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1 font-sans text-[11px] text-slate-600 dark:text-slate-400">
                        <p><span className="font-semibold text-slate-800 dark:text-slate-200">Assessed Entity:</span> {selectedReport.client}</p>
                        <p><span className="font-semibold text-slate-800 dark:text-slate-200">Assessment FY:</span> {selectedReport.fy}</p>
                        <p><span className="font-semibold text-slate-800 dark:text-slate-200">Sync Date:</span> 2026-07-20</p>
                        <p><span className="font-semibold text-slate-800 dark:text-slate-200">Audit Status:</span> Draft Completed</p>
                      </div>
                    </div>

                    {/* Section 2 */}
                    <div className="space-y-2 text-xs">
                      <h5 className="font-bold text-slate-900 dark:text-white font-sans uppercase text-[10px]">2. Executive Compliance Overview</h5>
                      <p className="leading-relaxed text-slate-700 dark:text-slate-300 font-serif text-xs">
                        This document serves as an analytical reconciliation report prepared in support of tax assessment filings. All purchase ledgers, banking narratives, and invoices processed during the fiscal period were audited for tax rate accuracy and validity under Indian GST and Income Tax statutes.
                      </p>
                    </div>

                    {/* Section 3 (Conditional data based on report type) */}
                    <div className="space-y-2 text-xs">
                      <h5 className="font-bold text-slate-900 dark:text-white font-sans uppercase text-[10px]">3. Key Reconciliation Balances</h5>
                      <div className="border border-slate-350 dark:border-slate-800 rounded font-sans overflow-hidden">
                        <table className="w-full text-left text-[11px]">
                          <thead>
                            <tr className="bg-slate-100 dark:bg-surface-900 text-slate-700 dark:text-slate-400 border-b border-slate-300 dark:border-slate-800">
                              <th className="p-2">Compliance Description</th>
                              <th className="p-2 text-right">Ledger Books</th>
                              <th className="p-2 text-right">Government Portal</th>
                              <th className="p-2 text-right">Net Variance</th>
                            </tr>
                          </thead>
                          <tbody className="text-slate-600 dark:text-slate-300 divide-y divide-slate-200 dark:divide-slate-800">
                            <tr>
                              <td className="p-2 font-medium text-slate-800 dark:text-slate-100">Taxable Purchase Value</td>
                              <td className="p-2 text-right font-mono">₹45,22,180.00</td>
                              <td className="p-2 text-right font-mono">₹44,72,180.00</td>
                              <td className="p-2 text-right font-mono text-red-500">₹50,000.00</td>
                            </tr>
                            <tr>
                              <td className="p-2 font-medium text-slate-800 dark:text-slate-100">Claimed Input Tax Credit (ITC)</td>
                              <td className="p-2 text-right font-mono">₹8,13,992.00</td>
                              <td className="p-2 text-right font-mono">₹8,05,892.00</td>
                              <td className="p-2 text-right font-mono text-red-500">₹8,100.00</td>
                            </tr>
                            <tr className="bg-slate-50 dark:bg-surface-900 font-bold text-slate-900 dark:text-white">
                              <td className="p-2">Total Verified Reconciliations</td>
                              <td className="p-2 text-right font-mono">₹53,36,172.00</td>
                              <td className="p-2 text-right font-mono">₹52,78,072.00</td>
                              <td className="p-2 text-right font-mono text-red-500">₹58,100.00</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Section 4 */}
                    <div className="space-y-4 text-xs font-sans pt-4 border-t border-slate-300 dark:border-slate-800">
                      <div className="flex justify-between items-end text-slate-500">
                        <div>
                          <p className="text-[10px]">VERIFIED BY LOCAL AI ENGINE</p>
                          <p className="text-emerald-500 font-bold text-[10px] mt-0.5">COMPLIANT MATCHED</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase font-bold text-slate-800 dark:text-white">Chartered Accountant Seal</p>
                          <p className="text-[9px] mt-1 text-slate-400 font-mono">Digitally Drafted - 2026-07-20</p>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => toast.success('Sending report draft for signature...')}
                    className="btn-primary flex-1 text-xs justify-center"
                  >
                    Draft Sign & Approve Report
                  </button>
                  <button
                    onClick={() => toast.success('Opening audit timeline logs')}
                    className="btn-secondary px-3.5 text-xs border border-surface-700"
                  >
                    View Revision History
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-20 text-surface-500">
                <BarChart3 size={26} className="mb-2" />
                <p className="text-sm">Select a report from the draft history log to review certificate preview details</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
