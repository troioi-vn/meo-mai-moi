import { useSyncExternalStore } from 'react'
import { onlineManager } from '@tanstack/react-query'

export function useNetworkStatus() {
  return useSyncExternalStore(
    (onStoreChange) => onlineManager.subscribe(onStoreChange),
    () => onlineManager.isOnline(),
    () => true // SSR fallback (always online)
  )
}
