import { app, BrowserWindow, shell, ipcMain, dialog, nativeTheme } from 'electron'
import path from 'path'
import { PythonProcessManager } from './pythonManager'
import { registerIpcHandlers } from './ipcHandlers'
import { DatabaseManager } from './database'
import { AuthDatabaseManager } from './auth/authDatabase'
import { AuthService } from './auth/authService'
import { registerAuthIpcHandlers } from './auth/authIPC'

const isDev = process.env.NODE_ENV === 'development'

let mainWindow: BrowserWindow | null = null
let pythonManager: PythonProcessManager | null = null
let dbManager: DatabaseManager | null = null
let authDbManager: AuthDatabaseManager | null = null
let authService: AuthService | null = null

function getPreloadPath(): string {
  return isDev
    ? path.join(__dirname, 'preload.js')
    : path.join(__dirname, 'preload.js')
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    frame: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0f172a',
      symbolColor: '#94a3b8',
      height: 36,
    },
    backgroundColor: '#0f172a',
    show: false,
    icon: path.join(__dirname, '../assets/icon.png'),
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // needed for preload to use require
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  })

  // Load the app
  if (isDev) {
    await mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

async function initializeApp() {
  // Initialize database
  dbManager = new DatabaseManager()
  await dbManager.initialize()

  // Initialize authentication database
  authDbManager = new AuthDatabaseManager()
  await authDbManager.initialize()

  // Initialize authentication service
  authService = new AuthService(authDbManager)

  // Clean up expired sessions on startup
  authService.cleanupExpiredSessions()

  // Start Python service
  pythonManager = new PythonProcessManager()
  await pythonManager.start()

  // Register all IPC handlers
  registerIpcHandlers(ipcMain, pythonManager, dbManager)

  // Register authentication IPC handlers
  registerAuthIpcHandlers(ipcMain, authService)

  // Create the window
  await createWindow()
}

app.whenReady().then(async () => {
  try {
    await initializeApp()
  } catch (err) {
    console.error('Failed to initialize app:', err)
  }

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow()
    }
  })
})

app.on('window-all-closed', async () => {
  // Clean up Python process
  if (pythonManager) {
    await pythonManager.stop()
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', async () => {
  if (pythonManager) {
    await pythonManager.stop()
  }
})

// Security: prevent navigation away from app
app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (event, url) => {
    const allowedUrls = ['http://localhost:5173', 'file://']
    const isAllowed = allowedUrls.some(allowed => url.startsWith(allowed))
    if (!isAllowed) {
      event.preventDefault()
    }
  })
})
