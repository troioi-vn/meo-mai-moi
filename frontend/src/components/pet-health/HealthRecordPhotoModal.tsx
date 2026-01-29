import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Trash2 } from 'lucide-react'

export interface HealthRecordPhoto {
  id: number
  url: string
  thumb_url: string
}

interface HealthRecordPhotoModalProps {
  photos: HealthRecordPhoto[]
  open: boolean
  onOpenChange: (open: boolean) => void
  initialIndex?: number
  onDelete?: (photoId: number) => Promise<void>
  canDelete?: boolean
}

export function HealthRecordPhotoModal({
  photos,
  open,
  onOpenChange,
  initialIndex = 0,
  onDelete,
  canDelete = false,
}: HealthRecordPhotoModalProps) {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(initialIndex)
  const [isDeleting, setIsDeleting] = useState<number | null>(null)

  // Update selected index when initialIndex changes or modal opens
  useEffect(() => {
    if (open) {
      setSelectedPhotoIndex(initialIndex)
    }
  }, [open, initialIndex])

  const handleDelete = async (photo: HealthRecordPhoto) => {
    if (!onDelete) return

    setIsDeleting(photo.id)

    try {
      await onDelete(photo.id)

      // Close modal if we deleted the last photo or navigate to previous
      const remainingPhotos = photos.length - 1
      if (remainingPhotos === 0) {
        onOpenChange(false)
      } else if (selectedPhotoIndex >= remainingPhotos) {
        setSelectedPhotoIndex(remainingPhotos - 1)
      }
    } finally {
      setIsDeleting(null)
    }
  }

  // Sync carousel with selected index when modal opens
  const handleCarouselApi = (api: CarouselApi) => {
    if (api) {
      api.scrollTo(selectedPhotoIndex, true)
      api.on('select', () => {
        setSelectedPhotoIndex(api.selectedScrollSnap())
      })
    }
  }

  if (photos.length === 0) return null

  const currentPhoto = photos[selectedPhotoIndex]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black border-none">
        <DialogHeader className="sr-only">
          <DialogTitle>
            Photo {selectedPhotoIndex + 1} of {photos.length}
          </DialogTitle>
          <DialogDescription>View health record photos</DialogDescription>
        </DialogHeader>

        <div className="relative group">
          {photos.length === 1 && photos[0] ? (
            // Single photo - no carousel needed
            <div className="flex items-center justify-center min-h-[50vh] bg-black">
              <img
                src={photos[0].url}
                alt="Health record photo"
                className="w-full h-auto max-h-[85vh] object-contain"
              />
            </div>
          ) : (
            // Multiple photos - carousel
            <Carousel
              opts={{
                align: 'center',
                loop: true,
                startIndex: initialIndex,
              }}
              setApi={handleCarouselApi}
              className="w-full"
            >
              <CarouselContent>
                {photos.map((photo) => (
                  <CarouselItem key={photo.id}>
                    <div className="flex items-center justify-center min-h-[50vh] bg-black">
                      <img
                        src={photo.url}
                        alt="Health record photo"
                        className="w-full h-auto max-h-[85vh] object-contain"
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              <CarouselNext className="right-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Carousel>
          )}

          {/* Photo counter */}
          {photos.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-xs font-medium">
              {selectedPhotoIndex + 1} / {photos.length}
            </div>
          )}
        </div>

        {/* Action buttons */}
        {canDelete && currentPhoto && onDelete && (
          <div className="p-4 flex justify-center gap-3 bg-background border-t">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={isDeleting === currentPhoto.id}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isDeleting === currentPhoto.id ? 'Deleting...' : 'Delete Photo'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Photo</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this photo? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      void handleDelete(currentPhoto)
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
