import { AuthContext } from './AuthContext'
import { vi } from 'vitest'
import React from 'react'

import { type AuthContextType } from '@/contexts/auth-context'

interface TestAuthProviderProps {
  children: React.ReactNode
  mockValues?: Partial<AuthContextType>
}

export const TestAuthProvider = ({ children, mockValues }: TestAuthProviderProps) => {
  const defaultMockValues = React.useMemo(
    () => ({
      user: null,
      register: vi.fn().mockResolvedValue(undefined),
      login: vi.fn().mockResolvedValue(undefined),
      logout: vi.fn().mockResolvedValue(undefined),
      loadUser: vi.fn().mockResolvedValue(undefined),
      isLoading: false,
      isAuthenticated: false,
      changePassword: vi.fn().mockResolvedValue(undefined),
      deleteAccount: vi.fn().mockResolvedValue(undefined),
    }),
    []
  )

  const value = React.useMemo(
    () => ({ ...defaultMockValues, ...mockValues }),
    [defaultMockValues, mockValues]
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
