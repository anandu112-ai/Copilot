import { Plug, CheckCircle2, Clock } from 'lucide-react'

interface IntegrationCard {
  name: string
  description: string
  icon: string
  status: 'available' | 'coming_soon'
  category: string
}

const integrations: IntegrationCard[] = [
  {
    name: 'Tally',
    description: 'Import and export data to Tally ERP. Sync ledgers, vouchers, and masters.',
    icon: '📊',
    status: 'coming_soon',
    category: 'Accounting',
  },
  {
    name: 'Microsoft Excel',
    description: 'Advanced Excel integration for complex workbook operations and templates.',
    icon: '📗',
    status: 'coming_soon',
    category: 'Spreadsheet',
  },
  {
    name: 'Zoho Books',
    description: 'Sync invoices, contacts, and transactions with Zoho Books.',
    icon: '📘',
    status: 'coming_soon',
    category: 'Accounting',
  },
  {
    name: 'QuickBooks',
    description: 'Connect to QuickBooks Desktop or Online for data synchronization.',
    icon: '💼',
    status: 'coming_soon',
    category: 'Accounting',
  },
  {
    name: 'Google Drive',
    description: 'Upload processed documents and converted files to Google Drive.',
    icon: '🗂️',
    status: 'coming_soon',
    category: 'Cloud Storage',
  },
  {
    name: 'OneDrive',
    description: 'Sync your document workspace with Microsoft OneDrive.',
    icon: '☁️',
    status: 'coming_soon',
    category: 'Cloud Storage',
  },
  {
    name: 'Supabase',
    description: 'Cloud database backup and team collaboration via Supabase.',
    icon: '🛢️',
    status: 'coming_soon',
    category: 'Cloud Database',
  },
]

export default function IntegrationsPage() {
  return (
    <div className="page-container">
      <div className="section-header">
        <div>
          <h2 className="text-lg font-bold text-surface-100 flex items-center gap-2">
            <Plug size={18} className="text-brand-400" />
            Integrations
          </h2>
          <p className="text-sm text-surface-400 mt-0.5">Connect CA Copilot to your existing accounting tools and cloud services</p>
        </div>
      </div>

      <div className="mb-4 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
        <p className="text-sm text-amber-400 flex items-center gap-2">
          <Clock size={14} />
          All integrations are planned for future versions. Currently, CA Copilot operates fully offline.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map((integration) => (
          <div key={integration.name} className="card p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="text-2xl">{integration.icon}</div>
                <div>
                  <p className="text-sm font-semibold text-surface-100">{integration.name}</p>
                  <p className="text-xs text-surface-500">{integration.category}</p>
                </div>
              </div>
              <span className="coming-soon-badge text-xs">Soon</span>
            </div>
            <p className="text-xs text-surface-400 leading-relaxed mb-4">{integration.description}</p>
            <button disabled className="btn-secondary w-full text-xs opacity-50 cursor-not-allowed">
              Not Available Yet
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
