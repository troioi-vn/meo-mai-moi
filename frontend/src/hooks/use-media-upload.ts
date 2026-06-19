import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from '@/lib/i18n-toast'
import { MEDIA_LIMITS, type ValidationResult, validateImageFiles } from '@/lib/media-validation'
import { type UploadTarget, uploadMedia } from '@/lib/media-upload-service'
import { enqueueUpload, isRetryableUploadError } from '@/lib/media-upload-queue'

export interface MediaPreview {
  id: string
  url: string
}

interface UseMediaUploadOptions {
  target?: UploadTarget
  limitKey: keyof typeof MEDIA_LIMITS
  mode?: 'immediate' | 'deferred'
  multiple?: boolean
  onUploaded?: (result: unknown) => void
  onSelectDeferred?: (files: File[]) => void
  useQueue?: boolean
}

const filesFromInput = (files: FileList | File[]) => Array.from(files)

export const imageFilesFromClipboardData = (clipboardData: DataTransfer | null | undefined) => {
  if (!clipboardData) return []

  return Array.from(clipboardData.items)
    .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
    .flatMap((item) => {
      const file = item.getAsFile()
      return file ? [file] : []
    })
}

const createPreview = (file: File, index: number): MediaPreview | null => {
  if (typeof URL.createObjectURL !== 'function') {
    return null
  }

  return {
    id: `${file.name}-${String(file.lastModified)}-${String(index)}`,
    url: URL.createObjectURL(file),
  }
}

const apiMessageFromError = (error: unknown) => {
  if (error instanceof Error && 'response' in error) {
    return (error as { response?: { data?: { message?: string } } }).response?.data?.message
  }

  return undefined
}

export function useMediaUpload({
  target,
  limitKey,
  mode = 'immediate',
  multiple = false,
  onUploaded,
  onSelectDeferred,
  useQueue = false,
}: UseMediaUploadOptions) {
  const { t } = useTranslation('media')
  const [previews, setPreviews] = useState<MediaPreview[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const previewUrlsRef = useRef<string[]>([])

  const revokePreviews = useCallback(() => {
    for (const url of previewUrlsRef.current) {
      URL.revokeObjectURL(url)
    }
    previewUrlsRef.current = []
  }, [])

  const reset = useCallback(() => {
    revokePreviews()
    setPreviews([])
    setIsUploading(false)
    setProgress(null)
    setError(null)
  }, [revokePreviews])

  useEffect(() => revokePreviews, [revokePreviews])

  const showValidationError = useCallback(
    (result: Extract<ValidationResult, { ok: false }>) => {
      const message = t(result.errorKey, result.params)
      setError(message)
      toast.raw.error(message)
    },
    [t]
  )

  const applyPreviews = useCallback(
    (files: File[]) => {
      revokePreviews()
      const nextPreviews = files.flatMap((file, index) => {
        const preview = createPreview(file, index)
        return preview ? [preview] : []
      })
      previewUrlsRef.current = nextPreviews.map((preview) => preview.url)
      setPreviews(nextPreviews)
    },
    [revokePreviews]
  )

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (!target) {
        return
      }

      setIsUploading(true)
      setProgress(null)
      setError(null)

      try {
        for (const [index, file] of files.entries()) {
          try {
            if (useQueue && typeof navigator !== 'undefined' && !navigator.onLine) {
              await enqueueUpload({ target, file })
              continue
            }

            const result = await uploadMedia(target, file, setProgress)
            onUploaded?.(result)
          } catch (uploadError) {
            if (useQueue && isRetryableUploadError(uploadError)) {
              for (const remainingFile of files.slice(index)) {
                await enqueueUpload({ target, file: remainingFile })
              }
              return
            }

            const message = apiMessageFromError(uploadError) ?? t('upload.failed')
            setError(message)
            toast.raw.error(message)
            return
          }
        }
      } finally {
        setIsUploading(false)
        setProgress(null)
      }
    },
    [onUploaded, t, target, useQueue]
  )

  const selectFiles = useCallback(
    (selectedFiles: FileList | File[]) => {
      const allFiles = filesFromInput(selectedFiles)
      const files = multiple ? allFiles : allFiles.slice(0, 1)
      if (files.length === 0) return

      const validation = validateImageFiles(files, MEDIA_LIMITS[limitKey])
      if (!validation.ok) {
        showValidationError(validation)
        return
      }

      applyPreviews(files)

      if (mode === 'deferred') {
        setError(null)
        onSelectDeferred?.(files)
        return
      }

      void uploadFiles(files)
    },
    [applyPreviews, limitKey, mode, multiple, onSelectDeferred, showValidationError, uploadFiles]
  )

  return {
    selectFiles,
    previews,
    isUploading,
    progress,
    error,
    reset,
  }
}
