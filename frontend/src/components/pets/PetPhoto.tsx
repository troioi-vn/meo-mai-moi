import React, { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { api } from '@/api/axios'
import { getPet } from '@/api/pets'
import { toast } from 'sonner'
import { Upload, Trash2 } from 'lucide-react'
import type { AxiosError } from 'axios'
import type { Pet } from '@/types/pet'
import { deriveImageUrl } from '@/utils/petImages'

interface PetPhotoProps {
  pet: Pet
  onPhotoUpdate: (updatedPet: Pet) => void
  showUploadControls?: boolean
  className?: string
}

export function PetPhoto({
  pet,
  onPhotoUpdate,
  showUploadControls = false,
  className = 'w-full h-64 object-cover',
}: PetPhotoProps) {
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
      toast.error('Please select an image file')
      return
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB')
      return
    }

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('photo', file)

      const response = await api.post<{ data: Pet }>(`/pets/${String(pet.id)}/photos`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      toast.success('Photo uploaded successfully')
      onPhotoUpdate(response.data.data)
    } catch (error: unknown) {
      let errorMessage = 'Failed to upload photo'
      if (error instanceof Error && 'response' in error) {
        const axiosError = error as AxiosError<{ message?: string }>
        errorMessage = axiosError.response?.data.message ?? axiosError.message
      } else if (error instanceof Error) {
        errorMessage = error.message
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
      toast.success('Photo deleted successfully')

      // Refetch the pet to get updated photos list
      const updatedPet = await getPet(String(pet.id))
      onPhotoUpdate(updatedPet)
    } catch (error: unknown) {
      let errorMessage = 'Failed to delete photo'
      if (error instanceof Error && 'response' in error) {
        const axiosError = error as AxiosError<{ message?: string }>
        errorMessage = axiosError.response?.data.message ?? axiosError.message
      } else if (error instanceof Error) {
        errorMessage = error.message
      }
      toast.error(errorMessage)
    } finally {
      setIsDeleting(false)
    }
  }

  const imageUrl = deriveImageUrl(pet)

  return (
    <div className="flex flex-col items-center space-y-4">
      <img src={imageUrl} alt={pet.name} className={className} />

      {showUploadControls && (
        <div className="flex space-x-2">
          <Button onClick={handleUploadClick} disabled={isUploading} size="sm" variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? 'Uploading...' : 'Upload'}
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
              {isDeleting ? 'Deleting...' : 'Remove'}
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
