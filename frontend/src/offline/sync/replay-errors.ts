import axios from 'axios'
import { extractHttpStatus, isRetryableHttpError } from '@/offline/queue-core'

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
