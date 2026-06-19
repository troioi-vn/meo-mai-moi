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
import { useMediaUpload } from '@/hooks/use-media-upload'

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
  })

  const preview = upload.previews[0]
  const imageSrc = preview?.url ?? currentImage?.src
  const imageThumbSrc = preview?.url ?? currentImage?.thumbSrc
  const imageAlt = currentImage?.alt ?? label ?? t('upload.choose')
  const hasImage = Boolean(imageSrc)
  const buttonText = hasImage ? t('upload.change') : t('upload.choose')

  const openPicker = () => {
    inputRef.current?.click()
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      upload.selectFiles(event.target.files)
    }
    event.target.value = ''
  }

  const removeButton = showRemove && onRemove && hasImage && (
    <button
      type="button"
      onClick={onRemove}
      disabled={disabled || upload.isUploading}
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
      onChange={handleInputChange}
      disabled={disabled || upload.isUploading}
    />
  )

  if (variant === 'button') {
    return (
      <div className={cn('space-y-2', className)}>
        {label && <div className="text-sm font-medium">{label}</div>}
        {input}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          disabled={disabled || upload.isUploading}
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
    <div className={cn('space-y-2', className)}>
      {label && <div className="text-sm font-medium">{label}</div>}
      {input}
      <div className="relative inline-block">
        <button
          type="button"
          onClick={openPicker}
          disabled={disabled || upload.isUploading}
          className={cn(
            'relative flex shrink-0 items-center justify-center overflow-hidden border-2 border-dashed border-muted-foreground/30 bg-muted/30 transition-colors hover:border-muted-foreground/60 disabled:pointer-events-none disabled:opacity-50',
            shapeClassName
          )}
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
    </div>
  )
}
