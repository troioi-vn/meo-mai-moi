import { createContext, useContext, useEffect, useState } from 'react';
import { api, csrf } from '../api/axios';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      const { data } = await api.get('/user');
      setUser(data);
    } catch (error) {
      console.error("Error loading user:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const register = async (payload) => {
    await csrf();
    await api.post('/register', payload);
    await loadUser();
  };

  const login = async (payload) => {
    await csrf();
    const response = await api.post('/login', payload);
    localStorage.setItem('access_token', response.data.access_token);
    await loadUser();
  };

  const logout = async () => {
    localStorage.removeItem('access_token');
    await api.post('/logout');
    setUser(null);
  };

  useEffect(() => { loadUser(); }, []);

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout, loadUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
