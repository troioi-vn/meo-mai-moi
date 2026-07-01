import { useSyncSnapshot } from '@/hooks/use-sync-snapshot'

export function useUnifiedPendingCount() {
  const snapshot = useSyncSnapshot()
  return snapshot.activeTotal
}
