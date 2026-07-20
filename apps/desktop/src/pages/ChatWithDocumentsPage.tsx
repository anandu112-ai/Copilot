import { MessageSquare } from 'lucide-react'
import ComingSoon from '../components/common/ComingSoon'

export default function ChatWithDocumentsPage() {
  return (
    <ComingSoon
      title="Chat with Documents"
      description="Upload your financial documents and have a natural language conversation about their contents. Powered by Retrieval-Augmented Generation (RAG) for grounded, accurate answers."
      icon={<MessageSquare size={28} className="text-white" />}
      accentColor="from-emerald-500 to-teal-700"
      features={[
        { label: 'Upload and index documents', description: 'Chunks text and builds a local vector store' },
        { label: 'Natural language Q&A', description: 'Ask questions about your documents in plain English' },
        { label: 'Grounded answers', description: 'Every answer includes source document references' },
        { label: 'Multi-document chat', description: 'Query across multiple documents simultaneously' },
        { label: 'Local embedding generation', description: 'No data leaves your device' },
        { label: 'Conversation history', description: 'Save and revisit past document conversations' },
      ]}
    />
  )
}
