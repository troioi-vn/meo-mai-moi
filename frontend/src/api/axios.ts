import axios, { AxiosError } from 'axios'

// Use absolute API base in tests so MSW handlers match and requests don't hang
const API_BASE = import.meta.env.MODE === 'test' ? 'http://localhost:3000/api' : '/api'

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // send cookies
})

api.interceptors.request.use(
  (config) => {
    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

export const csrf = async () => {
  // Use absolute origin in tests to match MSW handlers; relative otherwise
  const origin = import.meta.env.MODE === 'test' ? 'http://localhost:3000' : ''
  await axios.get(`${origin}/sanctum/csrf-cookie`, { withCredentials: true })
}
