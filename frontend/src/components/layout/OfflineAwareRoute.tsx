import type { ReactNode } from 'react'
import { useNetworkStatus } from '@/hooks/use-network-status'
import { ConnectionLostState } from '@/components/ui/ConnectionLostState'

interface OfflineAwareRouteProps {
  children: ReactNode
}

/**
 * Blocks routes that require network when the app is offline and no page-level
 * cached data is available. Pet routes are excluded at the App route level.
 */
export function OfflineAwareRoute({ children }: OfflineAwareRouteProps) {
  const isOnline = useNetworkStatus()

  if (!isOnline) {
    return <ConnectionLostState />
  }

  return children
}
