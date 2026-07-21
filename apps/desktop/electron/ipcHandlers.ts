import { IpcMain, dialog, shell, app, nativeTheme } from 'electron'
import path from 'path'
import fs from 'fs'
import type { PythonProcessManager } from './pythonManager'
import type { DatabaseManager } from './database'
import { BackupManager } from './backupManager'

export function registerIpcHandlers(
  ipcMain: IpcMain,
  pythonManager: PythonProcessManager,
  dbManager: DatabaseManager
): void {
  const backupManager = new BackupManager()

  // ── Python Service ─────────────────────────────────────────────────────────
  ipcMain.handle('python:get-port', () => pythonManager.getPort())
  ipcMain.handle('python:health', () => pythonManager.checkHealth())

  // ── File Dialogs ───────────────────────────────────────────────────────────
  ipcMain.handle('dialog:open-file', async (_, options: Electron.OpenDialogOptions) => {
    const result = await dialog.showOpenDialog(options)
    return result
  })

  ipcMain.handle('dialog:save-file', async (_, options: Electron.SaveDialogOptions) => {
    const result = await dialog.showSaveDialog(options)
    return result
  })

  // ── Shell Operations ───────────────────────────────────────────────────────
  ipcMain.handle('shell:open-folder', async (_, folderPath: string) => {
    // Validate path exists before opening
    if (fs.existsSync(folderPath)) {
      await shell.openPath(folderPath)
      return { success: true }
    }
    return { success: false, error: 'Folder not found' }
  })

  ipcMain.handle('shell:reveal-in-explorer', async (_, filePath: string) => {
    if (fs.existsSync(filePath)) {
      shell.showItemInFolder(filePath)
      return { success: true }
    }
    return { success: false, error: 'File not found' }
  })

  ipcMain.handle('shell:open-file', async (_, filePath: string) => {
    if (fs.existsSync(filePath)) {
      await shell.openPath(filePath)
      return { success: true }
    }
    return { success: false, error: 'File not found' }
  })

  // ── App Info ───────────────────────────────────────────────────────────────
  ipcMain.handle('app:get-version', () => app.getVersion())
  ipcMain.handle('app:get-path', (_, name: string) => {
    const allowed = ['userData', 'documents', 'downloads', 'desktop', 'temp']
    if (!allowed.includes(name)) {
      throw new Error(`Path '${name}' is not allowed`)
    }
    return app.getPath(name as Parameters<typeof app.getPath>[0])
  })

  // ── Database ───────────────────────────────────────────────────────────────
  ipcMain.handle('db:get-settings', () => dbManager.getAllSettings())

  ipcMain.handle('db:set-setting', (_, key: string, value: string) => {
    // Validate key
    const allowedKeys = [
      'theme', 'defaultExportFolder', 'ocrEnabled', 'ocrLanguage',
      'logLevel', 'language'
    ]
    if (!allowedKeys.includes(key)) {
      throw new Error(`Setting key '${key}' is not allowed`)
    }
    dbManager.setSetting(key, value)
    return { success: true }
  })

  ipcMain.handle('db:get-conversion-history', (_, limit?: number) => {
    return dbManager.getConversionHistory(limit)
  })

  ipcMain.handle('db:insert-conversion', (_, record: Parameters<DatabaseManager['insertConversion']>[0]) => {
    dbManager.insertConversion(record)
    return { success: true }
  })

  ipcMain.handle('db:delete-conversion', (_, id: string) => {
    if (typeof id !== 'string' || id.length > 64) {
      throw new Error('Invalid conversion ID')
    }
    dbManager.deleteConversion(id)
    return { success: true }
  })

  ipcMain.handle('db:get-dashboard-stats', () => {
    return dbManager.getDashboardStats()
  })

  ipcMain.handle('db:get-recent-activity', (_, limit?: number) => {
    return dbManager.getRecentActivity(limit)
  })

  // Clients Database IPC Handlers
  ipcMain.handle('db:get-clients', () => {
    return dbManager.getClients()
  })

  ipcMain.handle('db:insert-client', (_, client: Parameters<DatabaseManager['insertClient']>[0]) => {
    dbManager.insertClient(client)
    return { success: true }
  })

  ipcMain.handle('db:delete-client', (_, id: string) => {
    if (typeof id !== 'string' || id.length > 64) {
      throw new Error('Invalid client ID')
    }
    dbManager.deleteClient(id)
    return { success: true }
  })

  // ── Firm details ──
  ipcMain.handle('db:get-firm-details', () => {
    return dbManager.getFirmDetails()
  })
  ipcMain.handle('db:save-firm-details', (_, details: any) => {
    dbManager.saveFirmDetails(details)
    return { success: true }
  })

  // ── Users ──
  ipcMain.handle('db:get-users', () => {
    return dbManager.getUsers()
  })
  ipcMain.handle('db:insert-user', (_, user: any) => {
    dbManager.insertUser(user)
    return { success: true }
  })
  ipcMain.handle('db:delete-user', (_, id: string) => {
    dbManager.deleteUser(id)
    return { success: true }
  })

  // ── Roles & Permissions ──
  ipcMain.handle('db:get-role-permissions', () => {
    return dbManager.getRolePermissions()
  })
  ipcMain.handle('db:insert-role-permission', (_, role: string, permission: string, enabled: number) => {
    dbManager.insertRolePermission(role, permission, enabled)
    return { success: true }
  })
  ipcMain.handle('db:clear-role-permissions', (_, role: string) => {
    dbManager.clearRolePermissions(role)
    return { success: true }
  })

  // ── Tasks ──
  ipcMain.handle('db:get-tasks', () => {
    return dbManager.getTasks()
  })
  ipcMain.handle('db:insert-task', (_, task: any) => {
    dbManager.insertTask(task)
    return { success: true }
  })
  ipcMain.handle('db:update-task-status', (_, id: string, status: string) => {
    dbManager.updateTaskStatus(id, status)
    return { success: true }
  })
  ipcMain.handle('db:delete-task', (_, id: string) => {
    dbManager.deleteTask(id)
    return { success: true }
  })

  // ── Task Comments ──
  ipcMain.handle('db:get-task-comments', (_, taskId: string) => {
    return dbManager.getTaskComments(taskId)
  })
  ipcMain.handle('db:insert-task-comment', (_, comment: any) => {
    dbManager.insertTaskComment(comment)
    return { success: true }
  })

  // ── Document Approvals ──
  ipcMain.handle('db:get-document-approvals', (_, documentId: string) => {
    return dbManager.getDocumentApprovals(documentId)
  })
  ipcMain.handle('db:insert-document-approval', (_, approval: any) => {
    dbManager.insertDocumentApproval(approval)
    return { success: true }
  })

  // ── Compliance Deadlines ──
  ipcMain.handle('db:get-compliance-deadlines', () => {
    return dbManager.getComplianceDeadlines()
  })
  ipcMain.handle('db:insert-compliance-deadline', (_, deadline: any) => {
    dbManager.insertComplianceDeadline(deadline)
    return { success: true }
  })
  ipcMain.handle('db:update-compliance-deadline', (_, id: string, status: string) => {
    dbManager.updateComplianceDeadline(id, status)
    return { success: true }
  })
  ipcMain.handle('db:delete-compliance-deadline', (_, id: string) => {
    dbManager.deleteComplianceDeadline(id)
    return { success: true }
  })

  // ── Knowledge Items ──
  ipcMain.handle('db:get-knowledge-items', (_, searchQuery?: string) => {
    return dbManager.getKnowledgeItems(searchQuery)
  })
  ipcMain.handle('db:insert-knowledge-item', (_, item: any) => {
    dbManager.insertKnowledgeItem(item)
    return { success: true }
  })
  ipcMain.handle('db:delete-knowledge-item', (_, id: string) => {
    dbManager.deleteKnowledgeItem(id)
    return { success: true }
  })

  // ── Audit Trail ──
  ipcMain.handle('db:get-audit-trail', (_, limit?: number) => {
    return dbManager.getAuditTrail(limit)
  })
  ipcMain.handle('db:insert-audit-trail', (_, log: any) => {
    dbManager.insertAuditTrail(log)
    return { success: true }
  })

  // ── Sync Logs ──
  ipcMain.handle('db:get-sync-logs', (_, limit?: number) => {
    return dbManager.getSyncLogs(limit)
  })
  ipcMain.handle('db:insert-sync-log', (_, log: any) => {
    dbManager.insertSyncLog(log)
    return { success: true }
  })

  // ── AI Automation Rules ──
  ipcMain.handle('db:get-ai-automation-rules', () => {
    return dbManager.getAiAutomationRules()
  })
  ipcMain.handle('db:insert-ai-automation-rule', (_, rule: any) => {
    dbManager.insertAiAutomationRule(rule)
    return { success: true }
  })
  ipcMain.handle('db:delete-ai-automation-rule', (_, id: string) => {
    dbManager.deleteAiAutomationRule(id)
    return { success: true }
  })

  // ── AI Suggestions ──
  ipcMain.handle('db:get-ai-suggestions', () => {
    return dbManager.getAiSuggestions()
  })
  ipcMain.handle('db:insert-ai-suggestion', (_, sug: any) => {
    dbManager.insertAiSuggestion(sug)
    return { success: true }
  })
  ipcMain.handle('db:update-ai-suggestion-status', (_, id: string, status: string) => {
    dbManager.updateAiSuggestionStatus(id, status)
    return { success: true }
  })

  // ── AI Working Papers ──
  ipcMain.handle('db:get-ai-working-papers', (_, clientId?: string) => {
    return dbManager.getAiWorkingPapers(clientId)
  })
  ipcMain.handle('db:insert-ai-working-paper', (_, wp: any) => {
    dbManager.insertAiWorkingPaper(wp)
    return { success: true }
  })
  ipcMain.handle('db:delete-ai-working-paper', (_, id: string) => {
    dbManager.deleteAiWorkingPaper(id)
    return { success: true }
  })

  // ── AI Learning Records ──
  ipcMain.handle('db:get-ai-learning-records', () => {
    return dbManager.getAiLearningRecords()
  })
  ipcMain.handle('db:insert-ai-learning-record', (_, record: any) => {
    dbManager.insertAiLearningRecord(record)
    return { success: true }
  })

  // ── AI Pipeline Jobs ──
  ipcMain.handle('db:get-ai-pipeline-jobs', (_, limit?: number) => {
    return dbManager.getAiPipelineJobs(limit)
  })
  ipcMain.handle('db:insert-ai-pipeline-job', (_, job: any) => {
    dbManager.insertAiPipelineJob(job)
    return { success: true }
  })
  ipcMain.handle('db:update-ai-pipeline-job', (_, id: string, status: string, currentStep: number, progress: number, logs: string) => {
    dbManager.updateAiPipelineJob(id, status, currentStep, progress, logs)
    return { success: true }
  })

  // ── AI QA Validation Flags ──
  ipcMain.handle('db:get-ai-qa-flags', () => {
    return dbManager.getAiQaFlags()
  })
  ipcMain.handle('db:insert-ai-qa-flag', (_, flag: any) => {
    dbManager.insertAiQaFlag(flag)
    return { success: true }
  })
  ipcMain.handle('db:update-ai-qa-flag-status', (_, id: string, status: string) => {
    dbManager.updateAiQaFlagStatus(id, status)
    return { success: true }
  })

  // ── Phase 8: Backup Records ──
  ipcMain.handle('db:get-backup-records', () => dbManager.getBackupRecords())
  ipcMain.handle('db:insert-backup-record', (_, rec: any) => { dbManager.insertBackupRecord(rec); return { success: true } })
  ipcMain.handle('db:update-backup-record', (_, id: string, status: string, completedAt?: string) => { dbManager.updateBackupRecord(id, status, completedAt); return { success: true } })
  ipcMain.handle('db:delete-backup-record', (_, id: string) => { dbManager.deleteBackupRecord(id); return { success: true } })

  // ── Phase 8: License ──
  ipcMain.handle('db:get-license-info', () => dbManager.getLicenseInfo())
  ipcMain.handle('db:upsert-license', (_, lic: any) => { dbManager.upsertLicense(lic); return { success: true } })

  // ── Phase 8: Plugins ──
  ipcMain.handle('db:get-plugins', () => dbManager.getPlugins())
  ipcMain.handle('db:upsert-plugin', (_, plg: any) => { dbManager.upsertPlugin(plg); return { success: true } })
  ipcMain.handle('db:update-plugin-status', (_, id: string, status: string) => { dbManager.updatePluginStatus(id, status); return { success: true } })

  // ── Phase 8: Error Logs ──
  ipcMain.handle('db:get-error-logs', (_, limit?: number) => dbManager.getErrorLogs(limit))
  ipcMain.handle('db:insert-error-log', (_, log: any) => { dbManager.insertErrorLog(log); return { success: true } })
  ipcMain.handle('db:resolve-error-log', (_, id: string) => { dbManager.resolveErrorLog(id); return { success: true } })

  // ── Phase 8: Performance Metrics ──
  ipcMain.handle('db:get-perf-metrics', () => dbManager.getPerfMetrics())
  ipcMain.handle('db:upsert-perf-metric', (_, m: any) => { dbManager.upsertPerfMetric(m); return { success: true } })

  // ── Phase 8: Document Fingerprints ──
  ipcMain.handle('db:get-document-fingerprints', () => dbManager.getDocumentFingerprints())
  ipcMain.handle('db:upsert-document-fingerprint', (_, fp: any) => { dbManager.upsertDocumentFingerprint(fp); return { success: true } })
  ipcMain.handle('db:append-document-access-history', (_, id: string, entry: object) => { dbManager.appendDocumentAccessHistory(id, entry); return { success: true } })

  // ── Phase 8: Update History ──
  ipcMain.handle('db:get-update-history', () => dbManager.getUpdateHistory())
  ipcMain.handle('db:insert-update-record', (_, upd: any) => { dbManager.insertUpdateRecord(upd); return { success: true } })

  // ── Phase 8: QA Test Results ──
  ipcMain.handle('db:get-qa-test-results', () => dbManager.getQaTestResults())
  ipcMain.handle('db:insert-qa-test-result', (_, r: any) => { dbManager.insertQaTestResult(r); return { success: true } })

  // ── Audit Logs ──────────────────────────────────────────────────────────────
  ipcMain.handle('db:get-audit-logs', (_, params: Record<string, unknown>) =>
    dbManager.getAuditLogs(params as Parameters<typeof dbManager.getAuditLogs>[0])
  )

  ipcMain.handle('db:log-audit-event', (_, params: Record<string, unknown>) => {
    dbManager.logAuditEvent(params as Parameters<typeof dbManager.logAuditEvent>[0])
    return { success: true }
  })

  // ── Theme ──────────────────────────────────────────────────────────────────
  ipcMain.handle('theme:get', () => nativeTheme.shouldUseDarkColors ? 'dark' : 'light')

  // ── Backup & Restore ──────────────────────────────────────────────────────────────
  ipcMain.handle('backup:create', (_, label?: string) => {
    return backupManager.createBackup(label)
  })

  ipcMain.handle('backup:list', () => {
    return backupManager.listBackups()
  })

  ipcMain.handle('backup:restore', async (_, backupPath: string) => {
    // Show confirmation dialog
    const { dialog } = await import('electron')
    const choice = await dialog.showMessageBox({
      type: 'warning',
      buttons: ['Restore', 'Cancel'],
      defaultId: 1,
      title: 'Restore Database',
      message: 'Restore this backup?',
      detail: 'The current database will be replaced. A safety backup will be created first. The application will need to restart.',
    })
    if (choice.response !== 0) return { success: false, cancelled: true }
    return backupManager.restoreBackup(backupPath)
  })

  ipcMain.handle('backup:open-folder', async () => {
    const { shell } = await import('electron')
    await shell.openPath(backupManager.backupDirectory)
    return { success: true }
  })

  ipcMain.handle('backup:prune', (_, keepCount = 10) => {
    const deleted = backupManager.pruneBackups(keepCount)
    return { deleted }
  })
}

