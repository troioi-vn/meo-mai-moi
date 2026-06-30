import axios from 'axios'
import { describe, expect, it } from 'vite-plus/test'
import { isRetryableOperationError, operationErrorMessage } from './replay-errors'

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
})
