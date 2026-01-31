import axios, { AxiosError } from 'axios'
import type { AxiosResponse } from 'axios'
import i18n from '@/i18n'

/**
 * Axios's built-in type for response interceptors.
 * Our interceptors deliberately return the unwrapped data (not AxiosResponse)
 * because axios.d.ts overrides make Axios methods return Promise<R> directly.
 * We use this type to cast the interceptor and satisfy the type system.
 */
type AxiosResponseInterceptor = (
  value: AxiosResponse<unknown>
) => AxiosResponse<unknown> | Promise<AxiosResponse<unknown>>

// Use absolute API base in tests so MSW handlers match and requests don't hang
const API_BASE = import.meta.env.MODE === 'test' ? 'http://localhost:3000/api' : '/api'

// Auth API base points to Fortify routes (no /api prefix)
const AUTH_API_BASE = import.meta.env.MODE === 'test' ? 'http://localhost:3000' : ''

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // send cookies
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

// Separate axios instance for Fortify auth routes (login, register, logout, password reset)
export const authApi = axios.create({
  baseURL: AUTH_API_BASE,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

type UnauthorizedHandler = (() => void) | null
let unauthorizedHandler: UnauthorizedHandler = null

export const setUnauthorizedHandler = (handler: UnauthorizedHandler) => {
  unauthorizedHandler = handler
}

api.interceptors.request.use(
  (config) => {
    // Add Accept-Language header for i18n
    config.headers['Accept-Language'] = i18n.language || 'en'
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
  ((response: AxiosResponse<unknown>) => unwrapEnvelope(response)) as AxiosResponseInterceptor,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
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
  ((response: AxiosResponse<unknown>) => unwrapEnvelope(response)) as AxiosResponseInterceptor,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
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
