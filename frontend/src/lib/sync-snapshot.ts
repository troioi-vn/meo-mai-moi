import type { QueryClient } from '@tanstack/react-query'
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
import { conflictResolutionSupport, formatConflictPreview } from '@/offline/conflicts'

export type SyncItemKind = 'upload' | 'operation'

export type SyncItemStatus =
  | 'pending'
  | 'syncing'
  | 'failed'
  | 'conflicted'
  | 'queued'
  | 'uploading'
  | 'error'

export interface SyncSnapshotCounts {
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
  canKeepMine: boolean
  canUseServer: boolean
  conflictLocalPreview?: string
  conflictServerPreview?: string
}

export function buildSyncSnapshot(_queryClient: QueryClient): SyncSnapshot {
  const pendingOperations = getPendingOperationCountSnapshot()
  const queuedUploads = getQueuedUploadCountSnapshot()
  const syncingOperations = getSyncingOperationCountSnapshot()
  const uploadingUploads = getUploadingCountSnapshot()
  const failedOperations = getFailedOperationCountSnapshot()
  const conflictedOperations = getConflictedOperationCountSnapshot()
  const failedUploads = getFailedUploadCountSnapshot()

  const activeTotal = pendingOperations + queuedUploads + syncingOperations + uploadingUploads
  const issueTotal = failedOperations + conflictedOperations + failedUploads

  return {
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

function operationRowActions(operation: OfflineOperation) {
  const resolution = conflictResolutionSupport(operation.entityType, operation.operation)
  const hasServerVersion = typeof operation.conflictMetadata?.serverVersion === 'string'
  const hasServerValue = operation.conflictMetadata?.serverValue !== undefined

  return {
    canRetry: operation.status === 'failed',
    canDiscard: operation.status === 'failed' || operation.status === 'conflicted',
    canKeepMine: operation.status === 'conflicted' && resolution.canKeepMine && hasServerVersion,
    canUseServer: operation.status === 'conflicted' && resolution.canUseServer && hasServerValue,
    conflictLocalPreview:
      operation.status === 'conflicted'
        ? formatConflictPreview(
            operation.conflictMetadata?.localAttemptedValue ?? operation.payload
          )
        : undefined,
    conflictServerPreview:
      operation.status === 'conflicted'
        ? formatConflictPreview(operation.conflictMetadata?.serverValue)
        : undefined,
  }
}

export function listSyncTableRows(_queryClient: QueryClient): SyncTableRow[] {
  const rows: SyncTableRow[] = []

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
      canKeepMine: false,
      canUseServer: false,
    })
  }

  for (const operation of getOperationIssuesSnapshot()) {
    const actions = operationRowActions(operation)
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
      ...actions,
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
      canKeepMine: false,
      canUseServer: false,
    })
  }

  return rows.sort((left, right) => right.updatedAt - left.updatedAt)
}
