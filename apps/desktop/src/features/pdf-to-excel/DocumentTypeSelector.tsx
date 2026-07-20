import type { DocumentType, DocumentTypeOption } from '../../types'
import { X, FileText, AlertCircle } from 'lucide-react'
import { cn } from '../../utils/cn'

const DOCUMENT_TYPES: DocumentTypeOption[] = [
  { value: 'invoice', label: 'Invoice', description: 'Generic invoice', icon: '🧾', extractionSupport: 'full' },
  { value: 'purchase_invoice', label: 'Purchase Invoice', description: 'Bill from a supplier', icon: '📥', extractionSupport: 'full' },
  { value: 'sales_invoice', label: 'Sales Invoice', description: 'Invoice raised to a customer', icon: '📤', extractionSupport: 'full' },
  { value: 'gst_invoice', label: 'GST Invoice', description: 'GST-compliant tax invoice', icon: '🏦', extractionSupport: 'full' },
  { value: 'bank_statement', label: 'Bank Statement', description: 'Bank account statement', icon: '🏛️', extractionSupport: 'partial' },
  { value: 'ledger', label: 'Ledger', description: 'Account ledger extract', icon: '📒', extractionSupport: 'partial' },
  { value: 'purchase_register', label: 'Purchase Register', description: 'Purchase register / daybook', icon: '📋', extractionSupport: 'partial' },
  { value: 'sales_register', label: 'Sales Register', description: 'Sales register / daybook', icon: '📊', extractionSupport: 'partial' },
  { value: 'credit_note', label: 'Credit Note', description: 'Credit note from supplier or to customer', icon: '📃', extractionSupport: 'full' },
  { value: 'debit_note', label: 'Debit Note', description: 'Debit note document', icon: '📄', extractionSupport: 'full' },
  { value: 'receipt', label: 'Receipt', description: 'Payment receipt', icon: '🧾', extractionSupport: 'partial' },
  { value: 'expense_bill', label: 'Expense Bill', description: 'Expense voucher or bill', icon: '💰', extractionSupport: 'partial' },
  { value: 'other', label: 'Other', description: 'Generic table extraction', icon: '📁', extractionSupport: 'generic' },
]

const SUPPORT_LABELS: Record<DocumentTypeOption['extractionSupport'], { label: string; color: string }> = {
  full: { label: 'Full extraction', color: 'text-emerald-400' },
  partial: { label: 'Partial extraction', color: 'text-amber-400' },
  generic: { label: 'Generic tables only', color: 'text-surface-500' },
}

interface DocumentTypeSelectorProps {
  onSelect: (type: DocumentType) => void
  onClose: () => void
  fileName: string
}

export default function DocumentTypeSelector({ onSelect, onClose, fileName }: DocumentTypeSelectorProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-2xl mx-4 shadow-2xl animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-surface-800">
          <div>
            <h2 className="text-base font-semibold text-surface-100">Select Document Type</h2>
            <p className="text-xs text-surface-500 mt-0.5 truncate max-w-sm" title={fileName}>
              <FileText size={11} className="inline mr-1" />
              {fileName}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-surface-500 hover:text-surface-300 hover:bg-surface-800 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          <p className="text-sm text-surface-400 mb-4">
            Choose the type that best matches your document. This helps CA Copilot extract the most accurate data.
          </p>
          <div className="grid grid-cols-3 gap-2 max-h-[380px] overflow-y-auto pr-1">
            {DOCUMENT_TYPES.map((type) => {
              const support = SUPPORT_LABELS[type.extractionSupport]
              return (
                <button
                  key={type.value}
                  onClick={() => onSelect(type.value)}
                  className="flex flex-col items-start p-3 rounded-xl border border-surface-800 bg-surface-800/50 hover:border-brand-500/50 hover:bg-brand-500/5 transition-all duration-150 text-left"
                >
                  <span className="text-xl mb-2">{type.icon}</span>
                  <p className="text-sm font-medium text-surface-200">{type.label}</p>
                  <p className="text-xs text-surface-500 mt-0.5 leading-snug">{type.description}</p>
                  <p className={cn('text-xs mt-2 font-medium', support.color)}>{support.label}</p>
                </button>
              )
            })}
          </div>

          <div className="mt-4 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg flex items-start gap-2">
            <AlertCircle size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-surface-400">
              Always review extracted data before exporting. Extraction accuracy depends on PDF quality and layout. OCR is used for scanned documents.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
