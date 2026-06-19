import { useRef } from 'react'
import type React from 'react'
import { Camera, Upload, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { MediaImage } from '@/components/ui/MediaImage'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { type UploadTarget } from '@/lib/media-upload-service'
import { MEDIA_LIMITS } from '@/lib/media-validation'
import { imageFilesFromClipboardData, useMediaUpload } from '@/hooks/use-media-upload'
import { useFileDrop } from '@/hooks/use-file-drop'

interface MediaUploadFieldProps {
  target?: UploadTarget
  limitKey: keyof typeof MEDIA_LIMITS
  mode?: 'immediate' | 'deferred'
  multiple?: boolean
  variant?: 'avatar-circle' | 'pet-hero' | 'dashed-tile' | 'button' | 'dropzone'
  label?: string
  description?: string
  disabled?: boolean
  currentImage?: { src: string; thumbSrc?: string | null; alt?: string } | null
  showRemove?: boolean
  onRemove?: () => void
  onUploaded?: (result: unknown) => void
  onSelectDeferred?: (files: File[]) => void
  useQueue?: boolean
  cropConfig?: {
    aspect?: number
    cropShape?: 'rect' | 'round'
    outputMaxSize?: number
    outputType?: 'image/jpeg' | 'image/png' | 'image/webp'
  }
  enablePaste?: boolean
  error?: string
  className?: string
  children?: React.ReactNode
}

export function MediaUploadField({
  target,
  limitKey,
  mode = 'immediate',
  multiple = false,
  variant = 'button',
  label,
  description,
  disabled = false,
  currentImage,
  showRemove = false,
  onRemove,
  onUploaded,
  onSelectDeferred,
  useQueue,
  cropConfig,
  enablePaste = false,
  error,
  className,
  children,
}: MediaUploadFieldProps) {
  const { t } = useTranslation('media')
  const inputRef = useRef<HTMLInputElement>(null)
  const upload = useMediaUpload({
    target,
    limitKey,
    mode,
    multiple,
    onUploaded,
    onSelectDeferred,
    useQueue,
    cropConfig,
  })

  const preview = upload.previews[0]
  const imageSrc = preview?.url ?? currentImage?.src
  const imageThumbSrc = preview?.url ?? currentImage?.thumbSrc
  const imageAlt = currentImage?.alt ?? label ?? t('upload.choose')
  const hasImage = Boolean(imageSrc)
  const buttonText = hasImage ? t('upload.change') : t('upload.choose')
  const isDisabled = disabled || upload.isUploading
  const { isDragging, dropProps } = useFileDrop({
    onFiles: upload.selectFiles,
    disabled: isDisabled,
    multiple,
  })

  const openPicker = () => {
    inputRef.current?.click()
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      upload.selectFiles(event.target.files)
    }
    event.target.value = ''
  }

  const handlePaste = (event: React.ClipboardEvent<HTMLElement>) => {
    if (!enablePaste || isDisabled) return

    const files = imageFilesFromClipboardData(event.clipboardData)
    const selectedFiles = multiple ? files : files.slice(0, 1)
    if (selectedFiles.length === 0) return

    event.preventDefault()
    upload.selectFiles(selectedFiles)
  }

  const removeButton = showRemove && onRemove && hasImage && (
    <button
      type="button"
      onClick={onRemove}
      disabled={isDisabled}
      className="absolute -right-2 -top-2 rounded-full bg-destructive p-0.5 text-destructive-foreground hover:bg-destructive/90 disabled:pointer-events-none disabled:opacity-50"
      aria-label={t('upload.remove')}
    >
      <X className="h-3 w-3" />
    </button>
  )

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      multiple={multiple}
      className="hidden"
      aria-label={label ?? t('upload.choose')}
      onChange={handleInputChange}
      disabled={isDisabled}
    />
  )

  if (variant === 'button') {
    return (
      <div className={cn('space-y-2', className)} onPaste={handlePaste}>
        {label && <div className="text-sm font-medium">{label}</div>}
        {upload.cropDialog}
        {input}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          disabled={isDisabled}
          onClick={openPicker}
        >
          {upload.isUploading ? (
            <Spinner className="mr-1 h-3 w-3" />
          ) : (
            <Upload className="mr-1 h-3 w-3" />
          )}
          {children ?? buttonText}
        </Button>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
        {error && <p className="text-sm font-medium text-destructive">{error}</p>}
      </div>
    )
  }

  if (variant === 'dropzone') {
    return (
      <div className={cn('space-y-2', className)} onPaste={handlePaste}>
        {label && <div className="text-sm font-medium">{label}</div>}
        {upload.cropDialog}
        {input}
        <button
          type="button"
          onClick={openPicker}
          disabled={isDisabled}
          className={cn(
            'relative flex min-h-32 w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/30 p-4 text-center transition-colors hover:border-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
            isDragging && 'border-primary bg-primary/5 ring-2 ring-primary/30'
          )}
          {...dropProps}
        >
          {upload.previews.length > 0 ? (
            <div className="grid w-full grid-cols-3 gap-2 sm:grid-cols-5">
              {upload.previews.map((preview) => (
                <MediaImage
                  key={preview.id}
                  src={preview.url}
                  thumbSrc={preview.url}
                  alt={label ?? t('upload.choose')}
                  aspect="square"
                  className="h-full w-full rounded object-cover"
                />
              ))}
            </div>
          ) : (
            <>
              <Upload className="mb-2 h-8 w-8 text-muted-foreground/60" aria-hidden="true" />
              <span className="text-sm font-medium">
                {isDragging ? t('upload.dropActive') : (children ?? t('upload.dropHint'))}
              </span>
              {enablePaste && (
                <span className="mt-1 text-xs text-muted-foreground">{t('upload.pasteHint')}</span>
              )}
            </>
          )}
          {upload.isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60">
              <Spinner className="size-6" />
            </div>
          )}
        </button>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
        {(error ?? upload.error) && (
          <p className="text-sm font-medium text-destructive">{error ?? upload.error}</p>
        )}
      </div>
    )
  }

  const shapeClassName =
    variant === 'avatar-circle'
      ? 'h-24 w-24 rounded-full'
      : variant === 'pet-hero'
        ? 'h-64 w-full rounded-md'
        : 'h-24 w-24 rounded-full'

  return (
    <div className={cn('space-y-2', className)} onPaste={handlePaste}>
      {label && <div className="text-sm font-medium">{label}</div>}
      {upload.cropDialog}
      {input}
      <div className="relative inline-block">
        <button
          type="button"
          onClick={openPicker}
          disabled={isDisabled}
          className={cn(
            'relative flex shrink-0 items-center justify-center overflow-hidden border-2 border-dashed border-muted-foreground/30 bg-muted/30 transition-colors hover:border-muted-foreground/60 disabled:pointer-events-none disabled:opacity-50',
            isDragging && 'border-primary bg-primary/5 ring-2 ring-primary/30',
            shapeClassName
          )}
          {...dropProps}
        >
          {hasImage && imageSrc ? (
            <MediaImage
              src={imageSrc}
              thumbSrc={imageThumbSrc}
              alt={imageAlt}
              className="h-full w-full object-cover"
            />
          ) : (
            <Camera className="h-8 w-8 text-muted-foreground/50" />
          )}
          {upload.isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60">
              <Spinner className="size-6" />
            </div>
          )}
        </button>
        {removeButton}
      </div>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      {(error ?? upload.error) && (
        <p className="text-sm font-medium text-destructive">{error ?? upload.error}</p>
      )}
    </div>
  )
}
