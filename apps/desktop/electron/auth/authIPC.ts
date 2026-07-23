import { IpcMain } from 'electron'
import { AuthService } from './authService'

/**
 * Register authentication IPC handlers
 * 
 * All handlers follow security best practices:
 * - Input validation
 * - Error handling with safe error messages
 * - No sensitive data exposure to renderer
 * - Session-based authentication
 */
export function registerAuthIpcHandlers(
  ipcMain: IpcMain,
  authService: AuthService
): void {
  /**
   * Register a new user
   */
  ipcMain.handle(
    'auth:register',
    async (_, data: {
      fullName: string
      email: string
      mobile?: string
      firmName?: string
      password: string
      confirmPassword: string
    }) => {
      try {
        // Validate input
        if (!data || !data.fullName || !data.email || !data.password) {
          return {
            success: false,
            error: 'Please fill in all required fields',
          }
        }

        // Check password match
        if (data.password !== data.confirmPassword) {
          return {
            success: false,
            error: 'Passwords do not match',
          }
        }

        // Sanitize inputs
        const sanitizedData = {
          fullName: data.fullName?.trim() || '',
          email: data.email?.trim().toLowerCase() || '',
          mobile: data.mobile?.trim() || undefined,
          firmName: data.firmName?.trim() || undefined,
          password: data.password,
        }

        // Register user
        const result = await authService.register(sanitizedData)

        return {
          success: true,
          user: result.user,
          sessionToken: result.sessionToken,
        }
      } catch (err: any) {
        console.error('[Auth IPC] Registration error:', err.message)
        return {
          success: false,
          error: err.message || 'Registration failed. Please try again.',
        }
      }
    }
  )

  /**
   * Login user
   */
  ipcMain.handle(
    'auth:login',
    async (_, data: { email: string; password: string }) => {
      try {
        // Validate input
        if (!data || !data.email || !data.password) {
          return {
            success: false,
            error: 'Please enter your email and password',
          }
        }

        // Sanitize inputs
        const email = data.email?.trim() || ''
        const password = data.password || ''

        // Login
        const result = await authService.login(email, password)

        return {
          success: true,
          user: result.user,
          sessionToken: result.sessionToken,
        }
      } catch (err: any) {
        console.error('[Auth IPC] Login error:', err.message)
        return {
          success: false,
          error: err.message || 'Login failed. Please try again.',
        }
      }
    }
  )

  /**
   * Get current user from session token
   */
  ipcMain.handle('auth:get-current-user', async (_, sessionToken: string) => {
    try {
      if (!sessionToken) {
        return { success: false, user: null }
      }

      const user = authService.getCurrentUser(sessionToken)

      if (!user) {
        return { success: false, user: null }
      }

      return {
        success: true,
        user,
      }
    } catch (err: any) {
      console.error('[Auth IPC] Get current user error:', err.message)
      return {
        success: false,
        user: null,
      }
    }
  })

  /**
   * Logout user (delete session)
   */
  ipcMain.handle('auth:logout', async (_, sessionToken: string) => {
    try {
      if (!sessionToken) {
        return { success: true }
      }

      authService.logout(sessionToken)

      return { success: true }
    } catch (err: any) {
      console.error('[Auth IPC] Logout error:', err.message)
      return {
        success: false,
        error: err.message || 'Logout failed',
      }
    }
  })

  /**
   * Logout from all devices
   */
  ipcMain.handle('auth:logout-all', async (_, sessionToken: string) => {
    try {
      if (!sessionToken) {
        return { success: false, error: 'No session token provided' }
      }

      authService.logoutAll(sessionToken)

      return { success: true }
    } catch (err: any) {
      console.error('[Auth IPC] Logout all error:', err.message)
      return {
        success: false,
        error: err.message || 'Failed to logout from all devices',
      }
    }
  })

  /**
   * Update user profile
   */
  ipcMain.handle(
    'auth:update-profile',
    async (_, sessionToken: string, updates: {
      fullName?: string
      mobile?: string
      firmName?: string
    }) => {
      try {
        if (!sessionToken) {
          return { success: false, error: 'Unauthorized' }
        }

        authService.updateProfile(sessionToken, updates)

        // Get updated user
        const user = authService.getCurrentUser(sessionToken)

        return {
          success: true,
          user,
        }
      } catch (err: any) {
        console.error('[Auth IPC] Update profile error:', err.message)
        return {
          success: false,
          error: err.message || 'Failed to update profile',
        }
      }
    }
  )

  /**
   * Change password
   */
  ipcMain.handle(
    'auth:change-password',
    async (_, sessionToken: string, data: {
      currentPassword: string
      newPassword: string
      confirmPassword: string
    }) => {
      try {
        if (!sessionToken) {
          return { success: false, error: 'Unauthorized' }
        }

        // Validate input
        if (!data.currentPassword || !data.newPassword) {
          return {
            success: false,
            error: 'Please fill in all fields',
          }
        }

        // Check password match
        if (data.newPassword !== data.confirmPassword) {
          return {
            success: false,
            error: 'New passwords do not match',
          }
        }

        // Change password
        await authService.changePassword(
          sessionToken,
          data.currentPassword,
          data.newPassword
        )

        return { success: true }
      } catch (err: any) {
        console.error('[Auth IPC] Change password error:', err.message)
        return {
          success: false,
          error: err.message || 'Failed to change password',
        }
      }
    }
  )

  /**
   * Delete account
   */
  ipcMain.handle(
    'auth:delete-account',
    async (_, sessionToken: string, password: string) => {
      try {
        if (!sessionToken) {
          return { success: false, error: 'Unauthorized' }
        }

        if (!password) {
          return {
            success: false,
            error: 'Password is required to delete account',
          }
        }

        await authService.deleteAccount(sessionToken, password)

        return { success: true }
      } catch (err: any) {
        console.error('[Auth IPC] Delete account error:', err.message)
        return {
          success: false,
          error: err.message || 'Failed to delete account',
        }
      }
    }
  )

  /**
   * Check if this is the first run (no users exist)
   */
  ipcMain.handle('auth:is-first-run', async () => {
    try {
      const isFirstRun = authService.isFirstRun()
      return { success: true, isFirstRun }
    } catch (err: any) {
      console.error('[Auth IPC] Is first run error:', err.message)
      return { success: false, isFirstRun: false }
    }
  })

  /**
   * Get user count
   */
  ipcMain.handle('auth:get-user-count', async () => {
    try {
      const count = authService.getUserCount()
      return { success: true, count }
    } catch (err: any) {
      console.error('[Auth IPC] Get user count error:', err.message)
      return { success: false, count: 0 }
    }
  })

  console.log('[Auth IPC] Authentication handlers registered')
}
