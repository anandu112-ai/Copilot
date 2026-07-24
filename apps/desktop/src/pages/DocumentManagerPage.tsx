import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Clock3, FileSpreadsheet, FileText, FolderOpen, Search, ShieldAlert, Upload, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useDocumentStore } from '../stores/documentStore'
import type { DocumentStatus, ProcessedDocument } from '../types/document'

const statusStyle: Record<DocumentStatus, string> = {
  Queued: 'bg-surface-500/10 text-surface-500',
  Processing: 'bg-brand-500/10 text-brand-600 dark:text-brand-400',
  Completed: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  'Requires Review': 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  Error: 'bg-red-500/10 text-red-600 dark:text-red-400',
}

export default function DocumentManagerPage() {
  const { documents, selectedDocId, searchFilter, selectDocument, setSearchFilter, updateDocument } = useDocumentStore()
  const filtered = useMemo(() => documents.filter((document) => {
    const query = searchFilter.query.trim().toLowerCase()
    const matchQuery = !query || [document.name, document.type, document.header.vendorName, document.header.invoiceNumber, document.header.vendorGstin]
      .some((value) => value.toLowerCase().includes(query))
    return matchQuery && (searchFilter.status === 'All' || document.status === searchFilter.status)
  }), [documents, searchFilter])
  const selected = documents.find((document) => document.id === selectedDocId) ?? filtered[0]
  const needsReview = documents.filter((document) => document.status === 'Requires Review').length

  const setReviewStatus = (document: ProcessedDocument, status: 'Completed' | 'Error') => {
    updateDocument(document.id, { status, processedAt: new Date().toISOString() })
    toast.success(status === 'Completed' ? 'Document approved for use.' : 'Document marked as rejected.')
  }

  return <main className="flex h-[calc(100vh-var(--topbar-height))] min-h-0 flex-col bg-surface-50 dark:bg-surface-950">
    <header className="flex flex-col gap-4 border-b border-surface-200 bg-white px-6 py-5 dark:border-surface-800 dark:bg-surface-900 lg:flex-row lg:items-center lg:justify-between">
      <div><p className="text-sm font-medium text-brand-600 dark:text-brand-400">Document intelligence</p><h1 className="mt-1 text-xl font-bold text-surface-900 dark:text-white">Document workspace</h1><p className="mt-1 text-sm text-surface-500">Review extracted data, quality signals, and approval decisions in one place.</p></div>
      <Link to="/document-ai" className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"><Upload size={16} /> Upload documents</Link>
    </header>

    <section className="grid grid-cols-2 gap-3 border-b border-surface-200 bg-white px-6 py-4 dark:border-surface-800 dark:bg-surface-900 lg:grid-cols-4" aria-label="Document summary">
      <Metric icon={<FolderOpen size={18} />} label="Documents" value={documents.length} tone="brand" />
      <Metric icon={<CheckCircle2 size={18} />} label="Approved" value={documents.filter((item) => item.status === 'Completed').length} tone="success" />
      <Metric icon={<AlertTriangle size={18} />} label="Needs review" value={needsReview} tone="warning" />
      <Metric icon={<ShieldAlert size={18} />} label="Duplicate alerts" value={documents.filter((item) => item.duplicate.isDuplicate).length} tone="danger" />
    </section>

    <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(320px,0.85fr)_minmax(420px,1.5fr)]">
      <section className="flex min-h-0 flex-col border-r border-surface-200 bg-white dark:border-surface-800 dark:bg-surface-900" aria-label="Document list">
        <div className="flex gap-2 border-b border-surface-200 p-4 dark:border-surface-800"><label className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" size={16} /><span className="sr-only">Search documents</span><input value={searchFilter.query} onChange={(event) => setSearchFilter({ query: event.target.value })} placeholder="Search documents" className="w-full rounded-lg border border-surface-300 bg-transparent py-2 pl-9 pr-3 text-sm text-surface-900 outline-none focus:border-brand-500 dark:border-surface-700 dark:text-white" /></label><select value={searchFilter.status} onChange={(event) => setSearchFilter({ status: event.target.value as DocumentStatus | 'All' })} className="rounded-lg border border-surface-300 bg-transparent px-2 text-sm text-surface-700 outline-none dark:border-surface-700 dark:text-surface-300"><option value="All">All</option><option value="Requires Review">Review</option><option value="Completed">Approved</option><option value="Processing">Processing</option><option value="Error">Errors</option></select></div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">{filtered.map((document) => <button key={document.id} onClick={() => selectDocument(document.id)} className={`mb-1 w-full rounded-lg border p-3 text-left transition ${selected?.id === document.id ? 'border-brand-500 bg-brand-500/5' : 'border-transparent hover:border-surface-200 hover:bg-surface-50 dark:hover:border-surface-800 dark:hover:bg-surface-800/70'}`}><div className="flex gap-3"><div className="rounded-lg bg-brand-500/10 p-2 text-brand-600 dark:text-brand-400">{document.type === 'Bank Statement' ? <FileSpreadsheet size={17} /> : <FileText size={17} />}</div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="truncate text-sm font-semibold text-surface-800 dark:text-surface-100">{document.name}</p><span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${statusStyle[document.status]}`}>{document.status}</span></div><p className="mt-1 truncate text-xs text-surface-500">{document.header.vendorName || document.type} · {document.size}</p><div className="mt-2 flex items-center justify-between text-xs"><span className="text-surface-500">Confidence</span><span className={document.confidence >= 90 ? 'font-semibold text-emerald-600 dark:text-emerald-400' : 'font-semibold text-amber-600 dark:text-amber-400'}>{document.confidence}%</span></div></div></div></button>)}{!filtered.length && <p className="p-8 text-center text-sm text-surface-500">No documents match these filters.</p>}</div>
      </section>

      <section className="min-h-0 overflow-y-auto p-5 lg:p-7" aria-label="Document details">{selected ? <DocumentDetail document={selected} onApprove={() => setReviewStatus(selected, 'Completed')} onReject={() => setReviewStatus(selected, 'Error')} /> : <div className="grid h-full place-items-center text-center text-surface-500"><FolderOpen size={30} /><p className="mt-3 text-sm">Select a document to inspect it.</p></div>}</section>
    </div>
  </main>
}

function Metric({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: 'brand' | 'success' | 'warning' | 'danger' }) {
  const tones = { brand: 'bg-brand-500/10 text-brand-600 dark:text-brand-400', success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', danger: 'bg-red-500/10 text-red-600 dark:text-red-400' }
  return <div className="flex items-center gap-3"><span className={`rounded-lg p-2 ${tones[tone]}`}>{icon}</span><div><p className="text-xs text-surface-500">{label}</p><p className="text-lg font-bold text-surface-900 dark:text-white">{value}</p></div></div>
}

function DocumentDetail({ document, onApprove, onReject }: { document: ProcessedDocument; onApprove: () => void; onReject: () => void }) {
  const hasReviewSignals = document.status === 'Requires Review' || document.validationWarnings.length > 0 || document.duplicate.isDuplicate
  return <article><div className="flex flex-col gap-4 border-b border-surface-200 pb-5 dark:border-surface-800 sm:flex-row sm:items-start sm:justify-between"><div><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusStyle[document.status]}`}>{document.status}</span><h2 className="mt-3 break-words text-xl font-bold text-surface-900 dark:text-white">{document.name}</h2><p className="mt-1 text-sm text-surface-500">{document.type} · Uploaded {new Date(document.uploadedAt).toLocaleDateString()}</p></div>{document.status === 'Requires Review' && <div className="flex gap-2"><button onClick={onReject} className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30"><XCircle size={15} /> Reject</button><button onClick={onApprove} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"><CheckCircle2 size={15} /> Approve</button></div>}</div>
    <div className="mt-6 grid gap-4 sm:grid-cols-3"><Info label="AI confidence" value={`${document.confidence}%`} /><Info label="Processing time" value={`${(document.metadata.processingTimeMs / 1000).toFixed(1)}s`} /><Info label="Pages processed" value={String(document.pageCount)} /></div>
    {hasReviewSignals && <section className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-900/70 dark:bg-amber-950/20"><h3 className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-300"><AlertTriangle size={16} /> Review signals</h3><ul className="mt-3 space-y-2 text-sm text-amber-700 dark:text-amber-200">{document.duplicate.isDuplicate && <li>Potential duplicate: {document.duplicate.duplicateReason || 'similar accounting data detected'}.</li>}{document.validationWarnings.map((warning) => <li key={warning}>{warning}</li>)}{!document.validationWarnings.length && !document.duplicate.isDuplicate && <li>Low-confidence fields need a reviewer decision.</li>}</ul></section>}
    <section className="mt-7"><h3 className="text-sm font-semibold text-surface-900 dark:text-white">Extracted information</h3><dl className="mt-3 grid overflow-hidden rounded-xl border border-surface-200 text-sm dark:border-surface-800 sm:grid-cols-2">{[['Supplier', document.header.vendorName], ['Invoice number', document.header.invoiceNumber], ['Invoice date', document.header.invoiceDate], ['GSTIN', document.header.vendorGstin], ['Taxable amount', formatCurrency(document.header.taxableAmount)], ['Grand total', formatCurrency(document.header.grandTotal)]].map(([label, value]) => <div key={label} className="border-b border-surface-200 p-3 last:border-b-0 even:sm:border-l dark:border-surface-800"><dt className="text-xs text-surface-500">{label}</dt><dd className="mt-1 font-medium text-surface-800 dark:text-surface-200">{value || '—'}</dd></div>)}</dl></section>
    <section className="mt-7"><h3 className="text-sm font-semibold text-surface-900 dark:text-white">Processing record</h3><div className="mt-3 flex items-center gap-3 rounded-xl border border-surface-200 p-4 text-sm text-surface-600 dark:border-surface-800 dark:text-surface-300"><Clock3 size={17} className="text-surface-400" /><span>{document.metadata.engine} · {document.metadata.ocrUsed ? 'OCR enabled' : 'Native text extraction'} · {document.metadata.reviewFields.length} field(s) flagged</span></div></section>
  </article>
}

function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-surface-200 bg-white p-3 dark:border-surface-800 dark:bg-surface-900"><p className="text-xs text-surface-500">{label}</p><p className="mt-1 font-semibold text-surface-900 dark:text-white">{value}</p></div> }
function formatCurrency(value: number) { return value ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value) : '—' }
