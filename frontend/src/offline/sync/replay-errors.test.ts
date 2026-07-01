import axios from 'axios'
import { describe, expect, it } from 'vite-plus/test'
import type { OfflineOperation } from '@/offline/operations'
import {
  classifyOperationReplayError,
  extractConflictMetadata,
  isAuthOperationError,
  isConflictOperationError,
  isRetryableOperationError,
  isValidationOperationError,
  operationErrorMessage,
} from './replay-errors'

const baseOperation: OfflineOperation = {
  id: 'op-1',
  idempotencyKey: 'idem-1',
  entityType: 'weight',
  entityId: 1,
  operation: 'update',
  payload: { petId: 1, weightId: 1, weight_kg: 5.5 },
  baseVersion: '2024-01-01T00:00:00.000000Z',
  status: 'pending',
  attempts: 0,
  createdAt: 1,
  updatedAt: 1,
}

describe('replay-errors', () => {
  describe('operationErrorMessage', () => {
    it('returns envelope message from axios errors', () => {
      const error = new axios.AxiosError(
        'Request failed',
        'ERR_BAD_REQUEST',
        undefined,
        undefined,
        {
          status: 422,
          statusText: 'Unprocessable Entity',
          headers: {},
          config: {} as never,
          data: {
            success: false,
            message: 'The record date has already been taken for this pet.',
          },
        }
      )

      expect(operationErrorMessage(error)).toBe(
        'The record date has already been taken for this pet.'
      )
    })

    it('falls back to axios message when envelope message is missing', () => {
      const error = new axios.AxiosError('Network Error', 'ERR_NETWORK')

      expect(operationErrorMessage(error)).toBe('Network Error')
    })

    it('returns Error.message for generic errors', () => {
      expect(operationErrorMessage(new Error('Something broke'))).toBe('Something broke')
    })

    it('returns a default message for unknown values', () => {
      expect(operationErrorMessage(null)).toBe('Unknown error')
    })
  })

  describe('isRetryableOperationError', () => {
    it('treats network failures without a response as retryable', () => {
      const error = new axios.AxiosError('Network Error', 'ERR_NETWORK')

      expect(isRetryableOperationError(error)).toBe(true)
    })

    it('treats HTTP 425 as retryable', () => {
      const error = {
        response: { status: 425 },
      }

      expect(isRetryableOperationError(error)).toBe(true)
    })

    it('treats 5xx responses as retryable', () => {
      const error = {
        response: { status: 503 },
      }

      expect(isRetryableOperationError(error)).toBe(true)
    })

    it('treats validation failures as non-retryable', () => {
      const error = {
        response: { status: 422 },
      }

      expect(isRetryableOperationError(error)).toBe(false)
    })
  })

  describe('classifyOperationReplayError', () => {
    it('classifies structured version conflicts separately from validation failures', () => {
      const conflictError = new axios.AxiosError(
        'Conflict',
        'ERR_BAD_REQUEST',
        undefined,
        undefined,
        {
          status: 409,
          statusText: 'Conflict',
          headers: {},
          config: {} as never,
          data: {
            success: false,
            message: 'Version conflict',
            data: {
              server_value: { weight_kg: 4.2 },
              server_version: '2024-02-01T00:00:00.000000Z',
              client_base_version: '2024-01-01T00:00:00.000000Z',
            },
          },
        }
      )

      expect(classifyOperationReplayError(conflictError, baseOperation)).toEqual({
        kind: 'conflict',
        message: 'Version conflict',
        conflictMetadata: {
          localAttemptedValue: baseOperation.payload,
          serverValue: { weight_kg: 4.2 },
          clientBaseVersion: '2024-01-01T00:00:00.000000Z',
          serverVersion: '2024-02-01T00:00:00.000000Z',
          operationId: 'op-1',
          idempotencyKey: 'idem-1',
        },
      })

      const validationError = {
        response: { status: 422 },
      }

      expect(classifyOperationReplayError(validationError, baseOperation)).toEqual({
        kind: 'validation',
        message: 'Unknown error',
      })
    })

    it('classifies auth errors as non-retryable failures', () => {
      expect(isAuthOperationError({ response: { status: 401 } })).toBe(true)
      expect(isValidationOperationError({ response: { status: 422 } })).toBe(true)
      expect(isConflictOperationError({ response: { status: 409 } })).toBe(true)
      expect(classifyOperationReplayError({ response: { status: 403 } }, baseOperation).kind).toBe(
        'auth'
      )
    })
  })

  describe('extractConflictMetadata', () => {
    it('returns minimal metadata for idempotency conflicts', () => {
      const error = new axios.AxiosError('Conflict', 'ERR_BAD_REQUEST', undefined, undefined, {
        status: 409,
        statusText: 'Conflict',
        headers: {},
        config: {} as never,
        data: {
          success: false,
          message: 'Idempotency conflict',
          data: null,
        },
      })

      expect(extractConflictMetadata(error, baseOperation)).toEqual({
        localAttemptedValue: baseOperation.payload,
        serverValue: undefined,
        clientBaseVersion: baseOperation.baseVersion,
        serverVersion: undefined,
        operationId: 'op-1',
        idempotencyKey: 'idem-1',
      })
    })
  })
})
