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
    timeout: 120000, // 2 minutes for OCR
    headers: {
      'Content-Type': 'application/json',
    },
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
}
