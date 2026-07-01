import type { QueryClient } from '@tanstack/react-query'
import { OFFLINE_PET_MUTATION_KEYS } from '@/lib/offline-mutations'
import {
  getFailedUploadCountSnapshot,
  getQueuedUploadCountSnapshot,
  getUploadingCountSnapshot,
  listUploadsSnapshot,
  type PendingUploadView,
} from '@/lib/media-upload-queue'
import {
  getConflictedOperationCountSnapshot,
  getFailedOperationCountSnapshot,
  getOperationIssuesSnapshot,
  getPendingOperationCountSnapshot,
  getSyncingOperationCountSnapshot,
  listOperationsSnapshot,
  type OfflineOperation,
} from '@/offline/operations'

const OFFLINE_MUTATION_KEY_SET = new Set<string>([
  OFFLINE_PET_MUTATION_KEYS.postPets[0],
  OFFLINE_PET_MUTATION_KEYS.putPetsId[0],
  OFFLINE_PET_MUTATION_KEYS.deletePetsId[0],
  OFFLINE_PET_MUTATION_KEYS.putPetsIdStatus[0],
])

const MUTATION_OPERATION_LABELS: Record<string, string> = {
  [OFFLINE_PET_MUTATION_KEYS.postPets[0]]: 'create',
  [OFFLINE_PET_MUTATION_KEYS.putPetsId[0]]: 'update',
  [OFFLINE_PET_MUTATION_KEYS.deletePetsId[0]]: 'delete',
  [OFFLINE_PET_MUTATION_KEYS.putPetsIdStatus[0]]: 'update',
}

export type SyncItemKind = 'mutation' | 'upload' | 'operation'

export type SyncItemStatus =
  | 'pending'
  | 'syncing'
  | 'failed'
  | 'conflicted'
  | 'queued'
  | 'uploading'
  | 'error'

export interface SyncSnapshotCounts {
  pendingMutations: number
  failedMutations: number
  pendingOperations: number
  queuedUploads: number
  syncingOperations: number
  uploadingUploads: number
  failedOperations: number
  conflictedOperations: number
  failedUploads: number
}

export interface SyncSnapshot extends SyncSnapshotCounts {
  activeTotal: number
  issueTotal: number
  hasActiveWork: boolean
  hasIssues: boolean
  isDrained: boolean
}

export interface SyncTableRow {
  id: string
  kind: SyncItemKind
  domain: string
  operation: string
  status: SyncItemStatus
  attempts: number
  lastError?: string
  createdAt: number
  updatedAt: number
  referenceId: string
  actionTargetId: string
  canRetry: boolean
  canDiscard: boolean
}

function countOfflineMutations(queryClient: QueryClient, statuses: Set<string>): number {
  return queryClient
    .getMutationCache()
    .getAll()
    .filter((mutation) => {
      const mutationKey = mutation.options.mutationKey?.[0]
      return (
        typeof mutationKey === 'string' &&
        OFFLINE_MUTATION_KEY_SET.has(mutationKey) &&
        statuses.has(mutation.state.status)
      )
    }).length
}

export function getPendingMutationCountSnapshot(queryClient: QueryClient): number {
  return countOfflineMutations(queryClient, new Set(['pending']))
}

export function getFailedMutationCountSnapshot(queryClient: QueryClient): number {
  return countOfflineMutations(queryClient, new Set(['error']))
}

export function buildSyncSnapshot(queryClient: QueryClient): SyncSnapshot {
  const pendingMutations = getPendingMutationCountSnapshot(queryClient)
  const failedMutations = getFailedMutationCountSnapshot(queryClient)
  const pendingOperations = getPendingOperationCountSnapshot()
  const queuedUploads = getQueuedUploadCountSnapshot()
  const syncingOperations = getSyncingOperationCountSnapshot()
  const uploadingUploads = getUploadingCountSnapshot()
  const failedOperations = getFailedOperationCountSnapshot()
  const conflictedOperations = getConflictedOperationCountSnapshot()
  const failedUploads = getFailedUploadCountSnapshot()

  const activeTotal =
    pendingMutations + pendingOperations + queuedUploads + syncingOperations + uploadingUploads
  const issueTotal = failedMutations + failedOperations + conflictedOperations + failedUploads

  return {
    pendingMutations,
    failedMutations,
    pendingOperations,
    queuedUploads,
    syncingOperations,
    uploadingUploads,
    failedOperations,
    conflictedOperations,
    failedUploads,
    activeTotal,
    issueTotal,
    hasActiveWork: activeTotal > 0,
    hasIssues: issueTotal > 0,
    isDrained: activeTotal === 0,
  }
}

function uploadTargetDomain(target: PendingUploadView['target']): string {
  switch (target.kind) {
    case 'pet-photo':
    case 'pending-pet':
      return 'pet'
    case 'medical-photo':
    case 'pending-medical-record':
      return 'medical_record'
    case 'vaccination-photo':
      return 'vaccination'
    case 'helper-photo':
      return 'helper'
    case 'chat-image':
      return 'chat'
    case 'avatar':
      return 'account'
  }
}

function uploadOperationLabel(target: PendingUploadView['target']): string {
  if (target.kind === 'pending-pet' || target.kind === 'pending-medical-record') {
    return 'create'
  }

  return 'upload'
}

function uploadStatus(status: PendingUploadView['status']): SyncItemStatus {
  if (status === 'uploading') return 'uploading'
  if (status === 'error') return 'error'
  return 'queued'
}

function operationStatus(status: OfflineOperation['status']): SyncItemStatus {
  if (status === 'syncing') return 'syncing'
  if (status === 'failed') return 'failed'
  if (status === 'conflicted') return 'conflicted'
  return 'pending'
}

function mutationStatus(status: string): SyncItemStatus {
  if (status === 'error') return 'failed'
  if (status === 'pending') return 'pending'
  return 'pending'
}

export function listSyncTableRows(queryClient: QueryClient): SyncTableRow[] {
  const rows: SyncTableRow[] = []

  for (const mutation of queryClient.getMutationCache().getAll()) {
    const mutationKey = mutation.options.mutationKey?.[0]
    if (typeof mutationKey !== 'string' || !OFFLINE_MUTATION_KEY_SET.has(mutationKey)) {
      continue
    }

    if (mutation.state.status !== 'pending' && mutation.state.status !== 'error') {
      continue
    }

    const submittedAt = mutation.state.submittedAt
    const error =
      mutation.state.error instanceof Error
        ? mutation.state.error.message
        : typeof mutation.state.error === 'string'
          ? mutation.state.error
          : undefined

    rows.push({
      id: `mutation-${String(mutation.mutationId)}`,
      kind: 'mutation',
      domain: 'pet',
      operation: MUTATION_OPERATION_LABELS[mutationKey] ?? 'update',
      status: mutationStatus(mutation.state.status),
      attempts: mutation.state.failureCount,
      lastError: error,
      createdAt: submittedAt,
      updatedAt: submittedAt,
      referenceId: String(mutation.mutationId),
      actionTargetId: String(mutation.mutationId),
      canRetry: false,
      canDiscard: false,
    })
  }

  for (const upload of listUploadsSnapshot()) {
    rows.push({
      id: `upload-${upload.id}`,
      kind: 'upload',
      domain: uploadTargetDomain(upload.target),
      operation: uploadOperationLabel(upload.target),
      status: uploadStatus(upload.status),
      attempts: upload.attempts,
      lastError: upload.lastError,
      createdAt: upload.createdAt,
      updatedAt: upload.createdAt,
      referenceId: upload.id,
      actionTargetId: upload.id,
      canRetry: upload.status === 'error',
      canDiscard: upload.status === 'error',
    })
  }

  for (const operation of getOperationIssuesSnapshot()) {
    rows.push({
      id: `operation-${operation.id}`,
      kind: 'operation',
      domain: operation.entityType,
      operation: operation.operation,
      status: operationStatus(operation.status),
      attempts: operation.attempts,
      lastError: operation.lastError,
      createdAt: operation.createdAt,
      updatedAt: operation.updatedAt,
      referenceId: operation.idempotencyKey,
      actionTargetId: operation.id,
      canRetry: operation.status === 'failed',
      canDiscard: true,
    })
  }

  const activeOperations = listOperationsSnapshot()
  for (const operation of activeOperations) {
    if (operation.status !== 'pending' && operation.status !== 'syncing') {
      continue
    }

    rows.push({
      id: `operation-${operation.id}`,
      kind: 'operation',
      domain: operation.entityType,
      operation: operation.operation,
      status: operationStatus(operation.status),
      attempts: operation.attempts,
      lastError: operation.lastError,
      createdAt: operation.createdAt,
      updatedAt: operation.updatedAt,
      referenceId: operation.idempotencyKey,
      actionTargetId: operation.id,
      canRetry: false,
      canDiscard: false,
    })
  }

  return rows.sort((left, right) => right.updatedAt - left.updatedAt)
}
