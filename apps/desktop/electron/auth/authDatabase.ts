import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'

/**
 * AuthDatabaseManager
 * 
 * Manages the authentication database with proper user table schema.
 * Handles migrations, schema initialization, and secure user data storage.
 */
export class AuthDatabaseManager {
  private db!: Database.Database
  private dbPath: string

  constructor() {
    const dataDir = path.join(app.getPath('userData'), 'data')
    fs.mkdirSync(dataDir, { recursive: true })
    this.dbPath = path.join(dataDir, 'ca-copilot-auth.db')
  }

  /**
   * Initialize database connection and run migrations
   */
  async initialize(): Promise<void> {
    this.db = new Database(this.dbPath)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
    this.runMigrations()
    console.log('[AuthDatabase] Initialized at', this.dbPath)
  }

  /**
   * Run database migrations
   * Creates auth_users table with proper schema for authentication
   */
  private runMigrations(): void {
    // Create auth_users table (separate from the legacy users table in main database)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS auth_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL COLLATE NOCASE,
        mobile TEXT,
        firm_name TEXT,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT (datetime('now')),
        updated_at DATETIME DEFAULT (datetime('now')),
        last_login DATETIME,
        role TEXT DEFAULT 'user' CHECK(role IN ('admin', 'partner', 'manager', 'staff', 'user')),
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'locked'))
      );

      -- Index for fast email lookup during login
      CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth_users(email);
      
      -- Index for UUID lookups
      CREATE INDEX IF NOT EXISTS idx_auth_users_uuid ON auth_users(uuid);

      -- Session table for persistent login sessions
      CREATE TABLE IF NOT EXISTS auth_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_uuid TEXT NOT NULL,
        session_token TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT (datetime('now')),
        expires_at DATETIME NOT NULL,
        last_activity DATETIME DEFAULT (datetime('now')),
        FOREIGN KEY (user_uuid) REFERENCES auth_users(uuid) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_auth_sessions_token ON auth_sessions(session_token);
      CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_uuid);
    `)
  }

  /**
   * Get user by email (for login)
   * @param email User email address
   * @returns User record or undefined
   */
  getUserByEmail(email: string): AuthUser | undefined {
    const stmt = this.db.prepare(`
      SELECT id, uuid, full_name, email, mobile, firm_name, password_hash, 
             created_at, updated_at, last_login, role, status
      FROM auth_users 
      WHERE email = ? COLLATE NOCASE
    `)
    return stmt.get(email) as AuthUser | undefined
  }

  /**
   * Get user by UUID
   * @param uuid User UUID
   * @returns User record or undefined
   */
  getUserByUuid(uuid: string): AuthUser | undefined {
    const stmt = this.db.prepare(`
      SELECT id, uuid, full_name, email, mobile, firm_name, password_hash,
             created_at, updated_at, last_login, role, status
      FROM auth_users 
      WHERE uuid = ?
    `)
    return stmt.get(uuid) as AuthUser | undefined
  }

  /**
   * Check if email already exists
   * @param email Email to check
   * @returns true if email exists, false otherwise
   */
  emailExists(email: string): boolean {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM auth_users WHERE email = ? COLLATE NOCASE
    `)
    const result = stmt.get(email) as { count: number }
    return result.count > 0
  }

  /**
   * Insert new user
   * @param user User data
   */
  insertUser(user: {
    uuid: string
    fullName: string
    email: string
    mobile?: string
    firmName?: string
    passwordHash: string
    role?: string
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO auth_users (uuid, full_name, email, mobile, firm_name, password_hash, role, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
    `)
    stmt.run(
      user.uuid,
      user.fullName,
      user.email.toLowerCase(),
      user.mobile || null,
      user.firmName || null,
      user.passwordHash,
      user.role || 'user'
    )
  }

  /**
   * Update last login timestamp
   * @param uuid User UUID
   */
  updateLastLogin(uuid: string): void {
    const stmt = this.db.prepare(`
      UPDATE auth_users 
      SET last_login = datetime('now') 
      WHERE uuid = ?
    `)
    stmt.run(uuid)
  }

  /**
   * Update user profile
   * @param uuid User UUID
   * @param updates Profile updates
   */
  updateProfile(uuid: string, updates: {
    fullName?: string
    mobile?: string
    firmName?: string
  }): void {
    const fields: string[] = []
    const values: any[] = []

    if (updates.fullName !== undefined) {
      fields.push('full_name = ?')
      values.push(updates.fullName)
    }
    if (updates.mobile !== undefined) {
      fields.push('mobile = ?')
      values.push(updates.mobile)
    }
    if (updates.firmName !== undefined) {
      fields.push('firm_name = ?')
      values.push(updates.firmName)
    }

    if (fields.length === 0) return

    fields.push('updated_at = datetime(\'now\')')
    values.push(uuid)

    const stmt = this.db.prepare(`
      UPDATE auth_users 
      SET ${fields.join(', ')} 
      WHERE uuid = ?
    `)
    stmt.run(...values)
  }

  /**
   * Change user password
   * @param uuid User UUID
   * @param newPasswordHash New password hash
   */
  changePassword(uuid: string, newPasswordHash: string): void {
    const stmt = this.db.prepare(`
      UPDATE auth_users 
      SET password_hash = ?, updated_at = datetime('now') 
      WHERE uuid = ?
    `)
    stmt.run(newPasswordHash, uuid)
  }

  /**
   * Delete user account
   * @param uuid User UUID
   */
  deleteUser(uuid: string): void {
    const stmt = this.db.prepare(`
      DELETE FROM auth_users WHERE uuid = ?
    `)
    stmt.run(uuid)
  }

  /**
   * Create session token
   * @param userUuid User UUID
   * @param sessionToken Session token
   * @param expiresAt Expiration date
   */
  createSession(userUuid: string, sessionToken: string, expiresAt: Date): void {
    const stmt = this.db.prepare(`
      INSERT INTO auth_sessions (user_uuid, session_token, expires_at)
      VALUES (?, ?, ?)
    `)
    stmt.run(userUuid, sessionToken, expiresAt.toISOString())
  }

  /**
   * Get session by token
   * @param sessionToken Session token
   * @returns Session or undefined
   */
  getSession(sessionToken: string): AuthSession | undefined {
    const stmt = this.db.prepare(`
      SELECT id, user_uuid, session_token, created_at, expires_at, last_activity
      FROM auth_sessions
      WHERE session_token = ? AND expires_at > datetime('now')
    `)
    return stmt.get(sessionToken) as AuthSession | undefined
  }

  /**
   * Update session activity timestamp
   * @param sessionToken Session token
   */
  updateSessionActivity(sessionToken: string): void {
    const stmt = this.db.prepare(`
      UPDATE auth_sessions
      SET last_activity = datetime('now')
      WHERE session_token = ?
    `)
    stmt.run(sessionToken)
  }

  /**
   * Delete session (logout)
   * @param sessionToken Session token
   */
  deleteSession(sessionToken: string): void {
    const stmt = this.db.prepare(`
      DELETE FROM auth_sessions WHERE session_token = ?
    `)
    stmt.run(sessionToken)
  }

  /**
   * Delete all sessions for a user
   * @param userUuid User UUID
   */
  deleteUserSessions(userUuid: string): void {
    const stmt = this.db.prepare(`
      DELETE FROM auth_sessions WHERE user_uuid = ?
    `)
    stmt.run(userUuid)
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions(): void {
    const stmt = this.db.prepare(`
      DELETE FROM auth_sessions WHERE expires_at <= datetime('now')
    `)
    stmt.run()
  }

  /**
   * Get total user count
   */
  getUserCount(): number {
    const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM auth_users`)
    const result = stmt.get() as { count: number }
    return result.count
  }

  /**
   * Get all users (without password hashes, for admin panel)
   */
  getAllUsers(): AuthUserSafe[] {
    const stmt = this.db.prepare(`
      SELECT id, uuid, full_name, email, mobile, firm_name,
             created_at, updated_at, last_login, role, status
      FROM auth_users
      ORDER BY created_at DESC
    `)
    return stmt.all() as AuthUserSafe[]
  }
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: number
  uuid: string
  full_name: string
  email: string
  mobile: string | null
  firm_name: string | null
  password_hash: string
  created_at: string
  updated_at: string
  last_login: string | null
  role: string
  status: string
}

export interface AuthUserSafe {
  id: number
  uuid: string
  full_name: string
  email: string
  mobile: string | null
  firm_name: string | null
  created_at: string
  updated_at: string
  last_login: string | null
  role: string
  status: string
}

export interface AuthSession {
  id: number
  user_uuid: string
  session_token: string
  created_at: string
  expires_at: string
  last_activity: string
}
