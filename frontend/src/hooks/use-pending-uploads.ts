import { useEffect, useMemo, useState } from 'react'
import {
  createPreviewUrl,
  getPendingUploadsFor,
  subscribe,
  type QueueUploadTarget,
  type PendingUploadView,
} from '@/lib/media-upload-queue'

export interface PendingUploadPreview extends PendingUploadView {
  previewUrl: string
}

const readPendingUploads = (target: QueueUploadTarget): PendingUploadPreview[] =>
  getPendingUploadsFor(target).map((upload) => ({
    ...upload,
    previewUrl: createPreviewUrl(upload.id),
  }))

export function usePendingUploads(target: QueueUploadTarget): PendingUploadPreview[] {
  const targetKey = JSON.stringify(target)
  const stableTarget = useMemo(() => JSON.parse(targetKey) as QueueUploadTarget, [targetKey])
  const [uploads, setUploads] = useState<PendingUploadPreview[]>(() =>
    readPendingUploads(stableTarget)
  )

  useEffect(() => {
    setUploads(readPendingUploads(stableTarget))

    return subscribe(() => {
      setUploads(readPendingUploads(stableTarget))
    })
  }, [stableTarget])

  return uploads
}
