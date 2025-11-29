import { QueryClient } from '@tanstack/react-query'

export const testQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: Infinity,
      // Prevent background GC timers from keeping the event loop alive in tests
      gcTime: 0,
    },
    mutations: {
      retry: false,
      // Prevent mutation GC timers from keeping the event loop alive
      gcTime: 0,
    },
  },
})
