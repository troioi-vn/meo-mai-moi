import type { AxiosError } from 'axios'

export const STORAGE_LIMIT_ERROR_CODE = 'STORAGE_LIMIT_EXCEEDED'
export const STORAGE_LIMIT_EXCEEDED_EVENT = 'storage-limit-exceeded'

interface ApiErrorPayload {
  error_code?: unknown
  code?: unknown
}

export function getApiErrorCode(data: unknown): string | null {
  if (!data || typeof data !== 'object') {
    return null
  }

  const payload = data as ApiErrorPayload
  if (typeof payload.error_code === 'string') {
    return payload.error_code
  }

  if (typeof payload.code === 'string') {
    return payload.code
  }

  return null
}

export function isStorageLimitExceededError(error: unknown): boolean {
  const maybeAxiosError = error as AxiosError<{ error_code?: string; code?: string }>
  const code = getApiErrorCode(maybeAxiosError.response?.data)

  return code === STORAGE_LIMIT_ERROR_CODE
}
