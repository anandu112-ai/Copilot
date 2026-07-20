import React, { useState } from 'react'
import {
  History, Calendar, AlertTriangle, AlertCircle, CheckCircle, Search, Filter,
  BookOpen, Clock, Users, ArrowUpRight, Sparkles, Download, CheckSquare,
  Square, ShieldAlert, FileText, Bell, RefreshCw, Zap, Landmark
} from 'lucide-react'
import toast from 'react-hot-toast'

interface ComplianceTask {
  id: string
  clientName: string
  category: 'GST' | 'Income Tax' | 'TDS/TCS' | 'ROC' | 'Corporate'
  taskName: string
  dueDate: string
  status: 'Pending' | 'Filed' | 'Overdue'
  referenceSection: string
  assignedTo: string
  taxLiabilitySimulated?: number
}

interface RegulatoryUpdate {
  id: string
  title: string
  category: string
  publishDate: string
  actReference: string
  aiSummary: string
  affectedClientsCount: number
}

const mockTasks: ComplianceTask[] = [
  { id: '1', clientName: 'Apex Steel Industries Pvt Ltd', category: 'GST', taskName: 'GSTR-3B Monthly Filing', dueDate: '2026-07-20', status: 'Pending', referenceSection: 'Section 39(1), CGST Act 2017', assignedTo: 'A. K. Mehta', taxLiabilitySimulated: 45000 },
  { id: '2', clientName: 'Apex Steel Industries Pvt Ltd', category: 'TDS/TCS', taskName: 'Q1 TDS Return Filing (Form 26Q)', dueDate: '2026-07-31', status: 'Pending', referenceSection: 'Section 200(3), Income Tax Act', assignedTo: 'Ravi Verma', taxLiabilitySimulated: 12500 },
  { id: '3', clientName: 'MGM Logistics Services', category: 'Income Tax', taskName: 'Advance Tax Installment Q1', dueDate: '2026-06-15', status: 'Overdue', referenceSection: 'Section 211, Income Tax Act', assignedTo: 'Ravi Verma', taxLiabilitySimulated: 180000 },
  { id: '4', clientName: 'TechVibe Solution Hub LLP', category: 'ROC', taskName: 'Filing of Form 11 (Annual Return)', dueDate: '2026-05-30', status: 'Filed', referenceSection: 'Section 34A, LLP Act 2008', assignedTo: 'S. Sharma' },
  { id: '5', clientName: 'Om Packaging Industries', category: 'GST', taskName: 'GSTR-1 Sales Return', dueDate: '2026-07-11', status: 'Filed', referenceSection: 'Section 37, CGST Act 2017', assignedTo: 'S. Sharma' },
  { id: '6', clientName: 'MGM Logistics Services', category: 'Corporate', taskName: 'ROC Annual General Meeting (AGM) Filing', dueDate: '2026-09-30', status: 'Pending', referenceSection: 'Section 96, Companies Act 2013', assignedTo: 'A. K. Mehta' },
  { id: '7', clientName: 'TechVibe Solution Hub LLP', category: 'GST', taskName: 'GSTR-9 Annual Return filing', dueDate: '2026-12-31', status: 'Pending', referenceSection: 'Section 44, CGST Act 2017', assignedTo: 'Ravi Verma' }
]

const mockUpdates: RegulatoryUpdate[] = [
  {
    id: 'u-1',
    title: 'GST Council reduces rates on certain metal alloys & carton containers',
    category: 'GST Regulations',
    publishDate: '2026-07-15',
    actReference: 'Notification No. 08/2026-Central Tax (Rate)',
    aiSummary: 'Reduces GST rates on structural carton containers from 18% to 12%. Impact: High potential savings for manufacturing and retail clients.',
    affectedClientsCount: 2
  },
  {
    id: 'u-2',
    title: 'New limits introduced under Section 43B(h) for MSME payments',
    category: 'Income Tax',
    publishDate: '2026-06-28',
    actReference: 'Section 43B(h) of the Income Tax Act, 1961',
    aiSummary: 'Disallows deductions for expenses where payment to registered MSMEs is delayed beyond 15 or 45 days. Crucial for vendor aging configurations.',
    affectedClientsCount: 4
  },
  {
    id: 'u-3',
    title: 'TDS Rates for Contract Payments updated',
    category: 'TDS/TCS',
    publishDate: '2026-07-02',
    actReference: 'Section 194C, Income Tax Act',
    aiSummary: 'Minor threshold adjustment for e-commerce operators and individual contactors. Check vendor contract mappings for correctness.',
    affectedClientsCount: 1
  }
]

export default function CompliancePage() {
  const [tasks, setTasks] = useState<ComplianceTask[]>(mockTasks)
  const [activeTab, setActiveTab] = useState<'checklist' | 'updates' | 'rules'>('checklist')
  const [categoryFilter, setCategoryFilter] = useState<string>('All')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>('1')

  const handleToggleTaskStatus = (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        const nextStatus = t.status === 'Filed' ? 'Pending' : 'Filed'
        toast.success(`Task status updated to: ${nextStatus}`)
        return { ...t, status: nextStatus }
      }
      return t
    }))
  }

  const handleRunComplianceCheck = () => {
    toast.loading('Analyzing regulatory ledger codes and verifying tax return status...')
    setTimeout(() => {
      toast.dismiss()
      toast.success('Compliance analysis completed! 0 compliance flags detected.')
    }, 1800)
  }

  const selectedTask = tasks.find(t => t.id === selectedTaskId)

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.taskName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.referenceSection.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === 'All' || t.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  return (
    <div className="flex flex-col h-[calc(100vh-var(--topbar-height))] overflow-hidden bg-surface-950 text-left">
      
      {/* Top Header */}
      <div className="px-6 py-4 border-b border-surface-800/80 bg-surface-900/40 flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-base font-black text-surface-100 flex items-center gap-2">
            <History className="text-brand-400" size={18} />
            Knowledge & Compliance Workspace
          </h2>
          <p className="text-[11px] text-surface-500 mt-0.5">
            Monitor tax deadlines, review regulatory changes, track filings, and manage statutory checklists.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRunComplianceCheck}
            className="btn-secondary text-xs px-3 py-1.5 border border-surface-700/85 hover:bg-surface-800 flex items-center gap-1.5"
          >
            <RefreshCw size={12} /> Sync Compliance State
          </button>
        </div>
      </div>

      {/* Compliance Stats Dashboard */}
      <div className="grid grid-cols-4 gap-4 px-6 py-4 bg-surface-900/10 border-b border-surface-800/50 flex-shrink-0">
        {[
          { title: 'Pending Filings', value: tasks.filter(t => t.status === 'Pending').length, sub: 'Needs action this week', color: 'text-amber-400' },
          { title: 'Completed Returns', value: tasks.filter(t => t.status === 'Filed').length, sub: 'Successfully posted', color: 'text-emerald-400' },
          { title: 'Overdue Warnings', value: tasks.filter(t => t.status === 'Overdue').length, sub: 'High risk of penalty', color: 'text-red-400' },
          { title: 'Active Regulations', value: mockUpdates.length, sub: 'Knowledge modules updated', color: 'text-brand-300' }
        ].map((stat, i) => (
          <div key={i} className="bg-surface-900/40 border border-surface-850 p-3.5 rounded-xl text-left">
            <div className="text-[10px] text-surface-500 font-bold uppercase tracking-wider">{stat.title}</div>
            <div className={`text-xl font-black mt-1 ${stat.color}`}>{stat.value}</div>
            <div className="text-[9px] text-surface-500 mt-0.5">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Tab Select & Filters */}
      <div className="px-6 py-3 border-b border-surface-800/50 bg-surface-900/10 flex items-center justify-between flex-shrink-0">
        <div className="flex gap-1.5 text-xs bg-surface-900 p-0.5 rounded-lg border border-surface-800">
          {[
            { id: 'checklist', label: 'Compliance Checklist' },
            { id: 'updates', label: 'Regulatory Feed' },
            { id: 'rules', label: 'Compliance Engine Settings' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1 rounded-md transition-all font-semibold ${
                activeTab === tab.id
                  ? 'bg-brand-500/15 border border-brand-500/20 text-brand-300'
                  : 'text-surface-500 hover:text-surface-300 border border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'checklist' && (
          <div className="flex gap-3 items-center">
            {/* Search Input */}
            <div className="flex items-center gap-2 bg-surface-900 border border-surface-800 rounded-lg px-2.5 py-1 text-xs">
              <Search size={12} className="text-surface-500" />
              <input
                type="text"
                placeholder="Filter by client or task..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="bg-transparent border-none text-[11px] text-surface-200 placeholder-surface-600 outline-none w-44 focus:ring-0"
              />
            </div>
            {/* Category Select */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-surface-500 flex items-center gap-1 font-semibold"><Filter size={11} /> Module:</span>
              {['All', 'GST', 'Income Tax', 'TDS/TCS', 'ROC'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                    categoryFilter === cat
                      ? 'bg-brand-500/20 border border-brand-500/30 text-brand-300 font-semibold'
                      : 'bg-surface-900 border border-surface-800 text-surface-500 hover:text-surface-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* CHECKLIST TAB */}
        {activeTab === 'checklist' && (
          <div className="flex-1 grid grid-cols-12 overflow-hidden">
            
            {/* Left Column: List of Tasks */}
            <div className="col-span-8 overflow-y-auto border-r border-surface-850 p-5 space-y-3">
              {filteredTasks.length === 0 ? (
                <div className="text-center py-20 text-surface-600 text-xs">
                  No compliance tasks found matching selected criteria.
                </div>
              ) : (
                filteredTasks.map(task => {
                  const isSelected = task.id === selectedTaskId
                  return (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTaskId(task.id)}
                      className={`p-3.5 border rounded-xl flex items-center justify-between gap-4 cursor-pointer transition-all hover:border-surface-700/80 ${
                        isSelected ? 'bg-brand-500/3 border-brand-500/30' : 'bg-surface-900/60 border-surface-800/80'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleToggleTaskStatus(task.id)
                          }}
                          className="text-surface-500 hover:text-emerald-400 transition-colors"
                        >
                          {task.status === 'Filed' ? (
                            <CheckCircle size={16} className="text-emerald-400" />
                          ) : (
                            <Square size={16} className="text-surface-700" />
                          )}
                        </button>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-surface-200">{task.taskName}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                              task.category === 'GST' ? 'bg-sky-500/10 text-sky-400' :
                              task.category === 'Income Tax' ? 'bg-amber-500/10 text-amber-400' :
                              task.category === 'TDS/TCS' ? 'bg-purple-500/10 text-purple-400' :
                              'bg-emerald-500/10 text-emerald-400'
                            }`}>
                              {task.category}
                            </span>
                          </div>
                          <p className="text-[10px] text-surface-500 mt-1">
                            Client: <strong>{task.clientName}</strong> · Section: <code className="text-brand-300 font-mono">{task.referenceSection}</code>
                          </p>
                        </div>
                      </div>

                      <div className="text-right flex items-center gap-4">
                        <div className="text-xs">
                          <p className="text-surface-500 text-[10px] font-medium uppercase">Due Date</p>
                          <p className={`font-mono font-bold mt-0.5 ${
                            task.status === 'Overdue' ? 'text-red-400' : 'text-surface-300'
                          }`}>
                            {task.dueDate}
                          </p>
                        </div>
                        <span className={`badge text-[9px] font-bold px-2 py-0.5 ${
                          task.status === 'Filed' ? 'badge-success' :
                          task.status === 'Overdue' ? 'badge-error' : 'badge-warning'
                        }`}>
                          {task.status}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Right Column: Task detail dashboard / Compliance assistant */}
            <div className="col-span-4 overflow-y-auto p-5 bg-surface-900/10 text-left space-y-5">
              {selectedTask ? (
                <>
                  <div className="border-b border-surface-800 pb-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-brand-500/10 text-brand-400 flex items-center justify-center flex-shrink-0">
                      <Landmark size={20} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-surface-200 truncate">{selectedTask.taskName}</h3>
                      <p className="text-[10px] text-surface-500 font-semibold">{selectedTask.clientName}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Statutory Details</h4>
                    <div className="space-y-2 text-xs bg-surface-900 border border-surface-850 p-3 rounded-xl font-medium">
                      <div className="flex justify-between py-1 border-b border-surface-950/40">
                        <span className="text-surface-500">Legal Provision</span>
                        <span className="text-brand-300 font-mono text-[10px]">{selectedTask.referenceSection}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-surface-950/40">
                        <span className="text-surface-500">Task Owner</span>
                        <span className="text-surface-300">{selectedTask.assignedTo}</span>
                      </div>
                      {selectedTask.taxLiabilitySimulated && (
                        <div className="flex justify-between py-1">
                          <span className="text-surface-500">Calculated Liability</span>
                          <span className="text-surface-200 font-mono font-bold">₹{selectedTask.taxLiabilitySimulated.toLocaleString('en-IN')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Explainable AI block */}
                  <div className="bg-brand-500/5 border border-brand-500/20 p-4 rounded-xl space-y-2.5">
                    <h4 className="text-[10px] font-bold text-brand-300 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles size={11} /> AI Assistant Recommendation
                    </h4>
                    <p className="text-[11px] text-surface-400 leading-relaxed font-medium">
                      This transaction registry is flagged for compliance routing. Recommended filing action is based on {selectedTask.referenceSection}. We verified matching vouchers in Tally, with a confidence score of <strong>94%</strong>.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => toast.success('Reminding client to verify data...')}
                        className="w-full py-1.5 px-3 bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/20 rounded-lg text-[10px] font-bold text-brand-400 transition-all text-center"
                      >
                        Send Client Reminder
                      </button>
                    </div>
                  </div>

                  {/* Workflow approvals info */}
                  <div className="bg-surface-900 border border-surface-850 p-4 rounded-xl text-xs space-y-2 text-surface-500 font-medium">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>Voucher Audit: Verified</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>Reconciliations: 2B matched</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      <span>GST Classification: Awaiting review</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleTaskStatus(selectedTask.id)}
                    className="w-full py-2 bg-brand-500 text-white hover:bg-brand-400 rounded-lg font-bold text-xs transition-all shadow flex items-center justify-center gap-1.5"
                  >
                    <CheckSquare size={13} />
                    {selectedTask.status === 'Filed' ? 'Mark Return as Pending' : 'Mark Return as Filed'}
                  </button>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center py-20 text-surface-600 text-xs">
                  <AlertCircle size={20} className="mb-2" />
                  Select a compliance task to review statutory guidelines
                </div>
              )}
            </div>
          </div>
        )}

        {/* REGULATORY UPDATES FEED */}
        {activeTab === 'updates' && (
          <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto space-y-6">
            <h3 className="text-xs font-bold text-surface-200 text-left">Latest Statutory Notifications & AI Summary Analysis</h3>
            
            <div className="space-y-4">
              {mockUpdates.map(upd => (
                <div key={upd.id} className="bg-surface-900 border border-surface-800/80 p-5 rounded-xl space-y-3.5 text-left">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <span className="text-[9px] font-bold px-2 py-0.5 bg-brand-500/10 border border-brand-500/20 text-brand-400 rounded-full uppercase">{upd.category}</span>
                      <h4 className="text-xs font-bold text-surface-100 mt-2">{upd.title}</h4>
                      <p className="text-[10px] text-surface-500 mt-1 font-semibold">Official Reference: <code className="text-brand-300 font-mono text-[9px]">{upd.actReference}</code></p>
                    </div>
                    <span className="text-[10px] text-surface-500 font-mono">{upd.publishDate}</span>
                  </div>

                  {/* AI summary block with clear warning distinguishing Legal Law vs AI translation */}
                  <div className="bg-surface-950 border border-surface-850 p-3.5 rounded-xl space-y-2">
                    <p className="text-[10px] text-surface-600 font-black uppercase tracking-wider flex items-center gap-1">
                      <Sparkles size={10} className="text-brand-400" /> AI Insights Summary
                    </p>
                    <p className="text-xs text-surface-300 leading-relaxed font-medium">
                      {upd.aiSummary}
                    </p>
                    <div className="border-t border-surface-800/50 pt-2 flex items-center justify-between text-[9px] text-surface-500">
                      <span className="text-amber-500/80 flex items-center gap-1">
                        <AlertTriangle size={10} /> Disclaimer: AI translation of statutory acts. Always cross-reference the official text.
                      </span>
                      <a href="#" className="text-brand-400 hover:underline flex items-center gap-0.5">Read Official Gazette →</a>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-surface-850">
                    <span className="text-[11px] text-surface-400 font-semibold">
                      Affected Clients: <strong className="text-surface-200">{upd.affectedClientsCount} clients</strong>
                    </span>
                    <button
                      onClick={() => toast.success(`Applied checklist updates for ${upd.affectedClientsCount} clients`)}
                      className="text-[10px] bg-brand-500/10 border border-brand-500/20 text-brand-400 px-3 py-1 rounded hover:bg-brand-500/25 font-bold transition-all"
                    >
                      Update Client Checklists
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RULES / COMPLIANCE ENGINE */}
        {activeTab === 'rules' && (
          <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto space-y-6 text-left">
            <div className="bg-surface-900 border border-surface-800/80 p-5 rounded-xl space-y-4">
              <h3 className="text-xs font-bold text-surface-200 flex items-center gap-1.5"><ShieldAlert size={14} className="text-brand-400" /> Statutory Audit Rules Configuration</h3>
              <p className="text-[11px] text-surface-500 leading-relaxed">
                Configure global threshold monitors. The local audit rules engine automatically analyzes and flags transactions failing these compliance criteria.
              </p>
              
              <div className="space-y-3">
                {[
                  { title: 'GSTIN Invalidation Alert', desc: 'Auto flag invoices mismatching standard 15-character structural checksums.', active: true },
                  { title: 'TDS Section 194C contractor cap', desc: 'Warn when contract ledger credits exceed ₹30,000 single or ₹1,00,000 aggregate without TDS deduction.', active: true },
                  { title: 'MSME Payment Aging (Section 43B-h)', desc: 'Highlight outstanding invoices to MSMEs older than 45 days for income tax disallowance tracking.', active: true },
                  { title: 'Cash transaction bounds', desc: 'Flags daily transaction aggregates posted as cash exceeding ₹10,000 limits.', active: true }
                ].map((rule, idx) => (
                  <div key={idx} className="p-3.5 bg-surface-950 border border-surface-850 rounded-xl flex items-center justify-between gap-3 text-xs">
                    <div>
                      <p className="font-bold text-surface-200">{rule.title}</p>
                      <p className="text-[10px] text-surface-500 mt-0.5">{rule.desc}</p>
                    </div>
                    <label className="flex items-center cursor-pointer flex-shrink-0">
                      <div className="relative">
                        <input type="checkbox" className="sr-only" defaultChecked={rule.active} onChange={() => toast.success('Audit rule state changed')} />
                        <div className="w-8 h-4 bg-surface-750 rounded-full transition-colors peer-checked:bg-brand-500" />
                        <div className="absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform" />
                      </div>
                    </label>
                  </div>
                ))}
              </div>

              <div className="flex justify-end border-t border-surface-850 pt-4">
                <button
                  onClick={() => toast.success('Compliance rules saved successfully')}
                  className="btn-primary text-xs px-4"
                >
                  Save Configuration
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
