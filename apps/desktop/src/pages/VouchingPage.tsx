import { useState } from 'react'
import {
  BookCheck, CheckCircle2, Clock, AlertCircle, XCircle,
  ChevronRight, ChevronDown, Send, User, Users, Shield,
  FileText, RotateCcw, MessageSquare, Eye, Download,
  Sparkles, History, Filter, Search, Lock, ArrowRight
} from 'lucide-react'
import toast from 'react-hot-toast'

// ─── Types ────────────────────────────────────────────────────────────────────

type ApprovalStatus = 'pending' | 'in_review' | 'approved' | 'rejected' | 'sent_back'
type ReviewLevel = 'junior' | 'senior' | 'partner'

interface VersionEntry {
  version: number
  editedBy: string
  editedAt: string
  summary: string
}

interface ApprovalLogEntry {
  level: ReviewLevel
  reviewer: string
  status: ApprovalStatus
  timestamp: string
  note: string
}

interface Voucher {
  id: string
  voucherNo: string
  date: string
  client: string
  type: 'Purchase' | 'Sales' | 'Payment' | 'Receipt' | 'Journal'
  narration: string
  amount: number
  debitAccount: string
  creditAccount: string
  currentLevel: ReviewLevel
  status: ApprovalStatus
  juniorApproval: ApprovalStatus
  seniorApproval: ApprovalStatus
  partnerApproval: ApprovalStatus
  supportingDocs: number
  versionLog: VersionEntry[]
  approvalLog: ApprovalLogEntry[]
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const mockVouchers: Voucher[] = [
  {
    id: 'v001',
    voucherNo: 'PV-2026-0478',
    date: '2026-07-15',
    client: 'Apex Steel Industries',
    type: 'Purchase',
    narration: 'Raw material procurement – HR Coils from Shyam Metals',
    amount: 485000,
    debitAccount: 'Raw Material A/c',
    creditAccount: 'Shyam Metals Creditor A/c',
    currentLevel: 'senior',
    status: 'in_review',
    juniorApproval: 'approved',
    seniorApproval: 'in_review',
    partnerApproval: 'pending',
    supportingDocs: 3,
    versionLog: [
      { version: 2, editedBy: 'Riya Sharma (Jr.)', editedAt: '2026-07-16 10:32', summary: 'Updated narration and GST tax amount after supplier invoice correction.' },
      { version: 1, editedBy: 'Riya Sharma (Jr.)', editedAt: '2026-07-15 14:12', summary: 'Initial voucher entry from Tally export.' }
    ],
    approvalLog: [
      { level: 'junior', reviewer: 'Riya Sharma', status: 'approved', timestamp: '2026-07-16 11:05', note: 'Verified against invoice PO#451 and GRN. Amounts match.' },
      { level: 'senior', reviewer: 'Arjun Mehta', status: 'in_review', timestamp: '2026-07-17 09:30', note: 'Checking ITC eligibility on capital goods component.' }
    ]
  },
  {
    id: 'v002',
    voucherNo: 'SV-2026-0202',
    date: '2026-07-10',
    client: 'MGM Logistics Services',
    type: 'Sales',
    narration: 'Freight forwarding services – July batch to Delhi Warehouse',
    amount: 128000,
    debitAccount: 'MGM Debtors A/c',
    creditAccount: 'Sales – Freight Services A/c',
    currentLevel: 'partner',
    status: 'in_review',
    juniorApproval: 'approved',
    seniorApproval: 'approved',
    partnerApproval: 'in_review',
    supportingDocs: 2,
    versionLog: [
      { version: 1, editedBy: 'Karan Verma (Jr.)', editedAt: '2026-07-11 09:00', summary: 'Initial voucher entry from Excel invoice register.' }
    ],
    approvalLog: [
      { level: 'junior', reviewer: 'Karan Verma', status: 'approved', timestamp: '2026-07-11 10:15', note: 'Cross-checked with client delivery receipts.' },
      { level: 'senior', reviewer: 'Priya Nair', status: 'approved', timestamp: '2026-07-13 14:45', note: 'GST rate verified @18%. Signed off.' },
      { level: 'partner', reviewer: 'CA Ramesh Iyer', status: 'in_review', timestamp: '2026-07-17 11:00', note: 'Reviewing high-value freight markup.' }
    ]
  },
  {
    id: 'v003',
    voucherNo: 'JV-2026-0034',
    date: '2026-07-08',
    client: 'Om Packaging Industries',
    type: 'Journal',
    narration: 'Depreciation adjustment entry for Plant & Machinery FY 2025-26',
    amount: 67500,
    debitAccount: 'Depreciation A/c',
    creditAccount: 'Plant & Machinery A/c',
    currentLevel: 'junior',
    status: 'pending',
    juniorApproval: 'pending',
    seniorApproval: 'pending',
    partnerApproval: 'pending',
    supportingDocs: 1,
    versionLog: [
      { version: 1, editedBy: 'System Import', editedAt: '2026-07-08 08:00', summary: 'Auto-generated depreciation voucher from asset master.' }
    ],
    approvalLog: []
  },
  {
    id: 'v004',
    voucherNo: 'PV-2026-0199',
    date: '2026-06-30',
    client: 'Apex Steel Industries',
    type: 'Payment',
    narration: 'TDS remittance for Q1 FY26-27 – Section 194C contractor payments',
    amount: 34200,
    debitAccount: 'TDS Payable A/c',
    creditAccount: 'Bank – SBI Current A/c',
    currentLevel: 'partner',
    status: 'approved',
    juniorApproval: 'approved',
    seniorApproval: 'approved',
    partnerApproval: 'approved',
    supportingDocs: 4,
    versionLog: [
      { version: 1, editedBy: 'Riya Sharma (Jr.)', editedAt: '2026-07-01 09:00', summary: 'TDS challan details filled after TRACES confirmation.' }
    ],
    approvalLog: [
      { level: 'junior', reviewer: 'Riya Sharma', status: 'approved', timestamp: '2026-07-01 10:30', note: 'TRACES challan CIN verified.' },
      { level: 'senior', reviewer: 'Arjun Mehta', status: 'approved', timestamp: '2026-07-02 11:00', note: 'Correct deductee count and rate.' },
      { level: 'partner', reviewer: 'CA Ramesh Iyer', status: 'approved', timestamp: '2026-07-03 16:00', note: 'Cleared for export to Tally.' }
    ]
  },
  {
    id: 'v005',
    voucherNo: 'RV-2026-0088',
    date: '2026-07-05',
    client: 'TechVibe Solution Hub',
    type: 'Receipt',
    narration: 'Advance received from client for ERP implementation – Phase 1',
    amount: 250000,
    debitAccount: 'Bank – HDFC Current A/c',
    creditAccount: 'TechVibe Advance Creditor A/c',
    currentLevel: 'senior',
    status: 'sent_back',
    juniorApproval: 'sent_back',
    seniorApproval: 'pending',
    partnerApproval: 'pending',
    supportingDocs: 0,
    versionLog: [
      { version: 1, editedBy: 'Karan Verma (Jr.)', editedAt: '2026-07-06 14:00', summary: 'Initial entry from bank statement.' }
    ],
    approvalLog: [
      { level: 'junior', reviewer: 'Riya Sharma', status: 'sent_back', timestamp: '2026-07-07 09:20', note: 'Missing client advance agreement copy and signed bank advice.' }
    ]
  }
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ApprovalStatus, { label: string; color: string; bg: string; icon: JSX.Element }> = {
  pending:   { label: 'Pending',    color: 'text-surface-400', bg: 'bg-surface-800',   icon: <Clock size={11} /> },
  in_review: { label: 'In Review',  color: 'text-amber-400',   bg: 'bg-amber-500/15',  icon: <Eye size={11} /> },
  approved:  { label: 'Approved',   color: 'text-emerald-400', bg: 'bg-emerald-500/15',icon: <CheckCircle2 size={11} /> },
  rejected:  { label: 'Rejected',   color: 'text-red-400',     bg: 'bg-red-500/15',    icon: <XCircle size={11} /> },
  sent_back: { label: 'Sent Back',  color: 'text-orange-400',  bg: 'bg-orange-500/15', icon: <RotateCcw size={11} /> }
}

const LEVEL_LABELS: Record<ReviewLevel, string> = {
  junior: 'Junior Staff',
  senior: 'Senior CA',
  partner: 'Partner Sign-off'
}

const LEVEL_ICONS: Record<ReviewLevel, JSX.Element> = {
  junior:  <User size={12} />,
  senior:  <Users size={12} />,
  partner: <Shield size={12} />
}

function StatusBadge({ status }: { status: ApprovalStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.color} ${cfg.bg}`}>
      {cfg.icon} {cfg.label}
    </span>
  )
}

function PipelineStep({ level, status, reviewer }: { level: ReviewLevel; status: ApprovalStatus; reviewer?: string }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <div className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg border min-w-[90px] ${
      status === 'in_review' ? 'border-amber-500/40 bg-amber-500/5 ring-1 ring-amber-500/20' :
      status === 'approved'  ? 'border-emerald-500/40 bg-emerald-500/5' :
      status === 'rejected'  ? 'border-red-500/40 bg-red-500/5' :
      status === 'sent_back' ? 'border-orange-500/40 bg-orange-500/5' :
      'border-surface-700 bg-surface-900'
    }`}>
      <span className={`${cfg.color}`}>{cfg.icon}</span>
      <span className="text-[9px] font-bold text-surface-300">{LEVEL_LABELS[level]}</span>
      {reviewer && <span className="text-[9px] text-surface-500 truncate max-w-[80px]">{reviewer}</span>}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function VouchingPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>(mockVouchers)
  const [selectedId, setSelectedId] = useState<string>('v001')
  const [activeTab, setActiveTab] = useState<'detail' | 'log' | 'versions'>('detail')
  const [filterStatus, setFilterStatus] = useState<'all' | ApprovalStatus>('all')
  const [search, setSearch] = useState('')
  const [reviewNote, setReviewNote] = useState('')
  const [expandLog, setExpandLog] = useState(true)

  const selected = vouchers.find(v => v.id === selectedId)

  const filtered = vouchers.filter(v => {
    const matchStatus = filterStatus === 'all' || v.status === filterStatus
    const matchSearch = v.voucherNo.toLowerCase().includes(search.toLowerCase()) ||
      v.client.toLowerCase().includes(search.toLowerCase()) ||
      v.narration.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const doAction = (action: 'approve' | 'reject' | 'send_back') => {
    if (!selected) return
    if (!reviewNote.trim()) {
      toast.error('Please add a review note before taking action.')
      return
    }
    const newStatus: ApprovalStatus = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'sent_back'
    const levelOrder: ReviewLevel[] = ['junior', 'senior', 'partner']
    const idx = levelOrder.indexOf(selected.currentLevel)

    setVouchers(prev => prev.map(v => {
      if (v.id !== selected.id) return v
      const newLog: ApprovalLogEntry = {
        level: v.currentLevel,
        reviewer: v.currentLevel === 'junior' ? 'Riya Sharma' : v.currentLevel === 'senior' ? 'Arjun Mehta' : 'CA Ramesh Iyer',
        status: newStatus,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        note: reviewNote
      }
      const nextLevel = action === 'approve' && idx < 2 ? levelOrder[idx + 1] : v.currentLevel
      const overallStatus: ApprovalStatus =
        action === 'approve' && idx === 2 ? 'approved' :
        action === 'reject' ? 'rejected' :
        action === 'send_back' ? 'sent_back' : 'in_review'

      return {
        ...v,
        status: overallStatus,
        currentLevel: nextLevel,
        [`${v.currentLevel}Approval`]: newStatus,
        approvalLog: [...v.approvalLog, newLog]
      }
    }))

    const msgs = { approve: '✅ Voucher approved and forwarded.', reject: '❌ Voucher rejected.', send_back: '↩️ Voucher sent back for correction.' }
    toast.success(msgs[action])
    setReviewNote('')
  }

  const totalsByStatus = {
    pending: vouchers.filter(v => v.status === 'pending').length,
    in_review: vouchers.filter(v => v.status === 'in_review').length,
    approved: vouchers.filter(v => v.status === 'approved').length,
    sent_back: vouchers.filter(v => v.status === 'sent_back').length,
    rejected: vouchers.filter(v => v.status === 'rejected').length,
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="section-header">
        <div>
          <h2 className="text-lg font-bold text-surface-100 flex items-center gap-2">
            <BookCheck size={18} className="text-brand-500" />
            Voucher Approval Workflows
          </h2>
          <p className="text-sm text-surface-400 mt-0.5 font-medium">
            Multi-level review pipeline — Junior Staff → Senior CA → Partner Sign-off
          </p>
        </div>
        <button
          onClick={() => toast.success('Opening new voucher entry wizard...')}
          className="btn-primary text-xs gap-1.5"
        >
          <FileText size={13} /> New Voucher
        </button>
      </div>

      {/* Status KPI strip */}
      <div className="grid grid-cols-5 gap-3 mb-5">
        {([
          { key: 'pending',   label: 'Pending Review' },
          { key: 'in_review', label: 'Active Review' },
          { key: 'approved',  label: 'Approved' },
          { key: 'sent_back', label: 'Sent Back' },
          { key: 'rejected',  label: 'Rejected' }
        ] as { key: ApprovalStatus; label: string }[]).map(item => {
          const cfg = STATUS_CONFIG[item.key]
          return (
            <button
              key={item.key}
              onClick={() => setFilterStatus(prev => prev === item.key ? 'all' : item.key)}
              className={`card p-3 text-left border transition-all hover:scale-[1.02] ${
                filterStatus === item.key ? 'border-brand-500/40 bg-brand-500/5' : ''
              }`}
            >
              <p className={`text-xl font-black ${cfg.color}`}>{totalsByStatus[item.key]}</p>
              <p className="text-[10px] text-surface-500 font-semibold mt-0.5">{item.label}</p>
            </button>
          )
        })}
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        
        {/* Left: Voucher List */}
        <div className="xl:col-span-4 flex flex-col gap-3">
          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-8 py-2 text-xs"
              placeholder="Search vouchers, clients, narration…"
            />
          </div>

          <div className="space-y-2 max-h-[680px] overflow-y-auto pr-0.5">
            {filtered.length === 0 && (
              <div className="text-center py-12 text-surface-500 text-xs">No vouchers match your filter.</div>
            )}
            {filtered.map(v => {
              const cfg = STATUS_CONFIG[v.status]
              const isSelected = v.id === selectedId
              return (
                <div
                  key={v.id}
                  onClick={() => setSelectedId(v.id)}
                  className={`card p-4 cursor-pointer transition-all border text-left hover:scale-[1.005] ${
                    isSelected ? 'border-brand-500/40 bg-brand-500/5 shadow-md' : 'hover:border-surface-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-surface-100 font-mono">{v.voucherNo}</p>
                      <p className="text-[10px] text-surface-500 mt-0.5">{v.client}</p>
                    </div>
                    <StatusBadge status={v.status} />
                  </div>
                  <p className="text-[11px] text-surface-400 truncate mb-2">{v.narration}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-surface-200">
                      ₹{v.amount.toLocaleString('en-IN')}
                    </span>
                    <div className="flex items-center gap-1 text-[9px] text-surface-500 font-semibold">
                      {LEVEL_ICONS[v.currentLevel]}
                      <span>{LEVEL_LABELS[v.currentLevel]}</span>
                    </div>
                  </div>

                  {/* Mini pipeline dots */}
                  <div className="flex items-center gap-1.5 mt-3">
                    {(['junior', 'senior', 'partner'] as ReviewLevel[]).map((lvl, i) => {
                      const s = v[`${lvl}Approval`] as ApprovalStatus
                      const c = STATUS_CONFIG[s]
                      return (
                        <div key={lvl} className="flex items-center gap-1">
                          <span className={`w-2 h-2 rounded-full ${
                            s === 'approved' ? 'bg-emerald-500' :
                            s === 'in_review' ? 'bg-amber-500' :
                            s === 'rejected' ? 'bg-red-500' :
                            s === 'sent_back' ? 'bg-orange-500' :
                            'bg-surface-700'
                          }`} />
                          {i < 2 && <ArrowRight size={8} className="text-surface-700" />}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: Detail Panel */}
        <div className="xl:col-span-8 flex flex-col gap-4">
          {selected ? (
            <>
              {/* Voucher header card */}
              <div className="card p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-black text-surface-100 font-mono">{selected.voucherNo}</h3>
                    <p className="text-xs text-surface-400 mt-0.5">{selected.client} · {selected.date} · <span className="text-brand-400 font-semibold">{selected.type} Voucher</span></p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toast.success('Downloading voucher PDF...')} className="btn-secondary text-xs gap-1.5 border border-surface-700 px-3 py-1.5">
                      <Download size={12} /> Export
                    </button>
                    <StatusBadge status={selected.status} />
                  </div>
                </div>

                {/* Approval Pipeline Visualiser */}
                <div className="bg-surface-900/50 rounded-xl p-4 border border-surface-800">
                  <p className="text-[10px] text-surface-500 font-bold uppercase tracking-wider mb-3">Approval Pipeline</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <PipelineStep level="junior" status={selected.juniorApproval} reviewer={selected.approvalLog.find(l=>l.level==='junior')?.reviewer} />
                    <ArrowRight size={14} className="text-surface-600 flex-shrink-0" />
                    <PipelineStep level="senior" status={selected.seniorApproval} reviewer={selected.approvalLog.find(l=>l.level==='senior')?.reviewer} />
                    <ArrowRight size={14} className="text-surface-600 flex-shrink-0" />
                    <PipelineStep level="partner" status={selected.partnerApproval} reviewer={selected.approvalLog.find(l=>l.level==='partner')?.reviewer} />
                    {selected.status === 'approved' && (
                      <>
                        <ArrowRight size={14} className="text-surface-600 flex-shrink-0" />
                        <div className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg border border-emerald-500/40 bg-emerald-500/5 min-w-[90px]">
                          <Send size={11} className="text-emerald-400" />
                          <span className="text-[9px] font-bold text-surface-300">Push to Tally</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Voucher ledger detail */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="space-y-2">
                    <div>
                      <p className="text-[10px] text-surface-500 uppercase font-bold">Debit Account</p>
                      <p className="text-surface-200 font-semibold mt-0.5">{selected.debitAccount}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-surface-500 uppercase font-bold">Amount</p>
                      <p className="text-surface-100 font-black text-lg mt-0.5">₹{selected.amount.toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-[10px] text-surface-500 uppercase font-bold">Credit Account</p>
                      <p className="text-surface-200 font-semibold mt-0.5">{selected.creditAccount}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-surface-500 uppercase font-bold">Narration</p>
                      <p className="text-surface-300 mt-0.5 leading-relaxed">{selected.narration}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-[10px] text-surface-500 pt-2 border-t border-surface-800">
                  <span className="flex items-center gap-1"><FileText size={11} /> {selected.supportingDocs} Supporting Doc{selected.supportingDocs !== 1 ? 's' : ''}</span>
                  <span className="flex items-center gap-1"><History size={11} /> v{selected.versionLog.length} ({selected.versionLog.length} edit{selected.versionLog.length !== 1 ? 's' : ''})</span>
                  <button onClick={() => toast.success('Uploading supporting document...')} className="ml-auto text-brand-400 hover:text-brand-300 font-bold transition-colors flex items-center gap-1">
                    <FileText size={11} /> Attach Document
                  </button>
                </div>
              </div>

              {/* Tab switcher */}
              <div className="flex border-b border-surface-800 gap-0.5 text-xs">
                {([
                  { key: 'detail',   label: 'Review & Action', icon: <Eye size={12} /> },
                  { key: 'log',      label: 'Approval Audit Log', icon: <History size={12} /> },
                  { key: 'versions', label: 'Version History', icon: <RotateCcw size={12} /> }
                ] as { key: typeof activeTab; label: string; icon: JSX.Element }[]).map(t => (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key)}
                    className={`flex items-center gap-1.5 px-4 py-2 border-b-2 font-semibold transition-all -mb-[2px] ${
                      activeTab === t.key ? 'border-brand-500 text-white bg-brand-500/5' : 'border-transparent text-surface-400 hover:text-surface-200'
                    }`}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>

              {/* Tab: Review & Action */}
              {activeTab === 'detail' && (
                <div className="card p-5 space-y-4">
                  {selected.status === 'approved' ? (
                    <div className="text-center py-8 space-y-2">
                      <CheckCircle2 size={40} className="mx-auto text-emerald-500" />
                      <p className="font-bold text-emerald-400">Voucher Fully Approved</p>
                      <p className="text-xs text-surface-500">All three review levels signed off. Ready to push to Tally/Zoho Books.</p>
                      <button onClick={() => toast.success('Voucher queued to push to Tally/Zoho...')} className="btn-primary text-xs gap-1.5 mt-2">
                        <Send size={13} /> Push to Accounting Software
                      </button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="text-[10px] text-surface-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                          {LEVEL_ICONS[selected.currentLevel]}
                          Current Review Level: <span className="text-surface-200">{LEVEL_LABELS[selected.currentLevel]}</span>
                        </p>
                      </div>

                      {/* AI Review Suggestion */}
                      <div className="bg-brand-500/5 border border-brand-500/20 rounded-xl p-4 space-y-2">
                        <p className="text-[10px] font-bold text-brand-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles size={12} /> AI Review Suggestion
                        </p>
                        <p className="text-xs text-surface-300 leading-relaxed">
                          Ledger match confidence: <span className="text-emerald-400 font-bold">92%</span>. 
                          Debit and credit accounts are consistent with prior period entries.
                          {selected.supportingDocs === 0 && <span className="text-amber-400"> ⚠ No supporting documents attached — recommend requesting before approval.</span>}
                          {selected.amount > 200000 && <span className="text-amber-400"> ⚠ Amount exceeds ₹2L — partner sign-off required per firm policy.</span>}
                        </p>
                      </div>

                      {/* Review Note */}
                      <div>
                        <label className="text-[10px] font-bold text-surface-400 uppercase tracking-wider block mb-1.5">Review Note (Required)</label>
                        <textarea
                          value={reviewNote}
                          onChange={e => setReviewNote(e.target.value)}
                          rows={3}
                          className="input text-xs resize-none"
                          placeholder="Add your review comments, observations, or instructions for correction…"
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-3 gap-3">
                        <button
                          onClick={() => doAction('approve')}
                          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all"
                        >
                          <CheckCircle2 size={13} /> Approve
                        </button>
                        <button
                          onClick={() => doAction('send_back')}
                          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold bg-amber-600/80 hover:bg-amber-500 text-white transition-all"
                        >
                          <RotateCcw size={13} /> Send Back
                        </button>
                        <button
                          onClick={() => doAction('reject')}
                          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold bg-red-600/80 hover:bg-red-500 text-white transition-all"
                        >
                          <XCircle size={13} /> Reject
                        </button>
                      </div>

                      {selected.status === 'sent_back' && (
                        <div className="flex items-start gap-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/30 text-xs text-orange-300">
                          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                          <span>This voucher was sent back. Please review the note from the previous reviewer and correct the entry before re-submitting.</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Tab: Approval Audit Log */}
              {activeTab === 'log' && (
                <div className="card p-5 space-y-3">
                  <p className="text-[10px] text-surface-400 font-bold uppercase tracking-wider">Full Approval Audit Trail</p>
                  {selected.approvalLog.length === 0 ? (
                    <div className="text-center py-10 text-surface-500 text-xs">No review actions recorded yet.</div>
                  ) : (
                    <div className="relative pl-5 space-y-5">
                      <div className="absolute left-2 top-0 bottom-0 w-px bg-surface-800" />
                      {selected.approvalLog.map((entry, i) => {
                        const cfg = STATUS_CONFIG[entry.status]
                        return (
                          <div key={i} className="relative">
                            <span className={`absolute -left-5 top-1 w-2.5 h-2.5 rounded-full border-2 border-surface-900 ${
                              entry.status === 'approved' ? 'bg-emerald-500' :
                              entry.status === 'in_review' ? 'bg-amber-500' :
                              entry.status === 'rejected' ? 'bg-red-500' :
                              entry.status === 'sent_back' ? 'bg-orange-500' :
                              'bg-surface-600'
                            }`} />
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-surface-200">{entry.reviewer}</span>
                                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color}`}>{LEVEL_LABELS[entry.level]}</span>
                                <StatusBadge status={entry.status} />
                              </div>
                              <p className="text-xs text-surface-400 leading-relaxed italic">"{entry.note}"</p>
                              <p className="text-[9px] text-surface-600 font-mono">{entry.timestamp}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Version History */}
              {activeTab === 'versions' && (
                <div className="card p-5 space-y-3">
                  <p className="text-[10px] text-surface-400 font-bold uppercase tracking-wider">Voucher Edit History</p>
                  {selected.versionLog.map((ver, i) => (
                    <div key={i} className="flex items-start gap-4 p-3 rounded-lg bg-surface-900 border border-surface-800">
                      <div className="w-8 h-8 rounded-lg bg-surface-800 flex items-center justify-center flex-shrink-0 text-[10px] font-black text-surface-300">
                        v{ver.version}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-surface-200">{ver.editedBy}</p>
                          <p className="text-[9px] text-surface-500 font-mono">{ver.editedAt}</p>
                        </div>
                        <p className="text-xs text-surface-400 mt-0.5">{ver.summary}</p>
                      </div>
                      {i !== 0 && (
                        <button
                          onClick={() => toast.success(`Restoring voucher to version v${ver.version}...`)}
                          className="text-[10px] text-brand-400 hover:text-brand-300 font-bold flex-shrink-0 flex items-center gap-1 transition-colors"
                        >
                          <RotateCcw size={10} /> Restore
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="card flex-1 flex items-center justify-center py-24 text-center text-surface-500">
              <div>
                <BookCheck size={28} className="mx-auto mb-2" />
                <p className="text-sm">Select a voucher from the list to review and action it.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
