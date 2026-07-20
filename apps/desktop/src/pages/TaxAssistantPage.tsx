import { Calculator } from 'lucide-react'
import ComingSoon from '../components/common/ComingSoon'

export default function TaxAssistantPage() {
  return (
    <ComingSoon
      title="Tax Assistant"
      description="Organise tax documents, perform calculations, search the tax knowledge base, and prepare compliance checklists. Professional tax advice must come from a qualified CA."
      icon={<Calculator size={28} className="text-white" />}
      accentColor="from-indigo-500 to-blue-700"
      features={[
        { label: 'Tax document organisation', description: 'ITR, TDS, Form 26AS, AIS organisation' },
        { label: 'Tax calculations', description: 'Income tax computation assistance' },
        { label: 'Knowledge base search', description: 'Search tax provisions with source references' },
        { label: 'Document analysis', description: 'Extract key data from tax documents' },
        { label: 'Compliance checklist', description: 'Due date and compliance tracker' },
        { label: 'TDS reconciliation', description: 'Match TDS entries with Form 26AS' },
        { label: 'Tax planning assistance', description: 'Scenario analysis tools (not advice)' },
      ]}
    />
  )
}
