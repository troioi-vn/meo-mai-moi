import axios, { AxiosError } from 'axios'

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
    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      unauthorizedHandler?.()
    }
    return Promise.reject(error)
  }
)

authApi.interceptors.request.use(
  (config) => {
    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

authApi.interceptors.response.use(
  (response) => response,
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
