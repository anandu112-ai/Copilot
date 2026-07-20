import { useState, useEffect } from 'react'
import {
  Building2, Users, Search, Plus, Filter, FileText, CheckCircle2,
  AlertTriangle, Mail, Phone, Calendar, ArrowRight, UserCheck, X,
  Database, UploadCloud, Check, Play, FileSpreadsheet
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Client {
  id: string
  name: string
  entityType: 'Company' | 'Partnership' | 'LLP' | 'Proprietorship'
  pan: string
  gstin: string
  contactPerson: string
  email: string
  phone: string
  complianceStatus: 'Up to Date' | 'Filings Pending' | 'Audit In Progress'
  assignedStaff: string
  lastFilingDate: string
}

const mockClients: Client[] = [
  {
    id: 'client-1',
    name: 'Apex Steel Industries Pvt Ltd',
    entityType: 'Company',
    pan: 'AABCA9928R',
    gstin: '27AAACA9928R1Z5',
    contactPerson: 'Aditya Sen',
    email: 'aditya@apexsteel.com',
    phone: '+91 98220 18281',
    complianceStatus: 'Up to Date',
    assignedStaff: 'A. K. Mehta (Partner)',
    lastFilingDate: '2026-07-10'
  },
  {
    id: 'client-2',
    name: 'MGM Logistics Services',
    entityType: 'Partnership',
    pan: 'BBBCA1298D',
    gstin: '29BBBCA1298D2Z4',
    contactPerson: 'M. G. Murthy',
    email: 'contact@mgmlogistics.in',
    phone: '+91 80221 99281',
    complianceStatus: 'Filings Pending',
    assignedStaff: 'Ravi Verma (Senior)',
    lastFilingDate: '2026-06-15'
  },
  {
    id: 'client-3',
    name: 'Om Packaging Industries',
    entityType: 'Proprietorship',
    pan: 'AOBCO2981M',
    gstin: '27AABCO2981M2Z5',
    contactPerson: 'Om Prakash',
    email: 'info@ompack.co.in',
    phone: '+91 22891 00219',
    complianceStatus: 'Audit In Progress',
    assignedStaff: 'S. Sharma (Associate)',
    lastFilingDate: '2026-07-05'
  },
  {
    id: 'client-4',
    name: 'TechVibe Solution Hub LLP',
    entityType: 'LLP',
    pan: 'AAALB4829E',
    gstin: '27DDDCB4829E1Z8',
    contactPerson: 'Priya Nair',
    email: 'priya@techvibe.io',
    phone: '+91 91102 44102',
    complianceStatus: 'Up to Date',
    assignedStaff: 'Ravi Verma (Senior)',
    lastFilingDate: '2026-07-18'
  }
]

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClientId, setSelectedClientId] = useState<string>('client-1')
  const [searchTerm, setSearchTerm] = useState('')
  const [entityFilter, setEntityFilter] = useState('All')
  
  // Drawer / Form state
  const [showAddForm, setShowAddForm] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [newClientGSTIN, setNewClientGSTIN] = useState('')
  const [newClientType, setNewClientType] = useState<'Company' | 'Partnership' | 'LLP' | 'Proprietorship'>('Company')
  const [newClientContact, setNewClientContact] = useState('')

  // Onboarding / Import Masters state
  const [showOnboardModal, setShowOnboardModal] = useState(false)
  const [onboardStatus, setOnboardStatus] = useState<'idle' | 'importing' | 'completed' | 'failed'>('idle')
  const [onboardProgress, setOnboardProgress] = useState(0)
  const [selectedMasters, setSelectedMasters] = useState<string[]>([
    'company', 'ledgers', 'groups', 'vendors', 'gst', 'opening_balances'
  ])
  const [onboardErrors, setOnboardErrors] = useState<string[]>([])

  useEffect(() => {
    async function loadClients() {
      if (window.electronAPI && window.electronAPI.db) {
        try {
          const dbClients = await window.electronAPI.db.getClients()
          if (dbClients.length === 0) {
            // Seed DB with defaults
            for (const c of mockClients) {
              await window.electronAPI.db.insertClient({
                id: c.id,
                clientName: c.name,
                clientType: c.entityType,
                pan: c.pan,
                gstin: c.gstin,
                email: c.email,
                phone: c.phone,
                businessName: c.contactPerson,
                assignedStaff: c.assignedStaff,
                status: c.complianceStatus
              })
            }
            const seeded = await window.electronAPI.db.getClients()
            mapDbToState(seeded)
          } else {
            mapDbToState(dbClients)
          }
        } catch (e) {
          console.error(e)
          setClients(mockClients)
        }
      } else {
        setClients(mockClients)
      }
    }

    function mapDbToState(dbList: any[]) {
      const mapped = dbList.map((c: any) => ({
        id: c.id,
        name: c.clientName,
        entityType: (c.clientType || 'Company') as any,
        pan: c.pan || '',
        gstin: c.gstin || '',
        contactPerson: c.businessName || 'N/A',
        email: c.email || '',
        phone: c.phone || '',
        complianceStatus: (c.status || 'Up to Date') as any,
        assignedStaff: c.assignedStaff || 'Unassigned',
        lastFilingDate: c.updatedAt ? c.updatedAt.split(' ')[0] : new Date().toISOString().split('T')[0]
      }))
      setClients(mapped)
      if (mapped.length > 0) {
        setSelectedClientId(mapped[0].id)
      }
    }


    loadClients()
  }, [])

  const selectedClient = clients.find(c => c.id === selectedClientId)

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newClientName || !newClientGSTIN) {
      toast.error('Name and GSTIN are required')
      return
    }

    const newClient: Client = {
      id: `client-${Date.now()}`,
      name: newClientName,
      entityType: newClientType,
      pan: newClientGSTIN.substring(2, 12).toUpperCase(),
      gstin: newClientGSTIN.toUpperCase(),
      contactPerson: newClientContact || 'N/A',
      email: 'contact@temp.com',
      phone: '+91 99000 00000',
      complianceStatus: 'Up to Date',
      assignedStaff: 'Unassigned',
      lastFilingDate: new Date().toISOString().split('T')[0]
    }

    if (window.electronAPI && window.electronAPI.db) {
      try {
        await window.electronAPI.db.insertClient({
          id: newClient.id,
          clientName: newClient.name,
          clientType: newClient.entityType,
          pan: newClient.pan,
          gstin: newClient.gstin,
          email: newClient.email,
          phone: newClient.phone,
          businessName: newClient.contactPerson,
          assignedStaff: newClient.assignedStaff,
          status: newClient.complianceStatus
        })
      } catch (err) {
        console.error(err)
      }
    }

    setClients([...clients, newClient])
    setSelectedClientId(newClient.id)
    setShowAddForm(false)
    
    // Reset Form
    setNewClientName('')
    setNewClientGSTIN('')
    setNewClientContact('')
    toast.success('New client registered successfully!')
  }


  const filteredClients = clients.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.pan.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.gstin.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = entityFilter === 'All' || c.entityType === entityFilter
    return matchesSearch && matchesFilter
  })

  return (
    <div className="page-container relative">
      {/* Header */}
      <div className="section-header">
        <div>
          <h2 className="text-lg font-bold text-surface-100 flex items-center gap-2">
            <Building2 size={18} className="text-brand-500" />
            Client Registry Management
          </h2>
          <p className="text-sm text-surface-400 mt-0.5 font-medium">Configure corporate registrations, audit files, and compliance state metrics</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="btn-primary text-xs gap-1.5"
        >
          <Plus size={13} /> Add New Client
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Side: dense client table */}
        <div className="xl:col-span-8 flex flex-col gap-4">
          <div className="card p-4 flex flex-col h-full">
            
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center mb-4">
              <div className="flex items-center gap-2 w-full sm:max-w-xs bg-surface-900 border border-surface-700 rounded-lg px-2.5 py-1">
                <Search size={14} className="text-surface-500" />
                <input
                  type="text"
                  placeholder="Search clients by name, GSTIN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-transparent border-none text-xs text-surface-100 placeholder-surface-500 outline-none w-full focus:ring-0"
                />
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="text-xs text-surface-500 flex items-center gap-1"><Filter size={12} /> Entity Type:</span>
                {['All', 'Company', 'Partnership', 'LLP', 'Proprietorship'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setEntityFilter(type)}
                    className={`px-2.5 py-1 rounded text-xs transition-colors ${
                      entityFilter === type
                        ? 'bg-brand-600 text-white font-medium'
                        : 'bg-surface-900 border border-surface-800 text-surface-400 hover:text-surface-200'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Dense Table */}
            <div className="table-wrapper flex-1 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-800 border-b border-surface-700 text-surface-400 uppercase tracking-wider text-[10px]">
                    <th className="p-3">Client Name</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">PAN</th>
                    <th className="p-3">GSTIN</th>
                    <th className="p-3">Last Filing</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client) => {
                    const isSelected = client.id === selectedClientId
                    return (
                      <tr
                        key={client.id}
                        onClick={() => setSelectedClientId(client.id)}
                        className={`cursor-pointer hover:bg-surface-750 border-b border-surface-800 ${
                          isSelected ? 'bg-brand-500/5' : ''
                        }`}
                      >
                        <td className="p-3">
                          <p className="text-xs font-bold text-surface-100">{client.name}</p>
                          <p className="text-[10px] text-surface-500 mt-0.5">Assigned: {client.assignedStaff}</p>
                        </td>
                        <td className="p-3 text-xs text-surface-300 font-semibold">{client.entityType}</td>
                        <td className="p-3 text-xs font-mono text-surface-400">{client.pan}</td>
                        <td className="p-3 text-xs font-mono text-surface-300">{client.gstin}</td>
                        <td className="p-3 text-xs text-surface-400 font-mono">{client.lastFilingDate}</td>
                        <td className="p-3 text-center">
                          <span className={`badge text-[9px] px-2 py-0.5 font-bold ${
                            client.complianceStatus === 'Up to Date' ? 'badge-success' :
                            client.complianceStatus === 'Filings Pending' ? 'badge-error' :
                            'badge-warning'
                          }`}>
                            {client.complianceStatus}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

          </div>
        </div>

        {/* Right Side: Client Profile Sidebar */}
        <div className="xl:col-span-4 flex flex-col">
          <div className="card p-5 flex flex-col h-full justify-between gap-6 text-left">
            {selectedClient ? (
              <>
                <div className="space-y-4">
                  <div className="border-b border-surface-800 pb-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-brand-500/10 text-brand-400 flex items-center justify-center flex-shrink-0">
                      <Building2 size={20} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-surface-100 truncate">{selectedClient.name}</h3>
                      <p className="text-xs text-surface-500 font-semibold">{selectedClient.entityType}</p>
                    </div>
                  </div>

                  {/* Profile Details */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-surface-300 uppercase tracking-wider">Registration Profile</h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b border-surface-900">
                        <span className="text-surface-500">PAN</span>
                        <span className="font-mono text-surface-200 font-bold">{selectedClient.pan}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-surface-900">
                        <span className="text-surface-500">GSTIN</span>
                        <span className="font-mono text-surface-200 font-bold">{selectedClient.gstin}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-surface-900">
                        <span className="text-surface-500">Contact Person</span>
                        <span className="text-surface-200">{selectedClient.contactPerson}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-surface-900">
                        <span className="text-surface-500">Email</span>
                        <span className="text-surface-200 flex items-center gap-1"><Mail size={11} /> {selectedClient.email}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-surface-500">Phone</span>
                        <span className="text-surface-200 flex items-center gap-1"><Phone size={11} /> {selectedClient.phone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Compliance Summary */}
                  <div className="bg-surface-950 p-4 rounded-xl border border-surface-800 space-y-3">
                    <h4 className="text-xs font-bold text-surface-300 uppercase tracking-wider">Compliance Workflow</h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-surface-400">ITC Reconciliation (Books vs 2B)</span>
                        {selectedClient.complianceStatus === 'Up to Date' ? (
                          <span className="text-emerald-400 flex items-center gap-1 font-semibold text-[11px]"><CheckCircle2 size={12} /> Reconciled</span>
                        ) : (
                          <span className="text-amber-400 flex items-center gap-1 font-semibold text-[11px]"><AlertTriangle size={12} /> Discrepancies</span>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-surface-400">Assigned Team Lead</span>
                        <span className="text-surface-300 font-semibold">{selectedClient.assignedStaff}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => toast.success(`Opening compliances dashboard for ${selectedClient.name}`)}
                    className="btn-primary w-full text-xs justify-center gap-1.5"
                  >
                    Launch Compliance Assistant
                  </button>
                  <button
                    onClick={() => toast.success(`Viewing file archives for ${selectedClient.name}`)}
                    className="btn-secondary w-full text-xs justify-center border border-surface-700"
                  >
                    Browse Extracted Document Archives
                  </button>
                  <button
                    onClick={() => {
                      setOnboardStatus('idle')
                      setOnboardProgress(0)
                      setOnboardErrors([])
                      setShowOnboardModal(true)
                    }}
                    className="btn-secondary w-full text-xs justify-center border border-surface-700 text-brand-400 gap-1.5 font-bold"
                  >
                    <Database size={13} /> Onboard Masters & Sync Setup
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm(`Are you sure you want to delete ${selectedClient.name}?`)) {
                        if (window.electronAPI && window.electronAPI.db) {
                          try {
                            await window.electronAPI.db.deleteClient(selectedClient.id)
                          } catch (err) {
                            console.error(err)
                          }
                        }
                        const remaining = clients.filter(c => c.id !== selectedClient.id)
                        setClients(remaining)
                        if (remaining.length > 0) {
                          setSelectedClientId(remaining[0].id)
                        } else {
                          setSelectedClientId('')
                        }
                        toast.success('Client deleted successfully')
                      }
                    }}
                    className="btn-danger w-full text-xs justify-center gap-1.5"
                  >
                    Delete Client Account
                  </button>
                </div>

              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-20 text-surface-500">
                <Users size={26} className="mb-2" />
                <p className="text-sm">Select a client record to launch profile specifications</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Add Client Drawer Modal */}
      {showAddForm && (
        <div className="absolute inset-0 bg-surface-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-md p-6 bg-surface-900 border border-surface-700 shadow-2xl relative text-left space-y-4 animate-slide-in">
            <button
              onClick={() => setShowAddForm(false)}
              className="absolute top-4 right-4 text-surface-500 hover:text-surface-300"
            >
              <X size={16} />
            </button>

            <div>
              <h3 className="text-sm font-bold text-surface-100 flex items-center gap-1.5">
                <Building2 size={16} className="text-brand-500" /> Register Client Account
              </h3>
              <p className="text-xs text-surface-500 mt-0.5">Define corporate attributes for compliance automation mapping.</p>
            </div>

            <form onSubmit={handleAddClient} className="space-y-3.5">
              <div>
                <label className="text-[10px] text-surface-400 uppercase tracking-wider block font-semibold mb-1">Company / Entity Name</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Apex Tech Solutions Private Limited"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-surface-400 uppercase tracking-wider block font-semibold mb-1">Entity Classification</label>
                  <select
                    value={newClientType}
                    onChange={(e) => setNewClientType(e.target.value as any)}
                    className="input py-2"
                  >
                    <option value="Company">Company</option>
                    <option value="Partnership">Partnership</option>
                    <option value="LLP">LLP</option>
                    <option value="Proprietorship">Proprietorship</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-surface-400 uppercase tracking-wider block font-semibold mb-1">GSTIN Number</label>
                  <input
                    required
                    type="text"
                    maxLength={15}
                    placeholder="e.g. 27AAACA9928R1Z5"
                    value={newClientGSTIN}
                    onChange={(e) => setNewClientGSTIN(e.target.value)}
                    className="input uppercase font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-surface-400 uppercase tracking-wider block font-semibold mb-1">Contact Person Name</label>
                <input
                  type="text"
                  placeholder="e.g. Mukesh Ambani"
                  value={newClientContact}
                  onChange={(e) => setNewClientContact(e.target.value)}
                  className="input"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-surface-800">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="btn-secondary text-xs px-3.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary text-xs px-3.5"
                >
                  Register Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Onboard Masters & Sync Setup Modal */}
      {showOnboardModal && (
        <div className="absolute inset-0 bg-surface-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card w-full max-w-xl p-6 bg-surface-900 border border-surface-700 shadow-2xl relative text-left space-y-4 animate-slide-in">
            <button
              onClick={() => setShowOnboardModal(false)}
              className="absolute top-4 right-4 text-surface-500 hover:text-surface-300"
              disabled={onboardStatus === 'importing'}
            >
              <X size={16} />
            </button>

            <div>
              <h3 className="text-sm font-bold text-surface-100 flex items-center gap-1.5">
                <Database size={16} className="text-brand-500" /> Client Onboarding & Master Import
              </h3>
              <p className="text-xs text-surface-500 mt-0.5">
                Import company masters, ledgers, stock items, and balances for <strong>{selectedClient?.name}</strong>.
              </p>
            </div>

            {onboardStatus === 'idle' && (
              <div className="space-y-4 text-xs">
                {/* Checklist Selection */}
                <div>
                  <label className="text-[10px] text-surface-400 uppercase tracking-wider block font-semibold mb-2">Select Onboarding Modules</label>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto bg-surface-950 p-3 rounded-lg border border-surface-850">
                    {[
                      { id: 'company', label: 'Company Profile Details' },
                      { id: 'ledgers', label: 'Chart of Accounts & Ledgers' },
                      { id: 'groups', label: 'Accounting Groups Schema' },
                      { id: 'cost_centres', label: 'Cost Centres & Departments' },
                      { id: 'stock', label: 'Stock Items & Inventory SKU' },
                      { id: 'vendors', label: 'Vendors & Creditors Registry' },
                      { id: 'customers', label: 'Customers & Debtors Registry' },
                      { id: 'bank_accounts', label: 'Bank Account & Branch Mapping' },
                      { id: 'gst', label: 'GST Configuration & Thresholds' },
                      { id: 'opening_balances', label: 'Opening Balances Ledger' },
                      { id: 'historical', label: 'Historical Journals Sync' }
                    ].map(mod => {
                      const selected = selectedMasters.includes(mod.id)
                      return (
                        <label key={mod.id} className="flex items-center gap-2 p-1.5 cursor-pointer text-surface-300 hover:text-white">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => {
                              if (selected) {
                                setSelectedMasters(prev => prev.filter(x => x !== mod.id))
                              } else {
                                setSelectedMasters(prev => [...prev, mod.id])
                              }
                            }}
                            className="accent-brand-500 rounded border-surface-800"
                          />
                          <span>{mod.label}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>

                {/* File Upload / Connection Sync option */}
                <div className="border border-dashed border-surface-800 rounded-lg p-4 bg-surface-950/20 text-center space-y-2">
                  <UploadCloud size={24} className="mx-auto text-brand-400" />
                  <div>
                    <p className="font-semibold text-surface-300">Select Sync Source Spreadsheet / XML File</p>
                    <p className="text-[10px] text-surface-500 mt-0.5">Supports Tally XML exports, Zoho Excel templates, or BUSY CSV formats</p>
                  </div>
                  <button
                    onClick={() => {
                      // Trigger onboarding import simulation
                      setOnboardStatus('importing')
                      setOnboardProgress(0)
                      setOnboardErrors([])
                      
                      let progress = 0
                      const interval = setInterval(() => {
                        progress += 10
                        setOnboardProgress(progress)
                        
                        if (progress === 30) {
                          setOnboardErrors(prev => [...prev, "Warning: Ledger 'Suspense A/c' has no parent group. Auto-mapped to 'Other Expenses'."])
                        }
                        if (progress === 60) {
                          setOnboardErrors(prev => [...prev, "Warning: Vendor 'Ambica Enterprises' GSTIN is missing. Placed in review queue."])
                        }
                        
                        if (progress >= 100) {
                          clearInterval(interval)
                          setOnboardStatus('completed')
                          toast.success('Client Masters onboarded successfully!')
                        }
                      }, 250)
                    }}
                    className="btn-primary text-[10px] px-3 py-1 font-bold mt-2 inline-flex items-center gap-1"
                  >
                    <Play size={10} /> Initialize Import & Validation
                  </button>
                </div>
              </div>
            )}

            {onboardStatus === 'importing' && (
              <div className="space-y-4 text-xs py-4 text-center">
                <div className="flex items-center justify-between text-[10px] text-surface-400 font-bold uppercase tracking-wider mb-1">
                  <span>Extracting & Validating Schemas...</span>
                  <span>{onboardProgress}%</span>
                </div>
                <div className="w-full bg-surface-850 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-brand-500 h-full transition-all duration-300"
                    style={{ width: `${onboardProgress}%` }}
                  />
                </div>
                <p className="text-[10px] text-surface-500">
                  Running duplicate checks, GSTIN checksums, and date parsing...
                </p>
              </div>
            )}

            {onboardStatus === 'completed' && (
              <div className="space-y-4 text-xs">
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl flex items-start gap-3">
                  <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-surface-200">Onboarding Import Summary</h4>
                    <p className="text-[11px] text-surface-400 mt-1 leading-relaxed">
                      Successfully parsed and stored client masters in the local SQLite db cache:
                    </p>
                    <ul className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-[10px] text-surface-500 list-disc list-inside">
                      <li>Ledgers Imported: <strong>84</strong></li>
                      <li>Vendors/Customers: <strong>42</strong></li>
                      <li>Opening Balances: <strong>Verified</strong></li>
                      <li>GST Profiles: <strong>Checked</strong></li>
                    </ul>
                  </div>
                </div>

                {onboardErrors.length > 0 && (
                  <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-xl space-y-2">
                    <h4 className="font-bold text-amber-400 flex items-center gap-1.5 text-[10px] uppercase tracking-wider">
                      <AlertTriangle size={12} /> Validation Warnings ({onboardErrors.length})
                    </h4>
                    <div className="space-y-1.5">
                      {onboardErrors.map((err, i) => (
                        <p key={i} className="text-[10px] text-surface-400 leading-normal flex items-start gap-1 font-medium">
                          ⚠️ {err}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-surface-800">
                  <button
                    onClick={() => setShowOnboardModal(false)}
                    className="btn-primary text-xs px-5"
                  >
                    Close Setup Wizard
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  )
}
