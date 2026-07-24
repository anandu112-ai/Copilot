export interface SyncQueueSummary {
  pendingCount: number
  uploadingCount: number
  downloadingCount: number
  syncedCount: number
  conflictCount: number
  failedCount: number
  retryingCount: number
  cancelledCount: number
  needsAttention: boolean
}

export function summarizeSyncQueue(items: Array<{ status?: string; action?: string; retry_count?: number }>, pendingCountOverride?: number): SyncQueueSummary {
  const counts = (items ?? []).reduce((acc, item) => {
    const status = (item.status || 'pending').toLowerCase()
    if (status === 'pending') acc.pendingCount += 1
    if (status === 'uploading') acc.uploadingCount += 1
    if (status === 'downloading') acc.downloadingCount += 1
    if (status === 'synced') acc.syncedCount += 1
    if (status === 'conflict') acc.conflictCount += 1
    if (status === 'failed') acc.failedCount += 1
    if (status === 'retrying') acc.retryingCount += 1
    if (status === 'cancelled') acc.cancelledCount += 1
    return acc
  }, {
    pendingCount: 0,
    uploadingCount: 0,
    downloadingCount: 0,
    syncedCount: 0,
    conflictCount: 0,
    failedCount: 0,
    retryingCount: 0,
    cancelledCount: 0,
  })

  const pendingCount = pendingCountOverride ?? counts.pendingCount
  return {
    ...counts,
    pendingCount,
    needsAttention: pendingCount > 0 || counts.failedCount > 0 || counts.conflictCount > 0,
  }
}
