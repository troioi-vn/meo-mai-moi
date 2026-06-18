import { describe, expect, it } from 'vite-plus/test'
import { AxiosError } from 'axios'
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import {
  isCsrfExpiredError,
  isTransientAuthBootstrapError,
  isUnauthorizedError,
} from './auth-errors'

function createAxiosError(status?: number, withRequest = false): AxiosError {
  const config = { headers: {} } as InternalAxiosRequestConfig

  if (status === undefined && withRequest) {
    return new AxiosError('Network Error', 'ERR_NETWORK', config, {}, undefined)
  }

  const response: AxiosResponse | undefined =
    status !== undefined
      ? {
          status,
          statusText: '',
          headers: {},
          config,
          data: {},
        }
      : undefined

  return new AxiosError('Error', 'ERR_BAD_REQUEST', config, withRequest ? {} : undefined, response)
}

describe('isUnauthorizedError', () => {
  it('returns true for Axios 401', () => {
    expect(isUnauthorizedError(createAxiosError(401))).toBe(true)
  })

  it('returns false for Axios 403', () => {
    expect(isUnauthorizedError(createAxiosError(403))).toBe(false)
  })

  it('returns false for non-Axios errors', () => {
    expect(isUnauthorizedError(new Error('boom'))).toBe(false)
  })
})

describe('isTransientAuthBootstrapError', () => {
  it('returns true when response status is undefined', () => {
    expect(isTransientAuthBootstrapError(createAxiosError(undefined, true))).toBe(true)
  })

  it('returns true for Axios network errors with request and no response', () => {
    expect(isTransientAuthBootstrapError(createAxiosError(undefined, true))).toBe(true)
  })

  it.each([408, 419, 425, 429, 500, 503])('returns true for status %i', (status) => {
    expect(isTransientAuthBootstrapError(createAxiosError(status))).toBe(true)
  })

  it.each([400, 401, 403])('returns false for status %i', (status) => {
    expect(isTransientAuthBootstrapError(createAxiosError(status))).toBe(false)
  })

  it('returns false for non-Axios errors', () => {
    expect(isTransientAuthBootstrapError(new Error('boom'))).toBe(false)
  })
})

describe('isCsrfExpiredError', () => {
  it('returns true for Axios 419', () => {
    expect(isCsrfExpiredError(createAxiosError(419))).toBe(true)
  })

  it('returns false for other Axios statuses', () => {
    expect(isCsrfExpiredError(createAxiosError(401))).toBe(false)
  })

  it('returns false for non-Axios errors', () => {
    expect(isCsrfExpiredError(new Error('boom'))).toBe(false)
  })
})
