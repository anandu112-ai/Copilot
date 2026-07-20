import axios, { AxiosInstance } from 'axios'
import type { DocumentType, ExtractionResult } from '../types'

let _port: number | null = null
let _instance: AxiosInstance | null = null

async function getInstance(): Promise<AxiosInstance> {
  if (_instance) return _instance

  if (window.electronAPI) {
    _port = await window.electronAPI.getPythonPort()
  } else {
    _port = 8765 // Default for browser testing
  }

  _instance = axios.create({
    baseURL: `http://127.0.0.1:${_port}`,
    timeout: 120000,
    headers: { 'Content-Type': 'application/json' },
  })

  // Attach JWT token to every request automatically
  _instance.interceptors.request.use((config) => {
    try {
      const stored = localStorage.getItem('ca-copilot-auth')
      if (stored) {
        const parsed = JSON.parse(stored)
        const token = parsed?.state?.token
        if (token) {
          config.headers = config.headers || {}
          config.headers['Authorization'] = `Bearer ${token}`
        }
      }
    } catch {}
    return config
  })

  return _instance
}

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, char) => char.toUpperCase())
}

function toSnakeCase(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase()
}

function mapKeys(obj: any, fn: (key: string) => string): any {
  if (Array.isArray(obj)) {
    return obj.map(item => mapKeys(item, fn))
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc: any, key) => {
      const mappedKey = fn(key)
      acc[mappedKey] = mapKeys(obj[key], fn)
      return acc
    }, {})
  }
  return obj
}

const snakeToCamel = (obj: any) => mapKeys(obj, toCamelCase)
const camelToSnake = (obj: any) => mapKeys(obj, toSnakeCase)

export const processorApi = {
  async checkHealth(): Promise<boolean> {
    try {
      const api = await getInstance()
      const res = await api.get('/health', { timeout: 3000 })
      return res.status === 200
    } catch {
      return false
    }
  },

  async extractPdf(
    filePath: string,
    documentType: DocumentType,
    ocrEnabled: boolean,
    onStageUpdate: (stage: string) => void
  ): Promise<ExtractionResult> {
    const api = await getInstance()

    const response = await api.post<any>('/extract', {
      file_path: filePath,
      document_type: documentType,
      ocr_enabled: ocrEnabled,
    })

    return snakeToCamel(response.data) as ExtractionResult
  },

  async generateExcel(
    result: ExtractionResult,
    outputPath: string,
    documentType: DocumentType
  ): Promise<{ success: boolean; path: string; error?: string }> {
    const api = await getInstance()

    const response = await api.post<{ success: boolean; path: string; error?: string }>(
      '/generate-excel',
      {
        result: camelToSnake(result),
        output_path: outputPath,
        document_type: documentType,
      }
    )

    return response.data
  },

  // ── Reconciliation Engine APIs ───────────────────────────────────────────

  async getReconciliationClients(): Promise<Array<{ id: string; name: string; created_at: string }>> {
    const api = await getInstance()
    const response = await api.get('/reconciliation/clients')
    return response.data
  },

  async createReconciliationClient(name: string): Promise<{ id: string; name: string }> {
    const api = await getInstance()
    const formData = new FormData()
    formData.append('name', name)
    const response = await api.post('/reconciliation/clients', formData)
    return response.data
  },

  async uploadBankStatement(
    clientId: string,
    bankName: string,
    accountNumber: string,
    file: File
  ): Promise<{ success: boolean; count: number; bank_name: string; account_number: string }> {
    const api = await getInstance()
    const formData = new FormData()
    formData.append('client_id', clientId)
    formData.append('bank_name', bankName)
    formData.append('account_number', accountNumber)
    formData.append('file', file)
    const response = await api.post('/reconciliation/upload-bank', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },

  async uploadLedger(
    clientId: string,
    ledgerType: string,
    file: File
  ): Promise<{ success: boolean; count: number }> {
    const api = await getInstance()
    const formData = new FormData()
    formData.append('client_id', clientId)
    formData.append('ledger_type', ledgerType)
    formData.append('file', file)
    const response = await api.post('/reconciliation/upload-ledger', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },

  async uploadGst(
    clientId: string,
    sourceType: string,
    file: File
  ): Promise<{ success: boolean; count: number }> {
    const api = await getInstance()
    const formData = new FormData()
    formData.append('client_id', clientId)
    formData.append('source_type', sourceType)
    formData.append('file', file)
    const response = await api.post('/reconciliation/upload-gst', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },

  async runBankMatching(
    clientId: string,
    amountTolerance: number,
    dateToleranceDays: number
  ): Promise<{ auto_matched: number; suggestions: any[] }> {
    const api = await getInstance()
    const response = await api.post(`/reconciliation/match/bank?client_id=${clientId}&amount_tolerance=${amountTolerance}&date_tolerance_days=${dateToleranceDays}`)
    return response.data
  },

  async runGstMatching(
    clientId: string,
    amountTolerance: number
  ): Promise<{ auto_matched: number; suggestions: any[] }> {
    const api = await getInstance()
    const response = await api.post(`/reconciliation/match/gst?client_id=${clientId}&amount_tolerance=${amountTolerance}`)
    return response.data
  },

  async runLedgerMatching(
    clientId: string,
    amountTolerance: number
  ): Promise<{ auto_matched: number; suggestions: any[] }> {
    const api = await getInstance()
    const response = await api.post(`/reconciliation/match/ledger?client_id=${clientId}&amount_tolerance=${amountTolerance}`)
    return response.data
  },

  async getBankTransactions(
    clientId: string,
    status?: string,
    paymentMode?: string,
    category?: string
  ): Promise<any[]> {
    const api = await getInstance()
    const params: any = { client_id: clientId }
    if (status) params.status = status
    if (paymentMode) params.payment_mode = paymentMode
    if (category) params.category = category
    const response = await api.get('/reconciliation/transactions/bank', { params })
    return response.data
  },

  async getLedgerEntries(
    clientId: string,
    ledgerType?: string,
    status?: string
  ): Promise<any[]> {
    const api = await getInstance()
    const params: any = { client_id: clientId }
    if (ledgerType) params.ledger_type = ledgerType
    if (status) params.status = status
    const response = await api.get('/reconciliation/transactions/ledger', { params })
    return response.data
  },

  async getGstInvoices(
    clientId: string,
    sourceType?: string,
    status?: string
  ): Promise<any[]> {
    const api = await getInstance()
    const params: any = { client_id: clientId }
    if (sourceType) params.source_type = sourceType
    if (status) params.status = status
    const response = await api.get('/reconciliation/transactions/gst', { params })
    return response.data
  },

  async getReconciliationDuplicates(clientId: string): Promise<any> {
    const api = await getInstance()
    const response = await api.get('/reconciliation/duplicates', { params: { client_id: clientId } })
    return response.data
  },

  async getReconciliationDashboard(clientId: string): Promise<any> {
    const api = await getInstance()
    const response = await api.get('/reconciliation/dashboard', { params: { client_id: clientId } })
    return response.data
  },

  async handleReconciliationAction(
    clientId: string,
    action: string,
    module: string,
    recordId1: string,
    recordId2?: string,
    notes?: string,
    updatedData?: any
  ): Promise<{ success: boolean }> {
    const api = await getInstance()
    const formData = new FormData()
    formData.append('client_id', clientId)
    formData.append('action', action)
    formData.append('module', module)
    formData.append('record_id_1', recordId1)
    if (recordId2) formData.append('record_id_2', recordId2)
    if (notes) formData.append('notes', notes)
    if (updatedData) formData.append('updated_data', JSON.stringify(updatedData))
    
    const response = await api.post('/reconciliation/action', formData)
    return response.data
  },

  async getReconciliationAuditTrail(clientId: string): Promise<any[]> {
    const api = await getInstance()
    const response = await api.get('/reconciliation/audit-trail', { params: { client_id: clientId } })
    return response.data
  },

  async downloadReconciliationReport(
    clientId: string,
    reportType: string,
    formatType: string
  ): Promise<Blob> {
    const api = await getInstance()
    const response = await api.get('/reconciliation/reports/export', {
      params: { client_id: clientId, report_type: reportType, format_type: formatType },
      responseType: 'blob'
    })
    return response.data
  },

  // ── AI Audit Intelligence APIs ───────────────────────────────────────────

  async runAuditScan(clientId: string): Promise<{ success: boolean; count: number }> {
    const api = await getInstance()
    const formData = new FormData()
    formData.append('client_id', clientId)
    const response = await api.post('/audit/run', formData)
    return response.data
  },

  async getAuditFindings(
    clientId: string,
    severity?: string,
    category?: string,
    status?: string,
    search?: string
  ): Promise<any[]> {
    const api = await getInstance()
    const params: any = { client_id: clientId }
    if (severity) params.severity = severity
    if (category) params.category = category
    if (status) params.status = status
    if (search) params.search = search
    const response = await api.get('/audit/findings', { params })
    return response.data
  },

  async handleAuditAction(
    findingId: string,
    action: string,
    notes?: string
  ): Promise<{ success: boolean }> {
    const api = await getInstance()
    const formData = new FormData()
    formData.append('finding_id', findingId)
    formData.append('action', action)
    if (notes) formData.append('notes', notes)
    const response = await api.post('/audit/action', formData)
    return response.data
  },

  async getAuditRules(): Promise<any[]> {
    const api = await getInstance()
    const response = await api.get('/audit/rules')
    return response.data
  },

  async createAuditRule(
    name: string,
    description: string,
    targetField: string,
    conditionOperator: string,
    conditionValue: string,
    severity: string
  ): Promise<{ id: string; name: string }> {
    const api = await getInstance()
    const formData = new FormData()
    formData.append('name', name)
    formData.append('description', description)
    formData.append('target_field', targetField)
    formData.append('condition_operator', conditionOperator)
    formData.append('condition_value', conditionValue)
    formData.append('severity', severity)
    const response = await api.post('/audit/rules', formData)
    return response.data
  },

  async updateAuditRule(
    ruleId: string,
    description?: string,
    conditionValue?: string,
    severity?: string,
    isEnabled?: number
  ): Promise<{ success: boolean }> {
    const api = await getInstance()
    const formData = new FormData()
    if (description !== undefined) formData.append('description', description)
    if (conditionValue !== undefined) formData.append('condition_value', conditionValue)
    if (severity !== undefined) formData.append('severity', severity)
    if (isEnabled !== undefined) formData.append('is_enabled', String(isEnabled))
    const response = await api.put(`/audit/rules/${ruleId}`, formData)
    return response.data
  },

  async deleteAuditRule(ruleId: string): Promise<{ success: boolean }> {
    const api = await getInstance()
    const response = await api.delete(`/audit/rules/${ruleId}`)
    return response.data
  },

  async getAuditDashboardStats(clientId: string): Promise<any> {
    const api = await getInstance()
    const response = await api.get('/audit/dashboard-stats', { params: { client_id: clientId } })
    return response.data
  },

  async getVendorProfiles(clientId: string): Promise<any[]> {
    const api = await getInstance()
    const response = await api.get('/audit/vendor-profiles', { params: { client_id: clientId } })
    return response.data
  },

  async getCustomerProfiles(clientId: string): Promise<any[]> {
    const api = await getInstance()
    const response = await api.get('/audit/customer-profiles', { params: { client_id: clientId } })
    return response.data
  },

  async downloadAuditReport(clientId: string, formatType: string): Promise<Blob> {
    const api = await getInstance()
    const response = await api.get('/audit/reports/export', {
      params: { client_id: clientId, format_type: formatType },
      responseType: 'blob'
    })
    return response.data
  },

  // ── Auth endpoints ──────────────────────────────────────────────────────────

  async login(email: string, password: string): Promise<{ access_token: string; token_type: string; user: any }> {
    const api = await getInstance()
    const form = new FormData()
    form.append('email', email)
    form.append('password', password)
    const res = await api.post('/firm/auth/login', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  },

  async getMe(): Promise<any> {
    const api = await getInstance()
    const res = await api.get('/firm/auth/me')
    return res.data
  },
}
