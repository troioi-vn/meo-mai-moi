import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { subscribe as subscribeUploads } from '@/lib/media-upload-queue'
import {
  buildSyncSnapshot,
  listSyncTableRows,
  type SyncSnapshot,
  type SyncTableRow,
} from '@/lib/sync-snapshot'
import { initializeOperationsStore, subscribe as subscribeOperations } from '@/offline/operations'

export function useSyncSnapshot(): SyncSnapshot {
  const queryClient = useQueryClient()
  const [snapshot, setSnapshot] = useState(() => buildSyncSnapshot(queryClient))

  useEffect(() => {
    void initializeOperationsStore()
  }, [])

  useEffect(() => {
    const refresh = () => {
      setSnapshot(buildSyncSnapshot(queryClient))
    }

    refresh()

    const unsubscribeMutations = queryClient.getMutationCache().subscribe(refresh)
    const unsubscribeUploads = subscribeUploads(refresh)
    const unsubscribeOperations = subscribeOperations(refresh)

    return () => {
      unsubscribeMutations()
      unsubscribeUploads()
      unsubscribeOperations()
    }
  }, [queryClient])

  return snapshot
}

export function useSyncTableRows(): SyncTableRow[] {
  const queryClient = useQueryClient()
  const [rows, setRows] = useState(() => listSyncTableRows(queryClient))

  useEffect(() => {
    void initializeOperationsStore()
  }, [])

  useEffect(() => {
    const refresh = () => {
      setRows(listSyncTableRows(queryClient))
    }

    refresh()

    const unsubscribeMutations = queryClient.getMutationCache().subscribe(refresh)
    const unsubscribeUploads = subscribeUploads(refresh)
    const unsubscribeOperations = subscribeOperations(refresh)

    return () => {
      unsubscribeMutations()
      unsubscribeUploads()
      unsubscribeOperations()
    }
  }, [queryClient])

  return rows
}
