import { useEffect, useState } from 'react'
import { usePendingMutationsCount } from '@/hooks/use-pending-mutations'
import {
  getPendingUploadCountSnapshot,
  subscribe as subscribeUploads,
} from '@/lib/media-upload-queue'
import {
  getPendingOperationCountSnapshot,
  subscribe as subscribeOperations,
} from '@/offline/operations'

export function useUnifiedPendingCount() {
  const pendingMutationsCount = usePendingMutationsCount()
  const [pendingUploadCount, setPendingUploadCount] = useState(getPendingUploadCountSnapshot)
  const [pendingOperationCount, setPendingOperationCount] = useState(
    getPendingOperationCountSnapshot
  )

  useEffect(() => {
    setPendingUploadCount(getPendingUploadCountSnapshot())

    return subscribeUploads(() => {
      setPendingUploadCount(getPendingUploadCountSnapshot())
    })
  }, [])

  useEffect(() => {
    setPendingOperationCount(getPendingOperationCountSnapshot())

    return subscribeOperations(() => {
      setPendingOperationCount(getPendingOperationCountSnapshot())
    })
  }, [])

  return pendingMutationsCount + pendingUploadCount + pendingOperationCount
}
