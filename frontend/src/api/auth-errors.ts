import axios from 'axios'

export const TRANSIENT_AUTH_ERROR_STATUSES = new Set([408, 419, 425, 429])

export function isUnauthorizedError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 401
}

export function isTransientAuthBootstrapError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false

  const status = error.response?.status
  return status === undefined || status >= 500 || TRANSIENT_AUTH_ERROR_STATUSES.has(status)
}

export function isCsrfExpiredError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 419
}
