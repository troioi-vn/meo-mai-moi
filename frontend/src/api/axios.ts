import axios, { AxiosError } from 'axios'

export const api = axios.create({
  baseURL: process.env.NODE_ENV === 'test' ? 'http://localhost:3000/api' : '/api',
  withCredentials: true, // send cookies
})

api.interceptors.request.use(
  (config) => {
    // Do not add Authorization header for login, register, or csrf-cookie requests
    const skipAuth =
      config.url?.includes('/login') ||
      config.url?.includes('/register') ||
      config.url?.includes('/sanctum/csrf-cookie')

    if (!skipAuth) {
      const token = localStorage.getItem('access_token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    } else {
      // Ensure Authorization header is not set
      if (config.headers && 'Authorization' in config.headers) {
        delete config.headers.Authorization
      }
    }
    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

export const csrf = async () => {
  await axios.get('/sanctum/csrf-cookie', { withCredentials: true })
}
