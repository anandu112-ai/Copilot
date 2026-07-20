import { Brain } from 'lucide-react'
import ComingSoon from '../components/common/ComingSoon'

export default function DocumentIntelligencePage() {
  return (
    <ComingSoon
      title="Document Intelligence"
      description="AI-powered document understanding that automatically classifies, extracts structured data, summarizes, and detects anomalies across your financial documents."
      icon={<Brain size={28} className="text-white" />}
      accentColor="from-violet-500 to-violet-700"
      features={[
        { label: 'Automatic document classification', description: 'Identify invoice, statement, ledger automatically' },
        { label: 'Structured data extraction', description: 'Pull key fields without manual templates' },
        { label: 'Document summarization', description: 'AI-generated concise summaries' },
        { label: 'Entity extraction', description: 'Vendors, customers, GST numbers, dates' },
        { label: 'Document comparison', description: 'Compare two versions for differences' },
        { label: 'Anomaly detection', description: 'Flag unusual patterns in financial documents' },
        { label: 'Duplicate detection', description: 'Find duplicate invoices across uploads' },
      ]}
    />
  )
}
