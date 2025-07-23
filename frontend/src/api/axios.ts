import axios, { AxiosError } from 'axios'

export const api = axios.create({
  baseURL: '/api',
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
  await axios.get('/sanctum/csrf-cookie', { withCredentials: true })
}
