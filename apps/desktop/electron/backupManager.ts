/**
 * Backup & Restore Manager — CA Copilot
 * Handles SQLite database backups and restoration.
 */
import fs from 'fs'
import path from 'path'
import { app } from 'electron'

export interface BackupEntry {
  filename: string
  path: string
  size: number
  createdAt: string
}

export class BackupManager {
  private backupDir: string
  private dbPath: string

  constructor() {
    const userData = app.getPath('userData')
    this.backupDir = path.join(userData, 'backups')
    this.dbPath = path.join(userData, 'data', 'ca-copilot.db')
    fs.mkdirSync(this.backupDir, { recursive: true })
  }

  /** Create a timestamped backup of the main database. */
  createBackup(label?: string): BackupEntry {
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const tag = label ? `_${label.replace(/[^a-zA-Z0-9]/g, '_')}` : ''
    const filename = `ca-copilot_backup_${ts}${tag}.db`
    const dest = path.join(this.backupDir, filename)

    if (!fs.existsSync(this.dbPath)) {
      throw new Error('Database file not found — cannot create backup')
    }

    fs.copyFileSync(this.dbPath, dest)
    const stat = fs.statSync(dest)

    return {
      filename,
      path: dest,
      size: stat.size,
      createdAt: new Date().toISOString(),
    }
  }

  /** List all available backups sorted by newest first. */
  listBackups(): BackupEntry[] {
    if (!fs.existsSync(this.backupDir)) return []
    return fs
      .readdirSync(this.backupDir)
      .filter((f) => f.endsWith('.db'))
      .map((filename) => {
        const fullPath = path.join(this.backupDir, filename)
        const stat = fs.statSync(fullPath)
        return {
          filename,
          path: fullPath,
          size: stat.size,
          createdAt: stat.birthtime.toISOString(),
        }
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  /** Restore the database from a backup file. Creates a safety backup first. */
  restoreBackup(backupPath: string): { success: boolean; safetyBackup: string } {
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`)
    }
    // Create a safety backup before overwriting
    const safety = this.createBackup('pre_restore')
    fs.copyFileSync(backupPath, this.dbPath)
    return { success: true, safetyBackup: safety.path }
  }

  /** Delete old backups, keeping the N most recent. */
  pruneBackups(keepCount = 10): number {
    const all = this.listBackups()
    const toDelete = all.slice(keepCount)
    for (const entry of toDelete) {
      try { fs.unlinkSync(entry.path) } catch { /* ignore */ }
    }
    return toDelete.length
  }

  get backupDirectory(): string {
    return this.backupDir
  }
}
