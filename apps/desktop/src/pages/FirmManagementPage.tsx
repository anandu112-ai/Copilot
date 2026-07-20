import React, { useState, useEffect } from 'react'
import {
  Building2, Users, Shield, BookCheck, Calculator, Calendar, GitCompare,
  TrendingUp, Clock, AlertTriangle, CheckCircle2, ChevronRight, Activity,
  ArrowUpRight, Plus, Search, Trash2, Edit2, Lock, Unlock, RefreshCw, FileText,
  Check, X, FileUp, MessageSquare, Download, Upload, Eye, Filter, Settings,
  Database, AlertCircle, Sparkles, Send, Paperclip
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts'
import toast from 'react-hot-toast'

// Formats
import { format, parseISO, isPast } from 'date-fns'

// Define permissions
const ALL_PERMISSIONS = [
  'Upload Documents',
  'Delete Files',
  'Edit Ledger',
  'Approve Reports',
  'Export Reports',
  'Configure Rules',
  'Manage Users'
]

// Default roles list
const ROLES = [
  'Super Admin',
  'Managing Partner',
  'Partner',
  'Chartered Accountant',
  'Audit Manager',
  'Senior Auditor',
  'Junior Auditor',
  'Article Assistant',
  'Accountant',
  'Data Entry Operator',
  'Read-Only Reviewer'
]

export default function FirmManagementPage() {
  // Session Lock State
  const [isLocked, setIsLocked] = useState(false)
  const [lockPassword, setLockPassword] = useState('')
  const [activeTab, setActiveTab] = useState<'dashboard' | 'firm' | 'staff' | 'clients' | 'tasks' | 'approvals' | 'calendar' | 'knowledge' | 'audit' | 'sync'>('dashboard')

  // Data States
  const [firmDetails, setFirmDetails] = useState<any>({
    id: 'firm-1',
    name: 'Aditya Sen & Associates',
    registration: 'FRN-102938W',
    address: 'Suite 405, Nariman Point, Mumbai, MH - 400021',
    phone: '+91 22 2284 9011',
    email: 'office@adityasen.in',
    logo: '',
    letterhead: '',
    workspace_type: 'multi-partner'
  })
  const [users, setUsers] = useState<any[]>([])
  const [rolePermissions, setRolePermissions] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [tasks, setTasks] = useState<any[]>([])
  const [complianceDeadlines, setComplianceDeadlines] = useState<any[]>([])
  const [knowledgeItems, setKnowledgeItems] = useState<any[]>([])
  const [auditTrail, setAuditTrail] = useState<any[]>([])
  const [syncLogs, setSyncLogs] = useState<any[]>([])

  // Selection & Form States
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [selectedTask, setSelectedTask] = useState<any>(null)
  const [selectedDoc, setSelectedDoc] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [knowledgeSearch, setKnowledgeSearch] = useState('')

  // Task Drawer Internal Comment State
  const [newComment, setNewComment] = useState('')
  const [taskComments, setTaskComments] = useState<any[]>([])

  // Modal forms
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'Junior Auditor', branch: 'Mumbai Head Office', department: 'Audit' })

  const [showAddTaskModal, setShowAddTaskModal] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', description: '', client_id: '', owner_id: '', due_date: '', priority: 'medium', task_type: 'audit' })

  const [showAddDeadlineModal, setShowAddDeadlineModal] = useState(false)
  const [newDeadline, setNewDeadline] = useState({ title: '', deadline_date: '', category: 'GST', description: '' })

  const [showAddKnowledgeModal, setShowAddKnowledgeModal] = useState(false)
  const [newKnowledge, setNewKnowledge] = useState({ title: '', category: 'sop', content: '', tags: '', file_path: '' })

  const [showClientDetailModal, setShowClientDetailModal] = useState(false)

  // Current active user simulation
  const [currentUser, setCurrentUser] = useState<any>({
    name: 'CA Aditya Sen',
    role: 'Managing Partner',
    email: 'aditya@adityasen.in'
  })

  // Load database content
  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    if (window.electronAPI && window.electronAPI.db) {
      try {
        const firm = await window.electronAPI.db.getFirmDetails()
        if (firm) setFirmDetails(firm)

        const dbUsers = await window.electronAPI.db.getUsers()
        setUsers(dbUsers)

        const dbRolePerms = await window.electronAPI.db.getRolePermissions()
        setRolePermissions(dbRolePerms)

        const dbClients = await window.electronAPI.db.getClients()
        setClients(dbClients)

        const dbTasks = await window.electronAPI.db.getTasks()
        setTasks(dbTasks)

        const dbDeadlines = await window.electronAPI.db.getComplianceDeadlines()
        setComplianceDeadlines(dbDeadlines)

        const dbKnowledge = await window.electronAPI.db.getKnowledgeItems()
        setKnowledgeItems(dbKnowledge)

        const dbAudit = await window.electronAPI.db.getAuditTrail(100)
        setAuditTrail(dbAudit)

        const dbSync = await window.electronAPI.db.getSyncLogs(50)
        setSyncLogs(dbSync)
      } catch (err) {
        console.error('Failed to load database files', err)
      }
    } else {
      // Setup default mock values in development / browser mode
      toast.error('Electron API not available, loading fallback values')
    }
  }

  // Audit Logging Helper
  const logAction = async (action: string, clientName?: string, docName?: string, details?: string) => {
    const log = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      user_name: currentUser.name,
      role: currentUser.role,
      action,
      client_name: clientName || '',
      document_name: docName || '',
      details: details || ''
    }

    if (window.electronAPI && window.electronAPI.db) {
      try {
        await window.electronAPI.db.insertAuditTrail(log)
        // Refresh logs
        const dbAudit = await window.electronAPI.db.getAuditTrail(100)
        setAuditTrail(dbAudit)
      } catch (err) {
        console.error(err)
      }
    } else {
      setAuditTrail(prev => [log, ...prev])
    }
  }

  // Check role permission
  const hasPermission = (permission: string) => {
    const perm = rolePermissions.find(rp => rp.role === currentUser.role && rp.permission === permission)
    return perm ? perm.enabled === 1 : true // Default to true if not explicitly restricted
  }

  // --- ACTIONS ---

  // Save Firm Details
  const handleSaveFirmDetails = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hasPermission('Configure Rules')) {
      toast.error('Permission Denied: Cannot configure workspace settings.')
      return
    }

    if (window.electronAPI && window.electronAPI.db) {
      try {
        await window.electronAPI.db.saveFirmDetails(firmDetails)
        toast.success('Firm Workspace saved successfully!')
        logAction('Edit Firm Workspace', undefined, undefined, `Updated firm workspace details for ${firmDetails.name}`)
      } catch (err) {
        console.error(err)
        toast.error('Failed to save firm details')
      }
    } else {
      toast.success('Saved firm details (Simulation)')
    }
  }

  // Add User Staff
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hasPermission('Manage Users')) {
      toast.error('Permission Denied: Cannot manage users.')
      return
    }

    const id = `user-${Date.now()}`
    const record = { ...newUser, id, status: 'active', password_hash: `scrypt:${newUser.name.toLowerCase().replace(/\s/g, '')}123` }

    if (window.electronAPI && window.electronAPI.db) {
      try {
        await window.electronAPI.db.insertUser(record)
        toast.success(`User ${newUser.name} added successfully!`)
        logAction('Manage Users', undefined, undefined, `Added staff user ${newUser.name} with role ${newUser.role}`)
        setNewUser({ name: '', email: '', role: 'Junior Auditor', branch: 'Mumbai Head Office', department: 'Audit' })
        setShowAddUserModal(false)
        // Reload
        const dbUsers = await window.electronAPI.db.getUsers()
        setUsers(dbUsers)
      } catch (err) {
        console.error(err)
        toast.error('Failed to add user')
      }
    } else {
      setUsers([...users, record])
      setShowAddUserModal(false)
    }
  }

  // Remove User Staff
  const handleDeleteUser = async (id: string, name: string) => {
    if (!hasPermission('Manage Users')) {
      toast.error('Permission Denied: Cannot delete users.')
      return
    }

    if (confirm(`Are you sure you want to remove staff member ${name}?`)) {
      if (window.electronAPI && window.electronAPI.db) {
        try {
          await window.electronAPI.db.deleteUser(id)
          toast.success(`Staff user ${name} removed.`)
          logAction('Manage Users', undefined, undefined, `Removed staff user ${name}`)
          // Reload
          const dbUsers = await window.electronAPI.db.getUsers()
          setUsers(dbUsers)
        } catch (err) {
          console.error(err)
        }
      } else {
        setUsers(users.filter(u => u.id !== id))
      }
    }
  }

  // Toggle role permission
  const handleTogglePermission = async (role: string, permission: string, currentEnabled: number) => {
    if (!hasPermission('Configure Rules')) {
      toast.error('Permission Denied: Cannot configure permissions.')
      return
    }

    const nextEnabled = currentEnabled === 1 ? 0 : 1

    if (window.electronAPI && window.electronAPI.db) {
      try {
        await window.electronAPI.db.insertRolePermission(role, permission, nextEnabled)
        toast.success(`Updated permission ${permission} for ${role}`)
        logAction('Configure Rules', undefined, undefined, `Set permission ${permission} for role ${role} to ${nextEnabled ? 'enabled' : 'disabled'}`)
        const dbRolePerms = await window.electronAPI.db.getRolePermissions()
        setRolePermissions(dbRolePerms)
      } catch (err) {
        console.error(err)
      }
    } else {
      setRolePermissions(prev => {
        const index = prev.findIndex(rp => rp.role === role && rp.permission === permission)
        if (index > -1) {
          const updated = [...prev]
          updated[index] = { ...updated[index], enabled: nextEnabled }
          return updated
        } else {
          return [...prev, { role, permission, enabled: nextEnabled }]
        }
      })
    }
  }

  // Add Task
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTask.title) {
      toast.error('Task title is required')
      return
    }

    const id = `task-${Date.now()}`
    const client = clients.find(c => c.id === newTask.client_id)
    const owner = users.find(u => u.id === newTask.owner_id)

    const record = {
      id,
      ...newTask,
      owner_name: owner ? owner.name : 'Unassigned',
      status: 'pending',
      attachments: '[]'
    }

    if (window.electronAPI && window.electronAPI.db) {
      try {
        await window.electronAPI.db.insertTask(record)
        toast.success('Task created successfully')
        logAction('Edit', client?.clientName, undefined, `Created compliance task: ${newTask.title}`)
        setShowAddTaskModal(false)
        setNewTask({ title: '', description: '', client_id: '', owner_id: '', due_date: '', priority: 'medium', task_type: 'audit' })
        // Reload
        const dbTasks = await window.electronAPI.db.getTasks()
        setTasks(dbTasks)
      } catch (err) {
        console.error(err)
        toast.error('Failed to create task')
      }
    } else {
      setTasks([record, ...tasks])
      setShowAddTaskModal(false)
    }
  }

  // Update Task Status
  const handleUpdateTaskStatus = async (id: string, status: string, title: string) => {
    if (window.electronAPI && window.electronAPI.db) {
      try {
        await window.electronAPI.db.updateTaskStatus(id, status)
        toast.success(`Task status updated to ${status}`)
        logAction('Edit', undefined, undefined, `Updated task "${title}" status to ${status}`)
        const dbTasks = await window.electronAPI.db.getTasks()
        setTasks(dbTasks)
        if (selectedTask && selectedTask.id === id) {
          setSelectedTask({ ...selectedTask, status })
        }
      } catch (err) {
        console.error(err)
      }
    } else {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t))
    }
  }

  // Delete Task
  const handleDeleteTask = async (id: string, title: string) => {
    if (confirm(`Delete task "${title}"?`)) {
      if (window.electronAPI && window.electronAPI.db) {
        try {
          await window.electronAPI.db.deleteTask(id)
          toast.success('Task deleted')
          logAction('Delete', undefined, undefined, `Deleted task: ${title}`)
          const dbTasks = await window.electronAPI.db.getTasks()
          setTasks(dbTasks)
          if (selectedTask && selectedTask.id === id) setSelectedTask(null)
        } catch (err) {
          console.error(err)
        }
      } else {
        setTasks(tasks.filter(t => t.id !== id))
        setSelectedTask(null)
      }
    }
  }

  // Load Task Comments
  const loadComments = async (taskId: string) => {
    if (window.electronAPI && window.electronAPI.db) {
      try {
        const comments = await window.electronAPI.db.getTaskComments(taskId)
        setTaskComments(comments)
      } catch (err) {
        console.error(err)
      }
    } else {
      setTaskComments([
        { id: 'c-1', user_name: 'CA Aditya Sen', user_role: 'Managing Partner', comment_text: 'Please look at the purchase ledger from April closely.', created_at: '2026-07-20 10:15:00', is_internal: 1 }
      ])
    }
  }

  // Insert Task Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !selectedTask) return

    const record = {
      id: `comment-${Date.now()}`,
      task_id: selectedTask.id,
      user_name: currentUser.name,
      user_role: currentUser.role,
      comment_text: newComment,
      attachment_path: '',
      is_internal: 1
    }

    if (window.electronAPI && window.electronAPI.db) {
      try {
        await window.electronAPI.db.insertTaskComment(record)
        setNewComment('')
        loadComments(selectedTask.id)
        logAction('Edit', undefined, undefined, `Added comment on task "${selectedTask.title}"`)
      } catch (err) {
        console.error(err)
      }
    } else {
      setTaskComments([...taskComments, { ...record, created_at: new Date().toISOString().replace('T', ' ').substring(0, 19) }])
      setNewComment('')
    }
  }

  // Save Compliance Deadline
  const handleAddDeadline = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDeadline.title || !newDeadline.deadline_date) {
      toast.error('Title and Date are required')
      return
    }

    const id = `dl-${Date.now()}`
    const record = {
      id,
      ...newDeadline,
      status: 'upcoming'
    }

    if (window.electronAPI && window.electronAPI.db) {
      try {
        await window.electronAPI.db.insertComplianceDeadline(record)
        toast.success('Compliance deadline added!')
        logAction('Edit', undefined, undefined, `Added compliance deadline: ${newDeadline.title}`)
        setShowAddDeadlineModal(false)
        setNewDeadline({ title: '', deadline_date: '', category: 'GST', description: '' })
        const dbDeadlines = await window.electronAPI.db.getComplianceDeadlines()
        setComplianceDeadlines(dbDeadlines)
      } catch (err) {
        console.error(err)
        toast.error('Failed to add deadline')
      }
    } else {
      setComplianceDeadlines([...complianceDeadlines, record])
      setShowAddDeadlineModal(false)
    }
  }

  // Delete Deadline
  const handleDeleteDeadline = async (id: string, title: string) => {
    if (confirm(`Delete deadline "${title}"?`)) {
      if (window.electronAPI && window.electronAPI.db) {
        try {
          await window.electronAPI.db.deleteComplianceDeadline(id)
          toast.success('Deadline deleted')
          logAction('Delete', undefined, undefined, `Deleted compliance deadline: ${title}`)
          const dbDeadlines = await window.electronAPI.db.getComplianceDeadlines()
          setComplianceDeadlines(dbDeadlines)
        } catch (err) {
          console.error(err)
        }
      } else {
        setComplianceDeadlines(complianceDeadlines.filter(d => d.id !== id))
      }
    }
  }

  // Save Knowledge Repository Item
  const handleAddKnowledge = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newKnowledge.title) {
      toast.error('Title is required')
      return
    }

    const id = `ki-${Date.now()}`
    const tagsArr = newKnowledge.tags.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0)
    const record = {
      id,
      title: newKnowledge.title,
      category: newKnowledge.category,
      content: newKnowledge.content,
      file_path: newKnowledge.file_path,
      tags: JSON.stringify(tagsArr),
      created_by: currentUser.name
    }

    if (window.electronAPI && window.electronAPI.db) {
      try {
        await window.electronAPI.db.insertKnowledgeItem(record)
        toast.success('Knowledge item indexed successfully!')
        logAction('Upload', undefined, undefined, `Added knowledge base document: ${newKnowledge.title}`)
        setShowAddKnowledgeModal(false)
        setNewKnowledge({ title: '', category: 'sop', content: '', tags: '', file_path: '' })
        const dbKnowledge = await window.electronAPI.db.getKnowledgeItems()
        setKnowledgeItems(dbKnowledge)
      } catch (err) {
        console.error(err)
        toast.error('Failed to add knowledge item')
      }
    } else {
      setKnowledgeItems([record, ...knowledgeItems])
      setShowAddKnowledgeModal(false)
    }
  }

  // Delete Knowledge Item
  const handleDeleteKnowledge = async (id: string, title: string) => {
    if (confirm(`Remove "${title}" from repository?`)) {
      if (window.electronAPI && window.electronAPI.db) {
        try {
          await window.electronAPI.db.deleteKnowledgeItem(id)
          toast.success('Knowledge item deleted')
          logAction('Delete', undefined, undefined, `Deleted knowledge item: ${title}`)
          const dbKnowledge = await window.electronAPI.db.getKnowledgeItems()
          setKnowledgeItems(dbKnowledge)
        } catch (err) {
          console.error(err)
        }
      } else {
        setKnowledgeItems(knowledgeItems.filter(k => k.id !== id))
      }
    }
  }

  // Document Review approval action
  const handleApproveDocument = async (docId: string, docName: string, step: string, status: 'approved' | 'rejected' | 'needs_clarification', notes: string) => {
    if (!hasPermission('Approve Reports')) {
      toast.error('Permission Denied: Cannot approve reports/documents.')
      return
    }

    const id = `appr-${Date.now()}`
    const record = {
      id,
      document_id: docId,
      step,
      status,
      reviewer_name: currentUser.name,
      reviewer_role: currentUser.role,
      notes
    }

    if (window.electronAPI && window.electronAPI.db) {
      try {
        await window.electronAPI.db.insertDocumentApproval(record)
        toast.success(`Document marked as ${status}`)
        logAction('Approval', undefined, docName, `Approval step: ${step} status: ${status}. Reviewer notes: ${notes}`)
        
        // Also update documents log if matches conversion list or update conversion status
        if (selectedDoc) {
          setSelectedDoc({ ...selectedDoc, approvalStatus: status })
        }
      } catch (err) {
        console.error(err)
      }
    } else {
      toast.success(`Marked as ${status} (Simulation)`)
    }
  }

  // Simulation: Trigger sync offline
  const handleTriggerSync = async () => {
    const id = `sync-${Date.now()}`
    const log = {
      id,
      action: 'push',
      status: 'success',
      conflicts_count: 0,
      description: 'Synchronized workspace changes with Pune and Mumbai local nodes. No conflicts detected.'
    }

    if (window.electronAPI && window.electronAPI.db) {
      try {
        await window.electronAPI.db.insertSyncLog(log)
        toast.success('Offline workspace sync complete!')
        logAction('Export', undefined, undefined, 'Performed database synchronization with local network workspace')
        const dbSync = await window.electronAPI.db.getSyncLogs(50)
        setSyncLogs(dbSync)
      } catch (err) {
        console.error(err)
      }
    } else {
      setSyncLogs([log, ...syncLogs])
      toast.success('Sync complete (Simulation)')
    }
  }

  // Backup SQLite database simulation
  const handleBackupDatabase = async () => {
    logAction('Export', undefined, undefined, 'Exported workspace database backup file')
    toast.success('Encrypted database backup created in workspace backups folder.')
  }

  // Simulated unlock
  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault()
    if (lockPassword === 'admin123') {
      setIsLocked(false)
      setLockPassword('')
      toast.success('Session Unlocked')
      logAction('login', undefined, undefined, 'Session Unlocked manually')
    } else {
      toast.error('Incorrect Password')
    }
  }

  // Auto-lock simulator button
  const handleLockSession = () => {
    setIsLocked(true)
    logAction('login', undefined, undefined, 'Session Auto-Locked by user action')
  }

  // Change simulated active user
  const handleSwitchUserRole = (userName: string) => {
    const foundUser = users.find(u => u.name === userName)
    if (foundUser) {
      setCurrentUser({
        name: foundUser.name,
        role: foundUser.role,
        email: foundUser.email
      })
      toast.success(`Switched context to ${foundUser.name} (${foundUser.role})`)
    }
  }


  // --- SUB-RENDERERS ---

  // 1. Dashboard tab
  const renderDashboard = () => {
    const totalClients = clients.length
    const openTasks = tasks.filter(t => t.status !== 'completed').length
    const completedTasks = tasks.filter(t => t.status === 'completed').length
    const pendingApprovals = 3 // Simulation

    // Charts calculation data
    const teamWorkload = users.map(u => {
      const uTasks = tasks.filter(t => t.owner_name === u.name)
      return {
        name: u.name.split(' ')[0],
        tasks: uTasks.length,
        pending: uTasks.filter(t => t.status !== 'completed').length
      }
    })

    // Compliance categories count
    const deadLineData = [
      { name: 'GST', count: complianceDeadlines.filter(d => d.category === 'GST').length },
      { name: 'Income Tax', count: complianceDeadlines.filter(d => d.category === 'Income Tax').length },
      { name: 'TDS', count: complianceDeadlines.filter(d => d.category === 'TDS').length },
      { name: 'ROC', count: complianceDeadlines.filter(d => d.category === 'ROC').length }
    ]

    return (
      <div className="space-y-6 text-left">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-5 border border-surface-700 bg-surface-800 hover:border-surface-600 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-surface-400 font-bold uppercase tracking-wider">Active Clients Master</p>
                <p className="text-3xl font-black text-white mt-1">{totalClients || 4}</p>
                <p className="text-xs text-brand-400 mt-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block animate-ping" />
                  All engagement active
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center">
                <Building2 size={22} />
              </div>
            </div>
          </div>

          <div className="card p-5 border border-surface-700 bg-surface-800 hover:border-surface-600 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-surface-400 font-bold uppercase tracking-wider">Open Audits & Tasks</p>
                <p className="text-3xl font-black text-white mt-1">{openTasks || 0}</p>
                <p className="text-xs text-amber-500 mt-1">Pending review & verification</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <BookCheck size={22} />
              </div>
            </div>
          </div>

          <div className="card p-5 border border-surface-700 bg-surface-800 hover:border-surface-600 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-surface-400 font-bold uppercase tracking-wider">Compliance Deadlines</p>
                <p className="text-3xl font-black text-white mt-1">{complianceDeadlines.length}</p>
                <p className="text-xs text-rose-500 mt-1 font-semibold">GSTR-1, TDS Upcoming</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
                <Calendar size={22} />
              </div>
            </div>
          </div>

          <div className="card p-5 border border-surface-700 bg-surface-800 hover:border-surface-600 transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-surface-400 font-bold uppercase tracking-wider">Offline Sync Nodes</p>
                <p className="text-3xl font-black text-white mt-1">3 Active</p>
                <p className="text-xs text-emerald-400 mt-1">Pune, Mumbai & Local</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <GitCompare size={22} />
              </div>
            </div>
          </div>
        </div>

        {/* Charts & Graphs */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 card p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-surface-100">Team Workload Distribution</h3>
                <p className="text-xs text-surface-500 mt-0.5">Assigned compliance tasks per team member</p>
              </div>
              <span className="badge badge-info text-[10px]">Direct SQLite sync</span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={teamWorkload.length > 0 ? teamWorkload : [
                  { name: 'Aditya', tasks: 3, pending: 2 },
                  { name: 'Ravi', tasks: 5, pending: 3 },
                  { name: 'S. Sharma', tasks: 4, pending: 2 },
                  { name: 'Neha', tasks: 2, pending: 1 }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="tasks" name="Total Tasks Assigned" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pending" name="In Progress / Open" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-4 card p-5 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-surface-100">Compliance Categories</h3>
            <p className="text-xs text-surface-500 mt-0.5">Critical filings and calendar splits</p>
            <div className="h-56 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deadLineData.filter(d => d.count > 0).length > 0 ? deadLineData : [
                      { name: 'GST', count: 2 },
                      { name: 'Income Tax', count: 1 },
                      { name: 'TDS', count: 1 },
                      { name: 'ROC', count: 1 }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="count"
                  >
                    <Cell fill="#6366f1" />
                    <Cell fill="#10b981" />
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

        {/* Action Dashboard Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-surface-800 pb-3">
              <h3 className="text-sm font-bold text-surface-100 flex items-center gap-2">
                <Clock size={16} className="text-brand-400" />
                Live Firm Activities (Audit Trail)
              </h3>
              <button onClick={() => setActiveTab('audit')} className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
                View Full Audit Logs <ChevronRight size={14} />
              </button>
            </div>
            <div className="divide-y divide-surface-800 space-y-3 max-h-[300px] overflow-y-auto">
              {auditTrail.slice(0, 5).map((log) => (
                <div key={log.id} className="pt-3 flex items-start gap-3 justify-between">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-surface-900 border border-surface-700 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold text-surface-300">
                      {log.user_name.substring(3, 5).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-surface-200">
                        {log.user_name} ({log.role})
                      </p>
                      <p className="text-xs text-surface-400 mt-1">
                        <span className="font-semibold text-brand-400 uppercase text-[10px] bg-brand-500/10 px-1.5 py-0.5 rounded mr-1.5">{log.action}</span>
                        {log.details || 'Performed work item update'}
                      </p>
                      {log.client_name && (
                        <p className="text-[10px] text-surface-500 mt-1">Client: <span className="font-semibold">{log.client_name}</span></p>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-surface-500 font-mono">{log.timestamp ? log.timestamp.split(' ')[1] || log.timestamp : 'Recent'}</span>
                </div>
              ))}
              {auditTrail.length === 0 && (
                <div className="text-center py-8 text-surface-500 text-xs">No activity logged in database yet.</div>
              )}
            </div>
          </div>

          <div className="lg:col-span-4 card p-5 space-y-4">
            <h3 className="text-sm font-bold text-surface-100 flex items-center gap-2">
              <AlertTriangle size={16} className="text-rose-500" />
              Critical Deadlines
            </h3>
            <div className="space-y-3">
              {complianceDeadlines.slice(0, 3).map((dl) => (
                <div key={dl.id} className="p-3 bg-surface-900 border border-surface-800 rounded-lg flex flex-col gap-1.5">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-surface-200">{dl.title}</span>
                    <span className="text-[9px] uppercase font-black px-1.5 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded">
                      {dl.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-surface-500 leading-relaxed">{dl.description}</p>
                  <div className="flex justify-between items-center text-[10px] mt-1 border-t border-surface-800 pt-1.5">
                    <span className="text-surface-400 font-mono">Due: {dl.deadline_date}</span>
                    <span className="text-amber-500 font-semibold flex items-center gap-1">
                      <Clock size={10} /> 21 days remaining
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 2. Firm Workspace Details Tab
  const renderFirmDetails = () => {
    return (
      <div className="card p-6 text-left max-w-3xl">
        <div className="border-b border-surface-800 pb-4 mb-6">
          <h3 className="text-base font-bold text-surface-100 flex items-center gap-2">
            <Building2 size={18} className="text-brand-500" />
            Module 1: Firm Workspace Settings
          </h3>
          <p className="text-xs text-surface-500 mt-1">Configure company profiles, multiple partner configurations and departmental segmentation logs.</p>
        </div>

        <form onSubmit={handleSaveFirmDetails} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-surface-400 font-bold uppercase tracking-wider block mb-1">Chartered Accountant Firm Name</label>
              <input
                required
                type="text"
                value={firmDetails.name}
                onChange={e => setFirmDetails({ ...firmDetails, name: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="text-[10px] text-surface-400 font-bold uppercase tracking-wider block mb-1">Firm Registration Number (FRN)</label>
              <input
                required
                type="text"
                placeholder="e.g. FRN-102938W"
                value={firmDetails.registration}
                onChange={e => setFirmDetails({ ...firmDetails, registration: e.target.value })}
                className="input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-surface-400 font-bold uppercase tracking-wider block mb-1">Primary Email Address</label>
              <input
                type="email"
                value={firmDetails.email}
                onChange={e => setFirmDetails({ ...firmDetails, email: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="text-[10px] text-surface-400 font-bold uppercase tracking-wider block mb-1">Office Contact Phone</label>
              <input
                type="text"
                value={firmDetails.phone}
                onChange={e => setFirmDetails({ ...firmDetails, phone: e.target.value })}
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-surface-400 font-bold uppercase tracking-wider block mb-1">Firm Office Address</label>
            <textarea
              rows={3}
              value={firmDetails.address}
              onChange={e => setFirmDetails({ ...firmDetails, address: e.target.value })}
              className="input resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-surface-400 font-bold uppercase tracking-wider block mb-1">Practice Configuration</label>
              <select
                value={firmDetails.workspace_type}
                onChange={e => setFirmDetails({ ...firmDetails, workspace_type: e.target.value })}
                className="input py-2"
              >
                <option value="single">Single CA Practice</option>
                <option value="multi-partner">Multi-Partner Firm</option>
                <option value="branch">Branch Office Workspace</option>
                <option value="department">Department-wise Segmented Workspace</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-surface-400 font-bold uppercase tracking-wider block mb-1">Branch Office Location</label>
              <input
                type="text"
                placeholder="e.g. Pune, Mumbai, Bangalore"
                defaultValue="Mumbai Head Office"
                className="input"
              />
            </div>
          </div>

          {/* Branding (Logo, Letterhead) */}
          <div className="border-t border-surface-800 pt-5 space-y-3">
            <h4 className="text-xs font-bold text-surface-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={14} className="text-brand-400" /> branding assets
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-surface-900 border border-dashed border-surface-700 rounded-xl flex flex-col items-center justify-center text-center gap-1.5">
                <FileUp size={22} className="text-surface-500" />
                <span className="text-xs font-semibold text-surface-300">Upload Firm Logo</span>
                <span className="text-[10px] text-surface-500">Supports PNG, JPG (Max 500kb)</span>
              </div>
              <div className="p-4 bg-surface-900 border border-dashed border-surface-700 rounded-xl flex flex-col items-center justify-center text-center gap-1.5">
                <FileUp size={22} className="text-surface-500" />
                <span className="text-xs font-semibold text-surface-300">Upload Firm Letterhead Template</span>
                <span className="text-[10px] text-surface-500">PDF background file template</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-surface-800">
            <button type="submit" className="btn-primary text-xs gap-1.5 px-6">
              Save Workspace Settings
            </button>
          </div>
        </form>
      </div>
    )
  }

  // 3. User Roles & Permissions Tab
  const renderUserRoles = () => {
    return (
      <div className="space-y-6 text-left">
        {/* Roles Permission Table */}
        <div className="card p-5 space-y-4">
          <div className="border-b border-surface-800 pb-3">
            <h3 className="text-sm font-bold text-surface-100">Role-Based Access Control (RBAC)</h3>
            <p className="text-xs text-surface-500 mt-1">Configure workspace capabilities for each Chartered Accountant role type.</p>
          </div>

          <div className="table-wrapper overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-900 border-b border-surface-700 text-surface-400 uppercase tracking-wider text-[10px]">
                  <th className="p-3">Role / Designation</th>
                  {ALL_PERMISSIONS.map(p => (
                    <th key={p} className="p-3 text-center text-[9px] font-bold max-w-[120px]">{p}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROLES.map(role => (
                  <tr key={role} className="border-b border-surface-800 hover:bg-surface-750">
                    <td className="p-3 text-xs font-bold text-surface-200">{role}</td>
                    {ALL_PERMISSIONS.map(perm => {
                      const mapping = rolePermissions.find(rp => rp.role === role && rp.permission === perm)
                      const isEnabled = mapping ? mapping.enabled === 1 : true // Defaults to enabled

                      return (
                        <td key={perm} className="p-3 text-center">
                          <button
                            onClick={() => handleTogglePermission(role, perm, isEnabled ? 1 : 0)}
                            className={`w-6 h-6 rounded-md border flex items-center justify-center mx-auto transition-colors ${
                              isEnabled
                                ? 'bg-brand-500/10 border-brand-500/30 text-brand-400'
                                : 'bg-surface-900 border-surface-800 text-surface-600'
                            }`}
                          >
                            {isEnabled ? <Check size={12} /> : <X size={12} />}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Staff Directory */}
        <div className="card p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-surface-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-surface-100">Staff User Directory</h3>
              <p className="text-xs text-surface-500 mt-0.5">Manage office auditors, assistants, articles and external reviewers.</p>
            </div>
            <button onClick={() => setShowAddUserModal(true)} className="btn-primary text-xs gap-1.5">
              <Plus size={13} /> Add Staff Member
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map(u => (
              <div key={u.id} className="p-4 bg-surface-900 border border-surface-800 rounded-xl flex flex-col justify-between hover:border-surface-700 transition-colors">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs font-bold text-surface-100">{u.name}</p>
                      <p className="text-[10px] text-surface-500 font-mono mt-0.5">{u.email}</p>
                    </div>
                    <span className="badge badge-info text-[9px] font-bold">{u.role}</span>
                  </div>
                  <div className="text-[11px] text-surface-400 space-y-1 pt-1.5 border-t border-surface-950">
                    <p><span className="text-surface-500">Branch:</span> {u.branch || 'Mumbai Head Office'}</p>
                    <p><span className="text-surface-500">Department:</span> {u.department || 'Audit'}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-4 pt-2.5 border-t border-surface-950">
                  <span className="badge badge-success text-[8px]">Active</span>
                  <button
                    onClick={() => handleDeleteUser(u.id, u.name)}
                    className="p-1 text-surface-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add User Modal */}
        {showAddUserModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="card w-full max-w-md p-6 bg-surface-900 border border-surface-700 shadow-2xl relative space-y-4">
              <button onClick={() => setShowAddUserModal(false)} className="absolute top-4 right-4 text-surface-500 hover:text-surface-300">
                <X size={16} />
              </button>
              <div>
                <h3 className="text-sm font-bold text-surface-100 flex items-center gap-1.5">
                  <Users size={16} className="text-brand-500" /> Add Staff Member
                </h3>
                <p className="text-xs text-surface-500 mt-0.5">Register user credential settings for staff auditing workspace access.</p>
              </div>

              <form onSubmit={handleAddUser} className="space-y-3.5">
                <div>
                  <label className="text-[10px] text-surface-400 uppercase tracking-wider block font-bold mb-1">Staff Member Full Name</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Neha Gupta"
                    value={newUser.name}
                    onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-surface-400 uppercase tracking-wider block font-bold mb-1">Office Email Address</label>
                  <input
                    required
                    type="email"
                    placeholder="e.g. neha.g@firm.in"
                    value={newUser.email}
                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                    className="input"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-surface-400 uppercase tracking-wider block font-bold mb-1">Designated Role</label>
                    <select
                      value={newUser.role}
                      onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                      className="input py-2"
                    >
                      {ROLES.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-surface-400 uppercase tracking-wider block font-bold mb-1">Department</label>
                    <select
                      value={newUser.department}
                      onChange={e => setNewUser({ ...newUser, department: e.target.value })}
                      className="input py-2"
                    >
                      <option value="Audit">Audit Department</option>
                      <option value="Taxation">Taxation Department</option>
                      <option value="Accounts">Accounts Team</option>
                      <option value="Compliance">Compliance & ROC</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-surface-800">
                  <button type="button" onClick={() => setShowAddUserModal(false)} className="btn-secondary text-xs px-3.5">Cancel</button>
                  <button type="submit" className="btn-primary text-xs px-3.5">Register User</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    )
  }

  // 4. Clients tab (Module 3)
  const renderClients = () => {
    return (
      <div className="space-y-6 text-left">
        <div className="card p-5 space-y-4">
          <div className="border-b border-surface-800 pb-3 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-surface-100 flex items-center gap-2">
                <Building2 size={16} className="text-brand-400" />
                Client Master Repository
              </h3>
              <p className="text-xs text-surface-500 mt-1">Review legal registrations (GSTIN, PAN, CIN), engagement tasks, and AI review audit notes.</p>
            </div>
            <div className="w-64 bg-surface-900 border border-surface-800 rounded-lg px-2.5 py-1.5 flex items-center gap-2">
              <Search size={14} className="text-surface-500" />
              <input
                type="text"
                placeholder="Search clients..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-transparent border-none text-xs text-surface-200 outline-none w-full focus:ring-0"
              />
            </div>
          </div>

          <div className="table-wrapper">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-900 border-b border-surface-700 text-surface-400 uppercase tracking-wider text-[10px]">
                  <th className="p-3">Client / Business Name</th>
                  <th className="p-3">GSTIN</th>
                  <th className="p-3">PAN</th>
                  <th className="p-3">Industry</th>
                  <th className="p-3">Financial Year</th>
                  <th className="p-3">Assigned Auditor</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.filter(c => c.clientName.toLowerCase().includes(searchQuery.toLowerCase())).map((c) => (
                  <tr key={c.id} className="border-b border-surface-800 hover:bg-surface-750">
                    <td className="p-3 font-bold text-surface-200">{c.clientName}</td>
                    <td className="p-3 text-xs font-mono text-surface-300">{c.gstin || 'N/A'}</td>
                    <td className="p-3 text-xs font-mono text-surface-400">{c.pan || 'N/A'}</td>
                    <td className="p-3 text-xs text-surface-350">{c.clientType || 'Manufacturing'}</td>
                    <td className="p-3 text-xs font-mono text-surface-400">{c.financialYear || '2026-27'}</td>
                    <td className="p-3 text-xs text-surface-300">{c.assignedStaff || 'Unassigned'}</td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => {
                          setSelectedClient(c)
                          setShowClientDetailModal(true)
                          logAction('Edit', c.clientName, undefined, `Opened deep audit file for client ${c.clientName}`)
                        }}
                        className="btn-secondary text-[11px] px-2.5 py-1 flex items-center gap-1.5 mx-auto"
                      >
                        <Eye size={12} /> View File
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Client Detail Workspace modal */}
        {showClientDetailModal && selectedClient && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="card w-full max-w-4xl p-6 bg-surface-900 border border-surface-700 shadow-2xl relative space-y-6 max-h-[85vh] overflow-y-auto">
              <button onClick={() => setShowClientDetailModal(false)} className="absolute top-4 right-4 text-surface-500 hover:text-surface-300">
                <X size={16} />
              </button>

              <div className="flex items-start gap-4 border-b border-surface-800 pb-4">
                <div className="w-12 h-12 rounded-xl bg-brand-500/10 text-brand-400 flex items-center justify-center flex-shrink-0">
                  <Building2 size={24} />
                </div>
                <div className="text-left">
                  <h3 className="text-base font-bold text-surface-100">{selectedClient.clientName}</h3>
                  <p className="text-xs text-surface-500 mt-1 font-mono">
                    GSTIN: {selectedClient.gstin} | PAN: {selectedClient.pan} | CIN: U40100MH2021PTC328910
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                {/* Client parameters */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-surface-300 uppercase tracking-wider">Engagement Details</h4>
                  <div className="bg-surface-950 p-4 rounded-xl border border-surface-850 space-y-2 text-xs">
                    <p><span className="text-surface-550">Assessment Year:</span> <span className="font-semibold text-surface-200">AY 2026-27</span></p>
                    <p><span className="text-surface-550">Financial Year:</span> <span className="font-semibold text-surface-200">{selectedClient.financialYear || 'FY 2025-26'}</span></p>
                    <p><span className="text-surface-550">Industry Classification:</span> <span className="font-semibold text-surface-200">{selectedClient.clientType || 'Logistics'}</span></p>
                    <p><span className="text-surface-550">Audit Staff Owner:</span> <span className="font-semibold text-surface-200">{selectedClient.assignedStaff || 'Unassigned'}</span></p>
                    <p><span className="text-surface-550">Engagement Status:</span> <span className="badge badge-success text-[9px] mt-1">Active audit</span></p>
                  </div>

                  <h4 className="text-xs font-bold text-surface-300 uppercase tracking-wider">Contact Persons</h4>
                  <div className="bg-surface-950 p-4 rounded-xl border border-surface-850 space-y-2 text-xs">
                    <p className="font-bold text-surface-200">{selectedClient.businessName || 'Contact Representative'}</p>
                    <p className="text-surface-500">{selectedClient.email || 'office@apex.com'}</p>
                    <p className="text-surface-500">{selectedClient.phone || '+91 9822 182 122'}</p>
                  </div>
                </div>

                {/* AI findings & Recon details */}
                <div className="space-y-4 md:col-span-2">
                  <h4 className="text-xs font-bold text-surface-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={13} className="text-brand-400" />
                    AI-Assisted Findings
                  </h4>
                  <div className="bg-brand-500/5 border border-brand-500/20 p-4 rounded-xl space-y-2.5 text-xs">
                    <div className="flex items-start gap-2">
                      <AlertCircle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                      <p className="text-surface-300">
                        <span className="font-bold text-amber-500">ITC Mismatch Warning:</span> Checked Books vs GSTR-2B. Found credit mismatch of <span className="font-mono text-amber-400">₹42,891</span> for supplier invoice APX/9842.
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                      <p className="text-surface-300">
                        <span className="font-bold text-emerald-400 font-semibold">TDS Offset Match:</span> Tax withholding matches tax-paid credit certificates perfectly for Q1 filings.
                      </p>
                    </div>
                  </div>

                  <h4 className="text-xs font-bold text-surface-300 uppercase tracking-wider">Linked Audit Task List</h4>
                  <div className="space-y-2">
                    {tasks.filter(t => t.client_id === selectedClient.id).map(t => (
                      <div key={t.id} className="p-3 bg-surface-950 border border-surface-850 rounded-lg flex justify-between items-center text-xs">
                        <div className="space-y-1">
                          <p className="font-bold text-surface-200">{t.title}</p>
                          <p className="text-[10px] text-surface-500">Due: {t.due_date} | Owner: {t.owner_name}</p>
                        </div>
                        <span className={`badge text-[9px] uppercase font-bold ${
                          t.status === 'completed' ? 'badge-success' :
                          t.status === 'in_progress' ? 'badge-warning' :
                          'badge-neutral'
                        }`}>{t.status}</span>
                      </div>
                    ))}
                    {tasks.filter(t => t.client_id === selectedClient.id).length === 0 && (
                      <p className="text-xs text-surface-500 text-center py-4 bg-surface-950 rounded-lg border border-surface-850">No linked compliance tasks found.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // 5. Tasks Board tab (Modules 4 & 6)
  const renderTasks = () => {
    return (
      <div className="space-y-6 text-left">
        <div className="flex justify-between items-center border-b border-surface-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-surface-100 flex items-center gap-2">
              <BookCheck size={16} className="text-brand-400" />
              Compliance Workflow Tasks
            </h3>
            <p className="text-xs text-surface-500 mt-1">Audit, GST, Bank Reconciliation, IT Return, Document Collection and Review task boards.</p>
          </div>
          <button onClick={() => setShowAddTaskModal(true)} className="btn-primary text-xs gap-1.5">
            <Plus size={13} /> Create Compliance Task
          </button>
        </div>

        {/* Task cards split by status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {['pending', 'in_progress', 'completed'].map((status) => {
            const filteredTasks = tasks.filter(t => t.status === status)
            const statusLabel = status === 'pending' ? 'To Do / Pending' : status === 'in_progress' ? 'In Progress' : 'Completed'
            const statusColor = status === 'pending' ? 'bg-surface-700' : status === 'in_progress' ? 'bg-amber-500' : 'bg-emerald-500'

            return (
              <div key={status} className="card p-4 flex flex-col gap-3 min-h-[400px] bg-surface-800">
                <div className="flex items-center gap-2 border-b border-surface-700 pb-2 mb-1">
                  <span className={`w-2.5 h-2.5 rounded-full ${statusColor}`} />
                  <h4 className="text-xs font-bold text-surface-200 uppercase tracking-wider">{statusLabel} ({filteredTasks.length})</h4>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto max-h-[550px] pr-1">
                  {filteredTasks.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => {
                        setSelectedTask(t)
                        loadComments(t.id)
                      }}
                      className="p-3 bg-surface-900 border border-surface-750 hover:border-surface-600 rounded-xl cursor-pointer transition-all space-y-2 text-left"
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-[9px] uppercase font-black px-1.5 py-0.5 bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded">
                          {t.task_type}
                        </span>
                        <span className={`badge text-[9px] px-1.5 py-0.5 font-bold ${
                          t.priority === 'critical' ? 'badge-error' :
                          t.priority === 'high' ? 'badge-warning' :
                          'badge-neutral'
                        }`}>{t.priority}</span>
                      </div>
                      <p className="text-xs font-bold text-surface-200 line-clamp-2 leading-relaxed">{t.title}</p>
                      <p className="text-[11px] text-surface-500 line-clamp-2">{t.description}</p>
                      <div className="flex justify-between items-center text-[10px] pt-2 border-t border-surface-950 mt-1">
                        <span className="text-surface-400 font-mono flex items-center gap-1"><Clock size={10} /> {t.due_date}</span>
                        <span className="text-surface-300 font-semibold">{t.owner_name}</span>
                      </div>
                    </div>
                  ))}
                  {filteredTasks.length === 0 && (
                    <div className="text-center py-12 text-surface-600 text-xs">No tasks in this board stage.</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Task Details Drawer */}
        {selectedTask && (
          <div className="fixed inset-y-0 right-0 w-[420px] bg-surface-900 border-l border-surface-700 shadow-2xl z-50 p-6 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-5 text-left flex-1 flex flex-col">
              <div className="flex justify-between items-start border-b border-surface-800 pb-3">
                <div>
                  <span className="text-[9px] uppercase font-black px-1.5 py-0.5 bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded">
                    {selectedTask.task_type}
                  </span>
                  <h3 className="text-sm font-bold text-surface-100 mt-1.5">{selectedTask.title}</h3>
                </div>
                <button onClick={() => setSelectedTask(null)} className="p-1 text-surface-550 hover:text-surface-300">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4 overflow-y-auto flex-1 pr-1">
                {/* Details list */}
                <div className="bg-surface-950 p-4 rounded-xl border border-surface-850 space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-surface-500">Status</span>
                    <select
                      value={selectedTask.status}
                      onChange={e => handleUpdateTaskStatus(selectedTask.id, e.target.value, selectedTask.title)}
                      className="bg-surface-900 border border-surface-750 text-xs rounded text-surface-200 px-2 py-0.5 outline-none font-semibold"
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-surface-500">Priority</span>
                    <span className="font-bold text-surface-300 uppercase">{selectedTask.priority}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-surface-500">Due Date</span>
                    <span className="font-mono text-surface-300">{selectedTask.due_date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-surface-500">Owner</span>
                    <span className="text-surface-300 font-semibold">{selectedTask.owner_name}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <h4 className="text-[10px] text-surface-400 font-bold uppercase tracking-wider">Description</h4>
                  <p className="text-xs text-surface-300 leading-relaxed bg-surface-950 p-3 rounded-lg border border-surface-850">{selectedTask.description || 'No description provided.'}</p>
                </div>

                {/* Internal Communication (Module 6) */}
                <div className="space-y-3 pt-3 border-t border-surface-800 flex-1 flex flex-col justify-end">
                  <h4 className="text-xs font-bold text-surface-200 flex items-center gap-1.5">
                    <MessageSquare size={14} className="text-brand-400" />
                    Internal Discussion & Notes
                  </h4>

                  <div className="space-y-2 max-h-[220px] overflow-y-auto divide-y divide-surface-850 pr-1">
                    {taskComments.map(c => (
                      <div key={c.id} className="pt-2 text-xs text-left">
                        <div className="flex justify-between text-[10px] text-surface-400">
                          <span className="font-bold">{c.user_name} ({c.user_role})</span>
                          <span className="font-mono text-surface-500">{c.created_at ? c.created_at.split(' ')[1] || c.created_at : 'Recent'}</span>
                        </div>
                        <p className="text-surface-300 mt-1 leading-relaxed bg-surface-950/40 p-2 rounded border border-surface-850/50">{c.comment_text}</p>
                      </div>
                    ))}
                    {taskComments.length === 0 && (
                      <p className="text-[10px] text-surface-500 text-center py-4">No internal comments yet. Start discussion below.</p>
                    )}
                  </div>

                  <form onSubmit={handleAddComment} className="flex gap-2 items-center bg-surface-950 p-1.5 rounded-lg border border-surface-850">
                    <input
                      type="text"
                      placeholder="Add internal note... Use @name for mentions"
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      className="bg-transparent border-none text-xs text-surface-200 outline-none w-full focus:ring-0 px-2"
                    />
                    <button type="submit" className="p-1.5 bg-brand-600 rounded text-white hover:bg-brand-500 transition-colors">
                      <Send size={12} />
                    </button>
                  </form>
                </div>
              </div>

              <div className="pt-4 border-t border-surface-800 flex justify-between">
                <button
                  onClick={() => handleDeleteTask(selectedTask.id, selectedTask.title)}
                  className="btn-danger text-xs gap-1 py-1.5"
                >
                  <Trash2 size={12} /> Delete Task
                </button>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="btn-secondary text-xs py-1.5"
                >
                  Close Drawer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Task Modal */}
        {showAddTaskModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="card w-full max-w-md p-6 bg-surface-900 border border-surface-700 shadow-2xl relative space-y-4">
              <button onClick={() => setShowAddTaskModal(false)} className="absolute top-4 right-4 text-surface-500 hover:text-surface-300">
                <X size={16} />
              </button>
              <div>
                <h3 className="text-sm font-bold text-surface-100 flex items-center gap-1.5">
                  <BookCheck size={16} className="text-brand-500" /> Create Compliance Task
                </h3>
                <p className="text-xs text-surface-500 mt-0.5">Designate team members, deadlines, priority weight and compliance category.</p>
              </div>

              <form onSubmit={handleAddTask} className="space-y-3.5">
                <div>
                  <label className="text-[10px] text-surface-400 uppercase tracking-wider block font-bold mb-1">Task Title / Activity</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Audit purchase vouchers for Q3"
                    value={newTask.title}
                    onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-surface-400 uppercase tracking-wider block font-bold mb-1">Instructions / Description</label>
                  <textarea
                    rows={2}
                    placeholder="Verify invoice dates match GSTR-2B logs exactly."
                    value={newTask.description}
                    onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                    className="input resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-surface-400 uppercase tracking-wider block font-bold mb-1">Linked Client</label>
                    <select
                      value={newTask.client_id}
                      onChange={e => setNewTask({ ...newTask, client_id: e.target.value })}
                      className="input py-2"
                    >
                      <option value="">Select Client...</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.clientName}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-surface-400 uppercase tracking-wider block font-bold mb-1">Assigned Owner</label>
                    <select
                      value={newTask.owner_id}
                      onChange={e => setNewTask({ ...newTask, owner_id: e.target.value })}
                      className="input py-2"
                    >
                      <option value="">Select Auditor...</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="text-[10px] text-surface-400 uppercase tracking-wider block font-bold mb-1">Due Date</label>
                    <input
                      required
                      type="date"
                      value={newTask.due_date}
                      onChange={e => setNewTask({ ...newTask, due_date: e.target.value })}
                      className="input font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-surface-400 uppercase tracking-wider block font-bold mb-1">Priority</label>
                    <select
                      value={newTask.priority}
                      onChange={e => setNewTask({ ...newTask, priority: e.target.value })}
                      className="input py-2 font-bold"
                    >
                      <option value="low">LOW</option>
                      <option value="medium">MEDIUM</option>
                      <option value="high">HIGH</option>
                      <option value="critical">CRITICAL</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-surface-800">
                  <button type="button" onClick={() => setShowAddTaskModal(false)} className="btn-secondary text-xs px-3.5">Cancel</button>
                  <button type="submit" className="btn-primary text-xs px-3.5">Create Task</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    )
  }

  // 6. Approval Queue tab (Module 5 & 8)
  const renderApprovals = () => {
    // Mock review queue list
    const reviewQueue = [
      { id: 'doc-1', name: 'Apex_Q1_AuditReport_Draft.pdf', client: 'Apex Steel Industries Pvt Ltd', stage: 'partner_approval', status: 'pending', uploader: 'Ravi Verma (Senior)', size: '2.4 MB', date: '2026-07-19' },
      { id: 'doc-2', name: 'MGM_LedgerReconcilation_July.xlsx', client: 'MGM Logistics Services', stage: 'senior_review', status: 'needs_clarification', uploader: 'Neha Gupta (Article)', size: '1.8 MB', date: '2026-07-20' },
      { id: 'doc-3', name: 'Om_GST_OffsetDraft.pdf', client: 'Om Packaging Industries', stage: 'staff_review', status: 'pending', uploader: 'S. Sharma (Junior)', size: '920 KB', date: '2026-07-18' }
    ]

    return (
      <div className="space-y-6 text-left">
        <div className="card p-5 space-y-4">
          <div className="border-b border-surface-800 pb-3">
            <h3 className="text-sm font-bold text-surface-100 flex items-center gap-2">
              <Shield size={16} className="text-brand-400" />
              Document Approval Workflows
            </h3>
            <p className="text-xs text-surface-500 mt-1">Review ledger audits, reports and bank sheets through structured approval stages.</p>
          </div>

          <div className="table-wrapper">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-900 border-b border-surface-700 text-surface-400 uppercase tracking-wider text-[10px]">
                  <th className="p-3">File / Report Name</th>
                  <th className="p-3">Client</th>
                  <th className="p-3">Uploader</th>
                  <th className="p-3">Flow Stage</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Review Action</th>
                </tr>
              </thead>
              <tbody>
                {reviewQueue.map((doc) => (
                  <tr key={doc.id} className="border-b border-surface-800 hover:bg-surface-750">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <FileText size={15} className="text-brand-400" />
                        <div>
                          <p className="text-xs font-bold text-surface-200">{doc.name}</p>
                          <p className="text-[9px] text-surface-500 font-mono mt-0.5">{doc.size} | Uploaded: {doc.date}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-xs text-surface-300 font-semibold">{doc.client}</td>
                    <td className="p-3 text-xs text-surface-400">{doc.uploader}</td>
                    <td className="p-3">
                      <span className="text-[10px] uppercase font-bold bg-brand-500/10 text-brand-400 border border-brand-500/20 px-2 py-0.5 rounded">
                        {doc.stage.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`badge text-[9px] font-bold ${
                        doc.status === 'approved' ? 'badge-success' :
                        doc.status === 'needs_clarification' ? 'badge-warning' :
                        'badge-neutral'
                      }`}>{doc.status}</span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => setSelectedDoc(doc)}
                        className="btn-primary text-[10px] px-3 py-1 gap-1 flex items-center mx-auto"
                      >
                        Launch Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Deep Approval Review Modal */}
        {selectedDoc && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="card w-full max-w-2xl p-6 bg-surface-900 border border-surface-700 shadow-2xl relative space-y-5 text-left">
              <button onClick={() => setSelectedDoc(null)} className="absolute top-4 right-4 text-surface-500 hover:text-surface-300">
                <X size={16} />
              </button>

              <div>
                <span className="text-[9px] uppercase font-black px-1.5 py-0.5 bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded">
                  {selectedDoc.stage.replace('_', ' ')}
                </span>
                <h3 className="text-sm font-bold text-surface-100 mt-2 flex items-center gap-1.5">
                  <Shield size={16} className="text-brand-500" /> Review Document: {selectedDoc.name}
                </h3>
                <p className="text-xs text-surface-550 mt-0.5">Client: {selectedDoc.client} | Version 1.2 (Active version log)</p>
              </div>

              {/* Version History (Module 8) */}
              <div className="bg-surface-950 p-4 rounded-xl border border-surface-850 space-y-2 text-xs">
                <h4 className="text-[10px] text-surface-400 font-bold uppercase tracking-wider">Version History</h4>
                <div className="space-y-1.5 max-h-[100px] overflow-y-auto">
                  <p className="text-surface-300 flex justify-between font-mono text-[11px] border-b border-surface-900 pb-1">
                    <span>v1.2 - Final Draft for partner approval (Ravi Verma)</span>
                    <span className="text-surface-550">Today, 10:45 AM</span>
                  </p>
                  <p className="text-surface-400 flex justify-between font-mono text-[11px] border-b border-surface-900 pb-1">
                    <span>v1.1 - Added corrected ledger summary (Neha Gupta)</span>
                    <span className="text-surface-550">Yesterday, 4:12 PM</span>
                  </p>
                  <p className="text-surface-500 flex justify-between font-mono text-[11px]">
                    <span>v1.0 - Original OCR extraction upload (System AI)</span>
                    <span className="text-surface-550">2026-07-18, 11:20 AM</span>
                  </p>
                </div>
              </div>

              {/* Review Input */}
              <div className="space-y-3 pt-2">
                <label className="text-[10px] text-surface-400 uppercase tracking-wider block font-bold">Review Verdict & Notes</label>
                <textarea
                  id="approval-notes"
                  rows={3}
                  placeholder="Input feedback comments or approval exceptions..."
                  className="input resize-none"
                />

                <div className="flex flex-wrap justify-between items-center gap-3 pt-3 border-t border-surface-850">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const notesVal = (document.getElementById('approval-notes') as HTMLTextAreaElement)?.value || ''
                        handleApproveDocument(selectedDoc.id, selectedDoc.name, selectedDoc.stage, 'approved', notesVal)
                        setSelectedDoc(null)
                      }}
                      className="btn bg-emerald-600 text-white hover:bg-emerald-500 text-xs gap-1.5 px-4"
                    >
                      <CheckCircle2 size={13} /> Approve
                    </button>
                    <button
                      onClick={() => {
                        const notesVal = (document.getElementById('approval-notes') as HTMLTextAreaElement)?.value || ''
                        handleApproveDocument(selectedDoc.id, selectedDoc.name, selectedDoc.stage, 'rejected', notesVal)
                        setSelectedDoc(null)
                      }}
                      className="btn bg-rose-600 text-white hover:bg-rose-500 text-xs gap-1.5 px-4"
                    >
                      <X size={13} /> Reject File
                    </button>
                    <button
                      onClick={() => {
                        const notesVal = (document.getElementById('approval-notes') as HTMLTextAreaElement)?.value || ''
                        handleApproveDocument(selectedDoc.id, selectedDoc.name, selectedDoc.stage, 'needs_clarification', notesVal)
                        setSelectedDoc(null)
                      }}
                      className="btn bg-amber-600 text-white hover:bg-amber-500 text-xs gap-1.5 px-4"
                    >
                      <AlertTriangle size={13} /> Needs Clarification
                    </button>
                  </div>
                  <button onClick={() => setSelectedDoc(null)} className="btn-secondary text-xs px-4">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // 7. Compliance Calendar tab (Module 7)
  const renderCalendar = () => {
    // Basic compliance calendar list
    return (
      <div className="space-y-6 text-left">
        <div className="card p-5 space-y-4">
          <div className="border-b border-surface-800 pb-3 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-surface-100 flex items-center gap-2">
                <Calendar size={16} className="text-brand-400" />
                Compliance Deadlines Calendar
              </h3>
              <p className="text-xs text-surface-500 mt-1">Track regulatory return filings, audits, tax deposit dates and custom firm notifications.</p>
            </div>
            <button onClick={() => setShowAddDeadlineModal(true)} className="btn-primary text-xs gap-1.5">
              <Plus size={13} /> Add Custom Deadline
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Calendar view mock */}
            <div className="lg:col-span-8 bg-surface-900 border border-surface-800 rounded-xl p-4">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-bold text-surface-200 uppercase">August 2026</span>
                <div className="flex gap-1">
                  <span className="badge badge-success text-[9px]">GSTR-1 (11th)</span>
                  <span className="badge badge-error text-[9px]">GSTR-3B (20th)</span>
                </div>
              </div>

              {/* Grid 7 columns */}
              <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-surface-500 mb-2">
                <span>SUN</span><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span>
              </div>
              <div className="grid grid-cols-7 gap-2 h-72">
                {/* Seed dates mock */}
                {Array.from({ length: 31 }).map((_, idx) => {
                  const day = idx + 1
                  const isDeadline = day === 7 || day === 11 || day === 20
                  return (
                    <div
                      key={idx}
                      className={`p-1.5 rounded-lg border flex flex-col justify-between items-end cursor-pointer transition-colors ${
                        isDeadline
                          ? 'bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/20'
                          : 'bg-surface-950 border-surface-850 hover:border-surface-700'
                      }`}
                    >
                      <span className={`text-[10px] font-bold ${isDeadline ? 'text-rose-400' : 'text-surface-400'}`}>{day}</span>
                      {isDeadline && (
                        <span className="w-1.5 h-1.5 bg-rose-500 rounded-full mx-auto mb-1 animate-pulse" />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* List and detail panel */}
            <div className="lg:col-span-4 space-y-4">
              <h4 className="text-xs font-bold text-surface-300 uppercase tracking-wider">Filings and Deadlines Due</h4>
              <div className="space-y-3">
                {complianceDeadlines.map((dl) => {
                  const isPastDue = isPast(parseISO(dl.deadline_date))
                  return (
                    <div
                      key={dl.id}
                      className={`p-3 bg-surface-900 border rounded-lg space-y-1.5 ${
                        isPastDue ? 'border-red-500/20' : 'border-surface-800'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-bold text-surface-200">{dl.title}</span>
                        <button
                          onClick={() => handleDeleteDeadline(dl.id, dl.title)}
                          className="p-0.5 text-surface-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                      <p className="text-[11px] text-surface-500">{dl.description}</p>
                      <div className="flex justify-between items-center text-[10px] pt-1.5 border-t border-surface-950">
                        <span className="text-surface-400 font-mono flex items-center gap-1"><Clock size={10} /> Due: {dl.deadline_date}</span>
                        <span className={`badge text-[8px] uppercase font-bold ${isPastDue ? 'badge-error' : 'badge-neutral'}`}>
                          {isPastDue ? 'Overdue' : 'Upcoming'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Add Deadline Modal */}
        {showAddDeadlineModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="card w-full max-w-md p-6 bg-surface-900 border border-surface-700 shadow-2xl relative space-y-4">
              <button onClick={() => setShowAddDeadlineModal(false)} className="absolute top-4 right-4 text-surface-500 hover:text-surface-300">
                <X size={16} />
              </button>
              <div>
                <h3 className="text-sm font-bold text-surface-100 flex items-center gap-1.5">
                  <Calendar size={16} className="text-brand-500" /> Add Custom Deadline
                </h3>
                <p className="text-xs text-surface-500 mt-0.5">Log custom compliance and regulatory milestones in the workspace calendar.</p>
              </div>

              <form onSubmit={handleAddDeadline} className="space-y-3.5">
                <div>
                  <label className="text-[10px] text-surface-400 uppercase tracking-wider block font-bold mb-1">Filing / Deadline Name</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Q2 Advance Tax Installment"
                    value={newDeadline.title}
                    onChange={e => setNewDeadline({ ...newDeadline, title: e.target.value })}
                    className="input"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-surface-400 uppercase tracking-wider block font-bold mb-1">Due Date</label>
                    <input
                      required
                      type="date"
                      value={newDeadline.deadline_date}
                      onChange={e => setNewDeadline({ ...newDeadline, deadline_date: e.target.value })}
                      className="input font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-surface-400 uppercase tracking-wider block font-bold mb-1">Compliance Category</label>
                    <select
                      value={newDeadline.category}
                      onChange={e => setNewDeadline({ ...newDeadline, category: e.target.value })}
                      className="input py-2"
                    >
                      <option value="GST">GST Filings</option>
                      <option value="Income Tax">Income Tax Return</option>
                      <option value="ROC">ROC Filings</option>
                      <option value="TDS">TDS Deductions</option>
                      <option value="Custom">Custom milestone</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-surface-400 uppercase tracking-wider block font-bold mb-1">Milestone details / Remarks</label>
                  <textarea
                    rows={2}
                    placeholder="Filing for corporative clients."
                    value={newDeadline.description}
                    onChange={e => setNewDeadline({ ...newDeadline, description: e.target.value })}
                    className="input resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-surface-800">
                  <button type="button" onClick={() => setShowAddDeadlineModal(false)} className="btn-secondary text-xs px-3.5">Cancel</button>
                  <button type="submit" className="btn-primary text-xs px-3.5">Save Milestone</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    )
  }

  // 8. Knowledge repository (Module 10)
  const renderKnowledge = () => {
    return (
      <div className="space-y-6 text-left">
        <div className="card p-5 space-y-4">
          <div className="border-b border-surface-800 pb-3 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-surface-100 flex items-center gap-2">
                <BookCheck size={16} className="text-brand-400" />
                Knowledge Base & SOP Directory
              </h3>
              <p className="text-xs text-surface-500 mt-1">Manage firm checklist programs, audit guidelines, templates and Standard Operating Procedures.</p>
            </div>
            <div className="flex gap-2">
              <div className="w-64 bg-surface-900 border border-surface-800 rounded-lg px-2.5 py-1.5 flex items-center gap-2">
                <Search size={14} className="text-surface-500" />
                <input
                  type="text"
                  placeholder="Full-text search guidelines..."
                  value={knowledgeSearch}
                  onChange={e => setKnowledgeSearch(e.target.value)}
                  className="bg-transparent border-none text-xs text-surface-200 outline-none w-full focus:ring-0"
                />
              </div>
              <button onClick={() => setShowAddKnowledgeModal(true)} className="btn-primary text-xs gap-1.5 flex-shrink-0">
                <Plus size={13} /> Index Guide
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {knowledgeItems.filter(k => k.title.toLowerCase().includes(knowledgeSearch.toLowerCase()) || k.content.toLowerCase().includes(knowledgeSearch.toLowerCase())).map((item) => (
              <div key={item.id} className="p-4 bg-surface-900 border border-surface-800 hover:border-surface-700 transition-colors rounded-xl flex flex-col justify-between gap-3 text-left">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-[9px] uppercase font-black px-1.5 py-0.5 bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded">
                      {item.category}
                    </span>
                    <button
                      onClick={() => handleDeleteKnowledge(item.id, item.title)}
                      className="p-1 text-surface-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <h4 className="text-xs font-bold text-surface-200">{item.title}</h4>
                  <p className="text-xs text-surface-500 leading-relaxed line-clamp-4">{item.content}</p>
                </div>

                <div className="flex justify-between items-center pt-2.5 border-t border-surface-950 text-[10px] text-surface-500 mt-2 font-mono">
                  <span>Author: {item.created_by || 'Firm Management'}</span>
                  <span>Indexed: {item.created_at ? item.created_at.split(' ')[0] : 'Recent'}</span>
                </div>
              </div>
            ))}
            {knowledgeItems.length === 0 && (
              <div className="col-span-2 text-center py-12 text-surface-650 text-xs">No SOP templates indexed in repository database.</div>
            )}
          </div>
        </div>

        {/* Add Knowledge Modal */}
        {showAddKnowledgeModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="card w-full max-w-lg p-6 bg-surface-900 border border-surface-700 shadow-2xl relative space-y-4">
              <button onClick={() => setShowAddKnowledgeModal(false)} className="absolute top-4 right-4 text-surface-500 hover:text-surface-300">
                <X size={16} />
              </button>
              <div>
                <h3 className="text-sm font-bold text-surface-100 flex items-center gap-1.5">
                  <BookCheck size={16} className="text-brand-500" /> Index Knowledge Base Item
                </h3>
                <p className="text-xs text-surface-500 mt-0.5">Upload internal checklists, audit manuals, reference articles and templates.</p>
              </div>

              <form onSubmit={handleAddKnowledge} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-surface-400 uppercase tracking-wider block font-bold mb-1">Document Title</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. GSTR-3B audit checkpoints"
                      value={newKnowledge.title}
                      onChange={e => setNewKnowledge({ ...newKnowledge, title: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-surface-400 uppercase tracking-wider block font-bold mb-1">Index Category</label>
                    <select
                      value={newKnowledge.category}
                      onChange={e => setNewKnowledge({ ...newKnowledge, category: e.target.value })}
                      className="input py-2"
                    >
                      <option value="sop">Standard Operating Procedure</option>
                      <option value="checklist">Audit Checklist</option>
                      <option value="template">Working Paper Template</option>
                      <option value="reference">External Reference File</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-surface-400 uppercase tracking-wider block font-bold mb-1">Content / Document Text</label>
                  <textarea
                    rows={6}
                    placeholder="Provide full text guidelines for search indexing..."
                    value={newKnowledge.content}
                    onChange={e => setNewKnowledge({ ...newKnowledge, content: e.target.value })}
                    className="input resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-surface-400 uppercase tracking-wider block font-bold mb-1">Tags (Comma separated)</label>
                    <input
                      type="text"
                      placeholder="e.g. gst, filing, sop"
                      value={newKnowledge.tags}
                      onChange={e => setNewKnowledge({ ...newKnowledge, tags: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-surface-400 uppercase tracking-wider block font-bold mb-1">Reference File Path (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. C:\Audits\Manuals\GST_Filings.pdf"
                      value={newKnowledge.file_path}
                      onChange={e => setNewKnowledge({ ...newKnowledge, file_path: e.target.value })}
                      className="input font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-surface-800">
                  <button type="button" onClick={() => setShowAddKnowledgeModal(false)} className="btn-secondary text-xs px-3.5">Cancel</button>
                  <button type="submit" className="btn-primary text-xs px-3.5">Index SOP</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    )
  }

  // 9. Security & Audit tab (Modules 9 & 13)
  const renderSecurity = () => {
    return (
      <div className="space-y-6 text-left">
        {/* Security & Locks panel */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card p-5 space-y-4">
            <h3 className="text-sm font-bold text-surface-100 flex items-center gap-2">
              <Lock size={16} className="text-brand-500" />
              Module 13: Local Workspace Security
            </h3>
            <p className="text-xs text-surface-500 mt-1">Configure active session locking, simulated database encryption checks and automated backups.</p>

            <div className="space-y-3.5 pt-2">
              <div className="p-3 bg-surface-900 border border-surface-800 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-surface-200">Local Database Encryption</p>
                  <p className="text-[10px] text-emerald-400 font-semibold mt-0.5">Enabled (AES-256 local SQL cipher)</p>
                </div>
                <Database size={18} className="text-emerald-400" />
              </div>

              <div className="p-3 bg-surface-900 border border-surface-800 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-surface-200">Role-Based Access Validation</p>
                  <p className="text-[10px] text-surface-400 mt-0.5">Actively validating roles for actions.</p>
                </div>
                <Shield size={18} className="text-brand-400" />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  onClick={handleLockSession}
                  className="btn bg-rose-600/20 text-rose-400 hover:bg-rose-600/30 border border-rose-600/30 text-xs gap-1.5"
                >
                  <Lock size={12} /> Lock Workspace Session
                </button>
                <button
                  onClick={handleBackupDatabase}
                  className="btn-secondary text-xs gap-1.5 border border-surface-700"
                >
                  <Download size={12} /> Export SQLite Backup
                </button>
              </div>
            </div>
          </div>

          <div className="card p-5 space-y-4">
            <h3 className="text-sm font-bold text-surface-100">Simulate Context Switching</h3>
            <p className="text-xs text-surface-500 mt-1">Choose a staff member from user registry to simulate their Role Permission checks.</p>

            <div className="space-y-4 pt-2">
              <div>
                <label className="text-[10px] text-surface-400 font-bold uppercase tracking-wider block mb-1">Active Simulated User</label>
                <select
                  value={currentUser.name}
                  onChange={e => handleSwitchUserRole(e.target.value)}
                  className="input py-2 font-semibold"
                >
                  {users.map(u => (
                    <option key={u.id} value={u.name}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>

              <div className="bg-surface-950 p-4 rounded-xl border border-surface-850 space-y-2 text-xs">
                <p className="font-bold text-surface-300">Active Permissions list for {currentUser.role}:</p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {ALL_PERMISSIONS.map(p => {
                    const isEnabled = hasPermission(p)
                    return (
                      <span key={p} className={`flex items-center gap-1.5 text-[10px] font-semibold ${isEnabled ? 'text-emerald-400' : 'text-surface-600'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isEnabled ? 'bg-emerald-500' : 'bg-surface-600'}`} />
                        {p}
                      </span>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Audit trail full list */}
        <div className="card p-5 space-y-4">
          <div className="border-b border-surface-800 pb-3 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-surface-100 flex items-center gap-2">
                <Activity size={16} className="text-brand-400" />
                Audit Logs Records
              </h3>
              <p className="text-xs text-surface-500 mt-1">Chronological trail recording workspace edits, report exports and approvals (Module 9).</p>
            </div>
            <button
              onClick={() => logAction('manual_override', undefined, undefined, 'Manually cleared log views (simulation)')}
              className="btn-secondary text-[11px] py-1 border border-surface-700"
            >
              Log Manual Override Event
            </button>
          </div>

          <div className="table-wrapper max-h-[300px] overflow-y-auto pr-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-900 border-b border-surface-700 text-surface-400 uppercase tracking-wider text-[10px]">
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">User Designation</th>
                  <th className="p-3">Action Type</th>
                  <th className="p-3">Client Target</th>
                  <th className="p-3">File Affected</th>
                  <th className="p-3">Trace Log Description</th>
                </tr>
              </thead>
              <tbody>
                {auditTrail.map((log) => (
                  <tr key={log.id} className="border-b border-surface-800 hover:bg-surface-750 text-xs">
                    <td className="p-3 font-mono text-surface-400 whitespace-nowrap">{log.timestamp}</td>
                    <td className="p-3 font-semibold text-surface-300">{log.user_name} ({log.role})</td>
                    <td className="p-3">
                      <span className={`badge text-[9px] uppercase font-black ${
                        log.action === 'delete' ? 'badge-error' :
                        log.action === 'approval' ? 'badge-success' :
                        log.action === 'login' ? 'badge-info' :
                        'badge-neutral'
                      }`}>{log.action}</span>
                    </td>
                    <td className="p-3 text-surface-300 font-semibold">{log.client_name || 'N/A'}</td>
                    <td className="p-3 font-mono text-surface-400">{log.document_name || 'N/A'}</td>
                    <td className="p-3 text-surface-400">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  // 10. Sync Offline tab (Module 14)
  const renderSync = () => {
    return (
      <div className="space-y-6 text-left">
        <div className="card p-5 space-y-4">
          <div className="border-b border-surface-800 pb-3 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-surface-100 flex items-center gap-2">
                <RefreshCw size={16} className="text-brand-400" />
                Offline Collaboration & Conflict Resolution Hub
              </h3>
              <p className="text-xs text-surface-500 mt-1">Synchronize data changes with peer offices, resolve edits and export database changes (Module 14).</p>
            </div>
            <button
              onClick={handleTriggerSync}
              className="btn-primary text-xs gap-1.5"
            >
              <RefreshCw size={13} className="animate-spin-slow" /> Trigger Nodes Sync
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-surface-900 border border-surface-800 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-surface-200">Local Node Status</h4>
              <p className="text-[11px] text-surface-500">Device running in secure, completely offline sandbox environment. Connected to local office network share.</p>
              <div className="pt-2 border-t border-surface-950 text-xs flex justify-between">
                <span className="text-surface-400">Connection State:</span>
                <span className="text-emerald-400 font-bold">LAN Connected</span>
              </div>
            </div>

            <div className="p-4 bg-surface-900 border border-surface-800 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-surface-200">Sync Conflicts Detected</h4>
              <p className="text-[11px] text-surface-500">Calculates conflicts when multiple team members edit client profile entries before syncing.</p>
              <div className="pt-2 border-t border-surface-950 text-xs flex justify-between">
                <span className="text-surface-400">Unresolved Conflicts:</span>
                <span className="text-emerald-400 font-bold">0 Pending</span>
              </div>
            </div>

            <div className="p-4 bg-surface-900 border border-surface-800 rounded-xl space-y-3">
              <h4 className="text-xs font-bold text-surface-200">Sync Version Log</h4>
              <p className="text-[11px] text-surface-500">Database revision check tags indicating matching schema records between offline nodes.</p>
              <div className="pt-2 border-t border-surface-950 text-xs flex justify-between font-mono text-[10px]">
                <span className="text-surface-400">Database Hash:</span>
                <span className="text-surface-300">sha256:f48a1290e</span>
              </div>
            </div>
          </div>

          <h4 className="text-xs font-bold text-surface-300 uppercase tracking-wider pt-3">Synchronization History</h4>
          <div className="table-wrapper">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-900 border-b border-surface-700 text-surface-400 uppercase tracking-wider text-[10px]">
                  <th className="p-3">Sync Timestamp</th>
                  <th className="p-3">Synchronization Action</th>
                  <th className="p-3">Sync Status</th>
                  <th className="p-3">Conflicts Resolved</th>
                  <th className="p-3">Description</th>
                </tr>
              </thead>
              <tbody>
                {syncLogs.map((log) => (
                  <tr key={log.id} className="border-b border-surface-800 hover:bg-surface-750 text-xs">
                    <td className="p-3 font-mono text-surface-400">{log.timestamp}</td>
                    <td className="p-3 font-semibold text-brand-400 uppercase text-[10px]">{log.action}</td>
                    <td className="p-3">
                      <span className={`badge text-[9px] font-bold ${log.status === 'success' ? 'badge-success' : 'badge-error'}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-surface-300 text-center">{log.conflicts_count}</td>
                    <td className="p-3 text-surface-400">{log.description}</td>
                  </tr>
                ))}
                {syncLogs.length === 0 && (
                  <tr className="border-b border-surface-800">
                    <td colSpan={5} className="p-4 text-center text-surface-500 text-xs">No synchronization records logged in local node database.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  // Render main page shell
  return (
    <div className="page-container relative h-full">
      {/* Session Lock Screen Overlay */}
      {isLocked && (
        <div className="absolute inset-0 bg-surface-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="card p-6 bg-surface-900/90 border border-surface-700 shadow-2xl text-center space-y-4 max-w-sm w-full animate-fade-in relative overflow-hidden">
            {/* Elegant glass highlights */}
            <div className="absolute -top-12 -left-12 w-28 h-28 bg-brand-500/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-12 -right-12 w-28 h-28 bg-brand-700/10 rounded-full blur-2xl" />

            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-2 animate-pulse">
              <Lock size={20} />
            </div>

            <div>
              <h3 className="text-sm font-bold text-surface-100">CA Workspace Locked</h3>
              <p className="text-[11px] text-surface-500 mt-1">Automatic session safety lock engaged. Enter firm pin / password to resume work.</p>
            </div>

            <form onSubmit={handleUnlock} className="space-y-3.5 text-left">
              <div>
                <label className="text-[10px] text-surface-400 uppercase tracking-wider block font-bold mb-1">Workspace Password</label>
                <input
                  required
                  type="password"
                  placeholder="Enter 'admin123' to unlock"
                  value={lockPassword}
                  onChange={e => setLockPassword(e.target.value)}
                  className="input text-center font-mono placeholder-surface-600"
                />
              </div>

              <button
                type="submit"
                className="btn-primary w-full text-xs justify-center gap-1.5 py-2 mt-2"
              >
                <Unlock size={13} /> Unlock Session
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Title bar banner */}
      <div className="section-header">
        <div className="text-left">
          <h2 className="text-lg font-bold text-surface-100 flex items-center gap-2">
            <Building2 size={18} className="text-brand-500" />
            CA Firm Management & Workspace system
          </h2>
          <p className="text-sm text-surface-400 mt-0.5 font-medium">
            Manage clients, workspace users, compliance tasks, approval workflow and logs.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Active simulated role marker */}
          <div className="text-right text-xs">
            <p className="font-bold text-surface-200">{currentUser.name}</p>
            <p className="text-[10px] text-brand-400 font-semibold">{currentUser.role}</p>
          </div>
          <button
            onClick={handleLockSession}
            className="p-2 bg-surface-900 border border-surface-800 text-surface-400 hover:text-rose-400 rounded-lg hover:border-surface-700 transition-colors"
            title="Lock session"
          >
            <Lock size={14} />
          </button>
        </div>
      </div>

      {/* Tabs navigation menu */}
      <div className="border-b border-surface-800 flex flex-wrap gap-1.5 mb-4">
        {[
          { id: 'dashboard', label: 'Performance Hub', icon: TrendingUp },
          { id: 'firm', label: 'Firm Workspace', icon: Building2 },
          { id: 'staff', label: 'Staff & Roles', icon: Users },
          { id: 'clients', label: 'Clients Master', icon: Building2 },
          { id: 'tasks', label: 'Tasks Board', icon: BookCheck },
          { id: 'approvals', label: 'Approvals Queue', icon: Shield },
          { id: 'calendar', label: 'Deadlines Calendar', icon: Calendar },
          { id: 'knowledge', label: 'Knowledge Rep', icon: BookCheck },
          { id: 'audit', label: 'Security & Audit', icon: Shield },
          { id: 'sync', label: 'Offline Sync', icon: RefreshCw }
        ].map(t => {
          const Icon = t.icon
          const isActive = activeTab === t.id
          return (
            <button
              key={t.id}
              onClick={() => {
                setActiveTab(t.id as any)
                // Filter comments clear when closing task detail page
                setSelectedTask(null)
                setSelectedDoc(null)
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

      {/* Tabs Content Router */}
      <div className="flex-1 overflow-y-auto pb-8">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'firm' && renderFirmDetails()}
        {activeTab === 'staff' && renderUserRoles()}
        {activeTab === 'clients' && renderClients()}
        {activeTab === 'tasks' && renderTasks()}
        {activeTab === 'approvals' && renderApprovals()}
        {activeTab === 'calendar' && renderCalendar()}
        {activeTab === 'knowledge' && renderKnowledge()}
        {activeTab === 'audit' && renderSecurity()}
        {activeTab === 'sync' && renderSync()}
      </div>
    </div>
  )
}
