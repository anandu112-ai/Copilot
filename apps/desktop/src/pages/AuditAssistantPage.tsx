import { Shield } from 'lucide-react'
import ComingSoon from '../components/common/ComingSoon'

export default function AuditAssistantPage() {
  return (
    <ComingSoon
      title="Audit Assistant"
      description="A structured digital workspace for audit engagements. CA Copilot provides decision support tools — all professional judgments remain with the qualified auditor."
      icon={<Shield size={28} className="text-white" />}
      accentColor="from-red-500 to-rose-700"
      features={[
        { label: 'Audit engagement management', description: 'Create and track audit projects' },
        { label: 'Digital audit checklist', description: 'Structured checklists by audit area' },
        { label: 'Document review workflow', description: 'Review and annotate financial documents' },
        { label: 'Risk flag detection', description: 'AI-assisted identification of potential issues' },
        { label: 'Exception management', description: 'Log, track, and resolve audit exceptions' },
        { label: 'Audit notes and evidence', description: 'Attach supporting evidence to findings' },
        { label: 'Missing document detection', description: 'Identify gaps in submitted documentation' },
        { label: 'Unusual transaction flagging', description: 'Statistical anomaly detection in ledgers' },
      ]}
    />
  )
}
