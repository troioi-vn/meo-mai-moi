import { useEffect, useState } from 'react'
import { usePendingMutationsCount } from '@/hooks/use-pending-mutations'
import { getPendingUploadCountSnapshot, subscribe } from '@/lib/media-upload-queue'

export function useUnifiedPendingCount() {
  const pendingMutationsCount = usePendingMutationsCount()
  const [pendingUploadCount, setPendingUploadCount] = useState(getPendingUploadCountSnapshot)

  useEffect(() => {
    setPendingUploadCount(getPendingUploadCountSnapshot())

    return subscribe(() => {
      setPendingUploadCount(getPendingUploadCountSnapshot())
    })
  }, [])

  return pendingMutationsCount + pendingUploadCount
}
