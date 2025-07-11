import React, { useState, useEffect, type ReactNode } from 'react';
import { getUser, changePasswordApi, deleteAccountApi } from '@/services/authService';
import { type User, type AuthContextType } from '../types/auth';
import { createContext } from 'react';
import { AxiosError } from 'axios';

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
  initialUser?: User | null;
}

const AuthProvider: React.FC<AuthProviderProps> = ({ children, initialUser = null }) => {
  const [user, setUser] = useState<User | null>(initialUser);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (initialUser !== undefined) {
      setUser(initialUser);
      setIsLoading(false);
      return;
    }

    const checkUser = async () => {
      const token = localStorage.getItem('authToken');
      console.log('AuthContext: checkUser - Initializing, token:', token ? 'present' : 'absent');
      if (token) {
        try {
          const response = await getUser();
          setUser(response.data);
          console.log('AuthContext: checkUser - User fetched:', response.data);
        } catch (error) {
          console.error("AuthContext: Failed to fetch user", error);
          localStorage.removeItem('authToken');
        }
      }
      setIsLoading(false);
      console.log('AuthContext: checkUser - Finished loading, isLoading:', false);
    };

    checkUser();
  }, [initialUser]);

  const login = (userData: User, token: string): Promise<void> => {
    return new Promise((resolve) => {
      setUser(userData);
      localStorage.setItem('authToken', token);
      console.log('AuthContext: login - User set, isAuthenticated:', !!userData);
      resolve();
    });
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('authToken');
  };

  const changePassword = async (current_password: string, new_password: string, new_password_confirmation: string) => {
    try {
      await changePasswordApi({ current_password, new_password, new_password_confirmation });
    } catch (error: unknown) {
      const axiosError = error as AxiosError<{ message: string }>;
      throw new Error(axiosError.response?.data?.message || axiosError.message || 'Failed to change password.');
    }
  };

  const deleteAccount = async (password: string) => {
    try {
      await deleteAccountApi({ password });
      logout();
    } catch (error: unknown) {
      const axiosError = error as AxiosError<{ message: string }>;
      throw new Error(axiosError.response?.data?.message || axiosError.message || 'Failed to delete account.');
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, user, login, logout, isLoading, changePassword, deleteAccount }}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;