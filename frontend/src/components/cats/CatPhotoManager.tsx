import { useState, useRef } from 'react'
import { Upload, X, Camera, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { api } from '@/api/axios'
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

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Please select an image smaller than 5MB.')
      return
    }

    setIsUploading(true)
    
    try {
      const formData = new FormData()
      formData.append('photo', file)
      
      const response = await api.post<{ cat: Cat }>(`/cats/${String(cat.id)}/photos`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      
      onPhotoUpdated(response.data.cat)
      toast.success('Photo uploaded successfully')
    } catch (error) {
      console.error('Photo upload failed:', error)
      toast.error('Failed to upload the photo. Please try again.')
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
      const response = await api.delete<{ cat: Cat }>(`/cats/${String(cat.id)}/photo`)
      
      onPhotoUpdated(response.data.cat)
      toast.success('Photo deleted successfully')
    } catch (error) {
      console.error('Photo deletion failed:', error)
      toast.error('Failed to delete the photo. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      void handlePhotoUpload(file)
    }
  }

  const triggerFileSelect = () => {
    fileInputRef.current?.click()
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
                className="w-full max-w-md mx-auto rounded-lg object-cover aspect-square"
              />
              
              {isOwner && (
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded-lg flex items-center justify-center">
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
                      onClick={() => void handlePhotoDelete()}
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
            <div className="w-full max-w-md mx-auto aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500">
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
              Supported formats: JPG, PNG, GIF. Max size: 5MB
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}
