import axios, { AxiosError } from 'axios'

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // send cookies
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    console.log('Axios Request Headers:', config.headers) // Add this line
    return config
  },
  (error: AxiosError) => {
    return Promise.reject(new Error(error.message));
  }
)

export const csrf = async () => { // Make this async
  try {
    await axios.get('/sanctum/csrf-cookie', { withCredentials: true })
    console.log('CSRF cookie fetched successfully.') // Add this line
  } catch (error) {
    console.error('Error fetching CSRF cookie:', error) // Add this line
    throw error // Re-throw the error to propagate it
  }
}
