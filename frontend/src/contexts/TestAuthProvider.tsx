import { AuthContext } from './auth-context'
import { vi } from 'vitest'
import React from 'react'

import { type AuthContextType } from '@/types/auth'

interface TestAuthProviderProps {
  children: React.ReactNode
  mockValues?: Partial<AuthContextType>
}

export const TestAuthProvider = ({ children, mockValues }: TestAuthProviderProps) => {
  const defaultMockValues = React.useMemo(
    () => ({
      user: null,
      register: vi.fn(async () => {
        await Promise.resolve()
      }),
      login: vi.fn(async () => {
        await Promise.resolve()
      }),
      logout: vi.fn(),
      loadUser: vi.fn(),
      isLoading: false,
      isAuthenticated: false,
      changePassword: vi.fn(async () => {
        await Promise.resolve()
      }),
      deleteAccount: vi.fn(async () => {
        await Promise.resolve()
      }),
    }),
    []
  )

  const value = React.useMemo(
    () => ({ ...defaultMockValues, ...mockValues }),
    [defaultMockValues, mockValues]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
