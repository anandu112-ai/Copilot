import { FolderOpen } from 'lucide-react'
import ComingSoon from '../components/common/ComingSoon'

export default function DocumentManagerPage() {
  return (
    <ComingSoon
      title="Document Manager"
      description="A centralised repository for all your client financial documents — organized, searchable, and version-tracked entirely on your local machine."
      icon={<FolderOpen size={28} className="text-white" />}
      accentColor="from-amber-500 to-orange-700"
      features={[
        { label: 'Organize by client and financial year', description: 'Logical folder structure for all documents' },
        { label: 'Document tagging and search', description: 'Find any document instantly' },
        { label: 'Version history', description: 'Track changes to documents over time' },
        { label: 'Bulk upload', description: 'Upload multiple documents at once' },
        { label: 'Document preview', description: 'View PDFs without leaving the app' },
        { label: 'Export management', description: 'Track all generated Excel files' },
      ]}
    />
  )
}
