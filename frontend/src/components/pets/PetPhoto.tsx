import React, { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { api } from '@/api/axios'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from '@/lib/i18n-toast'
import { Upload, Trash2, Images, Clock } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { Progress } from '@/components/ui/progress'
import type { AxiosError } from 'axios'
import type { Pet } from '@/types/pet'
import { deriveImageUrl, deriveThumbUrl } from '@/utils/petImages'
import { useTranslation } from 'react-i18next'
import { MediaImage } from '@/components/ui/MediaImage'
import { useMediaUpload } from '@/hooks/use-media-upload'
import { usePendingUploads } from '@/hooks/use-pending-uploads'
import { useFileDrop } from '@/hooks/use-file-drop'
import { invalidatePetMediaQueries } from '@/lib/pet-media-cache'

const buildPetAfterCurrentPhotoDelete = (pet: Pet): Pet => {
  const remainingPhotos = (pet.photos ?? []).filter((photo) => photo.url !== pet.photo_url)
  const nextPrimaryPhoto = remainingPhotos.find((photo) => photo.is_primary) ?? remainingPhotos[0]

  return {
    ...pet,
    photo_url: nextPrimaryPhoto?.url,
    photos: remainingPhotos,
  }
}

interface PetPhotoProps {
  pet: Pet
  onPhotoUpdate: (updatedPet: Pet) => void
  showUploadControls?: boolean
  showPhotoCount?: boolean
  className?: string
  containerClassName?: string
  onClick?: () => void
}

export function PetPhoto({
  pet,
  onPhotoUpdate,
  showUploadControls = false,
  showPhotoCount = false,
  className = 'w-full h-64 object-cover',
  containerClassName,
  onClick,
}: PetPhotoProps) {
  const { t } = useTranslation(['pets', 'media'])
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const imageUrl = deriveImageUrl(pet)
  const imageThumbUrl = deriveThumbUrl(pet)
  const previousImageUrlRef = useRef(imageUrl)
  const pendingUploads = usePendingUploads({ kind: 'pet-photo', petId: pet.id })
  const pendingUpload = pendingUploads[0]
  const {
    selectFiles,
    previews,
    isUploading,
    progress,
    cropDialog,
    reset: resetMediaUpload,
  } = useMediaUpload({
    target: { kind: 'pet-photo', petId: pet.id },
    limitKey: 'petPhoto',
    useQueue: true,
    cropConfig: { aspect: 1, cropShape: 'rect', outputMaxSize: 1600 },
    onUploaded: (response) => {
      toast.success('pets:photos.uploadSuccess')
      void invalidatePetMediaQueries(queryClient, pet.id)
      onPhotoUpdate(response as Pet)
    },
  })
  const { isDragging, dropProps } = useFileDrop({
    onFiles: selectFiles,
    disabled: !showUploadControls || isUploading,
  })

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      selectFiles(event.target.files)
    }
    event.target.value = ''
  }

  const handleDeletePhoto = async () => {
    if (!pet.photo_url) return

    setIsDeleting(true)

    try {
      await api.delete(`/pets/${String(pet.id)}/photos/current`)
      toast.success('pets:photos.deleteSuccess')

      const updatedPet = buildPetAfterCurrentPhotoDelete(pet)

      // Keep the callback contract consistent while the query refetch catches up.
      void invalidatePetMediaQueries(queryClient, pet.id)
      onPhotoUpdate(updatedPet)
    } catch (error: unknown) {
      const errorMessage = 'pets:photos.deleteError'
      if (error instanceof Error && 'response' in error) {
        const axiosError = error as AxiosError<{ message?: string }>
        const apiMessage = axiosError.response?.data.message
        if (apiMessage) {
          toast.raw.error(apiMessage)
          return
        }
      }
      toast.error(errorMessage)
    } finally {
      setIsDeleting(false)
    }
  }

  const previewSrc = previews[0]?.url ?? null
  const pendingPreviewSrc = pendingUpload?.previewUrl ?? null
  const displayedImageUrl = previewSrc ?? pendingPreviewSrc ?? imageUrl
  const displayedThumbUrl = previewSrc ?? pendingPreviewSrc ?? imageThumbUrl

  useEffect(() => {
    if (previousImageUrlRef.current !== imageUrl) {
      previousImageUrlRef.current = imageUrl
      resetMediaUpload()
    }
  }, [imageUrl, resetMediaUpload])

  const photoFrame = (
    <div
      className={`relative ${showUploadControls ? 'rounded-md' : ''} ${
        isDragging ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
      }`}
      aria-busy={isUploading}
      {...dropProps}
    >
      {showUploadControls && cropDialog}
      <MediaImage
        src={displayedImageUrl}
        thumbSrc={displayedThumbUrl}
        alt={t('media:alt.petPhoto', { name: pet.name })}
        className={`${className} ${onClick ? 'cursor-pointer transition-opacity hover:opacity-90 motion-reduce:transition-none' : ''}`}
        containerClassName={containerClassName}
        loading="eager"
        onClick={onClick}
        overlay={
          pendingUpload ? (
            <div
              className="absolute left-2 top-2 rounded-full bg-black/65 px-2 py-1 text-xs font-medium text-white"
              aria-label={t('media:upload.pending')}
            >
              <Clock className="mr-1 inline h-3 w-3" aria-hidden="true" />
              {t(
                pendingUpload.status === 'uploading'
                  ? 'media:upload.uploading'
                  : 'media:upload.pending'
              )}
            </div>
          ) : null
        }
      />
      {isUploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/70 p-4">
          {progress === null ? (
            <Spinner className="size-8" />
          ) : (
            <div className="w-full max-w-48 space-y-2 text-center">
              <Progress value={progress} />
              <p className="text-xs font-medium text-foreground">
                {t('media:upload.progress', { percent: progress })}
              </p>
            </div>
          )}
          <span className="sr-only">{t('photos.uploading')}</span>
        </div>
      )}
      {pendingUpload?.status === 'uploading' && pendingUpload.progress != null && (
        <div className="absolute bottom-2 left-2 right-2">
          <Progress value={pendingUpload.progress} className="bg-black/40" />
        </div>
      )}
      {showPhotoCount && pet.photos && pet.photos.length >= 2 && (
        <div
          className="absolute bottom-1 right-1 bg-black/60 text-white px-1.5 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 pointer-events-none"
          aria-label={t('photos.photoCount', { count: pet.photos.length })}
        >
          <Images className="h-3 w-3" aria-hidden="true" />
          {pet.photos.length}
        </div>
      )}
    </div>
  )

  if (!showUploadControls) {
    return photoFrame
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      {photoFrame}

      <div className="flex space-x-2">
        <Button
          type="button"
          onClick={handleUploadClick}
          disabled={isUploading}
          size="sm"
          variant="outline"
        >
          {isUploading ? <Spinner className="mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
          {isUploading ? t('common:actions.uploading') : t('photos.upload')}
        </Button>

        {pet.photo_url && (
          <Button
            type="button"
            onClick={() => {
              void handleDeletePhoto()
            }}
            disabled={isDeleting}
            size="sm"
            variant="destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {isDeleting ? t('photos.deleting') : t('photos.delete')}
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(event) => {
          handleFileChange(event)
        }}
        className="hidden"
      />
    </div>
  )
}
