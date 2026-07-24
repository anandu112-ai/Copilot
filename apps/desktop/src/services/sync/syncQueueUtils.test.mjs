import assert from 'node:assert/strict'
import test from 'node:test'
import { summarizeSyncQueue } from './syncQueueUtils.ts'

test('summarizeSyncQueue counts pending and failed items', () => {
  const summary = summarizeSyncQueue([
    { status: 'pending' },
    { status: 'pending' },
    { status: 'failed' },
    { status: 'synced' },
  ], 2)

  assert.equal(summary.pendingCount, 2)
  assert.equal(summary.failedCount, 1)
  assert.equal(summary.conflictCount, 0)
  assert.equal(summary.needsAttention, true)
})
