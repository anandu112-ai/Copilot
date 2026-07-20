import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'

export class DatabaseManager {
  private db!: Database.Database
  private dbPath: string

  constructor() {
    const dataDir = path.join(app.getPath('userData'), 'data')
    fs.mkdirSync(dataDir, { recursive: true })
    this.dbPath = path.join(dataDir, 'ca-copilot.db')
  }

  async initialize(): Promise<void> {
    this.db = new Database(this.dbPath)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
    this.runMigrations()
    console.log('[Database] Initialized at', this.dbPath)
  }

  private runMigrations(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS conversion_history (
        id TEXT PRIMARY KEY,
        original_file_name TEXT NOT NULL,
        original_file_path TEXT,
        document_type TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('success', 'partial', 'failed')),
        output_path TEXT,
        warnings TEXT DEFAULT '[]',
        processing_duration_ms INTEGER,
        page_count INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        file_name TEXT NOT NULL,
        file_path TEXT,
        file_size INTEGER,
        document_type TEXT,
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        client_name TEXT NOT NULL,
        business_name TEXT,
        client_type TEXT,
        pan TEXT,
        gstin TEXT,
        email TEXT,
        phone TEXT,
        financial_year TEXT,
        assigned_staff TEXT,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT DEFAULT 'info',
        read INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Seed default settings
      INSERT OR IGNORE INTO app_settings (key, value) VALUES
        ('theme', 'dark'),
        ('defaultExportFolder', ''),
        ('ocrEnabled', 'true'),
        ('ocrLanguage', 'eng'),
        ('logLevel', 'info'),
        ('appVersion', '1.0.0');
    `)
  }

  // Settings
  getSetting(key: string): string | null {
    const row = this.db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as { value: string } | undefined
    return row?.value ?? null
  }

  setSetting(key: string, value: string): void {
    this.db.prepare(
      "INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))"
    ).run(key, value)
  }

  getAllSettings(): Record<string, string> {
    const rows = this.db.prepare('SELECT key, value FROM app_settings').all() as { key: string; value: string }[]
    return Object.fromEntries(rows.map(r => [r.key, r.value]))
  }

  // Conversion History
  insertConversion(record: {
    id: string
    originalFileName: string
    originalFilePath: string
    documentType: string
    status: string
    outputPath: string
    warnings: string[]
    processingDurationMs: number
    pageCount: number
  }): void {
    this.db.prepare(`
      INSERT INTO conversion_history
        (id, original_file_name, original_file_path, document_type, status, output_path, warnings, processing_duration_ms, page_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      record.id,
      record.originalFileName,
      record.originalFilePath,
      record.documentType,
      record.status,
      record.outputPath,
      JSON.stringify(record.warnings),
      record.processingDurationMs,
      record.pageCount
    )
  }

  getConversionHistory(limit = 100): unknown[] {
    return this.db.prepare(`
      SELECT * FROM conversion_history
      ORDER BY created_at DESC
      LIMIT ?
    `).all(limit)
  }

  deleteConversion(id: string): void {
    this.db.prepare('DELETE FROM conversion_history WHERE id = ?').run(id)
  }

  getDashboardStats(): Record<string, number> {
    const totalConversions = (this.db.prepare('SELECT COUNT(*) as count FROM conversion_history').get() as { count: number }).count
    const successfulConversions = (this.db.prepare("SELECT COUNT(*) as count FROM conversion_history WHERE status = 'success'").get() as { count: number }).count
    const totalClients = (this.db.prepare('SELECT COUNT(*) as count FROM clients').get() as { count: number }).count
    const totalDocuments = (this.db.prepare('SELECT COUNT(*) as count FROM documents').get() as { count: number }).count

    return {
      totalConversions,
      successfulConversions,
      totalClients,
      totalDocuments,
    }
  }

  getRecentActivity(limit = 10): unknown[] {
    return this.db.prepare(`
      SELECT
        id,
        'conversion' as activity_type,
        original_file_name as title,
        document_type as subtitle,
        status,
        created_at
      FROM conversion_history
      ORDER BY created_at DESC
      LIMIT ?
    `).all(limit)
  }

  // Clients Database Helper Methods
  getClients(): unknown[] {
    return this.db.prepare(`
      SELECT 
        id, 
        client_name as clientName, 
        business_name as businessName, 
        client_type as clientType, 
        pan, 
        gstin, 
        email, 
        phone, 
        financial_year as financialYear, 
        assigned_staff as assignedStaff, 
        status, 
        created_at as createdAt, 
        updated_at as updatedAt 
      FROM clients 
      ORDER BY created_at DESC
    `).all()
  }


  insertClient(client: {
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
  }): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO clients
        (id, client_name, business_name, client_type, pan, gstin, email, phone, financial_year, assigned_staff, status, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      client.id,
      client.clientName,
      client.businessName || '',
      client.clientType || '',
      client.pan || '',
      client.gstin || '',
      client.email || '',
      client.phone || '',
      client.financialYear || '',
      client.assignedStaff || '',
      client.status || 'active'
    )
  }

  deleteClient(id: string): void {
    this.db.prepare('DELETE FROM clients WHERE id = ?').run(id)
  }
}

