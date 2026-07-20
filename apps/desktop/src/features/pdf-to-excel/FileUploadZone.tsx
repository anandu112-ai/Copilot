import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, X, AlertCircle, CheckCircle2 } from 'lucide-react'
import { cn } from '../../utils/cn'

interface FileUploadZoneProps {
  onFileSelected: (file: File) => void
  disabled?: boolean
}

const MAX_FILE_SIZE_MB = 100

export default function FileUploadZone({ onFileSelected, disabled }: FileUploadZoneProps) {
  const [dragError, setDragError] = useState<string | null>(null)

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: unknown[]) => {
      setDragError(null)
      if (rejectedFiles && (rejectedFiles as File[]).length > 0) {
        setDragError('Please upload a valid PDF file.')
        return
      }
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0]
        if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
          setDragError(`File is too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`)
          return
        }
        onFileSelected(file)
      }
    },
    [onFileSelected]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    disabled,
  })

  const handleBrowse = async () => {
    if (!window.electronAPI) return
    const result = await window.electronAPI.openFileDialog({
      title: 'Select PDF File',
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
      properties: ['openFile'],
    })
    if (!result.canceled && result.filePaths.length > 0) {
      // Create a synthetic File-like object from path for display
      const fileName = result.filePaths[0].split(/[\\/]/).pop() || 'document.pdf'
      // We pass the path via a custom event since Electron handles file reading
      const evt = new CustomEvent('electron-file-selected', {
        detail: { path: result.filePaths[0], name: fileName },
      })
      window.dispatchEvent(evt)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div
        {...getRootProps()}
        className={cn(
          'w-full max-w-xl border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-200 cursor-pointer',
          isDragActive
            ? 'border-brand-400 bg-brand-500/10 drag-active'
            : 'border-surface-700 hover:border-surface-600 hover:bg-surface-800/50',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input {...getInputProps()} />
        <div className={cn(
          'w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center transition-colors',
          isDragActive ? 'bg-brand-500/30' : 'bg-surface-800'
        )}>
          {isDragActive ? (
            <CheckCircle2 size={28} className="text-brand-400" />
          ) : (
            <Upload size={28} className="text-surface-400" />
          )}
        </div>

        <h3 className="text-base font-semibold text-surface-200 mb-2">
          {isDragActive ? 'Drop your PDF here' : 'Upload a PDF Document'}
        </h3>
        <p className="text-sm text-surface-500 mb-6">
          Drag and drop a PDF file, or click to browse
        </p>

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleBrowse() }}
            className="btn-primary"
            disabled={disabled}
          >
            <FileText size={15} />
            Browse Files
          </button>
        </div>

        <div className="mt-6 flex items-center justify-center gap-4 text-xs text-surface-600">
          <span>PDF files only</span>
          <span>·</span>
          <span>Max {MAX_FILE_SIZE_MB}MB</span>
          <span>·</span>
          <span>Processed locally</span>
        </div>
      </div>

      {dragError && (
        <div className="mt-4 flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
          <AlertCircle size={15} />
          {dragError}
        </div>
      )}
    </div>
  )
}
