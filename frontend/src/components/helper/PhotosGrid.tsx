import React from 'react'
import { Button } from '@/components/ui/button'

export interface Photo {
  id: number
  path: string
}

interface Props {
  photos: Photo[]
  onDelete: (photoId: number) => void
  deleting?: boolean
}

export const PhotosGrid: React.FC<Props> = ({ photos, onDelete, deleting = false }) => {
  if (photos.length === 0) return null
  return (
    <div className="grid grid-cols-3 gap-4">
      {photos.map((photo) => (
        <div key={photo.id} className="relative">
          <img
            src={'http://localhost:8000/storage/' + photo.path}
            alt="Helper profile photo"
            className="w-full h-full object-cover"
          />
          <Button
            aria-label={'Delete photo ' + String(photo.id)}
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2"
            onClick={() => {
              onDelete(photo.id)
            }}
            disabled={deleting}
          >
            Delete
          </Button>
        </div>
      ))}
    </div>
  )
}
