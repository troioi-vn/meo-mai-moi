import { createContext, use, useEffect, useState } from 'react';
import { api, csrf } from '@/api/axios';

interface User {
  id: number;
  name: string;
  email: string;
  avatar_url?: string; // Optional avatar URL
  // Add other user properties as needed
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  register: (payload: any) => Promise<void>; // TODO: Define a proper type for payload
  login: (payload: any) => Promise<void>; // TODO: Define a proper type for payload
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string, newPasswordConfirmation: string) => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadUser = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (token) {
        api.defaults.headers.common.Authorization = `Bearer ${token}`;
      }
      const { data } = await api.get<User>('/user');
      setUser(data);
    } catch (error) {
      console.error("Error loading user:", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: any) => {
    await csrf();
    await api.post('/register', payload);
    await loadUser();
  };

  const login = async (payload: any) => {
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

  const changePassword = async (current_password: string, new_password: string, new_password_confirmation: string) => {
    await api.put('/users/me/password', { current_password, new_password, new_password_confirmation });
  };

  const deleteAccount = async (password: string) => {
    await api.delete('/users/me', { data: { password } });
  };

  useEffect(() => { loadUser(); }, []);

  const isAuthenticated = user !== null;

  return (
    <AuthContext value={{ user, isLoading, isAuthenticated, register, login, logout, loadUser, changePassword, deleteAccount }}>
      {children}
    </AuthContext>
  );
}

export const useAuth = () => {
  const context = use(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
