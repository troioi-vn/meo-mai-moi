import { useState, useEffect, useRef } from 'react'
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
import { MediaImage } from '@/components/ui/MediaImage'

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
  const [carouselApi, setCarouselApi] = useState<CarouselApi>()
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([])

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
    setCarouselApi(api)
    if (api) {
      api.scrollTo(selectedPhotoIndex, true)
      api.on('select', () => {
        setSelectedPhotoIndex(api.selectedScrollSnap())
      })
    }
  }

  useEffect(() => {
    const thumb = thumbRefs.current[selectedPhotoIndex]
    if (thumb) {
      thumb.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' })
    }
  }, [selectedPhotoIndex])

  if (photos.length === 0) return null

  const currentPhoto = photos[selectedPhotoIndex]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!flex h-[calc(100dvh-1rem)] max-h-[100dvh] w-[calc(100vw-1rem)] max-w-3xl flex-col gap-0 overflow-hidden border-none bg-black p-0 sm:h-[90vh] sm:max-h-[90vh]">
        <DialogHeader className="sr-only">
          <DialogTitle>
            Photo {selectedPhotoIndex + 1} of {photos.length}
          </DialogTitle>
          <DialogDescription>View health record photos</DialogDescription>
        </DialogHeader>

        <div className="group relative min-h-0 flex-1 bg-black">
          <Carousel
            opts={{
              align: 'center',
              loop: photos.length > 1,
              startIndex: initialIndex,
            }}
            setApi={handleCarouselApi}
            className="h-full w-full [&_[data-slot=carousel-content]]:h-full"
          >
            <CarouselContent className="!ml-0 h-full">
              {photos.map((photo) => (
                <CarouselItem key={photo.id} className="h-full !pl-0">
                  <div className="flex h-full min-h-0 items-center justify-center bg-black">
                    <MediaImage
                      src={photo.url}
                      thumbSrc={photo.thumb_url}
                      alt="Health record photo"
                      containerClassName="h-full w-full bg-black"
                      className="h-full w-full object-contain"
                      fit="contain"
                      loading="eager"
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            {photos.length > 1 && (
              <>
                <CarouselPrevious className="left-4 opacity-0 transition-opacity group-hover:opacity-100" />
                <CarouselNext className="right-4 opacity-0 transition-opacity group-hover:opacity-100" />
              </>
            )}
          </Carousel>

          {/* Photo counter */}
          {photos.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-xs font-medium">
              {selectedPhotoIndex + 1} / {photos.length}
            </div>
          )}
        </div>

        {photos.length > 1 && (
          <div className="flex shrink-0 justify-center gap-2 overflow-x-auto bg-black px-4 py-3">
            {photos.map((photo, index) => (
              <button
                key={photo.id}
                ref={(el) => {
                  thumbRefs.current[index] = el
                }}
                type="button"
                onClick={() => {
                  carouselApi?.scrollTo(index)
                }}
                className={`h-12 w-12 shrink-0 overflow-hidden rounded border-2 transition-all ${
                  index === selectedPhotoIndex
                    ? 'border-white opacity-100'
                    : 'border-transparent opacity-50 hover:opacity-75'
                }`}
              >
                <MediaImage
                  src={photo.thumb_url}
                  thumbSrc={photo.thumb_url}
                  alt="Health record photo"
                  containerClassName="h-full w-full"
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        )}

        {/* Action buttons */}
        {canDelete && currentPhoto && onDelete && (
          <div className="flex shrink-0 flex-wrap justify-center gap-3 border-t bg-background p-4">
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
