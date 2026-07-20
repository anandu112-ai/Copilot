import { GitCompare } from 'lucide-react'
import ComingSoon from '../components/common/ComingSoon'

export default function ReconciliationPage() {
  return (
    <ComingSoon
      title="Reconciliation"
      description="Reconcile bank statements, GST data, purchase registers, and sales registers with precision. Identify matched, partially matched, and unmatched records."
      icon={<GitCompare size={28} className="text-white" />}
      accentColor="from-teal-500 to-cyan-700"
      features={[
        { label: 'Bank reconciliation', description: 'Match bank statement with ledger entries' },
        { label: 'GST reconciliation', description: 'Match GSTR-2A/2B with purchase register' },
        { label: 'Purchase reconciliation', description: 'Cross-verify purchase data across sources' },
        { label: 'Sales reconciliation', description: 'Cross-verify sales data across sources' },
        { label: 'Matched records', description: 'View all perfectly matched entries' },
        { label: 'Partial matches', description: 'Entries with minor discrepancies' },
        { label: 'Unmatched entries', description: 'Items requiring manual investigation' },
        { label: 'Duplicate detection', description: 'Identify potential duplicate transactions' },
      ]}
    />
  )
}
