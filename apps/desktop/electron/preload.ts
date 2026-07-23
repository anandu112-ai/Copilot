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

  // Authentication
  auth: {
    register: (data: {
      fullName: string
      email: string
      mobile?: string
      firmName?: string
      password: string
      confirmPassword: string
    }) => ipcRenderer.invoke('auth:register', data),
    login: (data: { email: string; password: string }) =>
      ipcRenderer.invoke('auth:login', data),
    getCurrentUser: (sessionToken: string) =>
      ipcRenderer.invoke('auth:get-current-user', sessionToken),
    logout: (sessionToken: string) =>
      ipcRenderer.invoke('auth:logout', sessionToken),
    logoutAll: (sessionToken: string) =>
      ipcRenderer.invoke('auth:logout-all', sessionToken),
    updateProfile: (sessionToken: string, updates: {
      fullName?: string
      mobile?: string
      firmName?: string
    }) => ipcRenderer.invoke('auth:update-profile', sessionToken, updates),
    changePassword: (sessionToken: string, data: {
      currentPassword: string
      newPassword: string
      confirmPassword: string
    }) => ipcRenderer.invoke('auth:change-password', sessionToken, data),
    deleteAccount: (sessionToken: string, password: string) =>
      ipcRenderer.invoke('auth:delete-account', sessionToken, password),
    isFirstRun: () => ipcRenderer.invoke('auth:is-first-run'),
    getUserCount: () => ipcRenderer.invoke('auth:get-user-count'),
  },

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

    // Firm details
    getFirmDetails: () => ipcRenderer.invoke('db:get-firm-details'),
    saveFirmDetails: (details: any) => ipcRenderer.invoke('db:save-firm-details', details),

    // Users
    getUsers: () => ipcRenderer.invoke('db:get-users'),
    insertUser: (user: any) => ipcRenderer.invoke('db:insert-user', user),
    deleteUser: (id: string) => ipcRenderer.invoke('db:delete-user', id),

    // Roles & Permissions
    getRolePermissions: () => ipcRenderer.invoke('db:get-role-permissions'),
    insertRolePermission: (role: string, permission: string, enabled: number) =>
      ipcRenderer.invoke('db:insert-role-permission', role, permission, enabled),
    clearRolePermissions: (role: string) => ipcRenderer.invoke('db:clear-role-permissions', role),

    // Tasks
    getTasks: () => ipcRenderer.invoke('db:get-tasks'),
    insertTask: (task: any) => ipcRenderer.invoke('db:insert-task', task),
    updateTaskStatus: (id: string, status: string) => ipcRenderer.invoke('db:update-task-status', id, status),
    deleteTask: (id: string) => ipcRenderer.invoke('db:delete-task', id),

    // Comments
    getTaskComments: (taskId: string) => ipcRenderer.invoke('db:get-task-comments', taskId),
    insertTaskComment: (comment: any) => ipcRenderer.invoke('db:insert-task-comment', comment),

    // Document Approvals
    getDocumentApprovals: (documentId: string) => ipcRenderer.invoke('db:get-document-approvals', documentId),
    insertDocumentApproval: (approval: any) => ipcRenderer.invoke('db:insert-document-approval', approval),

    // Compliance deadlines
    getComplianceDeadlines: () => ipcRenderer.invoke('db:get-compliance-deadlines'),
    insertComplianceDeadline: (deadline: any) => ipcRenderer.invoke('db:insert-compliance-deadline', deadline),
    updateComplianceDeadline: (id: string, status: string) => ipcRenderer.invoke('db:update-compliance-deadline', id, status),
    deleteComplianceDeadline: (id: string) => ipcRenderer.invoke('db:delete-compliance-deadline', id),

    // Knowledge Items
    getKnowledgeItems: (searchQuery?: string) => ipcRenderer.invoke('db:get-knowledge-items', searchQuery),
    insertKnowledgeItem: (item: any) => ipcRenderer.invoke('db:insert-knowledge-item', item),
    deleteKnowledgeItem: (id: string) => ipcRenderer.invoke('db:delete-knowledge-item', id),

    // Audit Trail
    getAuditTrail: (limit?: number) => ipcRenderer.invoke('db:get-audit-trail', limit),
    insertAuditTrail: (log: any) => ipcRenderer.invoke('db:insert-audit-trail', log),

    // Sync logs
    getSyncLogs: (limit?: number) => ipcRenderer.invoke('db:get-sync-logs', limit),
    insertSyncLog: (log: any) => ipcRenderer.invoke('db:insert-sync-log', log),

    // AI Automation Rules
    getAiAutomationRules: () => ipcRenderer.invoke('db:get-ai-automation-rules'),
    insertAiAutomationRule: (rule: any) => ipcRenderer.invoke('db:insert-ai-automation-rule', rule),
    deleteAiAutomationRule: (id: string) => ipcRenderer.invoke('db:delete-ai-automation-rule', id),

    // AI Suggestions
    getAiSuggestions: () => ipcRenderer.invoke('db:get-ai-suggestions'),
    insertAiSuggestion: (sug: any) => ipcRenderer.invoke('db:insert-ai-suggestion', sug),
    updateAiSuggestionStatus: (id: string, status: string) => ipcRenderer.invoke('db:update-ai-suggestion-status', id, status),

    // AI Working Papers
    getAiWorkingPapers: (clientId?: string) => ipcRenderer.invoke('db:get-ai-working-papers', clientId),
    insertAiWorkingPaper: (wp: any) => ipcRenderer.invoke('db:insert-ai-working-paper', wp),
    deleteAiWorkingPaper: (id: string) => ipcRenderer.invoke('db:delete-ai-working-paper', id),

    // AI Learning Records
    getAiLearningRecords: () => ipcRenderer.invoke('db:get-ai-learning-records'),
    insertAiLearningRecord: (record: any) => ipcRenderer.invoke('db:insert-ai-learning-record', record),

    // AI Pipeline Jobs
    getAiPipelineJobs: (limit?: number) => ipcRenderer.invoke('db:get-ai-pipeline-jobs', limit),
    insertAiPipelineJob: (job: any) => ipcRenderer.invoke('db:insert-ai-pipeline-job', job),
    updateAiPipelineJob: (id: string, status: string, currentStep: number, progress: number, logs: string) =>
      ipcRenderer.invoke('db:update-ai-pipeline-job', id, status, currentStep, progress, logs),

    // AI QA Validation Flags
    getAiQaFlags: () => ipcRenderer.invoke('db:get-ai-qa-flags'),
    insertAiQaFlag: (flag: any) => ipcRenderer.invoke('db:insert-ai-qa-flag', flag),
    updateAiQaFlagStatus: (id: string, status: string) => ipcRenderer.invoke('db:update-ai-qa-flag-status', id, status),

    // Phase 8: Backup
    getBackupRecords: () => ipcRenderer.invoke('db:get-backup-records'),
    insertBackupRecord: (rec: any) => ipcRenderer.invoke('db:insert-backup-record', rec),
    updateBackupRecord: (id: string, status: string, completedAt?: string) => ipcRenderer.invoke('db:update-backup-record', id, status, completedAt),
    deleteBackupRecord: (id: string) => ipcRenderer.invoke('db:delete-backup-record', id),

    // Phase 8: License
    getLicenseInfo: () => ipcRenderer.invoke('db:get-license-info'),
    upsertLicense: (lic: any) => ipcRenderer.invoke('db:upsert-license', lic),

    // Phase 8: Plugins
    getPlugins: () => ipcRenderer.invoke('db:get-plugins'),
    upsertPlugin: (plg: any) => ipcRenderer.invoke('db:upsert-plugin', plg),
    updatePluginStatus: (id: string, status: string) => ipcRenderer.invoke('db:update-plugin-status', id, status),

    // Phase 8: Error Logs
    getErrorLogs: (limit?: number) => ipcRenderer.invoke('db:get-error-logs', limit),
    insertErrorLog: (log: any) => ipcRenderer.invoke('db:insert-error-log', log),
    resolveErrorLog: (id: string) => ipcRenderer.invoke('db:resolve-error-log', id),

    // Phase 8: Performance Metrics
    getPerfMetrics: () => ipcRenderer.invoke('db:get-perf-metrics'),
    upsertPerfMetric: (m: any) => ipcRenderer.invoke('db:upsert-perf-metric', m),

    // Phase 8: Document Fingerprints
    getDocumentFingerprints: () => ipcRenderer.invoke('db:get-document-fingerprints'),
    upsertDocumentFingerprint: (fp: any) => ipcRenderer.invoke('db:upsert-document-fingerprint', fp),
    appendDocumentAccessHistory: (id: string, entry: object) => ipcRenderer.invoke('db:append-document-access-history', id, entry),

    // Phase 8: Update History
    getUpdateHistory: () => ipcRenderer.invoke('db:get-update-history'),
    insertUpdateRecord: (upd: any) => ipcRenderer.invoke('db:insert-update-record', upd),

    // Phase 8: QA Tests
    getQaTestResults: () => ipcRenderer.invoke('db:get-qa-test-results'),
    insertQaTestResult: (r: any) => ipcRenderer.invoke('db:insert-qa-test-result', r),

    getAuditLogs: (params?: Record<string, unknown>) =>
      ipcRenderer.invoke('db:get-audit-logs', params ?? {}),
    logAuditEvent: (params: Record<string, unknown>) =>
      ipcRenderer.invoke('db:log-audit-event', params),
  },

  // Backup & Restore
  backup: {
    create: (label?: string) => ipcRenderer.invoke('backup:create', label),
    list: () => ipcRenderer.invoke('backup:list'),
    restore: (backupPath: string) => ipcRenderer.invoke('backup:restore', backupPath),
    openFolder: () => ipcRenderer.invoke('backup:open-folder'),
    prune: (keepCount?: number) => ipcRenderer.invoke('backup:prune', keepCount),
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

