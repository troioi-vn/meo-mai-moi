import React, { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { api } from '@/api/axios'
import { getPetsId as getPet } from '@/api/generated/pets/pets'
import { postPetsPetPhotos } from '@/api/generated/pet-photos/pet-photos'
import { toast } from '@/lib/i18n-toast'
import { Upload, Trash2 } from 'lucide-react'
import type { AxiosError } from 'axios'
import type { Pet } from '@/types/pet'
import { deriveImageUrl } from '@/utils/petImages'
import { useTranslation } from 'react-i18next'

interface PetPhotoProps {
  pet: Pet
  onPhotoUpdate: (updatedPet: Pet) => void
  showUploadControls?: boolean
  className?: string
  onClick?: () => void
}

export function PetPhoto({
  pet,
  onPhotoUpdate,
  showUploadControls = false,
  className = 'w-full h-64 object-cover',
  onClick,
}: PetPhotoProps) {
  const { t } = useTranslation('pets')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('pets:photos.selectImageError')
      return
    }

    // Validate file size (10MB limit)
    const MAX_SIZE_MB = 10
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.raw.error(t('photos.maxSizeError', { size: MAX_SIZE_MB }))
      return
    }

    setIsUploading(true)

    try {
      const response = await postPetsPetPhotos(pet.id, { photo: file })

      toast.success('pets:photos.uploadSuccess')
      onPhotoUpdate(response as Pet)
    } catch (error: unknown) {
      let errorMessage = 'pets:photos.uploadError'
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
      setIsUploading(false)
      // Reset the input value so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDeletePhoto = async () => {
    if (!pet.photo_url) return

    setIsDeleting(true)

    try {
      await api.delete(`/pets/${String(pet.id)}/photos/current`)
      toast.success('pets:photos.deleteSuccess')

      // Refetch the pet to get updated photos list
      const updatedPet = await getPet(pet.id)
      onPhotoUpdate(updatedPet)
    } catch (error: unknown) {
      let errorMessage = 'pets:photos.deleteError'
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

  const imageUrl = deriveImageUrl(pet)

  return (
    <div className="flex flex-col items-center space-y-4">
      <img
        src={imageUrl}
        alt={pet.name}
        className={`${className} ${onClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
        onClick={onClick}
      />

      {showUploadControls && (
        <div className="flex space-x-2">
          <Button onClick={handleUploadClick} disabled={isUploading} size="sm" variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? t('common:actions.uploading') : t('photos.upload')}
          </Button>

          {pet.photo_url && (
            <Button
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
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(event) => {
          void handleFileChange(event)
        }}
        className="hidden"
      />
    </div>
  )
}
