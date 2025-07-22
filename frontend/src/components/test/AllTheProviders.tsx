import React from 'react'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { Toaster } from '@/components/ui/sonner'

export const testQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: Infinity,
    },
  },
})

export const AllTheProviders: React.FC<{ children: React.ReactNode; initialAuthState?: { user: any; isLoading: boolean; isAuthenticated: boolean } }> = ({ children, initialAuthState }) => {
  return (
    <QueryClientProvider client={testQueryClient}>
      <AuthProvider initialUser={initialAuthState?.user} initialLoading={initialAuthState?.isLoading} skipInitialLoad={true}>
        {children}
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  )
}
