import { AuthContext } from './AuthContext'
import { vi } from 'vite-plus/test'
import React from 'react'

import { type AuthContextType, type AuthStatus } from '@/contexts/auth-context'

interface TestAuthProviderProps {
  children: React.ReactNode
  mockValues?: Partial<AuthContextType>
}

function resolveTestAuthStatus(mockValues: Partial<AuthContextType>): AuthStatus {
  if (mockValues.status) {
    return mockValues.status
  }

  if (mockValues.isAuthenticated || mockValues.user) {
    return 'authenticated'
  }

  if (mockValues.isRecovering) {
    return 'recovering'
  }

  if (mockValues.isLoading) {
    return 'unknown'
  }

  return 'anonymous'
}

function buildTestAuthValue(mockValues?: Partial<AuthContextType>): AuthContextType {
  const base = {
    user: null,
    register: vi.fn().mockResolvedValue(undefined),
    login: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    loadUser: vi.fn().mockResolvedValue(undefined),
    changePassword: vi.fn().mockResolvedValue(undefined),
    deleteAccount: vi.fn().mockResolvedValue(undefined),
    isSessionFromCache: false,
    ...mockValues,
  }

  const status = resolveTestAuthStatus(base)

  return {
    ...base,
    status,
    isLoading: status === 'unknown' || status === 'recovering',
    isAuthenticated: status === 'authenticated',
    isRecovering: status === 'recovering',
  }
}

export const TestAuthProvider = ({ children, mockValues }: TestAuthProviderProps) => {
  const value = React.useMemo(() => buildTestAuthValue(mockValues), [mockValues])

  return <AuthContext value={value}>{children}</AuthContext>
}
