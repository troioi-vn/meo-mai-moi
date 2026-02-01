import React, { useRef, useState, useEffect } from 'react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { toast } from '@/lib/i18n-toast'
import { useTranslation } from 'react-i18next'
import { User as UserIcon, Upload, Trash2 } from 'lucide-react'
import type { AxiosError } from 'axios'
import defaultAvatar from '@/assets/images/default-avatar.webp'
import { getInitials } from '@/utils/initials'
import { postUsersMeAvatar, deleteUsersMeAvatar } from '@/api/generated/user-profile/user-profile'

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
  const { t } = useTranslation('settings')
  const { user, loadUser } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [avatarSrc, setAvatarSrc] = useState<string>(defaultAvatar)

  // Preload avatar image to ensure it's available
  useEffect(() => {
    if (user?.avatar_url && user.avatar_url.trim() !== '') {
      const img = new Image()
      const avatarUrl = user.avatar_url
      img.onload = () => {
        setAvatarSrc(avatarUrl)
      }
      img.onerror = () => {
        setAvatarSrc(defaultAvatar)
      }
      img.src = avatarUrl
    } else {
      setAvatarSrc(defaultAvatar)
    }
  }, [user?.avatar_url])

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('settings:profile.avatarInvalidFile')
      return
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('settings:profile.avatarFileTooLarge')
      return
    }

    setIsUploading(true)

    try {
      await postUsersMeAvatar({ avatar: file })

      toast.success('settings:profile.avatarUploaded')
      await loadUser()
    } catch (error: unknown) {
      const errorMessage = 'settings:profile.avatarUploadError'
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

  const handleDeleteAvatar = async () => {
    if (!user?.avatar_url) return

    setIsDeleting(true)

    try {
      await deleteUsersMeAvatar()
      toast.success('settings:profile.avatarDeleted')
      await loadUser()
    } catch (error: unknown) {
      const errorMessage = 'settings:profile.avatarDeleteError'
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

  if (!user) return null

  const initials = user.name ? getInitials(user.name) : ''

  return (
    <div className="flex flex-col items-center space-y-4">
      <Avatar className={sizeClasses[size]}>
        <AvatarImage key={avatarSrc} src={avatarSrc} alt={`${user.name}'s avatar`} />
        <AvatarFallback>{initials || <UserIcon className="h-1/2 w-1/2" />}</AvatarFallback>
      </Avatar>

      {showUploadControls && (
        <div className="flex space-x-2">
          <Button onClick={handleUploadClick} disabled={isUploading} size="sm" variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            {isUploading ? t('profile.uploading') : t('profile.avatarUpload')}
          </Button>

          {user.avatar_url && (
            <Button
              onClick={() => {
                void handleDeleteAvatar()
              }}
              disabled={isDeleting}
              size="sm"
              variant="outline"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isDeleting ? t('profile.deleting') : t('profile.avatarRemove')}
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
