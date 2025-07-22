import React, { useRef, useState } from 'react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { api } from '@/api/axios'
import { toast } from 'sonner'
import { User as UserIcon, Upload, Trash2 } from 'lucide-react'
import type { AxiosError } from 'axios'
// import defaultAvatar from '@/assets/images/default-avatar.webp'
const defaultAvatar = '/build/assets/default-avatar-Dio_8tmr.webp'

interface UserAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showUploadControls?: boolean
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
  xl: 'h-24 w-24',
}

export function UserAvatar({ size = 'lg', showUploadControls = false }: UserAvatarProps) {
  const { user, loadUser } = useAuth()
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
      formData.append('avatar', file)

      await api.post('/users/me/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      toast.success('Avatar uploaded successfully')
      await loadUser()
    } catch (error: unknown) {
      let errorMessage = 'Failed to upload avatar'
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

  const handleDeleteAvatar = () => {
    if (!user?.avatar_url) return

    setIsDeleting(true)

    api
      .delete('/users/me/avatar')
      .then(async () => {
        toast.success('Avatar deleted successfully')
        await loadUser()
      })
      .catch((error: unknown) => {
        let errorMessage = 'Failed to delete avatar'
        if (error instanceof Error && 'response' in error) {
          const axiosError = error as AxiosError<{ message?: string }>
          errorMessage = axiosError.response?.data.message ?? axiosError.message
        } else if (error instanceof Error) {
          errorMessage = error.message
        }
        toast.error(errorMessage)
      })
      .finally(() => {
        setIsDeleting(false)
      })
  }

  if (!user) return null

  const initials = user.name
    ? user.name
        .split(' ')
        .map((name) => name.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : ''

  return (
    <div className="flex flex-col items-center space-y-4">
      <Avatar className={sizeClasses[size]}>
        <AvatarImage
          src={user.avatar_url && user.avatar_url.trim() !== '' ? user.avatar_url : defaultAvatar}
          alt={`${user.name}'s avatar`}
        />
        <AvatarFallback>{initials || <UserIcon className="h-1/2 w-1/2" />}</AvatarFallback>
      </Avatar>

      {showUploadControls && (
        <div className="flex space-x-2">
          <Button onClick={handleUploadClick} disabled={isUploading} size="sm" variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? 'Uploading...' : 'Upload Avatar'}
          </Button>

          {user.avatar_url && (
            <Button onClick={handleDeleteAvatar} disabled={isDeleting} size="sm" variant="outline">
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
