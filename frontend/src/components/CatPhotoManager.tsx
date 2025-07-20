import { useState, useRef } from 'react'
import { Upload, X, Camera, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { api } from '@/api/axios'
import { AxiosError } from 'axios'
import type { Cat } from '@/types/cat'

interface CatPhotoManagerProps {
  cat: Cat
  isOwner: boolean
  onPhotoUpdated: (updatedCat: Cat) => void
}

export function CatPhotoManager({ cat, isOwner, onPhotoUpdated }: CatPhotoManagerProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handlePhotoUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file.')
      return
    }

    // TODO: Move this into admin config page!
    //  Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Please select an image smaller than 10MB.')
      return
    }

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('photo', file)
      
      // Use the correct backend endpoint for photo upload
      const response = await api.post<{ data: Cat }>(`/cats/${String(cat.id)}/photos`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      
      onPhotoUpdated(response.data.data)
      toast.success('Photo uploaded successfully')
    } catch (error: unknown) {
      let errorMessage = 'Failed to upload the photo. Please try again.'
      if (error instanceof AxiosError) {
        if (error.response?.data && typeof error.response.data === 'object' && error.response.data !== null && 'message' in error.response.data) {
          const responseData = error.response.data as { message: string }
          errorMessage = responseData.message
        } else {
          errorMessage = error.message
        }
      } else if (error instanceof Error) {
        errorMessage = error.message
      }
      toast.error(errorMessage)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handlePhotoDelete = async () => {
    setIsDeleting(true)
    
    try {
      const photoId = cat.photo && 'id' in cat.photo ? String((cat.photo as { id: unknown }).id) : ''
      await api.delete<Cat>(`/cats/${String(cat.id)}/photos/${photoId}`);
      
      // Manually update the cat object to reflect photo deletion
      const updatedCat: Cat = { ...cat, photo: null, photo_url: undefined };
      onPhotoUpdated(updatedCat);
      toast.success('Photo deleted successfully');
    } catch (error: unknown) {
      let errorMessage = 'Failed to delete the photo. Please try again.'
      if (error instanceof AxiosError) {
        if (error.response?.data && typeof error.response.data === 'object' && error.response.data !== null && 'message' in error.response.data) {
          const responseData = error.response.data as { message: string }
          errorMessage = responseData.message
        } else {
          errorMessage = error.message
        }
      } else if (error instanceof Error) {
        errorMessage = error.message
      }
      toast.error(errorMessage)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      void handlePhotoUpload(file).catch(console.error)
    }
  }

  const triggerFileSelect = () => {
    fileInputRef.current?.click()
  }

  const handlePhotoDeleteClick = () => {
    void handlePhotoDelete().catch(console.error)
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Cat Photo
        </h3>

        {/* Photo Display */}
        <div className="relative">
          {cat.photo_url ? (
            <div className="relative group">
              <img
                src={cat.photo_url}
                alt={`Photo of ${cat.name}`}
                className="w-full max-w-md mx-auto rounded-lg object-cover aspect-[3/2]"
              />

              {isOwner && (
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 rounded-lg flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 space-x-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={triggerFileSelect}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-1" />
                          Replace
                        </>
                      )}
                    </Button>
                    
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handlePhotoDeleteClick}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <>
                          <X className="h-4 w-4 mr-1" />
                          Remove
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full max-w-md mx-auto aspect-[3/2] border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500">
              <Camera className="h-12 w-12 mb-2" />
              <p className="text-sm text-center">No photo uploaded</p>
              {isOwner && (
                <p className="text-xs text-center mt-1">Click below to add one</p>
              )}
            </div>
          )}
        </div>

        {/* Upload Controls (for owners only) */}
        {isOwner && (
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              aria-label="Upload Photo"
            />
            
            {!cat.photo_url && (
              <Button
                onClick={triggerFileSelect}
                disabled={isUploading}
                className="w-full"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Photo
                  </>
                )}
              </Button>
            )}
            
            <p className="text-xs text-gray-500 text-center">
              Supported formats: JPG, PNG, GIF. Max size: 10MB
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}