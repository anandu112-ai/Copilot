import { useState } from 'react'
import {
  Calculator, CheckCircle2, AlertTriangle, HelpCircle, Search, Filter,
  TrendingUp, Download, Eye, RefreshCw, Send, Mail
} from 'lucide-react'
import toast from 'react-hot-toast'

interface GstReconciliationRecord {
  id: string
  invoiceNumber: string
  date: string
  vendor: string
  taxableAmount: number
  gstAmount: number
  matchStatus: 'Matched' | 'Missing' | 'Amount Difference'
  booksData: {
    taxableAmount: number
    gstAmount: number
    date: string
  }
  gstr2bData: {
    taxableAmount: number
    gstAmount: number
    date: string
  } | null
  taxDifference: number
}

const mockReconciliationRecords: GstReconciliationRecord[] = [
  {
    id: 'rec-1',
    invoiceNumber: 'INV-2026-8941',
    date: '2026-07-15',
    vendor: 'Apex Steel Industries Pvt Ltd',
    taxableAmount: 150000.00,
    gstAmount: 27000.00,
    matchStatus: 'Matched',
    booksData: { taxableAmount: 150000.00, gstAmount: 27000.00, date: '2026-07-15' },
    gstr2bData: { taxableAmount: 150000.00, gstAmount: 27000.00, date: '2026-07-15' },
    taxDifference: 0
  },
  {
    id: 'rec-2',
    invoiceNumber: 'MGM/26-27/451',
    date: '2026-07-10',
    vendor: 'MGM Logistics Services',
    taxableAmount: 45000.00,
    gstAmount: 8100.00,
    matchStatus: 'Amount Difference',
    booksData: { taxableAmount: 45000.00, gstAmount: 8100.00, date: '2026-07-10' },
    gstr2bData: { taxableAmount: 45000.00, gstAmount: 5400.00, date: '2026-07-10' }, // Vendor filed 12% instead of 18%
    taxDifference: 2700.00
  },
  {
    id: 'rec-3',
    invoiceNumber: 'OB-992182',
    date: '2026-07-20',
    vendor: 'Bharat Petroleum Corp',
    taxableAmount: 4800.00,
    gstAmount: 864.00,
    matchStatus: 'Missing', // Not filed in GSTR-2B
    booksData: { taxableAmount: 4800.00, gstAmount: 864.00, date: '2026-07-20' },
    gstr2bData: null,
    taxDifference: 864.00
  },
  {
    id: 'rec-4',
    invoiceNumber: 'EL-88910',
    date: '2026-07-05',
    vendor: 'Power Grid Electricals',
    taxableAmount: 75000.00,
    gstAmount: 13500.00,
    matchStatus: 'Matched',
    booksData: { taxableAmount: 75000.00, gstAmount: 13500.00, date: '2026-07-05' },
    gstr2bData: { taxableAmount: 75000.00, gstAmount: 13500.00, date: '2026-07-05' },
    taxDifference: 0
  },
  {
    id: 'rec-5',
    invoiceNumber: 'TVS-2026-441',
    date: '2026-07-20',
    vendor: 'TechVibe Solution Hub',
    taxableAmount: 18000.00,
    gstAmount: 3240.00,
    matchStatus: 'Matched',
    booksData: { taxableAmount: 18000.00, gstAmount: 3240.00, date: '2026-07-20' },
    gstr2bData: { taxableAmount: 18000.00, gstAmount: 3240.00, date: '2026-07-20' },
    taxDifference: 0
  }
]

export default function GstReconciliationPage() {
  const [records, setRecords] = useState<GstReconciliationRecord[]>(mockReconciliationRecords)
  const [selectedRecordId, setSelectedRecordId] = useState<string>('rec-2')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('All')

  const selectedRecord = records.find(r => r.id === selectedRecordId)

  const handleSendReminder = (vendor: string, invNo: string, diff: number) => {
    toast.success(`Drafted email reminder to ${vendor} for invoice ${invNo} (GST diff: ₹${diff.toLocaleString('en-IN')})`)
  }

  const handleRecalculate = () => {
    toast.loading('Matching Purchase Register vs GSTR-2B (locally)...')
    setTimeout(() => {
      toast.dismiss()
      toast.success('GST reconciliation completed. 2 discrepancies found.')
    }, 1500)
  }

  const filteredRecords = records.filter(r => {
    const matchesSearch = r.vendor.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = statusFilter === 'All' || r.matchStatus === statusFilter
    return matchesSearch && matchesFilter
  })

  return (
    <div className="page-container">
      {/* Header */}
      <div className="section-header">
        <div>
          <h2 className="text-lg font-bold text-surface-100 flex items-center gap-2">
            <Calculator size={18} className="text-brand-500" />
            GST Reconciliation (Books vs GSTR-2B)
          </h2>
          <p className="text-sm text-surface-400 mt-0.5">Match vendor entries, identify missing ITC claims, and flag taxable value discrepancies</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRecalculate}
            className="btn-secondary text-xs gap-1.5 border border-surface-700"
          >
            <RefreshCw size={12} /> Sync GSTR-2B
          </button>
          <button
            onClick={() => toast.success('Exporting GST Reconciliation report')}
            className="btn-primary text-xs gap-1.5"
          >
            <Download size={12} /> Export Report
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-[10px] text-surface-400 font-bold uppercase tracking-wider">Total Invoices compared</p>
          <p className="text-2xl font-bold text-surface-100 mt-1">{records.length} records</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Matched (Ready for ITC)</p>
          <p className="text-2xl font-bold text-surface-100 mt-1">
            {records.filter(r => r.matchStatus === 'Matched').length} invoices
          </p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">Tax Difference Detected</p>
          <p className="text-2xl font-bold text-surface-100 mt-1">
            ₹{records.reduce((sum, r) => r.matchStatus === 'Amount Difference' ? sum + r.taxDifference : sum, 0).toLocaleString('en-IN')}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider">Missing in GSTR-2B</p>
          <p className="text-2xl font-bold text-surface-100 mt-1">
            {records.filter(r => r.matchStatus === 'Missing').length} claims (₹{records.reduce((sum, r) => r.matchStatus === 'Missing' ? sum + r.taxDifference : sum, 0).toLocaleString('en-IN')})
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        
        {/* Table Area */}
        <div className="xl:col-span-8 flex flex-col gap-4">
          <div className="card p-4 flex flex-col h-full">
            <div className="flex flex-col sm:flex-row justify-between gap-3 items-center mb-4">
              <div className="flex items-center gap-2 w-full sm:max-w-xs bg-surface-900 border border-surface-700 rounded-lg px-2.5 py-1">
                <Search size={14} className="text-surface-500" />
                <input
                  type="text"
                  placeholder="Search invoices, vendors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-transparent border-none text-xs text-surface-100 placeholder-surface-500 outline-none w-full focus:ring-0"
                />
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-xs text-surface-500 flex items-center gap-1"><Filter size={12} /> Status:</span>
                {['All', 'Matched', 'Missing', 'Amount Difference'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setStatusFilter(filter)}
                    className={`px-2.5 py-1 rounded text-xs transition-colors ${
                      statusFilter === filter
                        ? 'bg-brand-600 text-white font-medium'
                        : 'bg-surface-900 border border-surface-800 text-surface-400 hover:text-surface-200'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            <div className="table-wrapper flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-800 border-b border-surface-700 text-surface-400 uppercase tracking-wider text-[10px]">
                    <th className="p-3">Invoice Number</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Vendor</th>
                    <th className="p-3 text-right">Taxable Amount</th>
                    <th className="p-3 text-right">GST Amount</th>
                    <th className="p-3 text-center">Match Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.length > 0 ? (
                    filteredRecords.map((r) => {
                      const isSelected = r.id === selectedRecordId
                      return (
                        <tr
                          key={r.id}
                          onClick={() => setSelectedRecordId(r.id)}
                          className={`cursor-pointer hover:bg-surface-750 border-b border-surface-800 ${
                            isSelected ? 'bg-brand-500/5' : ''
                          }`}
                        >
                          <td className="p-3 text-xs font-semibold font-mono text-surface-100">{r.invoiceNumber}</td>
                          <td className="p-3 text-xs text-surface-300 font-mono">{r.date}</td>
                          <td className="p-3 text-xs text-surface-200">{r.vendor}</td>
                          <td className="p-3 text-xs text-right text-surface-200 font-mono">₹{r.taxableAmount.toLocaleString('en-IN')}</td>
                          <td className="p-3 text-xs text-right text-surface-300 font-mono">₹{r.gstAmount.toLocaleString('en-IN')}</td>
                          <td className="p-3 text-center">
                            {r.matchStatus === 'Matched' && (
                              <span className="badge badge-success px-2 py-0.5 text-[10px]">Matched</span>
                            )}
                            {r.matchStatus === 'Missing' && (
                              <span className="badge badge-error px-2 py-0.5 text-[10px]">Missing</span>
                            )}
                            {r.matchStatus === 'Amount Difference' && (
                              <span className="badge badge-warning px-2 py-0.5 text-[10px]">Amount Diff</span>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="text-center p-12 text-xs text-surface-500">No records found matching filters</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Comparison Details Sidebar */}
        <div className="xl:col-span-4 flex flex-col">
          <div className="card p-5 flex flex-col h-full justify-between gap-4 text-left">
            {selectedRecord ? (
              <>
                <div className="space-y-4">
                  <div className="border-b border-surface-800 pb-3">
                    <h3 className="text-xs font-bold text-surface-400 uppercase tracking-wider">Comparison Breakdown</h3>
                    <h4 className="text-sm font-bold text-surface-100 mt-1 truncate">{selectedRecord.vendor}</h4>
                    <p className="text-xs text-surface-500 font-mono mt-0.5">Inv: {selectedRecord.invoiceNumber}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {/* Books */}
                    <div className="bg-surface-950 p-3 rounded-lg border border-surface-800">
                      <p className="text-[10px] text-brand-400 font-bold uppercase tracking-wider mb-2">Our Purchase Register</p>
                      <div className="space-y-1 font-mono text-[11px]">
                        <p className="flex justify-between"><span className="text-surface-500">Date:</span> <span className="text-surface-200">{selectedRecord.booksData.date}</span></p>
                        <p className="flex justify-between"><span className="text-surface-500">Taxable:</span> <span className="text-surface-200">₹{selectedRecord.booksData.taxableAmount.toLocaleString('en-IN')}</span></p>
                        <p className="flex justify-between"><span className="text-surface-500">GST:</span> <span className="text-surface-200">₹{selectedRecord.booksData.gstAmount.toLocaleString('en-IN')}</span></p>
                      </div>
                    </div>

                    {/* Government Ledger */}
                    <div className="bg-surface-950 p-3 rounded-lg border border-surface-800">
                      <p className="text-[10px] text-amber-500 font-bold uppercase tracking-wider mb-2">GSTR-2B government portal</p>
                      {selectedRecord.gstr2bData ? (
                        <div className="space-y-1 font-mono text-[11px]">
                          <p className="flex justify-between"><span className="text-surface-500">Date:</span> <span className="text-surface-200">{selectedRecord.gstr2bData.date}</span></p>
                          <p className="flex justify-between"><span className="text-surface-500">Taxable:</span> <span className="text-surface-200">₹{selectedRecord.gstr2bData.taxableAmount.toLocaleString('en-IN')}</span></p>
                          <p className="flex justify-between"><span className="text-surface-500">GST:</span> <span className="text-surface-200">₹{selectedRecord.gstr2bData.gstAmount.toLocaleString('en-IN')}</span></p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-12 text-center text-red-400">
                          <AlertTriangle size={14} className="mb-0.5" />
                          <p className="text-[10px] font-semibold">Not Filed by Vendor</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* AI Diagnosis */}
                  <div className="bg-surface-900 p-3 rounded-lg border border-surface-800 space-y-2">
                    <h4 className="text-xs font-semibold text-surface-200 flex items-center gap-1.5">
                      <Calculator size={13} className="text-brand-400" />
                      AI Discrepancy Diagnostics
                    </h4>
                    {selectedRecord.matchStatus === 'Matched' && (
                      <p className="text-xs text-surface-400 leading-relaxed">
                        Data perfectly reconciled. Tax values, rates, and transaction dates match exactly. Suitable for full Input Tax Credit (ITC) offset claim.
                      </p>
                    )}
                    {selectedRecord.matchStatus === 'Missing' && (
                      <p className="text-xs text-surface-400 leading-relaxed">
                        This purchase transaction is recorded in books, but is absent from the GSTR-2B portal download. The vendor has not filed their GSTR-1 for this invoice. You will be unable to claim ITC offset of ₹{selectedRecord.taxDifference.toLocaleString('en-IN')} until they file.
                      </p>
                    )}
                    {selectedRecord.matchStatus === 'Amount Difference' && (
                      <p className="text-xs text-surface-400 leading-relaxed">
                        The vendor filed this invoice in GSTR-1, but at a different tax rate or value. Books show GST rate is 18% (₹{selectedRecord.booksData.gstAmount.toLocaleString('en-IN')}) but GSTR-2B shows 12% (₹{selectedRecord.gstr2bData?.gstAmount.toLocaleString('en-IN')}). Discrepancy amount is ₹{selectedRecord.taxDifference.toLocaleString('en-IN')}.
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  {selectedRecord.matchStatus !== 'Matched' && (
                    <button
                      onClick={() => handleSendReminder(selectedRecord.vendor, selectedRecord.invoiceNumber, selectedRecord.taxDifference)}
                      className="btn-primary w-full text-xs justify-center gap-1.5"
                    >
                      <Mail size={13} /> Draft Vendor Reminder Email
                    </button>
                  )}
                  <button
                    onClick={() => toast.success('Overriding status and matching manually')}
                    className="btn-secondary w-full text-xs justify-center border border-surface-700"
                  >
                    Force Manual Reconcile (Override)
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-20 text-surface-500">
                <Calculator size={26} className="mb-2" />
                <p className="text-sm">Select any record to view ledger comparison breakdown</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
