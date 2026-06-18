import React from 'react'

import { testQueryClient } from './query-client'
import { AuthProvider } from '@/contexts/AuthContext'
import type { AuthStatus } from '@/contexts/auth-context'
import type { User } from '@/types/user'
import { QueryClientProvider } from '@tanstack/react-query'
import { NotificationsProvider } from '@/contexts/NotificationProvider'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/i18n'
import { ThemeProvider } from '@/components/shared/theme-provider'

export interface InitialAuthState {
  user: User | null
  status?: AuthStatus
  isLoading: boolean
  isAuthenticated: boolean
}

function resolveInitialStatus(state: Partial<InitialAuthState>): AuthStatus | undefined {
  if (state.status) {
    return state.status
  }

  if (state.isAuthenticated || state.user) {
    return 'authenticated'
  }

  if (state.isLoading) {
    return 'unknown'
  }

  return 'anonymous'
}

export const AllTheProviders: React.FC<{
  children: React.ReactNode
  initialAuthState?: Partial<InitialAuthState>
}> = ({ children, initialAuthState }) => {
  const resolvedAuthState: InitialAuthState = {
    user: null,
    isLoading: false,
    isAuthenticated: false,
    ...initialAuthState,
  }

  return (
    <I18nextProvider i18n={i18n}>
      <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
        <QueryClientProvider client={testQueryClient}>
          <AuthProvider
            initialUser={resolvedAuthState.user}
            initialLoading={resolvedAuthState.isLoading}
            initialStatus={resolveInitialStatus(resolvedAuthState)}
            skipInitialLoad={true}
          >
            <NotificationsProvider>{children}</NotificationsProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </I18nextProvider>
  )
}
