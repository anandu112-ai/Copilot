import React, { useState, useEffect } from 'react'
import {
  BrainCircuit, Bot, Sparkles, Zap, GitBranch, ArrowRight, Play, CheckCircle2,
  AlertCircle, AlertTriangle, Eye, Shield, RefreshCw, Layers, Plus, Trash2,
  Check, X, Search, FileText, Calendar, TrendingUp, Clock, Info, CheckSquare,
  MessageSquare, FileSpreadsheet, PlusCircle, ArrowDownToLine, HelpCircle,
  Activity, Settings, Database, Sliders, Code, ChevronRight
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts'
import toast from 'react-hot-toast'
import { format, parseISO } from 'date-fns'

interface AutomationRule {
  id: string
  name: string
  trigger_event: string
  actions: string // JSON string
  status: 'active' | 'inactive'
}

interface Suggestion {
  id: string
  client_id?: string
  item_type: string
  original_value: string
  suggested_value: string
  confidence: number
  status: 'pending' | 'approved' | 'rejected'
}

interface WorkingPaper {
  id: string
  client_id?: string
  document_type: string
  title: string
  generated_content: string
  flagged_sections: string // JSON string
}

interface QaFlag {
  id: string
  file_id?: string
  file_name?: string
  check_type: string
  message: string
  confidence_score: number
  status: 'flagged' | 'resolved' | 'ignored'
}

interface PipelineJob {
  id: string
  title: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  steps: string // JSON string
  current_step: number
  progress: number
  retry_count: number
  logs: string // JSON string
}

export default function AiAutomationPage() {
  const [activeTab, setActiveTab] = useState<'control' | 'planner' | 'workflow' | 'suggestions' | 'papers' | 'analytics' | 'search' | 'qa'>('control')

  // SQLite DB States
  const [rules, setRules] = useState<AutomationRule[]>([])
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [workingPapers, setWorkingPapers] = useState<WorkingPaper[]>([])
  const [learningRecords, setLearningRecords] = useState<any[]>([])
  const [pipelineJobs, setPipelineJobs] = useState<PipelineJob[]>([])
  const [qaFlags, setQaFlags] = useState<QaFlag[]>([])
  const [clients, setClients] = useState<any[]>([])

  // UI Interactive States
  const [plannerInput, setPlannerInput] = useState('')
  const [isPlanning, setIsPlanning] = useState(false)
  const [activePlan, setActivePlan] = useState<any[] | null>(null)
  const [selectedPaper, setSelectedPaper] = useState<WorkingPaper | null>(null)

  // Rules form states
  const [newRuleName, setNewRuleName] = useState('')
  const [newRuleTrigger, setNewRuleTrigger] = useState('invoice_uploaded')
  const [newRuleConditionField, setNewRuleConditionField] = useState('grandTotal')
  const [newRuleOperator, setNewRuleOperator] = useState('>')
  const [newRuleConditionValue, setNewRuleConditionValue] = useState('')
  const [newRuleAssignee, setNewRuleAssignee] = useState('')

  // Search input
  const [nlSearchQuery, setNlSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[] | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  // Simulated active user
  const currentUser = { name: 'CA Aditya Sen', role: 'Managing Partner' }

  useEffect(() => {
    loadDbData()
  }, [])

  const loadDbData = async () => {
    if (window.electronAPI && window.electronAPI.db) {
      try {
        const dbRules = await window.electronAPI.db.getAiAutomationRules()
        setRules(dbRules as AutomationRule[])

        const dbSuggestions = await window.electronAPI.db.getAiSuggestions()
        setSuggestions(dbSuggestions as Suggestion[])

        const dbPapers = await window.electronAPI.db.getAiWorkingPapers()
        setWorkingPapers(dbPapers as WorkingPaper[])
        if (dbPapers.length > 0) setSelectedPaper(dbPapers[0] as WorkingPaper)

        const dbLearning = await window.electronAPI.db.getAiLearningRecords()
        setLearningRecords(dbLearning)

        const dbJobs = await window.electronAPI.db.getAiPipelineJobs()
        setPipelineJobs(dbJobs as PipelineJob[])

        const dbQa = await window.electronAPI.db.getAiQaFlags()
        setQaFlags(dbQa as QaFlag[])

        const dbClients = await window.electronAPI.db.getClients()
        setClients(dbClients)
      } catch (err) {
        console.error('Failed to load Phase 7 SQLite data', err)
      }
    }
  }

  const logAuditTrail = async (action: string, clientName?: string, details?: string) => {
    if (window.electronAPI && window.electronAPI.db) {
      try {
        await window.electronAPI.db.insertAuditTrail({
          id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          user_name: currentUser.name,
          role: currentUser.role,
          action,
          client_name: clientName || '',
          document_name: 'AI Automation Module',
          details: details || ''
        })
      } catch (err) {
        console.error(err)
      }
    }
  }

  // --- CONTROLLER ACTION WORKFLOWS ---

  // Module 1: AI Task Planner Submit
  const handlePlannerSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!plannerInput.trim()) return

    setIsPlanning(true)
    setActivePlan(null)

    // Simulate agent breakdown logic
    setTimeout(async () => {
      const generatedPlan = [
        { step: 1, title: 'Locate Client Workspace', status: 'completed', desc: 'Auto-identified ABC Pvt Ltd in client registry. FY 2026-27.' },
        { step: 2, title: 'Extract GST Purchases Register', status: 'completed', desc: 'Scanned Q1 GSTR-2B purchase portal documents with OCR quality score of 98.4%.' },
        { step: 3, title: 'Execute Books vs Portal Offset', status: 'running', desc: 'Running matching heuristics on GSTR-2B items. Total entries: 412.' },
        { step: 4, title: 'Generate AI variance recommendations', status: 'pending', desc: 'Identify variance accounts, category allocations, and GSTR offsets.' },
        { step: 5, title: 'Compile Statutory Working Papers', status: 'pending', desc: 'Compose checklist findings and exception registries with clearly flagged machine boundaries.' },
        { step: 6, title: 'Format Excel sheet & trigger notifications', status: 'pending', desc: 'Render final workbook report and alert Senior Reviewer.' }
      ]
      setActivePlan(generatedPlan)
      setIsPlanning(false)
      toast.success('AI Multi-Agent execution plan mapped successfully!')
      logAuditTrail('AI Recommendation', 'ABC Pvt Ltd', `Mapped planner sequence for NL request: "${plannerInput}"`)

      // Create a background job in SQLite
      if (window.electronAPI && window.electronAPI.db) {
        try {
          await window.electronAPI.db.insertAiPipelineJob({
            id: `job-${Date.now()}`,
            title: `NL Job: ${plannerInput.substring(0, 40)}...`,
            status: 'running',
            steps: JSON.stringify(generatedPlan),
            current_step: 2,
            progress: 0.33,
            retry_count: 0,
            logs: JSON.stringify(['Job initialized', 'Client located', 'GST files mapped'])
          })
          const dbJobs = await window.electronAPI.db.getAiPipelineJobs()
          setPipelineJobs(dbJobs as PipelineJob[])
        } catch (e) {
          console.error(e)
        }
      }
    }, 1500)
  }

  // Execute Simulated Pipeline Job Step-by-step
  const handleRunPipelineJob = async (jobId: string, jobTitle: string) => {
    toast.success(`Activating autonomous agents for pipeline job: ${jobTitle}`)
    logAuditTrail('AI Recommendation', undefined, `Initiated background pipeline workflow execution: ${jobTitle}`)

    if (window.electronAPI && window.electronAPI.db) {
      try {
        await window.electronAPI.db.updateAiPipelineJob(
          jobId,
          'completed',
          5,
          1.0,
          JSON.stringify(['Agent orchestration starting...', 'OCR Agent completed (99% confidence)', 'Variance offsets complete', 'Created working checklist papers', 'Orchestration done safely.'])
        )
        const dbJobs = await window.electronAPI.db.getAiPipelineJobs()
        setPipelineJobs(dbJobs as PipelineJob[])
      } catch (e) {
        console.error(e)
      }
    }
  }

  // Module 3 & 4: Suggestion Verdict - Approved/Rejected with Continuous Learning Log
  const handleSuggestionApproval = async (sugId: string, status: 'approved' | 'rejected', itemType: string, original: string, suggested: string) => {
    if (window.electronAPI && window.electronAPI.db) {
      try {
        await window.electronAPI.db.updateAiSuggestionStatus(sugId, status)
        toast.success(`Suggestion marked as ${status}`)

        // Log continuous learning preference
        if (status === 'approved') {
          await window.electronAPI.db.insertAiLearningRecord({
            id: `lr-${Date.now()}`,
            pattern_type: itemType === 'ledger' ? 'ledger_mapping' : 'vendor_naming',
            pattern_key: original,
            pattern_value: suggested,
            user_override: 0
          })
          logAuditTrail('Approval', undefined, `Approved AI suggestion mapping for "${original}" to "${suggested}"`)
        } else {
          logAuditTrail('Manual Override', undefined, `Rejected AI suggestion mapping for "${original}"`)
        }

        // Reload
        const dbSuggestions = await window.electronAPI.db.getAiSuggestions()
        setSuggestions(dbSuggestions as Suggestion[])
        const dbLearning = await window.electronAPI.db.getAiLearningRecords()
        setLearningRecords(dbLearning)
      } catch (err) {
        console.error(err)
      }
    }
  }

  // Module 9: Custom Rule Builder Submit
  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRuleName) {
      toast.error('Rule name is required')
      return
    }

    const triggerActions = [
      { type: 'condition', field: newRuleConditionField, operator: newRuleOperator, value: newRuleConditionValue },
      { type: 'action', assign_user: newRuleAssignee },
      { type: 'action', notify_role: 'Partner' }
    ]

    const record = {
      id: `rule-${Date.now()}`,
      name: newRuleName,
      trigger_event: newRuleTrigger,
      actions: JSON.stringify(triggerActions),
      status: 'active' as const
    }

    if (window.electronAPI && window.electronAPI.db) {
      try {
        await window.electronAPI.db.insertAiAutomationRule(record)
        toast.success(`Rule "${newRuleName}" created successfully!`)
        logAuditTrail('Configure Rules', undefined, `Created custom workflow automation rule: ${newRuleName}`)
        setNewRuleName('')
        setNewRuleConditionValue('')
        const dbRules = await window.electronAPI.db.getAiAutomationRules()
        setRules(dbRules as AutomationRule[])
      } catch (e) {
        console.error(e)
      }
    }
  }

  // Delete Rule
  const handleDeleteRule = async (id: string, name: string) => {
    if (confirm(`Delete automation rule "${name}"?`)) {
      if (window.electronAPI && window.electronAPI.db) {
        try {
          await window.electronAPI.db.deleteAiAutomationRule(id)
          toast.success('Rule deleted')
          logAuditTrail('Configure Rules', undefined, `Deleted automation rule: ${name}`)
          const dbRules = await window.electronAPI.db.getAiAutomationRules()
          setRules(dbRules as AutomationRule[])
        } catch (e) {
          console.error(e)
        }
      }
    }
  }

  // Module 8: Intelligent Search Submit
  const handleNLSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nlSearchQuery.trim()) return

    setIsSearching(true)
    setSearchResults(null)

    setTimeout(() => {
      // Mock Natural Language database results
      const results = [
        { type: 'invoice', name: 'INV-2026-8941_ApexSteel.pdf', date: '2026-05-18', amount: '₹12,49,201', confidence: 0.98, client: 'Apex Steel Industries Pvt Ltd' },
        { type: 'invoice', name: 'INV-2026-9011_ApexSteel.pdf', date: '2026-06-11', amount: '₹8,92,100', confidence: 0.96, client: 'Apex Steel Industries Pvt Ltd' },
        { type: 'report', name: 'Apex_Q1_AuditReport_Draft.pdf', date: '2026-07-10', amount: 'N/A', confidence: 0.89, client: 'Apex Steel Industries Pvt Ltd' }
      ]
      setSearchResults(results)
      setIsSearching(false)
      toast.success('Natural Language search indexed successfully!')
      logAuditTrail('AI Recommendation', undefined, `Ran intelligent search query: "${nlSearchQuery}"`)
    }, 1200)
  }

  // Module 10: AI QA Flags Resolution
  const handleResolveQaFlag = async (id: string, status: 'resolved' | 'ignored', checkType: string) => {
    if (window.electronAPI && window.electronAPI.db) {
      try {
        await window.electronAPI.db.updateAiQaFlagStatus(id, status)
        toast.success(`QA flag marked as ${status}`)
        logAuditTrail('Manual Override', undefined, `Resolved QA validation concern for check: ${checkType}`)
        const dbQa = await window.electronAPI.db.getAiQaFlags()
        setQaFlags(dbQa as QaFlag[])
      } catch (e) {
        console.error(e)
      }
    }
  }

  // --- SUB-TABS RENDERERS ---

  // 1. Control Room Tab (Module 11 - Dashboard)
  const renderControlRoom = () => {
    // Stats calculation
    const openJobs = pipelineJobs.filter(j => j.status === 'running' || j.status === 'pending').length
    const openQaFlags = qaFlags.filter(q => q.status === 'flagged').length
    const pendingSuggestions = suggestions.filter(s => s.status === 'pending').length
    const processedRules = rules.length

    // QA Risk check data splits
    const qaCategoryData = [
      { name: 'Missing Fields', value: qaFlags.filter(q => q.check_type === 'missing_fields').length },
      { name: 'Calc Mismatches', value: qaFlags.filter(q => q.check_type === 'calculation_check').length },
      { name: 'Duplicates', value: qaFlags.filter(q => q.check_type === 'duplicate').length }
    ]

    return (
      <div className="space-y-6 text-left">
        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-5 border border-surface-700 bg-surface-800 hover:border-surface-600 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-surface-400 font-bold uppercase tracking-wider">AI Automation Success Rate</p>
                <p className="text-3xl font-black text-white mt-1">98.2%</p>
                <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                  <Sparkles size={11} /> 1,290 autonomous steps
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <BrainCircuit size={22} />
              </div>
            </div>
          </div>

          <div className="card p-5 border border-surface-700 bg-surface-800 hover:border-surface-600 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-surface-400 font-bold uppercase tracking-wider">Active Pipeline Jobs</p>
                <p className="text-3xl font-black text-white mt-1">{openJobs}</p>
                <p className="text-xs text-amber-500 mt-1">Concurrent background queues</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Zap size={22} />
              </div>
            </div>
          </div>

          <div className="card p-5 border border-surface-700 bg-surface-800 hover:border-surface-600 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-surface-400 font-bold uppercase tracking-wider">Pending QA Exceptions</p>
                <p className="text-3xl font-black text-white mt-1">{openQaFlags}</p>
                <p className="text-xs text-rose-500 mt-1 font-semibold">Low confidence warnings</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
                <AlertCircle size={22} />
              </div>
            </div>
          </div>

          <div className="card p-5 border border-surface-700 bg-surface-800 hover:border-surface-600 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-surface-400 font-bold uppercase tracking-wider">Pending Mapping Review</p>
                <p className="text-3xl font-black text-white mt-1">{pendingSuggestions}</p>
                <p className="text-xs text-brand-400 mt-1">Suggested ledgers & categories</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center">
                <Sliders size={22} />
              </div>
            </div>
          </div>
        </div>

        {/* Charts & Agent Directories */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 card p-5 flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-surface-850 pb-2.5">
              <h3 className="text-sm font-bold text-surface-100 flex items-center gap-2">
                <Bot size={16} className="text-brand-400" />
                Active Multi-Agent Orchestration Nodes
              </h3>
              <span className="badge badge-info text-[9px]">Offline Isolated Model</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-surface-900 border border-surface-850 rounded-xl space-y-1.5">
                <div className="flex justify-between font-bold text-surface-200">
                  <span>Document & OCR Agent</span>
                  <span className="text-emerald-400">Idle (Ready)</span>
                </div>
                <p className="text-[11px] text-surface-500">Performs high-speed OCR extraction, duplicate search checks and math boundary validations.</p>
              </div>

              <div className="p-3 bg-surface-900 border border-surface-850 rounded-xl space-y-1.5">
                <div className="flex justify-between font-bold text-surface-200">
                  <span>GST & bank Reconciler Agent</span>
                  <span className="text-amber-500">Processing...</span>
                </div>
                <p className="text-[11px] text-surface-500">Correlates client purchase ledger entries against GSTR-2B portals and statement feeds.</p>
              </div>

              <div className="p-3 bg-surface-900 border border-surface-850 rounded-xl space-y-1.5">
                <div className="flex justify-between font-bold text-surface-200">
                  <span>Audit & Tax Knowledge Agent</span>
                  <span className="text-emerald-400">Idle (Ready)</span>
                </div>
                <p className="text-[11px] text-surface-500">Indexes SOP compliance, statutory sections checks, and cross-references working paper checklists.</p>
              </div>

              <div className="p-3 bg-surface-900 border border-surface-850 rounded-xl space-y-1.5">
                <div className="flex justify-between font-bold text-surface-200">
                  <span>Workflow Coordinator Agent</span>
                  <span className="text-emerald-400">Idle (Ready)</span>
                </div>
                <p className="text-[11px] text-surface-500">Orchestrates planning steps, maps task dependencies, and directs approval route notifications.</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 card p-5 flex flex-col gap-3">
            <h3 className="text-sm font-bold text-surface-100">QA Exception Distribution</h3>
            <p className="text-xs text-surface-500">Discrepancy validation alerts counts</p>
            <div className="h-44 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={qaCategoryData.filter(q => q.value > 0).length > 0 ? qaCategoryData : [
                      { name: 'Missing Fields', value: 1 },
                      { name: 'Calc Mismatches', value: 1 },
                      { name: 'Duplicates', value: 1 }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={68}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    <Cell fill="#6366f1" />
                    <Cell fill="#f59e0b" />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Active Pipeline Queues (Module 13) */}
        <div className="card p-5 space-y-4">
          <h3 className="text-sm font-bold text-surface-100 flex items-center gap-2">
            <Clock size={16} className="text-brand-400" />
            Active Background Task Queues
          </h3>
          <div className="space-y-3">
            {pipelineJobs.map(job => (
              <div key={job.id} className="p-4 bg-surface-900 border border-surface-850 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-surface-200">{job.title}</p>
                    <p className="text-[10px] text-surface-500 font-mono">Job ID: {job.id}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`badge text-[9px] uppercase font-bold ${
                      job.status === 'completed' ? 'badge-success' :
                      job.status === 'running' ? 'badge-warning' :
                      'badge-neutral'
                    }`}>{job.status}</span>
                    {job.status === 'running' && (
                      <button
                        onClick={() => handleRunPipelineJob(job.id, job.title)}
                        className="p-1 bg-brand-600 rounded text-white hover:bg-brand-500 transition-colors text-[10px] px-2 font-bold"
                      >
                        Trigger Complete
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-surface-500">
                    <span>Progress: {Math.round(job.progress * 100)}%</span>
                    <span>Retries: {job.retry_count}</span>
                  </div>
                  <div className="w-full bg-surface-950 h-1.5 rounded-full overflow-hidden border border-surface-800">
                    <div className="bg-brand-500 h-full rounded-full transition-all duration-300" style={{ width: `${job.progress * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
            {pipelineJobs.length === 0 && (
              <div className="text-center py-6 text-surface-650 text-xs bg-surface-900 rounded-xl border border-surface-850">No background pipeline queues active.</div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // 2. AI Task Planner Tab (Module 1)
  const renderTaskPlanner = () => {
    return (
      <div className="card p-6 text-left max-w-3xl space-y-6">
        <div className="border-b border-surface-800 pb-3">
          <h3 className="text-sm font-bold text-surface-100 flex items-center gap-2">
            <BrainCircuit size={16} className="text-brand-500" />
            Module 1: AI Task Sequence Planner
          </h3>
          <p className="text-xs text-surface-550 mt-1 font-medium">Input natural-language instructions to orchestrate multi-agent workflow paths.</p>
        </div>

        <form onSubmit={handlePlannerSubmit} className="space-y-3.5">
          <div>
            <label className="text-[10px] text-surface-400 font-bold uppercase tracking-wider block mb-1">What compliance sequence would you like to run?</label>
            <div className="flex gap-2">
              <input
                required
                type="text"
                value={plannerInput}
                onChange={e => setPlannerInput(e.target.value)}
                placeholder="e.g. Complete GST reconciliation for Apex Steel and compile statutory working papers"
                className="input py-2.5"
              />
              <button
                type="submit"
                disabled={isPlanning}
                className="btn-primary text-xs gap-1.5 flex-shrink-0 px-5"
              >
                {isPlanning ? <RefreshCw size={13} className="animate-spin" /> : <Play size={13} />}
                Generate Plan
              </button>
            </div>
          </div>
        </form>

        {activePlan && (
          <div className="space-y-4 pt-4 border-t border-surface-800">
            <h4 className="text-xs font-bold text-surface-300 uppercase tracking-wider">Generated Execution Plan sequence</h4>
            
            <div className="relative border-l border-surface-750 ml-3.5 pl-5 space-y-5">
              {activePlan.map((p) => (
                <div key={p.step} className="relative text-xs">
                  {/* Step point marker */}
                  <div className={`absolute -left-[27px] top-0.5 w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    p.status === 'completed' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' :
                    p.status === 'running' ? 'bg-amber-500/20 border-amber-500 text-amber-400 animate-pulse' :
                    'bg-surface-900 border-surface-700 text-surface-500'
                  }`}>
                    {p.status === 'completed' && <Check size={8} />}
                  </div>

                  <div>
                    <span className="font-bold text-surface-200">Step {p.step}: {p.title}</span>
                    <span className={`badge text-[8px] ml-2 font-bold ${
                      p.status === 'completed' ? 'badge-success' :
                      p.status === 'running' ? 'badge-warning' :
                      'badge-neutral'
                    }`}>{p.status}</span>
                    <p className="text-[11px] text-surface-500 mt-0.5">{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2 justify-end border-t border-surface-800">
              <button
                onClick={() => {
                  toast.success('Autonomous task sequence launched!')
                  setActivePlan(null)
                  setPlannerInput('')
                }}
                className="btn-primary text-xs py-1.5 px-4"
              >
                Confirm & Run Autonomous Agents
              </button>
              <button onClick={() => setActivePlan(null)} className="btn-secondary text-xs py-1.5 px-4">Modify Request</button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // 3. Workflow Rule Designer Tab (Module 2 & 9)
  const renderWorkflowRules = () => {
    return (
      <div className="space-y-6 text-left">
        {/* Rules Designer Form */}
        <div className="card p-5 space-y-4 max-w-3xl">
          <div className="border-b border-surface-800 pb-3">
            <h3 className="text-sm font-bold text-surface-100 flex items-center gap-2">
              <Code size={16} className="text-brand-500" />
              Module 9: Automation Rules Engine Builder
            </h3>
            <p className="text-xs text-surface-550 mt-1">Configure rule parameters to route documents, raise task priorities, or flag senior reviews without code changes.</p>
          </div>

          <form onSubmit={handleCreateRule} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-surface-400 font-bold uppercase tracking-wider block mb-1">Automation Name</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Route critical audit risks"
                  value={newRuleName}
                  onChange={e => setNewRuleName(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="text-[10px] text-surface-400 font-bold uppercase tracking-wider block mb-1">Trigger Event</label>
                <select
                  value={newRuleTrigger}
                  onChange={e => setNewRuleTrigger(e.target.value)}
                  className="input py-2"
                >
                  <option value="invoice_uploaded">Invoice Uploaded</option>
                  <option value="bank_statement_imported">Bank Statement Imported</option>
                  <option value="gst_mismatch_detected">GST Mismatch Detected</option>
                  <option value="low_confidence_extracted">OCR Low Confidence Output</option>
                </select>
              </div>
            </div>

            <div className="bg-surface-950 p-4 border border-surface-850 rounded-xl space-y-3">
              <h4 className="text-[10px] text-surface-400 font-bold uppercase tracking-wider">Trigger Condition Statement</h4>
              <div className="grid grid-cols-3 gap-3 items-center">
                <div>
                  <label className="text-[9px] text-surface-500 uppercase block mb-1">Condition Field</label>
                  <select
                    value={newRuleConditionField}
                    onChange={e => setNewRuleConditionField(e.target.value)}
                    className="input py-1.5"
                  >
                    <option value="grandTotal">Invoice Grand Total (Value)</option>
                    <option value="mismatchAmount">GST Variance Amount (Value)</option>
                    <option value="confidenceScore">OCR Confidence Level</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] text-surface-500 uppercase block mb-1">Condition Operator</label>
                  <select
                    value={newRuleOperator}
                    onChange={e => setNewRuleOperator(e.target.value)}
                    className="input py-1.5 font-bold"
                  >
                    <option value=">">GREATER THAN (&gt;)</option>
                    <option value="<">LESS THAN (&lt;)</option>
                    <option value="=">EQUAL TO (=)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] text-surface-500 uppercase block mb-1">Condition Limit Value</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. 1000000"
                    value={newRuleConditionValue}
                    onChange={e => setNewRuleConditionValue(e.target.value)}
                    className="input py-1.5 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-surface-400 font-bold uppercase tracking-wider block mb-1">Result Action: Assign Staff</label>
                <select
                  value={newRuleAssignee}
                  onChange={e => setNewRuleAssignee(e.target.value)}
                  className="input py-2"
                >
                  <option value="">Select Assignee...</option>
                  <option value="user-1">CA Aditya Sen (Partner)</option>
                  <option value="user-2">Ravi Verma (Senior)</option>
                  <option value="user-3">S. Sharma (Junior)</option>
                </select>
              </div>
              <div className="flex items-end">
                <button type="submit" className="btn-primary text-xs py-2 px-5 gap-1.5 w-full justify-center">
                  <PlusCircle size={14} /> Register Rules Pipeline
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Existing Rules List */}
        <div className="card p-5 space-y-4">
          <h3 className="text-sm font-bold text-surface-100">Configured Automation Pipelines</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rules.map(rule => (
              <div key={rule.id} className="p-4 bg-surface-900 border border-surface-850 rounded-xl space-y-3 flex flex-col justify-between hover:border-surface-700 transition-colors">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] uppercase font-black px-1.5 py-0.5 bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded">
                      {rule.trigger_event}
                    </span>
                    <button
                      onClick={() => handleDeleteRule(rule.id, rule.name)}
                      className="p-1 text-surface-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <h4 className="text-xs font-bold text-surface-200">{rule.name}</h4>
                  
                  {/* Parse actions preview */}
                  <div className="text-[10px] text-surface-500 bg-surface-950 p-2.5 rounded-lg border border-surface-850 font-mono">
                    {JSON.parse(rule.actions).map((act: any, idx: number) => {
                      if (act.type === 'condition') {
                        return <p key={idx} className="text-amber-500">IF: {act.field} {act.operator} {act.value}</p>
                      }
                      if (act.assign_user) {
                        return <p key={idx} className="text-surface-300">THEN: Assign user {act.assign_user}</p>
                      }
                      if (act.create_task) {
                        return <p key={idx} className="text-surface-300">THEN: Create task "{act.create_task}"</p>
                      }
                      return null
                    })}
                  </div>
                </div>

                <div className="flex justify-between items-center border-t border-surface-950 pt-2.5 mt-2">
                  <span className="badge badge-success text-[8px]">Active</span>
                  <span className="text-[9px] text-surface-500 font-mono">ID: {rule.id}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // 4. Suggestions & Continuous Learning Tab (Module 3 & 4)
  const renderSuggestions = () => {
    return (
      <div className="space-y-6 text-left">
        {/* Suggestion Approval Queue */}
        <div className="card p-5 space-y-4">
          <div className="border-b border-surface-800 pb-3">
            <h3 className="text-sm font-bold text-surface-100 flex items-center gap-2">
              <Sliders size={16} className="text-brand-500" />
              Module 3: AI Intelligence Suggestions Registry
            </h3>
            <p className="text-xs text-surface-550 mt-1">Accept mapping recommendations for ledgers and expense categories. Rejected offsets adjust learning weights.</p>
          </div>

          <div className="table-wrapper">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-900 border-b border-surface-700 text-surface-400 uppercase tracking-wider text-[10px]">
                  <th className="p-3">Original Extracted Text</th>
                  <th className="p-3">Item Classification Type</th>
                  <th className="p-3">Suggested Target Mapping</th>
                  <th className="p-3">Model Confidence</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Human Verdict</th>
                </tr>
              </thead>
              <tbody>
                {suggestions.map((sug) => (
                  <tr key={sug.id} className="border-b border-surface-800 hover:bg-surface-750">
                    <td className="p-3 font-mono text-xs text-surface-200 font-semibold">{sug.original_value}</td>
                    <td className="p-3">
                      <span className="text-[9px] uppercase font-black px-1.5 py-0.5 bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded">
                        {sug.item_type}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-xs text-surface-300">{sug.suggested_value}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold font-mono text-surface-300">{Math.round(sug.confidence * 100)}%</span>
                        <div className="w-16 bg-surface-900 h-1.5 rounded-full overflow-hidden border border-surface-800">
                          <div className={`h-full ${
                            sug.confidence > 0.9 ? 'bg-emerald-500' : 'bg-amber-500'
                          }`} style={{ width: `${sug.confidence * 100}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`badge text-[9px] font-bold ${
                        sug.status === 'approved' ? 'badge-success' :
                        sug.status === 'rejected' ? 'badge-error' :
                        'badge-neutral'
                      }`}>{sug.status}</span>
                    </td>
                    <td className="p-3 text-center">
                      {sug.status === 'pending' ? (
                        <div className="flex gap-2.5 justify-center">
                          <button
                            onClick={() => handleSuggestionApproval(sug.id, 'approved', sug.item_type, sug.original_value, sug.suggested_value)}
                            className="w-6 h-6 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 flex items-center justify-center"
                          >
                            <Check size={11} />
                          </button>
                          <button
                            onClick={() => handleSuggestionApproval(sug.id, 'rejected', sug.item_type, sug.original_value, sug.suggested_value)}
                            className="w-6 h-6 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 flex items-center justify-center"
                          >
                            <X size={11} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-surface-500 font-mono">Reviewed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Continuous Learning Preference Log (Module 4) */}
        <div className="card p-5 space-y-4">
          <h3 className="text-sm font-bold text-surface-100 flex items-center gap-2">
            <TrendingUp size={16} className="text-brand-400" />
            Module 4: Continuous Learning Mapping preferences
          </h3>
          <p className="text-xs text-surface-550 mt-1">Preferences dynamically updated by active overrides. Used to auto-reconcile recurring ledger accounts.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {learningRecords.map(lr => (
              <div key={lr.id} className="p-3 bg-surface-900 border border-surface-850 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-surface-200">Key: <span className="font-mono text-brand-400 font-semibold">{lr.pattern_key}</span></p>
                  <p className="text-[11px] text-surface-550 mt-1">Mapped to: <span className="font-semibold">{lr.pattern_value}</span></p>
                </div>
                <span className="badge badge-info text-[9px] uppercase font-bold">{lr.pattern_type.replace('_', ' ')}</span>
              </div>
            ))}
            {learningRecords.length === 0 && (
              <p className="col-span-2 text-center text-xs text-surface-550 py-6">No historical corrections logged yet.</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // 5. Working Papers Tab (Module 5)
  const renderWorkingPapers = () => {
    return (
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 text-left items-stretch">
        {/* Sidebar papers list */}
        <div className="xl:col-span-4 flex flex-col gap-4">
          <div className="card p-4 flex flex-col h-full space-y-3">
            <h3 className="text-xs font-bold text-surface-400 uppercase tracking-wider">AI Generated working files</h3>
            <div className="space-y-2 overflow-y-auto max-h-[450px]">
              {workingPapers.map(wp => (
                <div
                  key={wp.id}
                  onClick={() => setSelectedPaper(wp)}
                  className={`p-3 border rounded-xl cursor-pointer transition-colors space-y-1.5 ${
                    selectedPaper?.id === wp.id
                      ? 'bg-brand-500/5 border-brand-500'
                      : 'bg-surface-900 border-surface-850 hover:border-surface-700'
                  }`}
                >
                  <span className="text-[9px] uppercase font-black px-1.5 py-0.5 bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded">
                    {wp.document_type}
                  </span>
                  <p className="text-xs font-bold text-surface-200">{wp.title}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Paper details split-screen visual preview */}
        <div className="xl:col-span-8 flex flex-col">
          <div className="card p-5 flex flex-col h-full justify-between gap-6 relative">
            {selectedPaper ? (
              <>
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-surface-850 pb-3">
                    <div className="space-y-0.5">
                      <span className="text-[9px] uppercase font-black px-1.5 py-0.5 bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded">
                        {selectedPaper.document_type}
                      </span>
                      <h3 className="text-sm font-bold text-surface-100 mt-1">{selectedPaper.title}</h3>
                    </div>
                    {/* Glowing Flag warning */}
                    <span className="badge bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-black animate-pulse flex items-center gap-1">
                      <Sparkles size={11} /> AI-Generated Elements Flagged
                    </span>
                  </div>

                  {/* Document preview block showing tagged elements */}
                  <div className="bg-surface-950 p-5 rounded-xl border border-surface-850 prose prose-invert max-w-none text-xs leading-relaxed max-h-[350px] overflow-y-auto font-mono text-surface-300">
                    {selectedPaper.generated_content.split('\n').map((line, idx) => {
                      const isAiSegment = line.includes('[AI-GENERATED]')
                      return (
                        <p
                          key={idx}
                          className={`${
                            isAiSegment
                              ? 'bg-brand-500/10 border-l-2 border-brand-500 p-2.5 rounded-r my-2 text-brand-400 font-bold'
                              : 'my-1'
                          }`}
                        >
                          {line}
                        </p>
                      )
                    })}
                  </div>
                </div>

                <div className="flex gap-2 pt-4 border-t border-surface-850 justify-end">
                  <button
                    onClick={() => {
                      toast.success('Working paper signed and saved to audit archive.')
                      logAuditTrail('Approval', undefined, `Signed-off AI working paper document: ${selectedPaper.title}`)
                    }}
                    className="btn-primary text-xs px-5 py-1.5"
                  >
                    Approve & Save Paper
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Delete this working paper?')) {
                        handleDeleteAiWorkingPaper(selectedPaper.id)
                      }
                    }}
                    className="btn-danger text-xs px-4 py-1.5"
                  >
                    Delete Draft
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-20 text-surface-500 text-xs">No working papers drafted yet.</div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const handleDeleteAiWorkingPaper = async (id: string) => {
    if (window.electronAPI && window.electronAPI.db) {
      try {
        await window.electronAPI.db.deleteAiWorkingPaper(id)
        toast.success('Paper draft deleted')
        logAuditTrail('Delete', undefined, 'Deleted working paper draft')
        const dbPapers = await window.electronAPI.db.getAiWorkingPapers()
        setWorkingPapers(dbPapers as WorkingPaper[])
        if (dbPapers.length > 0) setSelectedPaper(dbPapers[0] as WorkingPaper)
        else setSelectedPaper(null)
      } catch (e) {
        console.error(e)
      }
    }
  }

  // 6. Analytics Tab (Module 6 & 7)
  const renderAnalytics = () => {
    // Variance analytical charts data
    const chartData = [
      { month: 'Apr', sales: 4200000, portal: 4180000, variance: 20000 },
      { month: 'May', sales: 5100000, portal: 5050000, variance: 50000 },
      { month: 'Jun', sales: 4800000, portal: 4790000, variance: 10000 },
      { month: 'Jul', sales: 6000000, portal: 5920000, variance: 80000 }
    ]

    return (
      <div className="space-y-6 text-left">
        {/* Compliancemonitor */}
        <div className="card p-5 space-y-4">
          <h3 className="text-sm font-bold text-surface-100 flex items-center gap-2">
            <Calendar size={16} className="text-brand-400" />
            Module 6: Smart Workload Compliance Monitor
          </h3>
          <p className="text-xs text-surface-550 mt-1">Smart forecast showing compliance workload density logs and potential overdue bottlenecks.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-surface-900 border border-surface-850 rounded-xl space-y-2">
              <span className="text-[10px] text-surface-500 font-bold uppercase">Estimated Team Stress index</span>
              <p className="text-xl font-bold text-amber-500">Medium density workload</p>
              <p className="text-[11px] text-surface-500 mt-1">Workloads peak between August 10 and 20 due to GSTR-3B filings.</p>
            </div>

            <div className="p-4 bg-surface-900 border border-surface-850 rounded-xl space-y-2">
              <span className="text-[10px] text-surface-500 font-bold uppercase">AI Risk variance forecast</span>
              <p className="text-xl font-bold text-rose-500">2 Critical mismatches</p>
              <p className="text-[11px] text-surface-500 mt-1">GST variance for Apex exceeds warning limit of ₹50,000.</p>
            </div>

            <div className="p-4 bg-surface-900 border border-surface-850 rounded-xl space-y-2">
              <span className="text-[10px] text-surface-500 font-bold uppercase">Filing Due Check</span>
              <p className="text-xl font-bold text-emerald-400">0 Overdue Returns</p>
              <p className="text-[11px] text-surface-500 mt-1">All monthly challans mapped and GSTR returns completed on time.</p>
            </div>
          </div>
        </div>

        {/* Predictive Analytics Variance Chart (Module 7) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-5 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-surface-100">GSTR-2B vs Books Variance Trends</h3>
            <p className="text-xs text-surface-500">Variance credit deviations mapped locally</p>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorVar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="variance" name="Credit Variance Value (₹)" stroke="#ef4444" fillOpacity={1} fill="url(#colorVar)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card p-5 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-surface-100">Monthly Cash Flow analytics</h3>
            <p className="text-xs text-surface-500">Revenue cash mappings versus outflow logs</p>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="sales" name="Sales ledger book inflow" stroke="#6366f1" strokeWidth={2} />
                  <Line type="monotone" dataKey="portal" name="Portal matching balance" stroke="#10b981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 7. Intelligent Search Tab (Module 8)
  const renderSearch = () => {
    return (
      <div className="card p-6 text-left max-w-3xl space-y-6">
        <div className="border-b border-surface-800 pb-3">
          <h3 className="text-sm font-bold text-surface-100 flex items-center gap-2">
            <Search size={16} className="text-brand-500" />
            Module 8: AI Intelligent Natural-Language Search
          </h3>
          <p className="text-xs text-surface-550 mt-1">Run complex natural language search parameters over client registries, ledger records, invoices, and reports.</p>
        </div>

        <form onSubmit={handleNLSearch} className="space-y-3.5">
          <div className="flex gap-2 bg-surface-900 border border-surface-750 p-1.5 rounded-lg px-3">
            <Search size={16} className="text-surface-500 mt-1.5" />
            <input
              required
              type="text"
              value={nlSearchQuery}
              onChange={e => setNlSearchQuery(e.target.value)}
              placeholder="e.g. Show all invoices from Apex Steel between April and June over ₹5 lakh"
              className="bg-transparent border-none text-xs text-surface-200 outline-none w-full focus:ring-0"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="btn-primary text-xs px-4"
            >
              {isSearching ? <RefreshCw size={12} className="animate-spin" /> : 'Search'}
            </button>
          </div>
        </form>

        {searchResults && (
          <div className="space-y-3.5 pt-4 border-t border-surface-800">
            <h4 className="text-xs font-bold text-surface-300 uppercase tracking-wider">Semantic Search Results</h4>
            
            <div className="space-y-3">
              {searchResults.map((res, idx) => (
                <div key={idx} className="p-3 bg-surface-950 border border-surface-850 rounded-xl flex justify-between items-center text-xs">
                  <div className="flex items-start gap-2.5">
                    <FileText size={16} className="text-brand-400 mt-0.5" />
                    <div>
                      <p className="font-bold text-surface-200">{res.name}</p>
                      <p className="text-[10px] text-surface-500 mt-0.5">Date: {res.date} | Client: {res.client}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-bold text-surface-200">{res.amount}</p>
                    <p className="text-[9px] text-brand-400 font-mono font-semibold">Match confidence: {Math.round(res.confidence * 100)}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // 8. Quality Assurance Tab (Module 10)
  const renderQa = () => {
    return (
      <div className="space-y-6 text-left">
        <div className="card p-5 space-y-4">
          <div className="border-b border-surface-800 pb-3">
            <h3 className="text-sm font-bold text-surface-100 flex items-center gap-2">
              <Shield size={16} className="text-brand-500" />
              Module 10: AI Quality Assurance & Validation Checks
            </h3>
            <p className="text-xs text-surface-550 mt-1">Automatic screening checking OCR quality, duplicate entries and math anomalies before partner presentation.</p>
          </div>

          <div className="table-wrapper">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-900 border-b border-surface-700 text-surface-400 uppercase tracking-wider text-[10px]">
                  <th className="p-3">Source File Target</th>
                  <th className="p-3">QA Check Type</th>
                  <th className="p-3">Trace Log / Discrepancy details</th>
                  <th className="p-3">Validation Confidence</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Review Override</th>
                </tr>
              </thead>
              <tbody>
                {qaFlags.map((flag) => (
                  <tr key={flag.id} className="border-b border-surface-800 hover:bg-surface-750">
                    <td className="p-3">
                      <div className="flex items-center gap-2 text-xs">
                        <FileText size={14} className="text-brand-400" />
                        <span className="font-semibold text-surface-300">{flag.file_name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-xs text-surface-400 font-bold uppercase tracking-wider">{flag.check_type.replace('_', ' ')}</td>
                    <td className="p-3 text-xs text-surface-350">{flag.message}</td>
                    <td className="p-3">
                      <span className="font-mono text-xs font-semibold text-surface-300">{Math.round(flag.confidence_score * 100)}%</span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`badge text-[9px] font-bold ${
                        flag.status === 'resolved' ? 'badge-success' :
                        flag.status === 'ignored' ? 'badge-neutral' :
                        'badge-error'
                      }`}>{flag.status}</span>
                    </td>
                    <td className="p-3 text-center">
                      {flag.status === 'flagged' ? (
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => handleResolveQaFlag(flag.id, 'resolved', flag.check_type)}
                            className="btn bg-emerald-600/10 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 text-[10px] font-bold rounded"
                          >
                            Resolve
                          </button>
                          <button
                            onClick={() => handleResolveQaFlag(flag.id, 'ignored', flag.check_type)}
                            className="btn bg-surface-900 border border-surface-800 text-surface-400 px-2 py-0.5 text-[10px] font-bold rounded"
                          >
                            Ignore
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-surface-500">Overridden</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container relative h-full">
      {/* Title Header Banner */}
      <div className="section-header">
        <div className="text-left">
          <h2 className="text-lg font-bold text-surface-100 flex items-center gap-2">
            <BrainCircuit size={18} className="text-brand-500" />
            AI Automation & Autonomous Workflows Hub
          </h2>
          <p className="text-sm text-surface-400 mt-0.5 font-medium">
            Transform CA Copilot into an autonomous operating system mapping task sequences, routing rules and papers.
          </p>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="border-b border-surface-800 flex flex-wrap gap-1.5 mb-4">
        {[
          { id: 'control', label: 'AI Operations Center', icon: Activity },
          { id: 'planner', label: 'AI Task Planner', icon: BrainCircuit },
          { id: 'workflow', label: 'Workflow Rules Builder', icon: GitBranch },
          { id: 'suggestions', label: 'Suggestions & Learning', icon: Sliders },
          { id: 'papers', label: 'AI Working Papers', icon: FileText },
          { id: 'analytics', label: 'Compliance & Analytics', icon: Calendar },
          { id: 'search', label: 'Intelligent Search', icon: Search },
          { id: 'qa', label: 'AI Quality Assurance', icon: Shield }
        ].map(t => {
          const Icon = t.icon
          const isActive = activeTab === t.id
          return (
            <button
              key={t.id}
              onClick={() => {
                setActiveTab(t.id as any)
                setActivePlan(null)
                setSearchResults(null)
              }}
              className={`px-3.5 py-2 border-b-2 text-xs font-semibold flex items-center gap-1.5 transition-colors -mb-[2px] ${
                isActive
                  ? 'border-brand-500 text-white font-bold bg-brand-500/5'
                  : 'border-transparent text-surface-400 hover:text-surface-200 hover:bg-surface-800/50'
              }`}
            >
              <Icon size={14} className={isActive ? 'text-brand-500' : 'text-surface-500'} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Render sub tab components */}
      <div className="flex-1 overflow-y-auto pb-8">
        {activeTab === 'control' && renderControlRoom()}
        {activeTab === 'planner' && renderTaskPlanner()}
        {activeTab === 'workflow' && renderWorkflowRules()}
        {activeTab === 'suggestions' && renderSuggestions()}
        {activeTab === 'papers' && renderWorkingPapers()}
        {activeTab === 'analytics' && renderAnalytics()}
        {activeTab === 'search' && renderSearch()}
        {activeTab === 'qa' && renderQa()}
      </div>
    </div>
  )
}
