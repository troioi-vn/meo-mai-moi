import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api', // Your Laravel API URL
  withCredentials: true, // This is important for Sanctum
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

// Function to get the token from storage (e.g., localStorage)
const getToken = () => {
  return localStorage.getItem('authToken');
};

// Add a request interceptor to include the token in the headers
api.interceptors.request.use(config => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
