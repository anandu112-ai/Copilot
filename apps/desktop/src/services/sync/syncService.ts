import { getSupabaseClient, isSupabaseConfigured } from '../supabase/supabaseClient'

export interface SyncStatus {
  isSyncing: boolean
  lastSyncedAt: Date | null
  error: string | null
  pendingItemsCount: number
}

type SyncStatusListener = (status: SyncStatus) => void

let syncTimer: NodeJS.Timeout | null = null
let currentStatus: SyncStatus = {
  isSyncing: false,
  lastSyncedAt: null,
  error: null,
  pendingItemsCount: 0,
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

    if (!isSupabaseConfigured()) {
      return { success: false, error: 'Supabase is not configured' }
    }

    const supabase = getSupabaseClient()
    if (!supabase) {
      return { success: false, error: 'Failed to connect to Supabase client' }
    }

    currentStatus.isSyncing = true
    currentStatus.error = null
    notifyListeners()

    try {
      // 1. Push local edits to Supabase
      const pushResult = await this.pushLocalChanges()
      
      // 2. Pull remote edits from Supabase
      const pullResult = await this.pullRemoteChanges()

      // 3. Log the sync result in SQLite history
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
      localStorage.setItem('ca-copilot-last-synced-at', currentStatus.lastSyncedAt.toISOString())
      
      return { success: true }
    } catch (err: any) {
      console.error('Synchronization failed:', err)
      currentStatus.error = err.message || 'Sync failed.'
      
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

    // Fetch the active user to bind user tags
    const session = localStorage.getItem('ca-copilot-auth-session')
    const activeUserId = session ? JSON.parse(session).user?.uuid : null
    const activeUserOrgId = session ? JSON.parse(session).user?.organization_id : null

    for (const item of queue) {
      const record = await db.getRecordData(item.table_name, item.record_local_id)
      
      if (!record) {
        // Record was purged or doesn't exist, remove from sync queue
        await db.deleteSyncQueueEntry(item.id)
        continue
      }

      try {
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

        // Successfully synced!
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

    // Fetch the last pull date
    const lastPullTimeStr = localStorage.getItem('ca-copilot-last-synced-at')
    const lastPullQuery = lastPullTimeStr 
      ? new Date(lastPullTimeStr).toISOString() 
      : new Date(0).toISOString()

    for (const table of tables) {
      // Query remote database for entries modified since last sync
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
          // Record doesn't exist locally, insert it directly
          const localInsertPayload = {
            ...remoteRecord,
            cloud_id: remoteRecord.id,
            sync_status: 'synced',
            last_synced_at: new Date().toISOString(),
          }
          await db.applySyncUpdate(table, localInsertPayload)
          pulledCount++
        } else {
          // Compare versions and timestamps to resolve conflicts
          const localVer = localRecord.version_number || 1
          const remoteVer = remoteRecord.version_number || 1
          
          if (remoteVer > localVer) {
            if (localRecord.sync_status === 'synced') {
              // Safe to overwrite local cache
              const localUpdatePayload = {
                ...remoteRecord,
                cloud_id: remoteRecord.id,
                sync_status: 'synced',
                last_synced_at: new Date().toISOString(),
              }
              await db.applySyncUpdate(table, localUpdatePayload)
              pulledCount++
            } else {
              // Mutation exists on both: Conflict!
              console.warn(`Conflict detected in table ${table} on record ${remoteRecord.id}`)
              await db.updateRecordSyncStatus(
                table,
                localRecord.id,
                remoteRecord.id,
                'conflict',
                localVer,
                localRecord.last_synced_at || ''
              )
            }
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
        currentStatus.pendingItemsCount = queue.length
        notifyListeners()
        return queue.length
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
    
    // Initial sync check
    this.sync().catch(console.error)

    // Setup periodic sync loop
    syncTimer = setInterval(() => {
      if (navigator.onLine) {
        this.sync().catch(console.error)
      }
    }, intervalMinutes * 60 * 1000)

    // Listen for connection changes
    window.addEventListener('online', this.handleConnectionRestore)
    
    // Active count checks
    this.updatePendingCount().catch(console.error)
  },

  /**
   * Stop synchronization timer loops
   */
  stop() {
    if (syncTimer) {
      clearInterval(syncTimer)
      syncTimer = null
    }
    window.removeEventListener('online', this.handleConnectionRestore)
  },

  handleConnectionRestore() {
    console.log('Internet connected. Triggering auto synchronization...')
    syncService.sync().catch(console.error)
  }
}
