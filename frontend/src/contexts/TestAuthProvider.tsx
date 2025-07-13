import { AuthContext } from './AuthContext';
import { vi } from 'vitest';
import React from 'react';

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
  register: (payload: any) => Promise<void>;
  login: (payload: any) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string, newPasswordConfirmation: string) => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
}

interface TestAuthProviderProps {
  children: React.ReactNode;
  mockValues?: Partial<AuthContextType>;
}

export const TestAuthProvider = ({ children, mockValues }: TestAuthProviderProps) => {
  const defaultMockValues: AuthContextType = {
    user: null,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    loadUser: vi.fn(),
    isLoading: false,
    isAuthenticated: false,
    changePassword: vi.fn(),
    deleteAccount: vi.fn(),
  };

  const value = { ...defaultMockValues, ...mockValues } as AuthContextType;

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};