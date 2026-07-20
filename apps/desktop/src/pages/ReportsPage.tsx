import { BarChart3 } from 'lucide-react'
import ComingSoon from '../components/common/ComingSoon'

export default function ReportsPage() {
  return (
    <ComingSoon
      title="Reports & Analytics"
      description="Visualise your document processing statistics, conversion trends, audit exception summaries, and client activity using real locally stored data."
      icon={<BarChart3 size={28} className="text-white" />}
      accentColor="from-rose-500 to-pink-700"
      features={[
        { label: 'Document processing statistics', description: 'Volume and success rates over time' },
        { label: 'Conversion history charts', description: 'PDF to Excel conversion trends' },
        { label: 'Audit exception trends', description: 'Track exception rates by engagement' },
        { label: 'Client activity reports', description: 'Work done per client over time' },
        { label: 'Processing time analytics', description: 'Identify slow workflows' },
        { label: 'Export reports to Excel', description: 'Download analytics data' },
      ]}
    />
  )
}
