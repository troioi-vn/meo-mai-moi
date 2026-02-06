import React from 'react'

import { testQueryClient } from './query-client'
import { AuthProvider } from '@/contexts/AuthContext'
import type { User } from '@/types/user'
import { QueryClientProvider } from '@tanstack/react-query'
import { afterEach } from 'vitest'
import { NotificationsProvider } from '@/contexts/NotificationProvider'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/i18n'

export const AllTheProviders: React.FC<{
  children: React.ReactNode
  initialAuthState?: { user: User | null; isLoading: boolean; isAuthenticated: boolean }
}> = ({ children, initialAuthState }) => {
  // Ensure tests don't keep stale caches/timers around
  afterEach(async () => {
    await testQueryClient.cancelQueries()
    testQueryClient.clear()
  })
  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={testQueryClient}>
        <AuthProvider
          initialUser={initialAuthState?.user ?? null}
          initialLoading={initialAuthState?.isLoading}
          skipInitialLoad={true}
        >
          <NotificationsProvider>{children}</NotificationsProvider>
        </AuthProvider>
      </QueryClientProvider>
    </I18nextProvider>
  )
}
