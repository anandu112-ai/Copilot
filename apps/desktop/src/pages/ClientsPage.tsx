import { Building2 } from 'lucide-react'
import ComingSoon from '../components/common/ComingSoon'

export default function ClientsPage() {
  return (
    <ComingSoon
      title="Client Management"
      description="Maintain a complete client registry with business details, assigned documents, engagement history, and compliance tracking — all stored locally."
      icon={<Building2 size={28} className="text-white" />}
      accentColor="from-sky-500 to-blue-700"
      features={[
        { label: 'Client registry', description: 'Name, PAN, GSTIN, contact details' },
        { label: 'Business type classification', description: 'Proprietorship, partnership, company, LLP' },
        { label: 'Document association', description: 'Link documents to specific clients' },
        { label: 'Financial year tracking', description: 'Organize work by FY per client' },
        { label: 'Staff assignment', description: 'Assign team members to clients' },
        { label: 'Client activity log', description: 'Full audit trail of all work done' },
        { label: 'Status management', description: 'Active, inactive, archived clients' },
      ]}
    />
  )
}
