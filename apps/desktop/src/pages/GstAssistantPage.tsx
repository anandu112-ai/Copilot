import { Receipt } from 'lucide-react'
import ComingSoon from '../components/common/ComingSoon'

export default function GstAssistantPage() {
  return (
    <ComingSoon
      title="GST Assistant"
      description="AI-assisted GST document analysis, tax calculations, GSTIN validation, and input tax credit review. All information must be verified by a qualified GST professional."
      icon={<Receipt size={28} className="text-white" />}
      accentColor="from-green-500 to-emerald-700"
      features={[
        { label: 'GST document review', description: 'Analyse invoices for GST compliance' },
        { label: 'Tax component calculations', description: 'CGST, SGST, IGST, CESS breakdown' },
        { label: 'GSTIN validation', description: 'Validate GSTIN format and check digit' },
        { label: 'Invoice tax analysis', description: 'Review tax rates and amounts' },
        { label: 'Input Tax Credit review', description: 'ITC eligibility assistance' },
        { label: 'GSTR reconciliation', description: 'Match purchase data with GSTR-2A' },
        { label: 'Return preparation assistance', description: 'Organize data for GST filing' },
      ]}
    />
  )
}
