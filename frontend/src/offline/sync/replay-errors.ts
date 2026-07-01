import axios from 'axios'
import { extractHttpStatus, isRetryableHttpError } from '@/offline/queue-core'
import type { OfflineOperation, OperationConflictMetadata } from '@/offline/operations/types'
import type { OperationReplayErrorClassification, OperationReplayErrorKind } from './replay-request'

export function operationErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const responseData: unknown = error.response?.data
    if (responseData && typeof responseData === 'object' && 'message' in responseData) {
      const message = (responseData as { message?: unknown }).message
      if (typeof message === 'string' && message.length > 0) {
        return message
      }
    }

    return error.message
  }

  return error instanceof Error ? error.message : 'Unknown error'
}

export function isAuthOperationError(error: unknown): boolean {
  const status = extractHttpStatus(error)
  return status === 401 || status === 403
}

export function isValidationOperationError(error: unknown): boolean {
  return extractHttpStatus(error) === 422
}

export function isConflictOperationError(error: unknown): boolean {
  return extractHttpStatus(error) === 409
}

export function isRetryableOperationError(error: unknown): boolean {
  if (axios.isAxiosError(error) && !error.response) {
    return true
  }

  const status = extractHttpStatus(error)
  if (status === 425) {
    return true
  }

  return isRetryableHttpError(error)
}

function isStructuredVersionConflictData(data: unknown): data is {
  server_value?: unknown
  server_version?: string
  client_base_version?: string
} {
  return (
    data !== null &&
    typeof data === 'object' &&
    ('server_value' in data || 'server_version' in data || 'client_base_version' in data)
  )
}

export function extractConflictMetadata(
  error: unknown,
  operation: OfflineOperation
): OperationConflictMetadata | undefined {
  if (!axios.isAxiosError(error) || error.response?.status !== 409) {
    return undefined
  }

  const responseData: unknown = error.response.data
  const envelopeData =
    responseData && typeof responseData === 'object' && 'data' in responseData
      ? (responseData as { data?: unknown }).data
      : undefined

  if (isStructuredVersionConflictData(envelopeData)) {
    return {
      localAttemptedValue: operation.payload,
      serverValue: envelopeData.server_value,
      clientBaseVersion: envelopeData.client_base_version ?? operation.baseVersion,
      serverVersion: envelopeData.server_version,
      operationId: operation.id,
      idempotencyKey: operation.idempotencyKey,
    }
  }

  return {
    localAttemptedValue: operation.payload,
    serverValue: undefined,
    clientBaseVersion: operation.baseVersion,
    serverVersion: undefined,
    operationId: operation.id,
    idempotencyKey: operation.idempotencyKey,
  }
}

function replayErrorKind(error: unknown): OperationReplayErrorKind {
  if (isRetryableOperationError(error)) {
    return 'retryable'
  }

  if (isConflictOperationError(error)) {
    return 'conflict'
  }

  if (isAuthOperationError(error)) {
    return 'auth'
  }

  if (isValidationOperationError(error)) {
    return 'validation'
  }

  return 'failed'
}

export function classifyOperationReplayError(
  error: unknown,
  operation: OfflineOperation
): OperationReplayErrorClassification {
  const kind = replayErrorKind(error)
  const message = operationErrorMessage(error)

  if (kind === 'conflict') {
    const conflictMetadata =
      extractConflictMetadata(error, operation) ??
      ({
        localAttemptedValue: operation.payload,
        clientBaseVersion: operation.baseVersion,
        operationId: operation.id,
        idempotencyKey: operation.idempotencyKey,
      } satisfies OperationConflictMetadata)

    return {
      kind,
      message,
      conflictMetadata,
    }
  }

  return { kind, message }
}

export function replayFailureStatus(
  classification: OperationReplayErrorClassification
): 'pending' | 'conflicted' | 'failed' {
  if (classification.kind === 'retryable') {
    return 'pending'
  }

  if (classification.kind === 'conflict') {
    return 'conflicted'
  }

  return 'failed'
}
