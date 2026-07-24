import { getSupabaseClient, isSupabaseConfigured } from '../supabase/supabaseClient'
import { summarizeSyncQueue } from './syncQueueUtils'

export interface SyncStatus {
  isSyncing: boolean
  lastSyncedAt: Date | null
  error: string | null
  pendingItemsCount: number
  uploadingCount: number
  downloadingCount: number
  conflictCount: number
  failedCount: number
  lastActivity: string | null
}

type SyncStatusListener = (status: SyncStatus) => void

let syncTimer: NodeJS.Timeout | null = null
let runCancelled = false
let currentStatus: SyncStatus = {
  isSyncing: false,
  lastSyncedAt: null,
  error: null,
  pendingItemsCount: 0,
  uploadingCount: 0,
  downloadingCount: 0,
  conflictCount: 0,
  failedCount: 0,
  lastActivity: null,
}

const listeners = new Set<SyncStatusListener>()

function notifyListeners() {
  listeners.forEach(listener => listener({ ...currentStatus }))
}

export const syncService = {
  /**
   * Subscribe to sync status updates
   */
  subscribe(listener: SyncStatusListener): () => void {
    listeners.add(listener)
    listener({ ...currentStatus })
    return () => {
      listeners.delete(listener)
    }
  },

  /**
   * Get the current status
   */
  getStatus(): SyncStatus {
    return { ...currentStatus }
  },

  /**
   * Triggers a full synchronization (Push + Pull)
   */
  async sync(): Promise<{ success: boolean; error?: string }> {
    if (currentStatus.isSyncing) {
      return { success: false, error: 'Synchronization already in progress' }
    }

    if (!navigator.onLine) {
      currentStatus.error = 'Offline. Changes will sync when connectivity returns.'
      currentStatus.lastActivity = 'offline'
      notifyListeners()
      return { success: false, error: currentStatus.error }
    }

    if (!isSupabaseConfigured()) {
      currentStatus.error = 'Supabase is not configured'
      currentStatus.lastActivity = 'config-missing'
      notifyListeners()
      return { success: false, error: currentStatus.error }
    }

    const supabase = getSupabaseClient()
    if (!supabase) {
      currentStatus.error = 'Failed to connect to Supabase client'
      currentStatus.lastActivity = 'client-error'
      notifyListeners()
      return { success: false, error: currentStatus.error }
    }

    currentStatus.isSyncing = true
    runCancelled = false
    currentStatus.error = null
    currentStatus.lastActivity = 'syncing'
    notifyListeners()

    try {
      const pushResult = await this.pushLocalChanges()
      const pullResult = await this.pullRemoteChanges()

      if (window.electronAPI?.db) {
        await window.electronAPI.db.insertSyncLog({
          id: `sync-log-${Date.now()}`,
          action: 'pull',
          status: 'success',
          conflicts_count: 0,
          description: `Push: ${pushResult.syncedCount} changes. Pull: ${pullResult.pulledCount} updates.`,
        }).catch(console.error)
      }

      currentStatus.lastSyncedAt = new Date()
      currentStatus.lastActivity = 'synced'
      localStorage.setItem('ca-copilot-last-synced-at', currentStatus.lastSyncedAt.toISOString())
      return { success: true }
    } catch (err: any) {
      console.error('Synchronization failed:', err)
      currentStatus.error = err.message || 'Sync failed.'
      currentStatus.lastActivity = 'failed'

      if (window.electronAPI?.db) {
        await window.electronAPI.db.insertSyncLog({
          id: `sync-log-${Date.now()}`,
          action: 'push',
          status: 'failed',
          conflicts_count: 0,
          description: `Error: ${currentStatus.error}`,
        }).catch(console.error)
      }

      return { success: false, error: currentStatus.error ?? undefined }
    } finally {
      currentStatus.isSyncing = false
      await this.updatePendingCount()
      notifyListeners()
    }
  },

  /**
   * Push mutations from local queue to Supabase
   */
  async pushLocalChanges(): Promise<{ success: boolean; syncedCount: number }> {
    const db = window.electronAPI.db
    const queue = await db.getPendingSyncQueue()
    const supabase = getSupabaseClient()
    
    if (!supabase || queue.length === 0) {
      return { success: true, syncedCount: 0 }
    }

    let syncedCount = 0

    const queueItems = await db.getPendingSyncQueue()
    const queueSummary = summarizeSyncQueue(queueItems as Array<{ status?: string }>)
    currentStatus.pendingItemsCount = queueSummary.pendingCount
    currentStatus.failedCount = queueSummary.failedCount
    currentStatus.conflictCount = queueSummary.conflictCount

    // Fetch the active user to bind user tags
    const session = localStorage.getItem('ca-copilot-auth-session')
    const activeUserId = session ? JSON.parse(session).user?.uuid : null
    const activeUserOrgId = session ? JSON.parse(session).user?.organization_id : null

    for (const item of queue) {
      if (runCancelled) break
      const record = await db.getRecordData(item.table_name, item.record_local_id)
      
      if (!record) {
        // Record was purged or doesn't exist, remove from sync queue
        await db.deleteSyncQueueEntry(item.id)
        continue
      }

      try {
        await db.updateSyncQueueStatus(item.id, 'uploading').catch(console.error)

        const cloudPayload = {
          ...record,
          organization_id: record.organization_id || activeUserOrgId,
          updated_at: new Date().toISOString(),
          deleted_at: record.deleted_at || null,
        }

        // Remove local SQLite specific columns before sending to Postgres
        delete cloudPayload.id
        delete cloudPayload.cloud_id
        delete cloudPayload.sync_status
        delete cloudPayload.last_synced_at

        let response: any

        if (item.action === 'delete') {
          // Soft delete in Postgres
          response = await supabase
            .from(item.table_name)
            .update({ deleted_at: new Date().toISOString(), version_number: (record.version_number || 1) + 1 })
            .eq('id', record.cloud_id)
            .select()
        } else {
          // Upsert in PostgreSQL
          if (record.cloud_id) {
            // Update
            response = await supabase
              .from(item.table_name)
              .update({
                ...cloudPayload,
                version_number: (record.version_number || 1) + 1,
                updated_by: activeUserId,
              })
              .eq('id', record.cloud_id)
              .select()
          } else {
            // Insert new record
            response = await supabase
              .from(item.table_name)
              .insert({
                ...cloudPayload,
                id: record.id, // Keep the same ID for reference
                version_number: 1,
                created_by: activeUserId,
              })
              .select()
          }
        }

        if (response.error) {
          throw new Error(response.error.message)
        }

        const cloudRecord = response.data?.[0]
        if (cloudRecord) {
          await db.updateRecordSyncStatus(
            item.table_name,
            item.record_local_id,
            cloudRecord.id,
            'synced',
            cloudRecord.version_number,
            new Date().toISOString()
          )
        }

        await db.updateSyncQueueStatus(item.id, 'synced').catch(console.error)
        await db.deleteSyncQueueEntry(item.id)
        syncedCount++
      } catch (err: any) {
        console.error(`Failed to push record ${item.record_local_id} from table ${item.table_name}:`, err)
        await db.updateSyncQueueError(item.id, err.message || 'Push failure')
      }
    }

    return { success: true, syncedCount }
  },

  /**
   * Pull updates from Supabase and merge locally
   */
  async pullRemoteChanges(): Promise<{ success: boolean; pulledCount: number }> {
    const db = window.electronAPI.db
    const supabase = getSupabaseClient()

    if (!supabase) {
      return { success: true, pulledCount: 0 }
    }

    const tables = ['clients', 'documents', 'tasks']
    let pulledCount = 0
    currentStatus.downloadingCount = 1

    const lastPullTimeStr = localStorage.getItem('ca-copilot-last-synced-at')
    const lastPullQuery = lastPullTimeStr
      ? new Date(lastPullTimeStr).toISOString()
      : new Date(0).toISOString()

    for (const table of tables) {
      const { data: remoteRecords, error } = await supabase
        .from(table)
        .select('*')
        .gt('updated_at', lastPullQuery)

      if (error) {
        console.error(`Failed to pull from table ${table}:`, error.message)
        continue
      }

      if (!remoteRecords || remoteRecords.length === 0) {
        continue
      }

      for (const remoteRecord of remoteRecords) {
        const localRecord = await db.getRecordData(table, remoteRecord.id)

        if (!localRecord) {
          const localInsertPayload = {
            ...remoteRecord,
            cloud_id: remoteRecord.id,
            sync_status: 'synced',
            last_synced_at: new Date().toISOString(),
          }
          await db.applySyncUpdate(table, localInsertPayload)
          pulledCount++
          continue
        }

        const localVer = localRecord.version_number || 1
        const remoteVer = remoteRecord.version_number || 1

        if (remoteVer > localVer) {
          const isLocalDirty = ['pending_upload', 'conflict', 'retrying'].includes(localRecord.sync_status)
          if (!isLocalDirty) {
            const localUpdatePayload = {
              ...remoteRecord,
              cloud_id: remoteRecord.id,
              sync_status: 'synced',
              last_synced_at: new Date().toISOString(),
            }
            await db.applySyncUpdate(table, localUpdatePayload)
            pulledCount++
          } else {
            const conflictId = `conflict-${table}-${remoteRecord.id}-${Date.now()}`
            await db.insertSyncConflict({
              id: conflictId,
              tableName: table,
              recordId: remoteRecord.id,
              localPayload: localRecord,
              remotePayload: remoteRecord,
            })
            await db.updateRecordSyncStatus(table, localRecord.id, remoteRecord.id, 'conflict', localVer, localRecord.last_synced_at || '')
            currentStatus.conflictCount += 1
          }
        }
      }
    }

    return { success: true, pulledCount }
  },

  /**
   * Refresh local pending sync items counter
   */
  async updatePendingCount(): Promise<number> {
    if (window.electronAPI?.db) {
      try {
        const queue = await window.electronAPI.db.getPendingSyncQueue()
        const summary = summarizeSyncQueue(queue as Array<{ status?: string }>)
        currentStatus.pendingItemsCount = summary.pendingCount
        currentStatus.uploadingCount = summary.uploadingCount
        currentStatus.downloadingCount = summary.downloadingCount
        currentStatus.failedCount = summary.failedCount
        currentStatus.conflictCount = summary.conflictCount
        notifyListeners()
        return summary.pendingCount
      } catch {
        return 0
      }
    }
    return 0
  },

  /**
   * Start background sync timer loop
   */
  start(intervalMinutes = 15) {
    this.stop()

    // A crash or app close must not leave work permanently marked uploading.
    // Recover before the first run so a previously claimed item is eligible again.
    const recover = window.electronAPI?.db.recoverInterruptedSyncOperations()
    Promise.resolve(recover).catch(console.error).finally(() => this.sync().catch(console.error))

    syncTimer = setInterval(() => {
      if (navigator.onLine) {
        this.sync().catch(console.error)
      }
    }, Math.max(10000, intervalMinutes * 60 * 1000))

    window.addEventListener('online', this.handleConnectionRestore)
    window.addEventListener('offline', this.handleConnectionLost)
    this.updatePendingCount().catch(console.error)
  },

  /**
   * Stop synchronization timer loops
   */
  stop() {
    runCancelled = true
    if (syncTimer) {
      clearInterval(syncTimer)
      syncTimer = null
    }
    window.removeEventListener('online', this.handleConnectionRestore)
    window.removeEventListener('offline', this.handleConnectionLost)
  },

  handleConnectionRestore() {
    console.log('Internet connected. Triggering auto synchronization...')
    syncService.sync().catch(console.error)
  },

  handleConnectionLost() {
    currentStatus.error = 'Offline. Local changes are queued pending reconnect.'
    currentStatus.lastActivity = 'offline'
    notifyListeners()
  }
}
