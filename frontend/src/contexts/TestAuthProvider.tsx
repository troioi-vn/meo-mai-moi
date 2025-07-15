import { AuthContext } from './auth-context'
import { vi } from 'vitest'
import React from 'react'

import { User, RegisterPayload, LoginPayload, AuthContextType } from '@/types/auth'

interface TestAuthProviderProps {
  children: React.ReactNode
  mockValues?: Partial<AuthContextType>
}

export const TestAuthProvider = ({ children, mockValues }: TestAuthProviderProps) => {
  const defaultMockValues: AuthContextType = {
    user: null,
    register: vi.fn(async (_payload: RegisterPayload) => {}),
    login: vi.fn(async (_payload: LoginPayload) => {}),
    logout: vi.fn(),
    loadUser: vi.fn(),
    isLoading: false,
    isAuthenticated: false,
    changePassword: vi.fn(async (_current, _new, _confirm) => {}),
    deleteAccount: vi.fn(async (_password: string) => {}),
  }

  const value = { ...defaultMockValues, ...mockValues } as AuthContextType

  return <AuthContext value={value}>{children}</AuthContext>
}
