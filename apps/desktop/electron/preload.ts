import { contextBridge, ipcRenderer } from 'electron'

// Expose a safe, typed API to the renderer process
// contextIsolation ensures the renderer cannot access Node.js directly
contextBridge.exposeInMainWorld('electronAPI', {
  // Python service
  getPythonPort: () => ipcRenderer.invoke('python:get-port'),
  checkPythonHealth: () => ipcRenderer.invoke('python:health'),

  // File system operations
  openFileDialog: (options: Electron.OpenDialogOptions) =>
    ipcRenderer.invoke('dialog:open-file', options),
  saveFileDialog: (options: Electron.SaveDialogOptions) =>
    ipcRenderer.invoke('dialog:save-file', options),
  openFolder: (folderPath: string) =>
    ipcRenderer.invoke('shell:open-folder', folderPath),
  revealInExplorer: (filePath: string) =>
    ipcRenderer.invoke('shell:reveal-in-explorer', filePath),
  openFile: (filePath: string) =>
    ipcRenderer.invoke('shell:open-file', filePath),

  // App info
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),
  getAppPath: (name: string) => ipcRenderer.invoke('app:get-path', name),

  // Database operations (proxied through main for security)
  db: {
    getSettings: () => ipcRenderer.invoke('db:get-settings'),
    setSetting: (key: string, value: string) =>
      ipcRenderer.invoke('db:set-setting', key, value),
    getConversionHistory: (limit?: number) =>
      ipcRenderer.invoke('db:get-conversion-history', limit),
    insertConversion: (record: ConversionRecord) =>
      ipcRenderer.invoke('db:insert-conversion', record),
    deleteConversion: (id: string) =>
      ipcRenderer.invoke('db:delete-conversion', id),
    getDashboardStats: () =>
      ipcRenderer.invoke('db:get-dashboard-stats'),
    getRecentActivity: (limit?: number) =>
      ipcRenderer.invoke('db:get-recent-activity', limit),
    getClients: () =>
      ipcRenderer.invoke('db:get-clients'),
    insertClient: (client: ClientRecord) =>
      ipcRenderer.invoke('db:insert-client', client),
    deleteClient: (id: string) =>
      ipcRenderer.invoke('db:delete-client', id),
  },


  // Theme
  getNativeTheme: () => ipcRenderer.invoke('theme:get'),
  onThemeChange: (callback: (theme: string) => void) => {
    ipcRenderer.on('theme:changed', (_, theme) => callback(theme))
    return () => ipcRenderer.removeAllListeners('theme:changed')
  },
})

// Type definitions (mirrored in renderer types)
interface ConversionRecord {
  id: string
  originalFileName: string
  originalFilePath: string
  documentType: string
  status: 'success' | 'partial' | 'failed'
  outputPath: string
  warnings: string[]
  processingDuration: number
  pageCount: number
}

interface ClientRecord {
  id: string
  clientName: string
  businessName?: string
  clientType?: string
  pan?: string
  gstin?: string
  email?: string
  phone?: string
  financialYear?: string
  assignedStaff?: string
  status?: string
}

