import React, { useRef, useState, useEffect } from 'react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { toast } from '@/lib/i18n-toast'
import { useTranslation } from 'react-i18next'
import { User as UserIcon, Upload, Trash2 } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import type { AxiosError } from 'axios'
import defaultAvatar from '@/assets/images/default-avatar.webp'
import { getInitials } from '@/utils/initials'
import { deleteUsersMeAvatar } from '@/api/generated/user-profile/user-profile'
import { isPremiumUser } from '@/lib/premium-user'
import { PremiumAvatarBadge } from './PremiumAvatarBadge'
import { useMediaUpload } from '@/hooks/use-media-upload'

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
  const [isDeleting, setIsDeleting] = useState(false)
  const [avatarSrc, setAvatarSrc] = useState(defaultAvatar)
  const previousUserAvatarUrlRef = useRef(user?.avatar_url ?? null)
  const {
    selectFiles,
    previews,
    isUploading,
    reset: resetMediaUpload,
  } = useMediaUpload({
    target: { kind: 'avatar' },
    limitKey: 'avatar',
    onUploaded: () => {
      toast.success('settings:profile.avatarUploaded')
      void loadUser()
    },
  })

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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      selectFiles(event.target.files)
    }
    event.target.value = ''
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

  useEffect(() => {
    const nextAvatarUrl = user?.avatar_url ?? null
    if (previousUserAvatarUrlRef.current !== nextAvatarUrl) {
      previousUserAvatarUrlRef.current = nextAvatarUrl
      resetMediaUpload()
    }
  }, [resetMediaUpload, user?.avatar_url])

  if (!user) return null

  const initials = user.name ? getInitials(user.name) : ''
  const previewSrc = previews[0]?.url ?? null
  const displayedAvatarSrc = previewSrc ?? avatarSrc

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative" aria-busy={isUploading}>
        <Avatar className={sizeClasses[size]}>
          <AvatarImage
            key={displayedAvatarSrc}
            src={displayedAvatarSrc}
            alt={`${user.name}'s avatar`}
          />
          <AvatarFallback>{initials || <UserIcon className="h-1/2 w-1/2" />}</AvatarFallback>
          {isPremiumUser(user) && <PremiumAvatarBadge size="large" />}
        </Avatar>
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/60">
            <Spinner className="size-6" />
            <span className="sr-only">{t('profile.uploading')}</span>
          </div>
        )}
      </div>

      {showUploadControls && (
        <div className="flex space-x-2">
          <Button onClick={handleUploadClick} disabled={isUploading} size="sm" variant="outline">
            {isUploading ? (
              <Spinner className="h-4 w-4 mr-2" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            {isUploading ? t('profile.uploading') : t('profile.avatarUpload')}
          </Button>

          {(user.avatar_url ?? previewSrc) && (
            <Button
              onClick={() => {
                void handleDeleteAvatar()
              }}
              disabled={isDeleting || isUploading}
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
          handleFileChange(event)
        }}
        className="hidden"
      />
    </div>
  )
}
