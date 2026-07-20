import { BookCheck } from 'lucide-react'
import ComingSoon from '../components/common/ComingSoon'

export default function VouchingPage() {
  return (
    <ComingSoon
      title="Vouching Assistant"
      description="Systematically match ledger entries with supporting documents — invoices, bills, receipts, and bank entries. Flag mismatches for professional review."
      icon={<BookCheck size={28} className="text-white" />}
      accentColor="from-orange-500 to-amber-700"
      features={[
        { label: 'Import ledger transactions', description: 'From Excel, CSV, or Tally export' },
        { label: 'Upload supporting documents', description: 'Invoices, bills, receipts, bank slips' },
        { label: 'Automated voucher matching', description: 'Match by amount, date, and reference' },
        { label: 'Flag missing evidence', description: 'Highlight unmatched ledger entries' },
        { label: 'Amount mismatch detection', description: 'Alert when amounts differ' },
        { label: 'Date mismatch detection', description: 'Alert when dates are inconsistent' },
        { label: 'Manual review workflow', description: 'Auditor can override any match' },
        { label: 'Vouching report export', description: 'Export complete vouching workpaper' },
      ]}
    />
  )
}
