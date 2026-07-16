import type { ReactNode } from 'react'
import { useNetworkStatus } from '@/hooks/use-network-status'
import { ConnectionLostState } from '@/components/ui/ConnectionLostState'

interface OfflineAwareRouteProps {
  children: ReactNode
}

/**
 * Blocks routes that always require network. Routes with useful cached data
 * should use a page-level guard or stay reachable offline instead.
 */
export function OfflineAwareRoute({ children }: OfflineAwareRouteProps) {
  const isOnline = useNetworkStatus()

  if (!isOnline) {
    return <ConnectionLostState />
  }

  return children
}
