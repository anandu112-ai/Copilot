import { create } from 'zustand'
import type {
  ProcessedDocument, BatchJob, SearchFilter, DocumentType, DocumentStatus
} from '../types/document'

// ─── Rich Mock Data ───────────────────────────────────────────────────────────

const mockDocuments: ProcessedDocument[] = [
  {
    id: 'doc-1',
    name: 'INV-2026-8941_Apex_Steel.pdf',
    originalName: 'INV-2026-8941_Apex_Steel.pdf',
    suggestedName: 'Apex_Steel_Industries_INV-2026-8941_2026-07-15.xlsx',
    size: '342 KB',
    sizeBytes: 350208,
    type: 'Purchase Invoice',
    uploadedAt: '2026-07-20T10:30:00Z',
    processedAt: '2026-07-20T10:30:05Z',
    status: 'Completed',
    confidence: 98,
    pageCount: 2,
    header: {
      vendorName: 'Apex Steel Industries Pvt Ltd',
      vendorGstin: '27AAACA9928R1Z5',
      vendorPan: 'AAACA9928R',
      vendorAddress: 'Plot 42, MIDC Taloja, Navi Mumbai 410206',
      vendorState: 'Maharashtra',
      vendorPinCode: '410206',
      vendorPhone: '+91-22-2741-8800',
      vendorEmail: 'accounts@apexsteel.in',
      customerName: 'Om Packaging Industries',
      customerGstin: '27AABCO5512N1Z4',
      customerAddress: 'Shed 12, Bhiwandi Industrial Area, Thane',
      customerState: 'Maharashtra',
      invoiceNumber: 'INV-2026-8941',
      invoiceDate: '2026-07-15',
      dueDate: '2026-08-14',
      poNumber: 'PO-2026-1124',
      referenceNo: '',
      placeOfSupply: 'Maharashtra (27)',
      reverseCharge: false,
      eWayBillNo: 'EWB-281920483',
      vehicleNo: 'MH-05-AX-9183',
      transportMode: 'Road',
      transportName: 'Shree Transport Co.',
      taxableAmount: 150000.00,
      cgst: 13500.00,
      sgst: 13500.00,
      igst: 0.00,
      cess: 0,
      discount: 0,
      freight: 2500,
      roundOff: 0,
      grandTotal: 179500.00,
      amountInWords: 'One Lakh Seventy Nine Thousand Five Hundred Only',
      currency: 'INR',
      bankName: 'HDFC Bank Ltd',
      accountNo: '****4892',
      ifscCode: 'HDFC0001829',
      branchName: 'Taloja Branch',
    },
    lineItems: [
      { id: '1', serialNo: '1', description: 'Mild Steel Plates — 12mm Thickness IS 2062', hsn: '7208', uom: 'MT', quantity: 5, rate: 20000, taxableValue: 100000, discount: 0, gstRate: 18, cgst: 9000, sgst: 9000, igst: 0, cess: 0, total: 118000, needsReview: false },
      { id: '2', serialNo: '2', description: 'Structural I-Beams — 200mm Section IS 2062', hsn: '7216', uom: 'MT', quantity: 2, rate: 25000, taxableValue: 50000, discount: 0, gstRate: 18, cgst: 4500, sgst: 4500, igst: 0, cess: 0, total: 59000, needsReview: false },
    ],
    metadata: {
      engine: 'AGY-OCR-v2.1',
      extractedAt: '2026-07-20T10:30:05Z',
      processingTimeMs: 4812,
      ocrUsed: false,
      pagesProcessed: 2,
      totalCharacters: 3241,
      confidence: 98,
      reviewFields: [],
    },
    duplicate: { isDuplicate: false },
    tags: ['Steel', 'Purchase', 'Apex'],
    clientId: 'client-1',
    financialYear: '2026-27',
    validationWarnings: [],
  },
  {
    id: 'doc-2',
    name: 'VND_MGM_Statement_Q1.xlsx',
    originalName: 'VND_MGM_Statement_Q1.xlsx',
    suggestedName: 'MGM_Logistics_INV-MGM-26-451_2026-07-10.xlsx',
    size: '1.2 MB',
    sizeBytes: 1258291,
    type: 'Purchase Invoice',
    uploadedAt: '2026-07-20T09:20:00Z',
    processedAt: '2026-07-20T09:20:08Z',
    status: 'Requires Review',
    confidence: 84,
    pageCount: 1,
    header: {
      vendorName: 'MGM Logistics Services',
      vendorGstin: '29BBBCA1298D2Z4',
      vendorPan: 'BBBCA1298D',
      vendorAddress: 'No 12, Tumkur Road, Bengaluru 560022',
      vendorState: 'Karnataka',
      vendorPinCode: '560022',
      vendorPhone: '',
      vendorEmail: '',
      customerName: 'Om Packaging Industries',
      customerGstin: '27AABCO5512N1Z4',
      customerAddress: 'Bhiwandi, Maharashtra',
      customerState: 'Maharashtra',
      invoiceNumber: 'MGM/26-27/451',
      invoiceDate: '2026-07-10',
      dueDate: '2026-08-09',
      poNumber: '',
      referenceNo: 'LR-29182',
      placeOfSupply: 'Maharashtra (27)',
      reverseCharge: false,
      eWayBillNo: '',
      vehicleNo: '',
      transportMode: '',
      transportName: '',
      taxableAmount: 45000.00,
      cgst: 0,
      sgst: 0,
      igst: 8100.00,
      cess: 0,
      discount: 0,
      freight: 0,
      roundOff: 0,
      grandTotal: 53100.00,
      amountInWords: 'Fifty Three Thousand One Hundred Only',
      currency: 'INR',
      bankName: '',
      accountNo: '',
      ifscCode: '',
      branchName: '',
    },
    lineItems: [
      { id: '1', serialNo: '1', description: 'Interstate Freight Charges Maharashtra to Karnataka', hsn: '9965', uom: 'JOB', quantity: 1, rate: 45000, taxableValue: 45000, discount: 0, gstRate: 18, cgst: 0, sgst: 0, igst: 8100, cess: 0, total: 53100, needsReview: true },
    ],
    metadata: {
      engine: 'AGY-OCR-v2.1',
      extractedAt: '2026-07-20T09:20:08Z',
      processingTimeMs: 7240,
      ocrUsed: false,
      pagesProcessed: 1,
      totalCharacters: 1842,
      confidence: 84,
      reviewFields: ['vendorGstin', 'placeOfSupply'],
    },
    duplicate: { isDuplicate: false },
    tags: ['Logistics', 'IGST'],
    clientId: 'client-1',
    financialYear: '2026-27',
    validationWarnings: [
      'IGST applied but vendor GSTIN is Karnataka (29) and customer is Maharashtra (27) — verify Place of Supply',
    ],
  },
  {
    id: 'doc-3',
    name: 'SBI_Statement_Apr_Jun_2026.pdf',
    originalName: 'SBI_Statement_Apr_Jun_2026.pdf',
    suggestedName: 'SBI_Bank_Statement_Apr-Jun_2026.xlsx',
    size: '2.1 MB',
    sizeBytes: 2201472,
    type: 'Bank Statement',
    uploadedAt: '2026-07-20T08:10:00Z',
    processedAt: '2026-07-20T08:10:22Z',
    status: 'Completed',
    confidence: 96,
    pageCount: 14,
    header: {
      vendorName: 'State Bank of India',
      vendorGstin: '',
      vendorPan: '',
      vendorAddress: 'Main Branch, Fort, Mumbai',
      vendorState: 'Maharashtra',
      vendorPinCode: '400001',
      vendorPhone: '',
      vendorEmail: '',
      customerName: 'Om Packaging Industries',
      customerGstin: '27AABCO5512N1Z4',
      customerAddress: '',
      customerState: '',
      invoiceNumber: '',
      invoiceDate: '2026-04-01',
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
      bankName: 'State Bank of India',
      accountNo: '****8821',
      ifscCode: 'SBIN0000300',
      branchName: 'Fort Mumbai',
      openingBalance: 1245891.50,
      closingBalance: 892341.20,
      totalCredits: 4528100.00,
      totalDebits: 4881650.30,
      accountNumber: '3298****8821',
      statementPeriod: '01-Apr-2026 to 30-Jun-2026',
    },
    lineItems: [],
    bankTransactions: [
      { id: 'txn-1', date: '2026-04-03', valueDate: '2026-04-03', narration: 'NEFT Cr - APEX STEEL INDUSTRIES PVTLTD', referenceNo: 'NEFT2026040300001', utr: 'SBIN126093028291', chequeNo: '', debit: 0, credit: 177000, balance: 1422891.50, category: 'Customer Receipt', transactionType: 'NEFT' },
      { id: 'txn-2', date: '2026-04-05', valueDate: '2026-04-05', narration: 'IMPS Dr - Vendor Payment MGM Logistics', referenceNo: 'IMPS2026040500091', utr: 'SBIN126095211892', chequeNo: '', debit: 53100, credit: 0, balance: 1369791.50, category: 'Vendor Payment', transactionType: 'IMPS' },
      { id: 'txn-3', date: '2026-04-10', valueDate: '2026-04-10', narration: 'CHQ/000182 - Capital Goods Purchase', referenceNo: 'CHQ000182', utr: '', chequeNo: '000182', debit: 45000, credit: 0, balance: 1324791.50, category: 'Vendor Payment', transactionType: 'Cheque' },
      { id: 'txn-4', date: '2026-04-15', valueDate: '2026-04-15', narration: 'GST Payment - Apr-26 GSTR-3B', referenceNo: 'NEFT2026041500721', utr: 'SBIN126105728829', chequeNo: '', debit: 27000, credit: 0, balance: 1297791.50, category: 'GST Payment', transactionType: 'NEFT' },
      { id: 'txn-5', date: '2026-04-22', valueDate: '2026-04-22', narration: 'CASH WDL - ATM Withdrawal', referenceNo: '', utr: '', chequeNo: '', debit: 50000, credit: 0, balance: 1247791.50, category: 'Cash', transactionType: 'Cash', needsReview: true },
    ],
    metadata: {
      engine: 'AGY-OCR-v2.1',
      extractedAt: '2026-07-20T08:10:22Z',
      processingTimeMs: 18421,
      ocrUsed: true,
      pagesProcessed: 14,
      totalCharacters: 42188,
      confidence: 96,
      reviewFields: [],
    },
    duplicate: { isDuplicate: false },
    tags: ['SBI', 'Q1', 'Bank Statement'],
    clientId: 'client-1',
    financialYear: '2026-27',
    validationWarnings: ['₹50,000 ATM cash withdrawal flagged for Section 40A(3) review'],
  },
  {
    id: 'doc-4',
    name: 'GSTIN_27AAACA9928R1Z5_GSTR2B_Jul26.pdf',
    originalName: 'GSTIN_27AAACA9928R1Z5_GSTR2B_Jul26.pdf',
    suggestedName: 'Apex_Steel_GSTR2B_Jul2026.xlsx',
    size: '890 KB',
    sizeBytes: 911360,
    type: 'GST Report',
    uploadedAt: '2026-07-20T07:50:00Z',
    processedAt: '2026-07-20T07:50:15Z',
    status: 'Completed',
    confidence: 99,
    pageCount: 5,
    header: {
      vendorName: 'Apex Steel Industries Pvt Ltd',
      vendorGstin: '27AAACA9928R1Z5',
      vendorPan: 'AAACA9928R',
      vendorAddress: '',
      vendorState: 'Maharashtra',
      vendorPinCode: '',
      vendorPhone: '',
      vendorEmail: '',
      customerName: '',
      customerGstin: '',
      customerAddress: '',
      customerState: '',
      invoiceNumber: 'GSTR-2B',
      invoiceDate: '2026-07-01',
      dueDate: '',
      poNumber: '',
      referenceNo: '',
      placeOfSupply: '',
      reverseCharge: false,
      eWayBillNo: '',
      vehicleNo: '',
      transportMode: '',
      transportName: '',
      taxableAmount: 1248500,
      cgst: 62425,
      sgst: 62425,
      igst: 28900,
      cess: 0,
      discount: 0,
      freight: 0,
      roundOff: 0,
      grandTotal: 1402250,

      amountInWords: '',
      currency: 'INR',
      bankName: '',
      accountNo: '',
      ifscCode: '',
      branchName: '',
    },
    lineItems: [],
    metadata: {
      engine: 'AGY-OCR-v2.1',
      extractedAt: '2026-07-20T07:50:15Z',
      processingTimeMs: 14882,
      ocrUsed: false,
      pagesProcessed: 5,
      totalCharacters: 22841,
      confidence: 99,
      reviewFields: [],
    },
    duplicate: { isDuplicate: false },
    tags: ['GSTR-2B', 'July 2026'],
    clientId: 'client-1',
    financialYear: '2026-27',
    validationWarnings: [],
  },
]

// ─── Store ────────────────────────────────────────────────────────────────────

interface DocumentStore {
  documents: ProcessedDocument[]
  batchJobs: BatchJob[]
  selectedDocId: string | null
  searchFilter: SearchFilter
  isProcessing: boolean
  processingProgress: number

  // Actions
  addDocument: (doc: ProcessedDocument) => void
  updateDocument: (id: string, updates: Partial<ProcessedDocument>) => void
  removeDocument: (id: string) => void
  selectDocument: (id: string | null) => void
  setSearchFilter: (filter: Partial<SearchFilter>) => void
  setIsProcessing: (v: boolean) => void
  setProcessingProgress: (v: number) => void
  addBatchJob: (job: BatchJob) => void
  updateBatchJob: (id: string, updates: Partial<BatchJob>) => void

  // Derived
  getFilteredDocuments: () => ProcessedDocument[]
  getSelectedDocument: () => ProcessedDocument | undefined
  getStats: () => {
    total: number
    completed: number
    requiresReview: number
    processing: number
    duplicates: number
  }
}

export const useDocumentStore = create<DocumentStore>((set, get) => ({
  documents: mockDocuments,
  batchJobs: [],
  selectedDocId: 'doc-1',
  searchFilter: {
    query: '',
    documentType: 'All',
    status: 'All',
    dateFrom: '',
    dateTo: '',
    minAmount: '',
    maxAmount: '',
    clientId: '',
  },
  isProcessing: false,
  processingProgress: 0,

  addDocument: (doc) => set((state) => ({ documents: [doc, ...state.documents] })),
  updateDocument: (id, updates) =>
    set((state) => ({
      documents: state.documents.map((d) => (d.id === id ? { ...d, ...updates } : d)),
    })),
  removeDocument: (id) =>
    set((state) => ({ documents: state.documents.filter((d) => d.id !== id) })),
  selectDocument: (id) => set({ selectedDocId: id }),
  setSearchFilter: (filter) =>
    set((state) => ({ searchFilter: { ...state.searchFilter, ...filter } })),
  setIsProcessing: (v) => set({ isProcessing: v }),
  setProcessingProgress: (v) => set({ processingProgress: v }),
  addBatchJob: (job) => set((state) => ({ batchJobs: [...state.batchJobs, job] })),
  updateBatchJob: (id, updates) =>
    set((state) => ({
      batchJobs: state.batchJobs.map((j) => (j.id === id ? { ...j, ...updates } : j)),
    })),

  getFilteredDocuments: () => {
    const { documents, searchFilter } = get()
    return documents.filter((doc) => {
      const q = searchFilter.query.toLowerCase()
      if (q) {
        const matchName = doc.name.toLowerCase().includes(q)
        const matchVendor = doc.header.vendorName.toLowerCase().includes(q)
        const matchGstin = doc.header.vendorGstin.toLowerCase().includes(q)
        const matchInvoice = doc.header.invoiceNumber.toLowerCase().includes(q)
        if (!matchName && !matchVendor && !matchGstin && !matchInvoice) return false
      }
      if (searchFilter.documentType !== 'All' && doc.type !== searchFilter.documentType) return false
      if (searchFilter.status !== 'All' && doc.status !== searchFilter.status) return false
      return true
    })
  },

  getSelectedDocument: () => {
    const { documents, selectedDocId } = get()
    return documents.find((d) => d.id === selectedDocId)
  },

  getStats: () => {
    const { documents } = get()
    return {
      total: documents.length,
      completed: documents.filter((d) => d.status === 'Completed').length,
      requiresReview: documents.filter((d) => d.status === 'Requires Review').length,
      processing: documents.filter((d) => d.status === 'Processing').length,
      duplicates: documents.filter((d) => d.duplicate.isDuplicate).length,
    }
  },
}))
