import { IpcMain, dialog, shell, app, nativeTheme } from 'electron'
import path from 'path'
import fs from 'fs'
import type { PythonProcessManager } from './pythonManager'
import type { DatabaseManager } from './database'

export function registerIpcHandlers(
  ipcMain: IpcMain,
  pythonManager: PythonProcessManager,
  dbManager: DatabaseManager
): void {

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

  // ── Theme ──────────────────────────────────────────────────────────────────
  ipcMain.handle('theme:get', () => nativeTheme.shouldUseDarkColors ? 'dark' : 'light')
}

