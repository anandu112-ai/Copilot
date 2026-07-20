import { useState } from 'react'
import {
  Receipt, CheckCircle2, AlertTriangle, XCircle, Search, Filter,
  TrendingUp, Download, ShieldCheck, Play, ArrowRight, Eye, RefreshCw
} from 'lucide-react'
import toast from 'react-hot-toast'

interface InvoiceRecord {
  id: string
  invoiceNumber: string
  date: string
  vendor: string
  gstin: string
  taxableAmount: number
  gstAmount: number
  totalAmount: number
  complianceStatus: 'Verified' | 'Flagged' | 'Action Required'
  vouchStatus: 'Not Vouched' | 'Approved' | 'Flagged' | 'Rejected'
  issue?: string
  confidenceScore: number
}

const mockInvoices: InvoiceRecord[] = [
  {
    id: 'inv-101',
    invoiceNumber: 'TAX/2026/089',
    date: '2026-07-12',
    vendor: 'Aditya Birla Chemicals Ltd',
    gstin: '24AAACA1209B1Z4',
    taxableAmount: 240000.00,
    gstAmount: 43200.00,
    totalAmount: 283200.00,
    complianceStatus: 'Verified',
    vouchStatus: 'Approved',
    confidenceScore: 99
  },
  {
    id: 'inv-102',
    invoiceNumber: 'MS-55102',
    date: '2026-07-14',
    vendor: 'Max Software Solutions',
    gstin: '27BBBCA8891D1Z1',
    taxableAmount: 125000.00,
    gstAmount: 22500.00,
    totalAmount: 147500.00,
    complianceStatus: 'Flagged',
    vouchStatus: 'Flagged',
    issue: 'Vendor GSTIN registered as Composition Taxpayer (cannot levy tax)',
    confidenceScore: 92
  },
  {
    id: 'inv-103',
    invoiceNumber: 'LOG-9921',
    date: '2026-07-16',
    vendor: 'Royal Express Cargo Pvt Ltd',
    gstin: '29AAACR4419E2Z7',
    taxableAmount: 85000.00,
    gstAmount: 15300.00,
    totalAmount: 100300.00,
    complianceStatus: 'Action Required',
    vouchStatus: 'Not Vouched',
    issue: 'Duplicate invoice number found in FY26 ledger for same vendor',
    confidenceScore: 97
  },
  {
    id: 'inv-104',
    invoiceNumber: 'INV-441028',
    date: '2026-07-18',
    vendor: 'Om Packaging Industries',
    gstin: '27AABCO2981M2Z5',
    taxableAmount: 45000.00,
    gstAmount: 8100.00,
    totalAmount: 53100.00,
    complianceStatus: 'Verified',
    vouchStatus: 'Not Vouched',
    confidenceScore: 98
  },
  {
    id: 'inv-105',
    invoiceNumber: 'BP/778921',
    date: '2026-07-19',
    vendor: 'Speedway Fuels & Services',
    gstin: '27AAACS1820H1ZA',
    taxableAmount: 12400.00,
    gstAmount: 2232.00,
    totalAmount: 14632.00,
    complianceStatus: 'Flagged',
    vouchStatus: 'Rejected',
    issue: 'Math Error: Total claims do not match line items (off by ₹150.00)',
    confidenceScore: 89
  }
]

export default function InvoiceProcessingPage() {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>(mockInvoices)
  const [selectedInvId, setSelectedInvId] = useState<string>('inv-102')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('All')

  const selectedInv = invoices.find(inv => inv.id === selectedInvId)

  const handleVouchAction = (id: string, action: 'Approved' | 'Flagged' | 'Rejected') => {
    setInvoices(prev => prev.map(inv => {
      if (inv.id === id) {
        return { ...inv, vouchStatus: action }
      }
      return inv
    }))
    toast.success(`Invoice status updated to ${action}`)
  }

  const runAiVouchingBatch = () => {
    toast.success('Analyzing 5 invoices with AI engine... checks: duplicate check, math verify, GST registration verification')
  }

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.vendor.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          inv.gstin.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = statusFilter === 'All' || inv.complianceStatus === statusFilter
    return matchesSearch && matchesFilter
  })

  return (
    <div className="page-container">
      {/* Header */}
      <div className="section-header">
        <div>
          <h2 className="text-lg font-bold text-surface-100 flex items-center gap-2">
            <Receipt size={18} className="text-brand-500" />
            Invoice Processing & Auto-Vouching
          </h2>
          <p className="text-sm text-surface-400 mt-0.5">Automate vouching compliance checks against Purchase Ledgers, GSTR-2B, and vendor registrations</p>
        </div>
        <div>
          <button
            onClick={runAiVouchingBatch}
            className="btn-primary text-xs gap-1.5"
          >
            <Play size={13} /> Run Batch Auto-Audit
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-[10px] text-surface-400 font-bold uppercase tracking-wider">Processed Today</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-surface-100">{invoices.length} Invoices</span>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-medium">100% locally</span>
          </div>
        </div>
        <div className="card p-4">
          <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">AI Verified (Auto)</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-surface-100">{invoices.filter(i => i.complianceStatus === 'Verified').length} Passed</span>
            <span className="text-[10px] text-surface-500">Zero errors</span>
          </div>
        </div>
        <div className="card p-4">
          <p className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">Flags Raised</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-surface-100">{invoices.filter(i => i.complianceStatus !== 'Verified').length} Flagged</span>
            <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded font-medium">Requires CA review</span>
          </div>
        </div>
        <div className="card p-4">
          <p className="text-[10px] text-brand-400 font-bold uppercase tracking-wider">Vouching Progress</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-surface-100">
              {invoices.filter(i => i.vouchStatus !== 'Not Vouched').length} / {invoices.length}
            </span>
            <span className="text-[10px] text-surface-400">
              {Math.round((invoices.filter(i => i.vouchStatus !== 'Not Vouched').length / invoices.length) * 100)}% done
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Side: Invoice Ledger View */}
        <div className="xl:col-span-8 flex flex-col gap-4">
          <div className="card p-4 flex flex-col h-full">
            {/* Filters bar */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center mb-4">
              <div className="flex items-center gap-2 w-full sm:max-w-xs bg-surface-900 border border-surface-700 rounded-lg px-2.5 py-1">
                <Search size={14} className="text-surface-500" />
                <input
                  type="text"
                  placeholder="Search invoices, vendors, GSTIN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-transparent border-none text-xs text-surface-100 placeholder-surface-500 outline-none w-full focus:ring-0"
                />
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-surface-500 flex items-center gap-1"><Filter size={12} /> Compliance:</span>
                {['All', 'Verified', 'Flagged', 'Action Required'].map((filter) => (
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

            {/* Dense Data Table */}
            <div className="table-wrapper flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-800 border-b border-surface-700 text-surface-400 uppercase tracking-wider text-[10px]">
                    <th className="p-3">Vendor / Invoice</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">GSTIN</th>
                    <th className="p-3 text-right">Taxable Value</th>
                    <th className="p-3 text-right">GST</th>
                    <th className="p-3 text-right">Total</th>
                    <th className="p-3 text-center">AI Compliance</th>
                    <th className="p-3 text-center">Vouch State</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.length > 0 ? (
                    filteredInvoices.map((inv) => {
                      const isSelected = inv.id === selectedInvId
                      return (
                        <tr
                          key={inv.id}
                          onClick={() => setSelectedInvId(inv.id)}
                          className={`cursor-pointer hover:bg-surface-750 border-b border-surface-800 ${
                            isSelected ? 'bg-brand-500/5' : ''
                          }`}
                        >
                          <td className="p-3">
                            <p className="text-xs font-semibold text-surface-100">{inv.vendor}</p>
                            <p className="text-[10px] font-mono text-surface-500 mt-0.5">{inv.invoiceNumber}</p>
                          </td>
                          <td className="p-3 text-xs text-surface-300 font-mono">{inv.date}</td>
                          <td className="p-3 text-xs font-mono text-surface-400">{inv.gstin}</td>
                          <td className="p-3 text-xs text-right text-surface-200 font-mono">₹{inv.taxableAmount.toLocaleString('en-IN')}</td>
                          <td className="p-3 text-xs text-right text-surface-300 font-mono">₹{inv.gstAmount.toLocaleString('en-IN')}</td>
                          <td className="p-3 text-xs text-right text-surface-100 font-bold font-mono">₹{inv.totalAmount.toLocaleString('en-IN')}</td>
                          <td className="p-3 text-center">
                            {inv.complianceStatus === 'Verified' && (
                              <span className="badge badge-success px-2 py-0.5 text-[10px]">
                                <CheckCircle2 size={10} /> Verified
                              </span>
                            )}
                            {inv.complianceStatus === 'Flagged' && (
                              <span className="badge badge-warning px-2 py-0.5 text-[10px]">
                                <AlertTriangle size={10} /> Flagged
                              </span>
                            )}
                            {inv.complianceStatus === 'Action Required' && (
                              <span className="badge badge-error px-2 py-0.5 text-[10px]">
                                <XCircle size={10} /> Critical
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 text-[10px] font-semibold rounded ${
                              inv.vouchStatus === 'Approved' ? 'bg-emerald-500/10 text-emerald-400' :
                              inv.vouchStatus === 'Flagged' ? 'bg-amber-500/10 text-amber-400' :
                              inv.vouchStatus === 'Rejected' ? 'bg-red-500/10 text-red-400' :
                              'bg-surface-700 text-surface-400'
                            }`}>
                              {inv.vouchStatus}
                            </span>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="text-center p-12 text-xs text-surface-500">No matching invoices found in this batch</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Side: Vouching Panel */}
        <div className="xl:col-span-4 flex flex-col">
          <div className="card p-5 flex flex-col h-full justify-between gap-6">
            {selectedInv ? (
              <>
                <div className="text-left space-y-4">
                  <div className="border-b border-surface-800 pb-3">
                    <h3 className="text-xs font-bold text-surface-400 uppercase tracking-wider">Vouching Verification Assistant</h3>
                    <h4 className="text-sm font-bold text-surface-100 mt-1">{selectedInv.vendor}</h4>
                    <p className="text-xs text-surface-500 font-mono mt-0.5">Invoice: {selectedInv.invoiceNumber}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs py-1 border-b border-surface-900">
                      <span className="text-surface-500">Place of Supply</span>
                      <span className="text-surface-200 font-medium font-mono">Maharashtra (GSTIN: 27)</span>
                    </div>
                    <div className="flex justify-between text-xs py-1 border-b border-surface-900">
                      <span className="text-surface-500">Tax Type</span>
                      <span className="text-surface-200 font-medium">CGST (9%) + SGST (9%)</span>
                    </div>
                    <div className="flex justify-between text-xs py-1 border-b border-surface-900">
                      <span className="text-surface-500">Extraction Confidence</span>
                      <span className="text-emerald-400 font-bold font-mono">{selectedInv.confidenceScore}%</span>
                    </div>
                  </div>

                  {/* AI Finding Card */}
                  <div className="bg-surface-950 p-4 rounded-xl border border-surface-800 space-y-2.5">
                    <div className="flex items-center gap-1.5 text-brand-400 font-semibold text-xs">
                      <ShieldCheck size={14} />
                      <span>AI Verification Report</span>
                    </div>
                    {selectedInv.complianceStatus === 'Verified' ? (
                      <p className="text-xs text-surface-400 leading-relaxed">
                        This invoice successfully passed all validation checks. We mapped the vendor GSTIN against government databases (validated active status), confirmed math checksum parameters, and reconciled invoice numbers against past journal entries.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        <p className="text-xs font-bold text-amber-500">Issue Detected:</p>
                        <p className="text-xs text-surface-300 leading-relaxed bg-surface-900 p-2.5 rounded border border-surface-800 font-mono">
                          {selectedInv.issue}
                        </p>
                        <p className="text-[11px] text-surface-500 leading-relaxed">
                          Recommendation: Verify the vendor's actual registration certificate or GSTR-2B filing status. Do not claim Input Tax Credit (ITC) if composition levy holds true.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2.5">
                  <p className="text-[10px] text-surface-500 uppercase tracking-wider text-left">Actions</p>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleVouchAction(selectedInv.id, 'Approved')}
                      className={`py-2 rounded-lg text-xs font-semibold border transition-all ${
                        selectedInv.vouchStatus === 'Approved'
                          ? 'bg-emerald-600 border-emerald-500 text-white'
                          : 'bg-surface-900 border-surface-800 text-emerald-500 hover:bg-emerald-500/5'
                      }`}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleVouchAction(selectedInv.id, 'Flagged')}
                      className={`py-2 rounded-lg text-xs font-semibold border transition-all ${
                        selectedInv.vouchStatus === 'Flagged'
                          ? 'bg-amber-600 border-amber-500 text-white'
                          : 'bg-surface-900 border-surface-800 text-amber-500 hover:bg-amber-500/5'
                      }`}
                    >
                      Flag Audit
                    </button>
                    <button
                      onClick={() => handleVouchAction(selectedInv.id, 'Rejected')}
                      className={`py-2 rounded-lg text-xs font-semibold border transition-all ${
                        selectedInv.vouchStatus === 'Rejected'
                          ? 'bg-red-600 border-red-500 text-white'
                          : 'bg-surface-900 border-surface-800 text-red-400 hover:bg-red-500/5'
                      }`}
                    >
                      Reject
                    </button>
                  </div>
                  <button
                    onClick={() => toast.success('Opening file visual comparison viewer')}
                    className="btn-secondary w-full text-xs justify-center gap-1.5 mt-2"
                  >
                    <Eye size={13} /> View Extracted Document Source
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-20 text-surface-500">
                <Receipt size={26} className="mb-2" />
                <p className="text-sm">Select an invoice to launch verification options</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
