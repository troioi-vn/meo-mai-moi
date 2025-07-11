import api from './api';

interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

export const register = async (credentials: RegisterCredentials) => {
  return api.post('/register', credentials);
};

export const login = async (credentials: LoginCredentials) => {
  await api.get('http://localhost:8000/sanctum/csrf-cookie');
  return api.post('/login', credentials);
};

export const logout = async () => {
  return api.post('/logout');
};

export const getUser = async () => {
  return api.get('/user');
};

export const changePasswordApi = async (data: { current_password: string; new_password: string; new_password_confirmation: string }) => {
  return api.put('/users/me/password', data);
};

export const deleteAccountApi = async (data: { password: string }) => {
  return api.delete('/users/me', { data }); // For DELETE requests with a body, Axios uses a 'data' property
};
