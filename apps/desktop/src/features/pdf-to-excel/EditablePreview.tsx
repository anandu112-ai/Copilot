import { useState, useCallback } from 'react'
import {
  AlertCircle, CheckCircle2, Edit3, Plus, Trash2, RotateCcw,
  Download, ChevronDown, ChevronRight, Info, Search
} from 'lucide-react'
import type { ExtractionResult, InvoiceHeader, LineItem, ExtractionWarning } from '../../types'
import { cn } from '../../utils/cn'

interface EditablePreviewProps {
  result: ExtractionResult
  originalResult: ExtractionResult
  onHeaderChange: (field: keyof InvoiceHeader, value: string) => void
  onLineItemChange: (id: string, field: keyof LineItem, value: string) => void
  onAddLineItem: () => void
  onDeleteLineItem: (id: string) => void
  onReset: () => void
  onExport: () => void
  isExporting: boolean
}

interface SectionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}

function Section({ title, children, defaultOpen = true }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="card mb-4 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-surface-800 hover:bg-surface-750 transition-colors"
      >
        <span className="text-sm font-semibold text-surface-200">{title}</span>
        {open ? <ChevronDown size={14} className="text-surface-400" /> : <ChevronRight size={14} className="text-surface-400" />}
      </button>
      {open && <div className="p-5">{children}</div>}
    </div>
  )
}

interface FieldRowProps {
  label: string
  value: string
  onChange: (v: string) => void
  type?: 'text' | 'number' | 'date'
  placeholder?: string
  important?: boolean
}

function FieldRow({ label, value, onChange, type = 'text', placeholder, important }: FieldRowProps) {
  return (
    <div className="grid grid-cols-2 gap-3 items-center py-2 border-b border-surface-800 last:border-0">
      <label className={cn('text-xs font-medium', important ? 'text-surface-300' : 'text-surface-400')}>
        {label}
        {important && <span className="text-brand-400 ml-1">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || '—'}
        className="input text-xs py-1.5"
      />
    </div>
  )
}

function WarningBanner({ warnings }: { warnings: ExtractionWarning[] }) {
  if (warnings.length === 0) return null
  const errors = warnings.filter(w => w.severity === 'error')
  const warns = warnings.filter(w => w.severity === 'warning')
  const infos = warnings.filter(w => w.severity === 'info')

  return (
    <div className="mb-4 space-y-2">
      {errors.length > 0 && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-xs font-semibold text-red-400 mb-1 flex items-center gap-1.5"><AlertCircle size={12} /> Extraction Issues</p>
          {errors.map((w, i) => <p key={i} className="text-xs text-surface-400">{w.message}</p>)}
        </div>
      )}
      {warns.length > 0 && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <p className="text-xs font-semibold text-amber-400 mb-1 flex items-center gap-1.5"><AlertCircle size={12} /> Warnings</p>
          {warns.map((w, i) => <p key={i} className="text-xs text-surface-400">{w.message}</p>)}
        </div>
      )}
      {infos.length > 0 && (
        <div className="p-3 bg-brand-500/10 border border-brand-500/20 rounded-xl">
          <p className="text-xs font-semibold text-brand-400 mb-1 flex items-center gap-1.5"><Info size={12} /> Information</p>
          {infos.map((w, i) => <p key={i} className="text-xs text-surface-400">{w.message}</p>)}
        </div>
      )}
    </div>
  )
}

export default function EditablePreview({
  result,
  originalResult,
  onHeaderChange,
  onLineItemChange,
  onAddLineItem,
  onDeleteLineItem,
  onReset,
  onExport,
  isExporting,
}: EditablePreviewProps) {
  const [lineSearch, setLineSearch] = useState('')

  const header = result.header
  const filteredItems = result.lineItems.filter(item =>
    !lineSearch || item.description.toLowerCase().includes(lineSearch.toLowerCase()) ||
    item.hsnSac.includes(lineSearch)
  )

  const confidenceBadge = {
    high: <span className="badge badge-success"><CheckCircle2 size={10} /> High confidence</span>,
    medium: <span className="badge badge-warning"><AlertCircle size={10} /> Medium confidence</span>,
    low: <span className="badge badge-error"><AlertCircle size={10} /> Low confidence — review carefully</span>,
  }[result.confidence]

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {confidenceBadge}
          {result.isOcrUsed && (
            <span className="badge badge-info"><Info size={10} /> OCR used</span>
          )}
          <span className="text-xs text-surface-500">{result.pageCount} page{result.pageCount !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onReset} className="btn-ghost text-xs gap-1.5">
            <RotateCcw size={13} />
            Reset to extracted
          </button>
          <button
            onClick={onExport}
            disabled={isExporting}
            className="btn-primary text-xs gap-1.5"
          >
            {isExporting ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download size={13} />
            )}
            Export to Excel
          </button>
        </div>
      </div>

      {/* Warnings */}
      <WarningBanner warnings={result.warnings} />

      <div className="overflow-y-auto flex-1 pr-1">
        {/* Document Info */}
        <Section title="📄 Document Information">
          <div className="grid grid-cols-2 gap-x-6">
            <div>
              <FieldRow label="Invoice Number" value={header.invoiceNumber || ''} onChange={v => onHeaderChange('invoiceNumber', v)} important />
              <FieldRow label="Invoice Date" value={header.invoiceDate || ''} onChange={v => onHeaderChange('invoiceDate', v)} type="date" important />
              <FieldRow label="Due Date" value={header.dueDate || ''} onChange={v => onHeaderChange('dueDate', v)} type="date" />
              <FieldRow label="Currency" value={header.currency || 'INR'} onChange={v => onHeaderChange('currency', v)} />
              <FieldRow label="Payment Terms" value={header.paymentTerms || ''} onChange={v => onHeaderChange('paymentTerms', v)} />
              <FieldRow label="Place of Supply" value={header.placeOfSupply || ''} onChange={v => onHeaderChange('placeOfSupply', v)} />
            </div>
          </div>
        </Section>

        {/* Seller */}
        <Section title="🏢 Seller / Vendor Information">
          <div>
            <FieldRow label="Vendor Name" value={header.vendorName || ''} onChange={v => onHeaderChange('vendorName', v)} important />
            <FieldRow label="Vendor Address" value={header.vendorAddress || ''} onChange={v => onHeaderChange('vendorAddress', v)} />
            <FieldRow label="Vendor GSTIN" value={header.vendorGstin || ''} onChange={v => onHeaderChange('vendorGstin', v)} />
            <FieldRow label="Vendor PAN" value={header.vendorPan || ''} onChange={v => onHeaderChange('vendorPan', v)} />
          </div>
        </Section>

        {/* Buyer */}
        <Section title="👤 Buyer / Customer Information">
          <div>
            <FieldRow label="Customer Name" value={header.customerName || ''} onChange={v => onHeaderChange('customerName', v)} important />
            <FieldRow label="Customer Address" value={header.customerAddress || ''} onChange={v => onHeaderChange('customerAddress', v)} />
            <FieldRow label="Customer GSTIN" value={header.customerGstin || ''} onChange={v => onHeaderChange('customerGstin', v)} />
          </div>
        </Section>

        {/* Tax */}
        <Section title="💰 Tax & Totals">
          <div className="grid grid-cols-2 gap-x-6">
            <div>
              <FieldRow label="Subtotal" value={header.subtotal || ''} onChange={v => onHeaderChange('subtotal', v)} type="text" />
              <FieldRow label="Discount" value={header.discount || ''} onChange={v => onHeaderChange('discount', v)} />
              <FieldRow label="Freight" value={header.freight || ''} onChange={v => onHeaderChange('freight', v)} />
              <FieldRow label="Other Charges" value={header.otherCharges || ''} onChange={v => onHeaderChange('otherCharges', v)} />
              <FieldRow label="Taxable Amount" value={header.taxableAmount || ''} onChange={v => onHeaderChange('taxableAmount', v)} important />
            </div>
            <div>
              <FieldRow label="CGST" value={header.cgst || ''} onChange={v => onHeaderChange('cgst', v)} />
              <FieldRow label="SGST" value={header.sgst || ''} onChange={v => onHeaderChange('sgst', v)} />
              <FieldRow label="IGST" value={header.igst || ''} onChange={v => onHeaderChange('igst', v)} />
              <FieldRow label="CESS" value={header.cess || ''} onChange={v => onHeaderChange('cess', v)} />
              <FieldRow label="Round Off" value={header.roundOff || ''} onChange={v => onHeaderChange('roundOff', v)} />
              <FieldRow label="Grand Total" value={header.grandTotal || ''} onChange={v => onHeaderChange('grandTotal', v)} important />
              <FieldRow label="Amount in Words" value={header.amountInWords || ''} onChange={v => onHeaderChange('amountInWords', v)} />
            </div>
          </div>
        </Section>

        {/* Bank Details */}
        <Section title="🏦 Bank Details" defaultOpen={false}>
          <div>
            <FieldRow label="Bank Name" value={header.bankName || ''} onChange={v => onHeaderChange('bankName', v)} />
            <FieldRow label="Account Number" value={header.accountNumber || ''} onChange={v => onHeaderChange('accountNumber', v)} />
            <FieldRow label="IFSC Code" value={header.ifsc || ''} onChange={v => onHeaderChange('ifsc', v)} />
            <FieldRow label="UPI ID" value={header.upi || ''} onChange={v => onHeaderChange('upi', v)} />
          </div>
        </Section>

        {/* Line Items */}
        <Section title={`📋 Line Items (${result.lineItems.length})`}>
          {/* Search */}
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1 max-w-xs">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-surface-500" />
              <input
                value={lineSearch}
                onChange={(e) => setLineSearch(e.target.value)}
                placeholder="Search line items..."
                className="input text-xs py-1.5 pl-7"
              />
            </div>
            <button onClick={onAddLineItem} className="btn-secondary text-xs gap-1.5">
              <Plus size={13} />
              Add Row
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-lg border border-surface-800">
            <table className="min-w-full">
              <thead>
                <tr className="bg-surface-800">
                  <th className="px-2 py-2 text-xs text-surface-400">#</th>
                  <th className="px-2 py-2 text-xs text-surface-400 text-left min-w-[180px]">Description</th>
                  <th className="px-2 py-2 text-xs text-surface-400">HSN/SAC</th>
                  <th className="px-2 py-2 text-xs text-surface-400">Qty</th>
                  <th className="px-2 py-2 text-xs text-surface-400">Unit</th>
                  <th className="px-2 py-2 text-xs text-surface-400">Rate</th>
                  <th className="px-2 py-2 text-xs text-surface-400">Taxable</th>
                  <th className="px-2 py-2 text-xs text-surface-400">CGST%</th>
                  <th className="px-2 py-2 text-xs text-surface-400">SGST%</th>
                  <th className="px-2 py-2 text-xs text-surface-400">IGST%</th>
                  <th className="px-2 py-2 text-xs text-surface-400">Total</th>
                  <th className="px-2 py-2 text-xs text-surface-400"></th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="text-center py-6 text-xs text-surface-500">
                      {lineSearch ? 'No matching line items' : 'No line items extracted'}
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, idx) => (
                    <tr key={item.id} className="border-t border-surface-800 hover:bg-surface-800/30">
                      <td className="px-2 py-1.5 text-xs text-surface-500 text-center">{idx + 1}</td>
                      {(['description', 'hsnSac', 'quantity', 'unit', 'rate', 'taxableValue',
                        'cgstRate', 'sgstRate', 'igstRate', 'total'] as (keyof LineItem)[]).map((field) => (
                        <td key={field} className="px-1 py-1">
                          <input
                            value={item[field] as string}
                            onChange={(e) => onLineItemChange(item.id, field, e.target.value)}
                            className={cn(
                              'w-full bg-transparent text-xs text-surface-200 px-1.5 py-1 rounded',
                              'hover:bg-surface-800 focus:bg-surface-800 focus:outline-none focus:ring-1 focus:ring-brand-500/50',
                              field === 'description' ? 'min-w-[170px]' : 'min-w-[60px] text-right'
                            )}
                          />
                        </td>
                      ))}
                      <td className="px-1 py-1">
                        <button
                          onClick={() => onDeleteLineItem(item.id)}
                          className="p-1 rounded text-surface-600 hover:text-red-400 hover:bg-surface-800 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Section>
      </div>
    </div>
  )
}
