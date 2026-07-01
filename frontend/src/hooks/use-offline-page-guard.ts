import { useNetworkStatus } from '@/hooks/use-network-status'

interface OfflinePageGuardOptions {
  hasData: boolean
  isLoading: boolean
}

export function useOfflinePageGuard({ hasData, isLoading }: OfflinePageGuardOptions) {
  const isOnline = useNetworkStatus()
  const blocked = !isOnline && !isLoading && !hasData

  return {
    blocked,
    reason: blocked ? ('offline' as const) : null,
  }
}
