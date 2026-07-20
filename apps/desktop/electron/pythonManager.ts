import { ChildProcess, spawn } from 'child_process'
import path from 'path'
import http from 'http'
import net from 'net'
import fs from 'fs'
import { app } from 'electron'

const isDev = process.env.NODE_ENV === 'development'

export class PythonProcessManager {
  private process: ChildProcess | null = null
  private port: number = 0
  private ready: boolean = false
  private logFile: string

  constructor() {
    const logDir = path.join(app.getPath('userData'), 'logs')
    fs.mkdirSync(logDir, { recursive: true })
    this.logFile = path.join(logDir, 'python-service.log')
  }

  getPort(): number {
    return this.port
  }

  isReady(): boolean {
    return this.ready
  }

  private async findFreePort(): Promise<number> {
    return new Promise((resolve, reject) => {
      const server = net.createServer()
      server.listen(0, '127.0.0.1', () => {
        const address = server.address()
        if (address && typeof address === 'object') {
          const port = address.port
          server.close(() => resolve(port))
        } else {
          reject(new Error('Could not determine free port'))
        }
      })
      server.on('error', reject)
    })
  }

  private getPythonPath(): string {
    if (isDev) {
      // Check both Unix (.venv/bin/python) and Windows (.venv/Scripts/python.exe) virtual environments
      const unixVenv = path.join(__dirname, '../../../apps/processor/.venv/bin/python')
      const winVenv = path.join(__dirname, '../../../apps/processor/.venv/Scripts/python.exe')
      if (fs.existsSync(unixVenv)) return unixVenv
      if (fs.existsSync(winVenv)) return winVenv
      return 'python3' // fallback to python3 in Unix development environments
    }
    // In production
    const unixBundled = path.join(process.resourcesPath, 'processor/.venv/bin/python')
    const winBundled = path.join(process.resourcesPath, 'processor/.venv/Scripts/python.exe')
    if (fs.existsSync(unixBundled)) return unixBundled
    if (fs.existsSync(winBundled)) return winBundled
    return path.join(process.resourcesPath, 'processor/python/python')
  }

  private getProcessorPath(): string {
    if (isDev) {
      return path.join(__dirname, '../../../apps/processor/main.py')
    }
    return path.join(process.resourcesPath, 'processor/main.py')
  }

  async start(): Promise<void> {
    this.port = await this.findFreePort()
    const pythonPath = this.getPythonPath()
    const processorPath = this.getProcessorPath()
    const logStream = fs.createWriteStream(this.logFile, { flags: 'a' })

    console.log(`[PythonManager] Starting Python service on port ${this.port}`)
    console.log(`[PythonManager] Python: ${pythonPath}`)
    console.log(`[PythonManager] Processor: ${processorPath}`)

    this.process = spawn(pythonPath, [processorPath, '--port', String(this.port)], {
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
      },
    })

    this.process.stdout?.pipe(logStream)
    this.process.stderr?.pipe(logStream)

    this.process.on('error', (err) => {
      console.error('[PythonManager] Process error:', err)
      this.ready = false
    })

    this.process.on('exit', (code, signal) => {
      console.log(`[PythonManager] Process exited: code=${code} signal=${signal}`)
      this.ready = false
      this.process = null
    })

    // Wait for the service to be ready
    await this.waitForReady()
  }

  private async waitForReady(maxAttempts = 30, intervalMs = 500): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const healthy = await this.checkHealth()
        if (healthy) {
          this.ready = true
          console.log('[PythonManager] Service is ready')
          return
        }
      } catch {
        // Not ready yet
      }
      await new Promise(resolve => setTimeout(resolve, intervalMs))
    }
    console.warn('[PythonManager] Service did not become ready in time — continuing anyway')
  }

  async checkHealth(): Promise<boolean> {
    return new Promise((resolve) => {
      const req = http.get(
        `http://127.0.0.1:${this.port}/health`,
        { timeout: 2000 },
        (res) => {
          resolve(res.statusCode === 200)
        }
      )
      req.on('error', () => resolve(false))
      req.on('timeout', () => {
        req.destroy()
        resolve(false)
      })
    })
  }

  async stop(): Promise<void> {
    if (!this.process) return
    console.log('[PythonManager] Stopping Python service')
    this.ready = false
    this.process.kill('SIGTERM')
    // Give it 3 seconds to shut down gracefully, then force kill
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        this.process?.kill('SIGKILL')
        resolve()
      }, 3000)
      this.process?.on('exit', () => {
        clearTimeout(timeout)
        resolve()
      })
    })
    this.process = null
  }
}
