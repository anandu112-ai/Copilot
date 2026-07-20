import { useState, useCallback, useEffect, useRef } from 'react'
import { FileSpreadsheet, ArrowLeft, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import toast from 'react-hot-toast'

import FileUploadZone from '../features/pdf-to-excel/FileUploadZone'
import DocumentTypeSelector from '../features/pdf-to-excel/DocumentTypeSelector'
import ProcessingProgress from '../features/pdf-to-excel/ProcessingProgress'
import EditablePreview from '../features/pdf-to-excel/EditablePreview'
import { processorApi } from '../services/processorApi'
import { useSettingsStore } from '../stores/settingsStore'
import type { DocumentType, ExtractionResult, InvoiceHeader, LineItem } from '../types'

type Stage = 'upload' | 'select-type' | 'processing' | 'preview'

interface ProcessingStage {
  label: string
  status: 'pending' | 'active' | 'done'
}

const PROCESSING_STAGES = [
  'Validating file',
  'Inspecting document',
  'Extracting text',
  'Detecting tables',
  'Parsing fields',
  'Structuring data',
  'Preparing preview',
]

export default function PdfToExcelPage() {
  const navigate = useNavigate()
  const { ocrEnabled, defaultExportFolder } = useSettingsStore()

  const [stage, setStage] = useState<Stage>('upload')
  const [selectedFile, setSelectedFile] = useState<{ name: string; path: string } | null>(null)
  const [documentType, setDocumentType] = useState<DocumentType | null>(null)
  const [processingStages, setProcessingStages] = useState<ProcessingStage[]>(
    PROCESSING_STAGES.map((label) => ({ label, status: 'pending' as const }))
  )
  const [result, setResult] = useState<ExtractionResult | null>(null)
  const [originalResult, setOriginalResult] = useState<ExtractionResult | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const startTimeRef = useRef<number>(0)

  // Listen for Electron native file selection
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { path: string; name: string }
      setSelectedFile({ name: detail.name, path: detail.path })
      setStage('select-type')
    }
    window.addEventListener('electron-file-selected', handler)
    return () => window.removeEventListener('electron-file-selected', handler)
  }, [])

  const handleFileSelected = useCallback((file: File) => {
    // For drag-and-drop (web path), we use the file object
    // In Electron, the file.path property is available
    const path = (file as unknown as { path?: string }).path || file.name
    setSelectedFile({ name: file.name, path })
    setStage('select-type')
  }, [])

  const handleDocumentTypeSelected = async (type: DocumentType) => {
    setDocumentType(type)
    setStage('processing')
    setError(null)
    startTimeRef.current = Date.now()

    // Animate stages
    const stages = [...processingStages]
    const updateStages = (index: number) => {
      setProcessingStages((prev) =>
        prev.map((s, i) =>
          i < index ? { ...s, status: 'done' } :
          i === index ? { ...s, status: 'active' } :
          s
        )
      )
    }

    try {
      updateStages(0)
      await new Promise(r => setTimeout(r, 300))
      updateStages(1)
      await new Promise(r => setTimeout(r, 300))
      updateStages(2)

      const extractionResult = await processorApi.extractPdf(
        selectedFile!.path,
        type,
        ocrEnabled,
        (stageLabel) => {
          const idx = PROCESSING_STAGES.findIndex(s => s.toLowerCase().includes(stageLabel.toLowerCase()))
          if (idx >= 0) updateStages(idx)
        }
      )

      updateStages(6)
      await new Promise(r => setTimeout(r, 300))

      setProcessingStages(PROCESSING_STAGES.map(label => ({ label, status: 'done' })))
      setResult(extractionResult)
      setOriginalResult(JSON.parse(JSON.stringify(extractionResult)))
      setStage('preview')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message :
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Processing failed. Please check the file and try again.'
      setError(message)
      setStage('upload')
      setProcessingStages(PROCESSING_STAGES.map(label => ({ label, status: 'pending' })))
      toast.error(message)
    }
  }

  const handleHeaderChange = (field: keyof InvoiceHeader, value: string) => {
    if (!result) return
    setResult({ ...result, header: { ...result.header, [field]: value } })
  }

  const handleLineItemChange = (id: string, field: keyof LineItem, value: string) => {
    if (!result) return
    setResult({
      ...result,
      lineItems: result.lineItems.map(item => item.id === id ? { ...item, [field]: value } : item),
    })
  }

  const handleAddLineItem = () => {
    if (!result) return
    const newItem: LineItem = {
      id: uuidv4(),
      srNo: String(result.lineItems.length + 1),
      description: '',
      hsnSac: '',
      quantity: '',
      unit: '',
      rate: '',
      discount: '',
      taxableValue: '',
      cgstRate: '',
      cgstAmount: '',
      sgstRate: '',
      sgstAmount: '',
      igstRate: '',
      igstAmount: '',
      cess: '',
      total: '',
    }
    setResult({ ...result, lineItems: [...result.lineItems, newItem] })
  }

  const handleDeleteLineItem = (id: string) => {
    if (!result) return
    setResult({ ...result, lineItems: result.lineItems.filter(item => item.id !== id) })
  }

  const handleReset = () => {
    if (!originalResult) return
    setResult(JSON.parse(JSON.stringify(originalResult)))
    toast.success('Reset to extracted data')
  }

  const handleExport = async () => {
    if (!result || !selectedFile) return
    setIsExporting(true)

    try {
      // Determine default file name
      const baseName = selectedFile.name.replace(/\.pdf$/i, '')
      const defaultFileName = `${baseName}_converted.xlsx`

      let savePath: string | undefined

      if (window.electronAPI) {
        const saveResult = await window.electronAPI.saveFileDialog({
          title: 'Save Excel File',
          defaultPath: defaultExportFolder
            ? `${defaultExportFolder}\\${defaultFileName}`
            : defaultFileName,
          filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }],
        })
        if (saveResult.canceled || !saveResult.filePath) {
          setIsExporting(false)
          return
        }
        savePath = saveResult.filePath
      } else {
        savePath = defaultFileName
      }

      const exportResult = await processorApi.generateExcel(result, savePath, documentType!)

      if (!exportResult.success) {
        throw new Error(exportResult.error || 'Excel generation failed')
      }

      // Save to history
      const duration = Date.now() - startTimeRef.current
      if (window.electronAPI) {
        await window.electronAPI.db.insertConversion({
          id: uuidv4(),
          originalFileName: selectedFile.name,
          originalFilePath: selectedFile.path,
          documentType: documentType!,
          status: result.warnings.some(w => w.severity === 'error') ? 'partial' : 'success',
          outputPath: savePath,
          warnings: result.warnings.map(w => w.message),
          processingDurationMs: duration,
          pageCount: result.pageCount,
        })
      }

      toast.success('Excel file saved successfully!')

      // Offer to open the file
      if (window.electronAPI) {
        setTimeout(async () => {
          await window.electronAPI.openFile(savePath!)
        }, 500)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Export failed'
      toast.error(msg)
    } finally {
      setIsExporting(false)
    }
  }

  const handleStartOver = () => {
    setStage('upload')
    setSelectedFile(null)
    setDocumentType(null)
    setResult(null)
    setOriginalResult(null)
    setError(null)
    setProcessingStages(PROCESSING_STAGES.map(label => ({ label, status: 'pending' })))
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-surface-800 bg-surface-900/50 flex-shrink-0">
        <div className="flex items-center gap-3">
          {stage !== 'upload' && (
            <button
              onClick={stage === 'preview' ? handleStartOver : () => setStage('upload')}
              className="btn-ghost p-2 text-xs"
            >
              <ArrowLeft size={15} />
            </button>
          )}
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-emerald-400" />
            <div>
              <h2 className="text-sm font-semibold text-surface-100">PDF to Excel Converter</h2>
              {selectedFile && (
                <p className="text-xs text-surface-500 truncate max-w-sm">{selectedFile.name}</p>
              )}
            </div>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {(['upload', 'select-type', 'processing', 'preview'] as Stage[]).map((s, i) => (
            <div key={s} className="flex items-center gap-1.5">
              <div className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-medium transition-colors ${
                stage === s ? 'bg-brand-600 text-white' :
                (['preview', 'processing'].indexOf(stage) > ['upload', 'select-type', 'processing', 'preview'].indexOf(s))
                  ? 'bg-emerald-600 text-white' :
                  'bg-surface-800 text-surface-500'
              }`}>
                {i + 1}
              </div>
              {i < 3 && <div className="w-8 h-0.5 bg-surface-800" />}
            </div>
          ))}
        </div>

        {stage !== 'upload' && (
          <button onClick={handleStartOver} className="btn-ghost text-xs gap-1.5">
            <X size={13} />
            Start Over
          </button>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2 text-sm text-red-300">
          <X size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden px-6 py-6">
        {stage === 'upload' && (
          <FileUploadZone onFileSelected={handleFileSelected} />
        )}

        {stage === 'select-type' && (
          <DocumentTypeSelector
            fileName={selectedFile?.name || ''}
            onSelect={handleDocumentTypeSelected}
            onClose={() => setStage('upload')}
          />
        )}

        {stage === 'processing' && (
          <ProcessingProgress
            stages={processingStages}
            fileName={selectedFile?.name || ''}
            documentType={documentType || ''}
          />
        )}

        {stage === 'preview' && result && (
          <EditablePreview
            result={result}
            originalResult={originalResult!}
            onHeaderChange={handleHeaderChange}
            onLineItemChange={handleLineItemChange}
            onAddLineItem={handleAddLineItem}
            onDeleteLineItem={handleDeleteLineItem}
            onReset={handleReset}
            onExport={handleExport}
            isExporting={isExporting}
          />
        )}
      </div>
    </div>
  )
}
