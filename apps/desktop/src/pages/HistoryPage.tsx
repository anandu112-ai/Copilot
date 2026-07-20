import { useEffect, useState } from 'react'
import { History, FolderOpen, FileSpreadsheet, Trash2, Eye, CheckCircle2, XCircle, AlertCircle, Clock, RefreshCcw } from 'lucide-react'
import type { ConversionHistoryRecord } from '../types'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

function StatusBadge({ status }: { status: string }) {
  if (status === 'success') return (
    <span className="badge badge-success"><CheckCircle2 size={10} /> Success</span>
  )
  if (status === 'failed') return (
    <span className="badge badge-error"><XCircle size={10} /> Failed</span>
  )
  return <span className="badge badge-warning"><AlertCircle size={10} /> Partial</span>
}

export default function HistoryPage() {
  const [records, setRecords] = useState<ConversionHistoryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    if (window.electronAPI) {
      const data = await window.electronAPI.db.getConversionHistory(200)
      setRecords(data)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (id: string) => {
    if (!window.electronAPI) return
    setDeleting(id)
    await window.electronAPI.db.deleteConversion(id)
    setRecords((prev) => prev.filter((r) => r.id !== id))
    setDeleting(null)
    toast.success('Record deleted')
  }

  const handleOpenFile = async (filePath: string) => {
    if (!window.electronAPI || !filePath) return
    const result = await window.electronAPI.openFile(filePath)
    if (!result.success) toast.error('File not found — it may have been moved or deleted')
  }

  const handleReveal = async (filePath: string) => {
    if (!window.electronAPI || !filePath) return
    const result = await window.electronAPI.revealInExplorer(filePath)
    if (!result.success) toast.error('Could not open folder')
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  return (
    <div className="page-container">
      <div className="section-header">
        <div>
          <h2 className="text-lg font-bold text-surface-100 flex items-center gap-2">
            <History size={18} className="text-brand-400" />
            Conversion History
          </h2>
          <p className="text-sm text-surface-400 mt-0.5">
            {records.length} conversion{records.length !== 1 ? 's' : ''} recorded
          </p>
        </div>
        <button onClick={load} className="btn-secondary gap-1.5 text-xs">
          <RefreshCcw size={13} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : records.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-xl bg-surface-800 flex items-center justify-center mb-4">
            <FileSpreadsheet size={22} className="text-surface-500" />
          </div>
          <p className="text-sm font-medium text-surface-300 mb-1">No conversions yet</p>
          <p className="text-xs text-surface-500 max-w-xs">
            Convert a PDF using the PDF to Excel tool and it will appear here.
          </p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>File Name</th>
                <th>Document Type</th>
                <th>Status</th>
                <th>Pages</th>
                <th>Duration</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet size={14} className="text-emerald-400 flex-shrink-0" />
                      <span className="text-surface-200 text-sm truncate max-w-[200px]" title={record.original_file_name}>
                        {record.original_file_name}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className="text-surface-300 capitalize text-xs">
                      {record.document_type.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td><StatusBadge status={record.status} /></td>
                  <td className="text-surface-400 text-xs">{record.page_count || '—'}</td>
                  <td className="text-surface-400 text-xs font-mono">
                    {record.processing_duration_ms ? formatDuration(record.processing_duration_ms) : '—'}
                  </td>
                  <td className="text-surface-400 text-xs">
                    {format(new Date(record.created_at), 'dd MMM yyyy, HH:mm')}
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      {record.output_path && (
                        <>
                          <button
                            onClick={() => handleOpenFile(record.output_path)}
                            className="p-1.5 rounded text-surface-500 hover:text-emerald-400 hover:bg-surface-800 transition-colors"
                            title="Open Excel file"
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            onClick={() => handleReveal(record.output_path)}
                            className="p-1.5 rounded text-surface-500 hover:text-brand-400 hover:bg-surface-800 transition-colors"
                            title="Reveal in Explorer"
                          >
                            <FolderOpen size={13} />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(record.id)}
                        disabled={deleting === record.id}
                        className="p-1.5 rounded text-surface-500 hover:text-red-400 hover:bg-surface-800 transition-colors disabled:opacity-50"
                        title="Delete record (does not delete your files)"
                      >
                        {deleting === record.id ? (
                          <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 size={13} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-surface-600 mt-4">
        Deleting a history record does not delete your original PDF or the exported Excel file.
      </p>
    </div>
  )
}
