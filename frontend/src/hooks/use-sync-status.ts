import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNetworkStatus } from '@/hooks/use-network-status'
import { toast } from '@/lib/i18n-toast'
import { processQueue, subscribe as subscribeUploads } from '@/lib/media-upload-queue'
import { buildSyncSnapshot } from '@/lib/sync-snapshot'
import { initializeOperationsStore, subscribe as subscribeOperations } from '@/offline/operations'
import { replayPendingOfflineOperations } from '@/offline/sync'

export function useSyncStatus() {
  const isOnline = useNetworkStatus()
  const queryClient = useQueryClient()
  const prevOnline = useRef(isOnline)
  const wasSyncing = useRef(false)

  useEffect(() => {
    void initializeOperationsStore()
  }, [])

  useEffect(() => {
    if (isOnline && !prevOnline.current) {
      void processQueue()
      void replayPendingOfflineOperations(queryClient)

      if (buildSyncSnapshot(queryClient).hasActiveWork) {
        wasSyncing.current = true
        toast.info('common:status.syncing')
      }
    }

    prevOnline.current = isOnline
  }, [isOnline, queryClient])

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!buildSyncSnapshot(queryClient).hasActiveWork) {
        return
      }
      event.preventDefault()
    }

    window.addEventListener('beforeunload', handler)
    return () => {
      window.removeEventListener('beforeunload', handler)
    }
  }, [queryClient])

  useEffect(() => {
    const processState = () => {
      const snapshot = buildSyncSnapshot(queryClient)

      if (wasSyncing.current && snapshot.isDrained) {
        wasSyncing.current = false
        toast.success('common:status.syncComplete')
      }
    }

    const unsubscribeUploads = subscribeUploads(processState)
    const unsubscribeOperations = subscribeOperations(processState)

    processState()

    return () => {
      unsubscribeUploads()
      unsubscribeOperations()
    }
  }, [queryClient])
}
