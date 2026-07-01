import { useSyncExternalStore } from 'react'
import { onlineManager } from '@tanstack/react-query'

// UI-facing online state must follow TanStack's onlineManager (wired in setupOnlineManager).
// Feature code should use this hook or onlineManager.isOnline(), not navigator.onLine.
export function useNetworkStatus() {
  return useSyncExternalStore(
    (onStoreChange) => onlineManager.subscribe(onStoreChange),
    () => onlineManager.isOnline(),
    () => true // SSR fallback (always online)
  )
}
