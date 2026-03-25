import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { AxiosResponse } from 'axios'
import i18n from '@/i18n'
import { getApiErrorCode, STORAGE_LIMIT_ERROR_CODE, STORAGE_LIMIT_EXCEEDED_EVENT } from '@/lib/storage-limit'

/**
 * Axios's built-in type for response interceptors.
 * Our interceptors deliberately return the unwrapped data (not AxiosResponse)
 * because axios.d.ts overrides make Axios methods return Promise<R> directly.
 * We use this type to cast the interceptor and satisfy the type system.
 */
type AxiosResponseInterceptor = (
  value: AxiosResponse<unknown>
) => AxiosResponse<unknown> | Promise<AxiosResponse<unknown>>

type CsrfRetryConfig = InternalAxiosRequestConfig & {
  _csrfRetried?: boolean
}

// Use absolute API base in tests so MSW handlers match and requests don't hang
const API_BASE = import.meta.env.MODE === 'test' ? 'http://localhost:3000/api' : '/api'

// Auth API base points to Fortify routes (no /api prefix)
const AUTH_API_BASE = import.meta.env.MODE === 'test' ? 'http://localhost:3000' : ''

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // send cookies
  headers: {
    Accept: 'application/json',
  },
})

// Separate axios instance for Fortify auth routes (login, register, logout, password reset)
export const authApi = axios.create({
  baseURL: AUTH_API_BASE,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
  },
})

type UnauthorizedHandler = (() => void) | null
let unauthorizedHandler: UnauthorizedHandler = null

export const setUnauthorizedHandler = (handler: UnauthorizedHandler) => {
  unauthorizedHandler = handler
}

export const SKIP_UNAUTHORIZED_REDIRECT_HEADER = 'X-Skip-Unauthorized-Redirect'

const shouldSkipUnauthorizedHandler = (error: AxiosError): boolean => {
  const headers = error.config?.headers
  if (!headers) return false

  const axiosHeaders = headers as { get?: (name: string) => unknown }
  if (typeof axiosHeaders.get === 'function') {
    return axiosHeaders.get(SKIP_UNAUTHORIZED_REDIRECT_HEADER) === '1'
  }

  const rawHeaders = headers as Record<string, unknown>
  const skipValue =
    rawHeaders[SKIP_UNAUTHORIZED_REDIRECT_HEADER] ??
    rawHeaders[SKIP_UNAUTHORIZED_REDIRECT_HEADER.toLowerCase()]

  return skipValue === '1'
}

// --- App version mismatch detection ---
// Remembers the first version seen from the API. When a newer version appears,
// fires the callback so the UI layer can decide how to notify the user.
let knownAppVersion: string | null = null

type VersionMismatchHandler = (() => void) | null
let versionMismatchHandler: VersionMismatchHandler = null

export const setVersionMismatchHandler = (handler: VersionMismatchHandler) => {
  versionMismatchHandler = handler
}

const checkAppVersion = (response: AxiosResponse<unknown>) => {
  const serverVersion = response.headers['x-app-version'] as string | undefined
  if (typeof serverVersion !== 'string' || !serverVersion) return

  if (knownAppVersion === null) {
    knownAppVersion = serverVersion
    return
  }

  if (serverVersion !== knownAppVersion) {
    versionMismatchHandler?.()
  }
}

api.interceptors.request.use(
  (config) => {
    // Add Accept-Language header for i18n
    config.headers['Accept-Language'] = i18n.language || 'en'

    // Ensure public legal terms endpoint is locale-stable even if proxies/CDNs drop Accept-Language.
    if (config.url?.includes('/legal/placement-terms')) {
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
      const locale = i18n.resolvedLanguage || i18n.language || 'en'
      const currentParams = (config.params ?? {}) as Record<string, unknown>
      config.params = { ...currentParams, locale }
    }

    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

// Helper function to unwrap the API envelope { data: <payload> } -> <payload>
const unwrapEnvelope = (response: AxiosResponse<unknown>): unknown => {
  const data = response.data
  if (data && typeof data === 'object' && 'data' in data) {
    return (data as Record<string, unknown>).data
  }
  return data
}

api.interceptors.response.use(
  // Return unwrapped data directly - type matches axios.d.ts overrides
  // Cast to AxiosResponseInterceptor to satisfy Axios's type system
  ((response: AxiosResponse<unknown>) => {
    checkAppVersion(response)
    return unwrapEnvelope(response)
  }) as AxiosResponseInterceptor,
  async (error: AxiosError) => {
    if (getApiErrorCode(error.response?.data) === STORAGE_LIMIT_ERROR_CODE && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(STORAGE_LIMIT_EXCEEDED_EVENT))
    }

    const retryConfig = error.config as CsrfRetryConfig | undefined
    if (error.response?.status === 419 && retryConfig && !retryConfig._csrfRetried) {
      retryConfig._csrfRetried = true
      await csrf()
      return api(retryConfig)
    }

    if (error.response?.status === 401 && !shouldSkipUnauthorizedHandler(error)) {
      unauthorizedHandler?.()
    }
    return Promise.reject(error)
  }
)

authApi.interceptors.request.use(
  (config) => {
    // Add Accept-Language header for i18n
    config.headers['Accept-Language'] = i18n.language || 'en'
    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

authApi.interceptors.response.use(
  // Return unwrapped data directly - type matches axios.d.ts overrides
  // Cast to AxiosResponseInterceptor to satisfy Axios's type system
  ((response: AxiosResponse<unknown>) => {
    checkAppVersion(response)
    return unwrapEnvelope(response)
  }) as AxiosResponseInterceptor,
  (error: AxiosError) => {
    if (error.response?.status === 401 && !shouldSkipUnauthorizedHandler(error)) {
      unauthorizedHandler?.()
    }
    return Promise.reject(error)
  }
)

export const csrf = async () => {
  // Use absolute origin in tests to match MSW handlers; relative otherwise
  const origin = import.meta.env.MODE === 'test' ? 'http://localhost:3000' : ''
  await axios.get(`${origin}/sanctum/csrf-cookie`, { withCredentials: true })
}
