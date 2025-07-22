import React from 'react'

import { testQueryClient } from '@/test-query-client'
import { AuthProvider } from '@/contexts/AuthContext'
import { Toaster } from '@/components/ui/sonner'
import type { User } from '@/types/user'
import { QueryClientProvider } from '@tanstack/react-query'

export const AllTheProviders: React.FC<{
  children: React.ReactNode
  initialAuthState?: { user: User | null; isLoading: boolean; isAuthenticated: boolean }
}> = ({ children, initialAuthState }) => {
  return (
    <QueryClientProvider client={testQueryClient}>
      <AuthProvider
        initialUser={initialAuthState?.user ?? null}
        initialLoading={initialAuthState?.isLoading}
        skipInitialLoad={true}
      >
        {children}
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  )
}
