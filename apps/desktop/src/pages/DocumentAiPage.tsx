import React, { useState } from 'react'
import {
  Upload, FileSpreadsheet, FileText, CheckCircle2, AlertCircle, Loader2,
  Download, Eye, RefreshCw, ChevronRight, Check, AlertTriangle, Layers,
  Trash2, Search, Filter, HelpCircle, FileCheck, ArrowRight, ShieldCheck, Tag
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useDocumentStore } from '../stores/documentStore'
import { useAuditStore } from '../stores/auditStore'
import type { ProcessedDocument, DocumentType, DocumentStatus, ExportFormat } from '../types/document'

export default function DocumentAiPage() {
  const {
    selectedDocId,
    searchFilter,
    isProcessing,
    processingProgress,
    selectDocument,
    setSearchFilter,
    removeDocument,
    getFilteredDocuments,
    getSelectedDocument,
    getStats,
    addDocument,
    setIsProcessing,
    setProcessingProgress
  } = useDocumentStore()

  const { addFinding } = useAuditStore()
  
  const [activeTab, setActiveTab] = useState<'details' | 'items' | 'duplicates' | 'raw'>('details')
  const [dragActive, setDragActive] = useState<boolean>(false)
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('Excel')
  const [activeClient, setActiveClient] = useState('client-1')

  const filteredDocs = getFilteredDocuments()
  const selectedDoc = getSelectedDocument()
  const stats = getStats()

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUploadedFile(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUploadedFile(e.target.files[0])
    }
  }

  const handleUploadedFile = (file: File) => {
    // Generate simulated ProcessedDocument object
    const name = file.name
    const isStatement = name.toLowerCase().includes('statement') || name.toLowerCase().includes('bank')
    const isGst = name.toLowerCase().includes('gstr') || name.toLowerCase().includes('gst')
    
    let docType: DocumentType = 'Purchase Invoice'
    if (isStatement) docType = 'Bank Statement'
    else if (isGst) docType = 'GST Report'

    const sizeStr = `${(file.size / 1024).toFixed(0)} KB`

    const newDocId = `doc-${Date.now()}`
    const tempDoc: ProcessedDocument = {
      id: newDocId,
      name,
      originalName: name,
      suggestedName: `${name.split('.')[0]}_Processed_${new Date().toISOString().split('T')[0]}.xlsx`,
      size: sizeStr,
      sizeBytes: file.size,
      type: docType,
      uploadedAt: new Date().toISOString(),
      status: 'Processing',
      confidence: 0,
      pageCount: 1,
      header: {
        vendorName: 'Analyzing File Structure...',
        vendorGstin: 'Detecting...',
        vendorPan: '',
        vendorAddress: '',
        vendorState: '',
        vendorPinCode: '',
        vendorPhone: '',
        vendorEmail: '',
        customerName: '',
        customerGstin: '',
        customerAddress: '',
        customerState: '',
        invoiceNumber: 'Reading OCR...',
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        poNumber: '',
        referenceNo: '',
        placeOfSupply: '',
        reverseCharge: false,
        eWayBillNo: '',
        vehicleNo: '',
        transportMode: '',
        transportName: '',
        taxableAmount: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        cess: 0,
        discount: 0,
        freight: 0,
        roundOff: 0,
        grandTotal: 0,
        amountInWords: '',
        currency: 'INR',
        bankName: '',
        accountNo: '',
        ifscCode: '',
        branchName: ''
      },
      lineItems: [],
      metadata: {
        engine: 'AGY-OCR-v2.1',
        extractedAt: new Date().toISOString(),
        processingTimeMs: 0,
        ocrUsed: true,
        pagesProcessed: 1,
        totalCharacters: 0,
        confidence: 0,
        reviewFields: []
      },
      duplicate: { isDuplicate: false },
      tags: ['Uploaded', docType],
      clientId: activeClient,
      financialYear: '2026-27',
      validationWarnings: []
    }

    addDocument(tempDoc)
    selectDocument(newDocId)
    setIsProcessing(true)
    setProcessingProgress(20)

    toast.success('Document uploaded. Running local layout parsing & OCR...')

    // Simulate pipeline stages
    setTimeout(() => setProcessingProgress(50), 1000)
    setTimeout(() => setProcessingProgress(80), 2000)
    setTimeout(() => {
      // Completed structure
      const isReviewNeeded = name.toLowerCase().includes('review') || Math.random() > 0.6
      const confidence = isReviewNeeded ? 82 : 97
      
      const finishedHeader = {
        vendorName: docType === 'Bank Statement' ? 'State Bank of India' : 'TechVibe Solution Hub',
        vendorGstin: docType === 'Bank Statement' ? '' : '27DDDCB4829E1Z8',
        vendorPan: docType === 'Bank Statement' ? '' : 'DDDCB4829E',
        vendorAddress: 'Building 4B, Sector 3, Pune 411014',
        vendorState: 'Maharashtra',
        vendorPinCode: '411014',
        vendorPhone: '+91-20-44910281',
        vendorEmail: 'billing@techvibe.in',
        customerName: 'Om Packaging Industries',
        customerGstin: '27AABCO5512N1Z4',
        customerAddress: 'Bhiwandi, Maharashtra',
        customerState: 'Maharashtra',
        invoiceNumber: docType === 'Bank Statement' ? '' : 'TVS-2026-9921',
        invoiceDate: '2026-07-20',
        dueDate: '2026-08-19',
        poNumber: 'PO-2026-9811',
        referenceNo: '',
        placeOfSupply: 'Maharashtra (27)',
        reverseCharge: false,
        eWayBillNo: '',
        vehicleNo: '',
        transportMode: '',
        transportName: '',
        taxableAmount: 18000.00,
        cgst: 1620.00,
        sgst: 1620.00,
        igst: 0.00,
        cess: 0,
        discount: 0,
        freight: 0,
        roundOff: 0,
        grandTotal: 21240.00,
        amountInWords: 'Twenty One Thousand Two Hundred and Forty Only',
        currency: 'INR',
        bankName: 'ICICI Bank Ltd',
        accountNo: '****99281',
        ifscCode: 'ICIC0000102',
        branchName: 'Kalyani Nagar Branch'
      }

      const warnings = isReviewNeeded 
        ? ['Validation Warning: Verify matching vendor GSTIN records. Place of supply matches billing address.'] 
        : []

      const items = docType === 'Bank Statement' ? [] : [
        { id: '1', serialNo: '1', description: 'Cloud App Engine Resource SLA Hosting', hsn: '9983', uom: 'NOS', quantity: 1, rate: 10000, taxableValue: 10000, discount: 0, gstRate: 18, cgst: 900, sgst: 900, igst: 0, cess: 0, total: 11800 },
        { id: '2', serialNo: '2', description: 'Database Cluster Replication Support', hsn: '9983', uom: 'NOS', quantity: 1, rate: 8000, taxableValue: 8000, discount: 0, gstRate: 18, cgst: 720, sgst: 720, igst: 0, cess: 0, total: 9440 }
      ]

      useDocumentStore.getState().updateDocument(newDocId, {
        status: isReviewNeeded ? 'Requires Review' : 'Completed',
        confidence,
        header: finishedHeader,
        lineItems: items,
        validationWarnings: warnings,
        duplicate: {
          isDuplicate: name.toLowerCase().includes('dup'),
          duplicateReason: name.toLowerCase().includes('dup') ? 'Exact amount & vendor name matches INV-441028' : undefined,
          duplicateScore: name.toLowerCase().includes('dup') ? 95 : 0
        },
        metadata: {
          engine: 'AGY-OCR-v2.1',
          extractedAt: new Date().toISOString(),
          processingTimeMs: 3410,
          ocrUsed: docType === 'Bank Statement',
          pagesProcessed: 1,
          totalCharacters: 2100,
          confidence,
          reviewFields: isReviewNeeded ? ['vendorGstin'] : []
        }
      })

      // Add to audit findings if there is a warning or duplicate
      if (name.toLowerCase().includes('dup') || isReviewNeeded) {
        addFinding({
          id: `find-new-${Date.now()}`,
          title: name.toLowerCase().includes('dup') ? 'Duplicate Purchase Booking Alert' : 'Vendor Registration Mismatch',
          category: name.toLowerCase().includes('dup') ? 'Duplicate Entry' : 'GST Mismatch',
          severity: 'High',
          status: 'Open',
          description: name.toLowerCase().includes('dup')
            ? `Duplicate purchase invoice ${name} has been uploaded. Risk of duplicate tax claim.`
            : `Mismatched vendor verification parameters on invoice ${name}. GSTIN is not active on portal.`,
          evidence: [`Uploaded document: ${name}`, `Taxable Value: ₹18,000.00`],
          recommendedAction: 'Verify transaction records and delete if duplicate.',
          potentialImpact: 'Loss of GST refund due to wrong filing parameters',
          impactAmount: 3240,
          affectedDocuments: [newDocId],
          client: 'Om Packaging Industries',
          clientId: 'client-3',
          detectedAt: new Date().toISOString(),
          notes: '',
          riskScore: 82
        })
      }

      setIsProcessing(false)
      setProcessingProgress(0)
      toast.success(`OCR Ingestion completed for ${name}!`)
    }, 3000)
  }

  const triggerExport = () => {
    if (!selectedDoc) return
    toast.success(`Generating CA-Ready workbook in ${selectedFormat} format... Saved!`)
  }

  return (
    <div className="page-container flex flex-col h-[calc(100vh-var(--topbar-height))] p-0">
      
      {/* Top statistics toolbar */}
      <div className="bg-surface-900 border-b border-surface-700 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Layers size={18} className="text-brand-500" />
          <h2 className="text-sm font-black text-surface-100 uppercase tracking-wider">Document AI Hub</h2>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="text-[10px] text-surface-500 uppercase font-semibold">Total Documents</span>
            <p className="text-sm font-bold text-surface-200">{stats.total}</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-emerald-500 uppercase font-semibold">Verified (100% OK)</span>
            <p className="text-sm font-bold text-emerald-400">{stats.completed}</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-amber-500 uppercase font-semibold">Requires Review</span>
            <p className="text-sm font-bold text-amber-400">{stats.requiresReview}</p>
          </div>
        </div>
      </div>

      {/* Main split workarea */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left column: Upload & Document Queue */}
        <div className="w-[340px] border-r border-surface-700 flex flex-col bg-surface-900/30">
          
          {/* Drag and Drop Zone */}
          <div className="p-4 border-b border-surface-700">
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed p-4 rounded-xl text-center cursor-pointer transition-all ${
                dragActive ? 'border-brand-500 bg-brand-500/5' : 'border-surface-700 hover:border-surface-600 bg-surface-900'
              }`}
            >
              <input
                type="file"
                id="file-selector"
                className="hidden"
                onChange={handleFileSelect}
                accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg"
              />
              <label htmlFor="file-selector" className="cursor-pointer flex flex-col items-center">
                <Upload size={20} className="text-brand-500 mb-2 animate-bounce" />
                <span className="text-xs font-semibold text-surface-200">Drag & drop local files</span>
                <span className="text-[9px] text-surface-500 mt-1">PDF, Excel, Images, CSV, ZIP</span>
              </label>
            </div>
          </div>

          {/* Queue Filters */}
          <div className="px-3 py-2 border-b border-surface-700 bg-surface-900/40 flex items-center justify-between gap-1.5">
            <div className="relative flex-1">
              <Search size={12} className="absolute left-2 top-2 text-surface-500" />
              <input
                type="text"
                placeholder="Search queue..."
                value={searchFilter.query}
                onChange={(e) => setSearchFilter({ query: e.target.value })}
                className="w-full bg-surface-950 text-[11px] rounded pl-7 pr-2 py-1 outline-none text-surface-300 border border-surface-800"
              />
            </div>
            
            <select
              value={searchFilter.status}
              onChange={(e) => setSearchFilter({ status: e.target.value as any })}
              className="bg-surface-950 text-[10px] text-surface-300 border border-surface-850 rounded px-1.5 py-1 outline-none font-semibold"
            >
              <option value="All">All Status</option>
              <option value="Completed">Verified</option>
              <option value="Requires Review">Needs Review</option>
            </select>
          </div>

          {/* Document list */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {filteredDocs.map((doc) => {
              const isSelected = doc.id === selectedDocId
              return (
                <div
                  key={doc.id}
                  onClick={() => selectDocument(doc.id)}
                  className={`p-3 rounded-lg border text-left cursor-pointer transition-all flex items-start gap-2.5 ${
                    isSelected
                      ? 'bg-brand-500/10 border-brand-500/30 text-surface-100 shadow-sm'
                      : 'bg-surface-900 border-surface-800 hover:border-surface-700 text-surface-300'
                  }`}
                >
                  <div className={`p-2 rounded mt-0.5 ${
                    doc.type === 'Bank Statement' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-brand-500/10 text-brand-400'
                  }`}>
                    {doc.type === 'Bank Statement' ? <FileSpreadsheet size={14} /> : <FileText size={14} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold truncate text-surface-200">{doc.name}</p>
                    <div className="flex items-center gap-1.5 mt-1 text-[9px] text-surface-500">
                      <span>{doc.size}</span>
                      <span>•</span>
                      <span>{doc.type}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    {doc.status === 'Completed' ? (
                      <span className="badge badge-success px-1.5 py-0.2 text-[8px] font-bold">OK</span>
                    ) : doc.status === 'Requires Review' ? (
                      <span className="badge badge-warning px-1.5 py-0.2 text-[8px] font-bold">Review</span>
                    ) : (
                      <span className="badge bg-brand-500/15 text-brand-400 border border-brand-500/20 px-1.5 py-0.2 text-[8px] flex items-center gap-1">
                        <Loader2 size={8} className="animate-spin" /> OCR
                      </span>
                    )}
                    <span className="text-[8px] text-emerald-400 font-bold font-mono bg-emerald-500/5 px-1 rounded">
                      {doc.confidence}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right column: Document Details Preview & Audit Warnings */}
        <div className="flex-1 flex flex-col overflow-hidden bg-surface-950/20">
          
          {selectedDoc ? (
            <>
              {/* Preview Header toolbar */}
              <div className="px-6 py-3 border-b border-surface-700 bg-surface-900/40 flex items-center justify-between flex-shrink-0">
                <div className="min-w-0">
                  <h3 className="text-xs font-bold text-surface-200 truncate">{selectedDoc.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-surface-500">Suggested Name:</span>
                    <span className="text-[10px] font-mono text-brand-400 bg-brand-500/5 px-1.5 py-0.5 rounded border border-brand-500/10 flex items-center gap-1">
                      <FileCheck size={10} /> {selectedDoc.suggestedName}
                    </span>
                  </div>
                </div>

                {/* Exporter Controls */}
                <div className="flex items-center gap-2">
                  <select
                    value={selectedFormat}
                    onChange={(e) => setSelectedFormat(e.target.value as ExportFormat)}
                    className="bg-surface-900 border border-surface-700 text-xs text-surface-300 rounded px-2 py-1 outline-none"
                  >
                    <option value="Excel">Excel (.xlsx)</option>
                    <option value="CSV">CSV (.csv)</option>
                    <option value="JSON">JSON (.json)</option>
                    <option value="PDF">Report PDF (.pdf)</option>
                  </select>
                  <button
                    onClick={triggerExport}
                    className="btn-primary py-1 px-3 text-xs gap-1.5 shadow"
                  >
                    <Download size={13} /> Save Workbook
                  </button>
                  <button
                    onClick={() => removeDocument(selectedDoc.id)}
                    className="btn-secondary py-1 px-2 text-xs border border-surface-700 hover:text-red-400"
                    title="Delete document"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Side-by-side processing preview path */}
              <div className="px-6 py-2 bg-surface-900/60 border-b border-surface-700 flex items-center gap-4 text-[10px] text-surface-400 flex-shrink-0">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                  <span>Original Ingested ({selectedDoc.size})</span>
                </div>
                <ArrowRight size={10} className="text-surface-650" />
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  <span>NLP Structural Extraction</span>
                </div>
                <ArrowRight size={10} className="text-surface-650" />
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>CA Excel Formatter</span>
                </div>
              </div>

              {/* Content Panel tabs */}
              <div className="px-6 border-b border-surface-700 bg-surface-900/20 flex flex-shrink-0">
                {[
                  { id: 'details', label: 'Document Header' },
                  { id: 'items', label: selectedDoc.type === 'Bank Statement' ? 'Bank Ledger' : 'Line Items' },
                  { id: 'duplicates', label: 'Duplicate Verification' },
                  { id: 'raw', label: 'Raw Extracted JSON' }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id as any)}
                    className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
                      activeTab === t.id
                        ? 'border-brand-500 text-brand-400'
                        : 'border-transparent text-surface-500 hover:text-surface-300'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Panel Views */}
              <div className="flex-1 overflow-y-auto p-6 text-left">
                
                {/* Active Tab: Details */}
                {activeTab === 'details' && (
                  <div className="space-y-5">
                    {/* Compliance/Verification Warnings Panel */}
                    {selectedDoc.validationWarnings.length > 0 && (
                      <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl p-4 flex gap-3 items-start">
                        <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-bold">Verification & Audit Issues Flagged:</p>
                          <ul className="list-disc list-inside text-[11px] mt-1 space-y-1 text-amber-500/80">
                            {selectedDoc.validationWarnings.map((w, idx) => (
                              <li key={idx}>{w}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Meta/Identification fields */}
                    <div className="grid grid-cols-3 gap-4">
                      {/* Vendor name */}
                      <div className="bg-surface-900/40 border border-surface-800 rounded-lg p-3">
                        <label className="text-[9px] text-surface-500 uppercase tracking-wider font-bold block">Vendor / Organization</label>
                        <input
                          type="text"
                          value={selectedDoc.header.vendorName}
                          onChange={(e) => {
                            useDocumentStore.getState().updateDocument(selectedDoc.id, {
                              header: { ...selectedDoc.header, vendorName: e.target.value }
                            })
                          }}
                          className="bg-transparent border-none text-xs text-surface-200 font-semibold w-full mt-1 p-0 focus:ring-0"
                        />
                      </div>

                      {/* GSTIN */}
                      <div className="bg-surface-900/40 border border-surface-800 rounded-lg p-3">
                        <label className="text-[9px] text-surface-500 uppercase tracking-wider font-bold block">Vendor GSTIN</label>
                        <input
                          type="text"
                          value={selectedDoc.header.vendorGstin}
                          onChange={(e) => {
                            useDocumentStore.getState().updateDocument(selectedDoc.id, {
                              header: { ...selectedDoc.header, vendorGstin: e.target.value }
                            })
                          }}
                          className="bg-transparent border-none text-xs font-mono text-surface-200 w-full mt-1 p-0 focus:ring-0"
                        />
                      </div>

                      {/* Document Type select */}
                      <div className="bg-surface-900/40 border border-surface-800 rounded-lg p-3">
                        <label className="text-[9px] text-surface-500 uppercase tracking-wider font-bold block">Invoice / Receipt Type</label>
                        <select
                          value={selectedDoc.type}
                          onChange={(e) => {
                            useDocumentStore.getState().updateDocument(selectedDoc.id, {
                              type: e.target.value as DocumentType
                            })
                          }}
                          className="bg-transparent border-none text-xs text-surface-200 font-semibold w-full mt-1 p-0 focus:ring-0 outline-none"
                        >
                          <option value="Purchase Invoice">Purchase Invoice</option>
                          <option value="Sales Invoice">Sales Invoice</option>
                          <option value="Bank Statement">Bank Statement</option>
                          <option value="GST Report">GST Report</option>
                          <option value="Expense Bill">Expense Bill</option>
                        </select>
                      </div>

                      {/* Invoice number */}
                      {selectedDoc.type !== 'Bank Statement' && (
                        <>
                          <div className="bg-surface-900/40 border border-surface-800 rounded-lg p-3">
                            <label className="text-[9px] text-surface-500 uppercase tracking-wider font-bold block">Invoice Reference No</label>
                            <input
                              type="text"
                              value={selectedDoc.header.invoiceNumber}
                              onChange={(e) => {
                                useDocumentStore.getState().updateDocument(selectedDoc.id, {
                                  header: { ...selectedDoc.header, invoiceNumber: e.target.value }
                                })
                              }}
                              className="bg-transparent border-none text-xs font-mono text-surface-200 w-full mt-1 p-0 focus:ring-0"
                            />
                          </div>

                          {/* Invoice Date */}
                          <div className="bg-surface-900/40 border border-surface-800 rounded-lg p-3">
                            <label className="text-[9px] text-surface-500 uppercase tracking-wider font-bold block">Invoice Date</label>
                            <input
                              type="date"
                              value={selectedDoc.header.invoiceDate}
                              onChange={(e) => {
                                useDocumentStore.getState().updateDocument(selectedDoc.id, {
                                  header: { ...selectedDoc.header, invoiceDate: e.target.value }
                                })
                              }}
                              className="bg-transparent border-none text-xs text-surface-200 w-full mt-1 p-0 focus:ring-0 outline-none"
                            />
                          </div>

                          {/* Place of supply */}
                          <div className="bg-surface-900/40 border border-surface-800 rounded-lg p-3">
                            <label className="text-[9px] text-surface-500 uppercase tracking-wider font-bold block">Place of Supply</label>
                            <input
                              type="text"
                              value={selectedDoc.header.placeOfSupply}
                              onChange={(e) => {
                                useDocumentStore.getState().updateDocument(selectedDoc.id, {
                                  header: { ...selectedDoc.header, placeOfSupply: e.target.value }
                                })
                              }}
                              className="bg-transparent border-none text-xs text-surface-200 w-full mt-1 p-0 focus:ring-0"
                            />
                          </div>
                        </>
                      )}
                    </div>

                    {/* Financial details row */}
                    {selectedDoc.type !== 'Bank Statement' && (
                      <div className="border-t border-surface-800 pt-5">
                        <h4 className="text-xs font-black text-surface-300 uppercase tracking-wider mb-3">Extracted Tax Details</h4>
                        <div className="grid grid-cols-4 gap-3 bg-surface-900 p-4 rounded-xl border border-surface-800">
                          <div>
                            <span className="text-[10px] text-surface-500 block">Taxable Subtotal</span>
                            <p className="text-sm font-bold text-surface-200 mt-1">₹{selectedDoc.header.taxableAmount.toLocaleString('en-IN')}</p>
                          </div>
                          <div>
                            <span className="text-[10px] text-surface-500 block">CGST</span>
                            <p className="text-sm font-medium text-surface-300 mt-1">₹{selectedDoc.header.cgst.toLocaleString('en-IN')}</p>
                          </div>
                          <div>
                            <span className="text-[10px] text-surface-500 block">SGST</span>
                            <p className="text-sm font-medium text-surface-300 mt-1">₹{selectedDoc.header.sgst.toLocaleString('en-IN')}</p>
                          </div>
                          <div>
                            <span className="text-[10px] text-surface-500 block">IGST</span>
                            <p className="text-sm font-medium text-surface-300 mt-1">₹{selectedDoc.header.igst.toLocaleString('en-IN')}</p>
                          </div>
                          
                          <div className="col-span-4 border-t border-surface-800 pt-3 flex justify-between items-center mt-2">
                            <div className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                              <ShieldCheck size={12} /> Math computation verified
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-brand-400 font-bold uppercase tracking-wider block">Total Amount (INR)</span>
                              <p className="text-lg font-black text-brand-500 mt-0.5">₹{selectedDoc.header.grandTotal.toLocaleString('en-IN')}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Bank statement specific card */}
                    {selectedDoc.type === 'Bank Statement' && (
                      <div className="border-t border-surface-800 pt-4 grid grid-cols-4 gap-4">
                        <div className="bg-surface-900 border border-surface-800 p-3 rounded-lg">
                          <label className="text-[9px] text-surface-500 uppercase tracking-wider font-bold">Bank Name</label>
                          <p className="text-xs font-bold text-surface-200 mt-1">{selectedDoc.header.bankName}</p>
                        </div>
                        <div className="bg-surface-900 border border-surface-800 p-3 rounded-lg">
                          <label className="text-[9px] text-surface-500 uppercase tracking-wider font-bold">Account Number</label>
                          <p className="text-xs font-mono text-surface-200 mt-1">{selectedDoc.header.accountNo}</p>
                        </div>
                        <div className="bg-surface-900 border border-surface-800 p-3 rounded-lg">
                          <label className="text-[9px] text-surface-500 uppercase tracking-wider font-bold">Opening Balance</label>
                          <p className="text-xs font-bold text-emerald-400 mt-1">₹{selectedDoc.header.openingBalance?.toLocaleString('en-IN')}</p>
                        </div>
                        <div className="bg-surface-900 border border-surface-800 p-3 rounded-lg">
                          <label className="text-[9px] text-surface-500 uppercase tracking-wider font-bold">Closing Balance</label>
                          <p className="text-xs font-bold text-brand-400 mt-1">₹{selectedDoc.header.closingBalance?.toLocaleString('en-IN')}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Active Tab: Line Items / Ledger */}
                {activeTab === 'items' && (
                  <div className="table-wrapper border border-surface-800 rounded-xl bg-surface-900/30">
                    {selectedDoc.type === 'Bank Statement' && selectedDoc.bankTransactions ? (
                      <table className="w-full">
                        <thead>
                          <tr className="bg-surface-900 border-b border-surface-800">
                            <th className="p-3 text-[10px] text-surface-450 font-bold">Date</th>
                            <th className="p-3 text-[10px] text-surface-450 font-bold">Narration</th>
                            <th className="p-3 text-[10px] text-surface-450 font-bold">Reference / UTR</th>
                            <th className="p-3 text-[10px] text-surface-450 font-bold text-right">Debit (Dr)</th>
                            <th className="p-3 text-[10px] text-surface-450 font-bold text-right">Credit (Cr)</th>
                            <th className="p-3 text-[10px] text-surface-450 font-bold text-right">Balance</th>
                            <th className="p-3 text-[10px] text-surface-450 font-bold text-center">Category</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedDoc.bankTransactions.map(txn => (
                            <tr key={txn.id} className="border-b border-surface-800/50 hover:bg-surface-800/20">
                              <td className="p-3 text-xs text-surface-300">{txn.date}</td>
                              <td className="p-3 text-xs text-surface-200">{txn.narration}</td>
                              <td className="p-3 text-xs text-surface-400 font-mono">{txn.referenceNo || txn.utr}</td>
                              <td className="p-3 text-xs text-right text-red-400 font-mono">
                                {txn.debit > 0 ? `₹${txn.debit.toLocaleString('en-IN')}` : '-'}
                              </td>
                              <td className="p-3 text-xs text-right text-emerald-400 font-mono">
                                {txn.credit > 0 ? `₹${txn.credit.toLocaleString('en-IN')}` : '-'}
                              </td>
                              <td className="p-3 text-xs text-right text-surface-200 font-mono">₹{txn.balance.toLocaleString('en-IN')}</td>
                              <td className="p-3 text-xs text-center">
                                <span className="bg-surface-800 border border-surface-750 px-2 py-0.5 rounded text-[10px] text-surface-300">
                                  {txn.category}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <table className="w-full">
                        <thead>
                          <tr className="bg-surface-900 border-b border-surface-800">
                            <th className="p-3 text-[10px] text-surface-450 font-bold">No</th>
                            <th className="p-3 text-[10px] text-surface-450 font-bold">Description</th>
                            <th className="p-3 text-[10px] text-surface-450 font-bold">HSN</th>
                            <th className="p-3 text-[10px] text-surface-450 font-bold text-right">Qty</th>
                            <th className="p-3 text-[10px] text-surface-450 font-bold text-right">Rate</th>
                            <th className="p-3 text-[10px] text-surface-450 font-bold text-right">Taxable</th>
                            <th className="p-3 text-[10px] text-surface-450 font-bold text-center">GST %</th>
                            <th className="p-3 text-[10px] text-surface-450 font-bold text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedDoc.lineItems.length > 0 ? (
                            selectedDoc.lineItems.map(item => (
                              <tr key={item.id} className="border-b border-surface-800/50 hover:bg-surface-800/20">
                                <td className="p-3 text-xs text-surface-400 font-mono">{item.serialNo}</td>
                                <td className="p-3 text-xs text-surface-200 max-w-[320px] truncate">{item.description}</td>
                                <td className="p-3 text-xs font-mono text-surface-400">{item.hsn}</td>
                                <td className="p-3 text-xs text-right text-surface-300 font-mono">{item.quantity}</td>
                                <td className="p-3 text-xs text-right text-surface-300 font-mono">₹{item.rate.toLocaleString('en-IN')}</td>
                                <td className="p-3 text-xs text-right text-surface-200 font-mono">₹{item.taxableValue.toLocaleString('en-IN')}</td>
                                <td className="p-3 text-xs text-center font-mono text-surface-400">{item.gstRate}%</td>
                                <td className="p-3 text-xs text-right text-surface-100 font-bold font-mono">₹{item.total.toLocaleString('en-IN')}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={8} className="text-center p-8 text-xs text-surface-500">
                                No line items extracted for this document.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* Active Tab: Duplicate Verification */}
                {activeTab === 'duplicates' && (
                  <div className="space-y-4">
                    <div className="bg-surface-900/60 p-4 rounded-xl border border-surface-800">
                      <h4 className="text-xs font-bold text-surface-300 flex items-center gap-1.5">
                        <ShieldCheck size={14} className="text-brand-500" />
                        AI Cross-Document Duplicate Checker
                      </h4>
                      <p className="text-[11px] text-surface-500 mt-1">
                        CA Copilot matches document references, vendors, and line item breakdowns to detect accounting duplication or potential fraud.
                      </p>
                    </div>

                    {selectedDoc.duplicate.isDuplicate ? (
                      <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl">
                        <div className="flex gap-3 items-start">
                          <AlertTriangle size={18} className="flex-shrink-0 mt-0.5 text-red-500" />
                          <div>
                            <p className="text-xs font-bold">Duplicate Alert raised! Confidence Match: {selectedDoc.duplicate.duplicateScore}%</p>
                            <p className="text-[11px] text-red-400/80 mt-1 leading-relaxed">
                              {selectedDoc.duplicate.duplicateReason || 'This invoice has identical attributes to a previously booked voucher.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl flex items-center gap-3">
                        <CheckCircle2 size={16} />
                        <span className="text-xs font-bold">No duplicate transactions or overlapping invoices detected for this document.</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Active Tab: Raw Output */}
                {activeTab === 'raw' && (
                  <div className="bg-surface-900 rounded-xl p-4 border border-surface-800 max-h-[360px] overflow-y-auto">
                    <pre className="text-[10px] font-mono text-brand-400 leading-relaxed whitespace-pre-wrap">
                      {JSON.stringify({
                        documentId: selectedDoc.id,
                        originalName: selectedDoc.originalName,
                        suggestedFilename: selectedDoc.suggestedName,
                        documentType: selectedDoc.type,
                        confidenceScore: selectedDoc.confidence,
                        header: selectedDoc.header,
                        lineItems: selectedDoc.lineItems,
                        bankTransactions: selectedDoc.bankTransactions,
                        metadata: selectedDoc.metadata
                      }, null, 2)}
                    </pre>
                  </div>
                )}

              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-surface-500">
              <Layers size={30} className="mb-2" />
              <p className="text-sm">Select a document from the queue to start review</p>
            </div>
          )}
        </div>

      </div>

      {/* Local OCR Pipeline Status overlay */}
      {isProcessing && (
        <div className="absolute inset-0 bg-surface-950/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-surface-900 border border-surface-800 p-6 rounded-2xl max-w-sm w-full text-center space-y-4 shadow-xl">
            <Loader2 size={30} className="text-brand-500 animate-spin mx-auto" />
            <div>
              <p className="text-sm font-bold text-surface-200">Local OCR & Structuring Engine</p>
              <p className="text-xs text-surface-500 mt-1">Executing layout parser & checking tax computation bounds...</p>
            </div>
            
            <div className="progress-bar w-full">
              <div className="progress-fill" style={{ width: `${processingProgress}%` }} />
            </div>
            <span className="text-[10px] font-mono text-brand-400 font-semibold">{processingProgress}% Processing</span>
          </div>
        </div>
      )}

    </div>
  )
}
