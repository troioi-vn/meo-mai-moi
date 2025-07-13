import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,  // send cookies
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(new Error(error.message));
  }
);

export const csrf = () => axios.get('/sanctum/csrf-cookie', { withCredentials: true });
