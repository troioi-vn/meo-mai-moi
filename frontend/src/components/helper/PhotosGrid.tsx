import React from 'react'
import { Button } from '@/components/ui/button'
import { useTranslation } from 'react-i18next'

export interface Photo {
  id: number
  url?: string
  thumb_url?: string | null
  path?: string
}

interface Props {
  photos: Photo[]
  onDelete: (photoId: number) => void
  deleting?: boolean
}

export const PhotosGrid: React.FC<Props> = ({ photos, onDelete, deleting = false }) => {
  const { t } = useTranslation(['helper', 'common'])

  if (photos.length === 0) return null
  return (
    <div className="grid grid-cols-3 gap-4">
      {photos.map((photo) => (
        <div key={photo.id} className="relative">
          <img
            src={photo.thumb_url ?? photo.url ?? (photo.path ? '/storage/' + photo.path : '')}
            alt={t('helper:photos.photoAlt')}
            className="w-full h-full object-cover"
          />
          <Button
            aria-label={t('helper:photos.deletePhoto', { id: photo.id })}
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2"
            onClick={() => {
              onDelete(photo.id)
            }}
            disabled={deleting}
          >
            {t('common:actions.delete')}
          </Button>
        </div>
      ))}
    </div>
  )
}
