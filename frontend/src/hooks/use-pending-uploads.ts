import { useEffect, useMemo, useState } from 'react'
import {
  createPreviewUrl,
  getPendingUploadsFor,
  subscribe,
  type PendingUploadView,
} from '@/lib/media-upload-queue'
import type { UploadTarget } from '@/lib/media-upload-service'

export interface PendingUploadPreview extends PendingUploadView {
  previewUrl: string
}

const readPendingUploads = (target: UploadTarget): PendingUploadPreview[] =>
  getPendingUploadsFor(target).map((upload) => ({
    ...upload,
    previewUrl: createPreviewUrl(upload.id),
  }))

export function usePendingUploads(target: UploadTarget): PendingUploadPreview[] {
  const targetKey = JSON.stringify(target)
  const stableTarget = useMemo(() => JSON.parse(targetKey) as UploadTarget, [targetKey])
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
