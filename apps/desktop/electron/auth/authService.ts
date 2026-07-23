import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { AuthDatabaseManager, AuthUser, AuthUserSafe } from './authDatabase'
import crypto from 'crypto'

/**
 * AuthService
 * 
 * Handles all authentication operations with bcrypt password hashing,
 * validation, and secure session management.
 */
export class AuthService {
  private authDb: AuthDatabaseManager
  private readonly SALT_ROUNDS = 12 // bcrypt cost factor (higher = more secure but slower)
  private readonly SESSION_DURATION_DAYS = 30 // Session expiration

  constructor(authDb: AuthDatabaseManager) {
    this.authDb = authDb
  }

  /**
   * Register a new user
   * @param data User registration data
   * @returns Newly created user (without password hash) and session token
   */
  async register(data: {
    fullName: string
    email: string
    mobile?: string
    firmName?: string
    password: string
    role?: string
  }): Promise<{ user: AuthUserSafe; sessionToken: string }> {
    // Validation
    this.validateRegistrationData(data)

    // Check if email already exists
    if (this.authDb.emailExists(data.email)) {
      throw new Error('Email address is already registered')
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, this.SALT_ROUNDS)

    // Generate UUID
    const uuid = uuidv4()

    // Insert user into database
    this.authDb.insertUser({
      uuid,
      fullName: data.fullName.trim(),
      email: data.email.trim().toLowerCase(),
      mobile: data.mobile?.trim(),
      firmName: data.firmName?.trim(),
      passwordHash,
      role: data.role || 'user',
    })

    // Get the created user
    const user = this.authDb.getUserByUuid(uuid)
    if (!user) {
      throw new Error('Failed to create user')
    }

    // Update last login
    this.authDb.updateLastLogin(uuid)

    // Create session
    const sessionToken = this.generateSessionToken()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + this.SESSION_DURATION_DAYS)
    this.authDb.createSession(uuid, sessionToken, expiresAt)

    // Return user without password hash
    return {
      user: this.stripPasswordHash(user),
      sessionToken,
    }
  }

  /**
   * Login user with email and password
   * @param email User email
   * @param password User password
   * @returns User data and session token
   */
  async login(
    email: string,
    password: string
  ): Promise<{ user: AuthUserSafe; sessionToken: string }> {
    // Basic validation
    if (!email || !password) {
      throw new Error('Email and password are required')
    }

    // Find user by email
    const user = this.authDb.getUserByEmail(email.trim())
    if (!user) {
      // Generic error message to prevent email enumeration
      throw new Error('Invalid email or password')
    }

    // Check if account is locked or inactive
    if (user.status === 'locked') {
      throw new Error('Account is locked. Please contact support.')
    }
    if (user.status === 'inactive') {
      throw new Error('Account is inactive. Please contact support.')
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash)
    if (!isPasswordValid) {
      throw new Error('Invalid email or password')
    }

    // Update last login
    this.authDb.updateLastLogin(user.uuid)

    // Create session
    const sessionToken = this.generateSessionToken()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + this.SESSION_DURATION_DAYS)
    this.authDb.createSession(user.uuid, sessionToken, expiresAt)

    // Return user without password hash
    return {
      user: this.stripPasswordHash(user),
      sessionToken,
    }
  }

  /**
   * Get current user from session token
   * @param sessionToken Session token
   * @returns User data or null
   */
  getCurrentUser(sessionToken: string): AuthUserSafe | null {
    if (!sessionToken) return null

    // Get session
    const session = this.authDb.getSession(sessionToken)
    if (!session) return null

    // Get user
    const user = this.authDb.getUserByUuid(session.user_uuid)
    if (!user) return null

    // Check if user is active
    if (user.status !== 'active') return null

    // Update session activity
    this.authDb.updateSessionActivity(sessionToken)

    return this.stripPasswordHash(user)
  }

  /**
   * Logout user (delete session)
   * @param sessionToken Session token
   */
  logout(sessionToken: string): void {
    if (!sessionToken) return
    this.authDb.deleteSession(sessionToken)
  }

  /**
   * Logout from all devices (delete all sessions for a user)
   * @param sessionToken Current session token to get user UUID
   */
  logoutAll(sessionToken: string): void {
    if (!sessionToken) return

    const session = this.authDb.getSession(sessionToken)
    if (!session) return

    this.authDb.deleteUserSessions(session.user_uuid)
  }

  /**
   * Update user profile
   * @param sessionToken Session token
   * @param updates Profile updates
   */
  updateProfile(
    sessionToken: string,
    updates: {
      fullName?: string
      mobile?: string
      firmName?: string
    }
  ): void {
    const user = this.getCurrentUser(sessionToken)
    if (!user) {
      throw new Error('Unauthorized')
    }

    // Validate updates
    if (updates.fullName !== undefined) {
      if (!updates.fullName.trim()) {
        throw new Error('Full name cannot be empty')
      }
      if (updates.fullName.trim().length < 2) {
        throw new Error('Full name must be at least 2 characters')
      }
    }

    if (updates.mobile !== undefined && updates.mobile.trim()) {
      if (!this.isValidMobile(updates.mobile.trim())) {
        throw new Error('Invalid mobile number format')
      }
    }

    this.authDb.updateProfile(user.uuid, updates)
  }

  /**
   * Change password
   * @param sessionToken Session token
   * @param currentPassword Current password
   * @param newPassword New password
   */
  async changePassword(
    sessionToken: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = this.getCurrentUser(sessionToken)
    if (!user) {
      throw new Error('Unauthorized')
    }

    // Get full user record with password hash
    const fullUser = this.authDb.getUserByUuid(user.uuid)
    if (!fullUser) {
      throw new Error('User not found')
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      fullUser.password_hash
    )
    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect')
    }

    // Validate new password
    this.validatePassword(newPassword)

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS)

    // Update password
    this.authDb.changePassword(user.uuid, newPasswordHash)

    // Logout from all other devices for security
    this.authDb.deleteUserSessions(user.uuid)

    // Recreate current session
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + this.SESSION_DURATION_DAYS)
    this.authDb.createSession(user.uuid, sessionToken, expiresAt)
  }

  /**
   * Delete user account
   * @param sessionToken Session token
   * @param password Password confirmation
   */
  async deleteAccount(sessionToken: string, password: string): Promise<void> {
    const user = this.getCurrentUser(sessionToken)
    if (!user) {
      throw new Error('Unauthorized')
    }

    // Get full user record
    const fullUser = this.authDb.getUserByUuid(user.uuid)
    if (!fullUser) {
      throw new Error('User not found')
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, fullUser.password_hash)
    if (!isPasswordValid) {
      throw new Error('Password is incorrect')
    }

    // Delete all sessions
    this.authDb.deleteUserSessions(user.uuid)

    // Delete user
    this.authDb.deleteUser(user.uuid)
  }

  /**
   * Clean up expired sessions (should be run periodically)
   */
  cleanupExpiredSessions(): void {
    this.authDb.cleanupExpiredSessions()
  }

  /**
   * Get total user count
   */
  getUserCount(): number {
    return this.authDb.getUserCount()
  }

  /**
   * Check if this is the first run (no users exist)
   */
  isFirstRun(): boolean {
    return this.getUserCount() === 0
  }

  // ─── Private Helper Methods ────────────────────────────────────────────────

  /**
   * Generate a secure random session token
   */
  private generateSessionToken(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  /**
   * Remove password_hash from user object
   */
  private stripPasswordHash(user: AuthUser): AuthUserSafe {
    const { password_hash, ...safeUser } = user
    return safeUser as AuthUserSafe
  }

  /**
   * Validate registration data
   */
  private validateRegistrationData(data: {
    fullName: string
    email: string
    mobile?: string
    password: string
  }): void {
    // Full name validation
    if (!data.fullName || data.fullName.trim().length < 2) {
      throw new Error('Full name must be at least 2 characters')
    }

    // Email validation
    if (!data.email || !this.isValidEmail(data.email.trim())) {
      throw new Error('Please enter a valid email address')
    }

    // Mobile validation (if provided)
    if (data.mobile && data.mobile.trim() && !this.isValidMobile(data.mobile.trim())) {
      throw new Error('Invalid mobile number format')
    }

    // Password validation
    this.validatePassword(data.password)
  }

  /**
   * Validate password strength
   */
  private validatePassword(password: string): void {
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters long')
    }

    if (password.length > 128) {
      throw new Error('Password is too long (max 128 characters)')
    }

    // Check for uppercase letter
    if (!/[A-Z]/.test(password)) {
      throw new Error('Password must contain at least one uppercase letter')
    }

    // Check for lowercase letter
    if (!/[a-z]/.test(password)) {
      throw new Error('Password must contain at least one lowercase letter')
    }

    // Check for number
    if (!/[0-9]/.test(password)) {
      throw new Error('Password must contain at least one number')
    }

    // Check for special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      throw new Error('Password must contain at least one special character')
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Validate Indian mobile number format
   */
  private isValidMobile(mobile: string): boolean {
    // Accept formats: 9876543210, +919876543210, 09876543210
    const mobileRegex = /^(\+91|0)?[6-9]\d{9}$/
    return mobileRegex.test(mobile.replace(/[\s\-()]/g, ''))
  }
}
