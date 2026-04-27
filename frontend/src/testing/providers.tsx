import React from 'react'

import { testQueryClient } from './query-client'
import { AuthProvider } from '@/contexts/AuthContext'
import type { User } from '@/types/user'
import { QueryClientProvider } from '@tanstack/react-query'
import { NotificationsProvider } from '@/contexts/NotificationProvider'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/i18n'
import { ThemeProvider } from '@/components/shared/theme-provider'

interface InitialAuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
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
            skipInitialLoad={true}
          >
            <NotificationsProvider>{children}</NotificationsProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </I18nextProvider>
  )
}
