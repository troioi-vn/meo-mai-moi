import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { toast } from 'sonner'
import { Star, Trash2, ImageIcon } from 'lucide-react'
import type { Pet, PetPhoto } from '@/types/pet'
import { deletePetPhoto, setPrimaryPetPhoto, getPet } from '@/api/pets'

// Image component that falls back to original URL if thumbnail fails to load
function PhotoImage({
  photo,
  className,
  useThumbnail = true,
}: {
  photo: PetPhoto
  className: string
  useThumbnail?: boolean
}) {
  const [errorPhotoId, setErrorPhotoId] = useState<number | null>(null)

  // If we're using thumbnail and haven't had an error for this specific photo yet,
  // use the thumbnail. Otherwise fall back to the full URL.
  const src =
    useThumbnail && photo.thumb_url && errorPhotoId !== photo.id ? photo.thumb_url : photo.url

  const handleError = () => {
    // If thumbnail failed, record the ID to fall back to original URL
    if (useThumbnail && photo.thumb_url && errorPhotoId !== photo.id) {
      setErrorPhotoId(photo.id)
    }
  }

  return <img src={src} alt="Pet photo" className={className} onError={handleError} />
}

interface PetPhotoCarouselModalProps {
  photos: PetPhoto[]
  open: boolean
  onOpenChange: (open: boolean) => void
  initialIndex?: number
  petId?: number
  onPetUpdate?: (updatedPet: Pet) => void
  showActions?: boolean
}

export function PetPhotoCarouselModal({
  photos,
  open,
  onOpenChange,
  initialIndex = 0,
  petId,
  onPetUpdate,
  showActions = false,
}: PetPhotoCarouselModalProps) {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(initialIndex)
  const [isSettingPrimary, setIsSettingPrimary] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState<number | null>(null)

  // Update selected index when initialIndex changes or modal opens
  useEffect(() => {
    if (open) {
      setSelectedPhotoIndex(initialIndex)
    }
  }, [open, initialIndex])

  const handleSetPrimary = async (photo: PetPhoto) => {
    if (!petId || !onPetUpdate) return

    if (photo.is_primary) {
      toast.info('This photo is already the avatar')
      return
    }

    setIsSettingPrimary(photo.id)

    try {
      const updatedPet = await setPrimaryPetPhoto(petId, photo.id)
      toast.success('Avatar updated successfully')
      onOpenChange(false) // Close modal after setting avatar
      onPetUpdate(updatedPet)
    } catch {
      toast.error('Failed to set avatar')
    } finally {
      setIsSettingPrimary(null)
    }
  }

  const handleDelete = async (photo: PetPhoto) => {
    if (!petId || !onPetUpdate) return

    setIsDeleting(photo.id)

    try {
      await deletePetPhoto(petId, photo.id)
      toast.success('Photo deleted successfully')

      // Refetch the pet to get updated photos list
      const updatedPet = await getPet(String(petId))
      onPetUpdate(updatedPet)

      // Close modal if we deleted the last photo or navigate to previous
      const remainingPhotos = (updatedPet.photos ?? []).length
      if (remainingPhotos === 0) {
        onOpenChange(false)
      } else if (selectedPhotoIndex >= remainingPhotos) {
        setSelectedPhotoIndex(remainingPhotos - 1)
      }
    } catch {
      toast.error('Failed to delete photo')
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
          <DialogDescription>View and manage pet photos</DialogDescription>
        </DialogHeader>

        <div className="relative group">
          {photos.length === 1 && photos[0] ? (
            // Single photo - no carousel needed
            <div className="flex items-center justify-center min-h-[50vh] bg-black">
              <PhotoImage
                photo={photos[0]}
                className="w-full h-auto max-h-[85vh] object-contain"
                useThumbnail={false}
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
                      <PhotoImage
                        photo={photo}
                        className="w-full h-auto max-h-[85vh] object-contain"
                        useThumbnail={false}
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
        {showActions && currentPhoto && (
          <div className="p-4 flex justify-center gap-3 bg-background border-t">
            <Button
              variant={currentPhoto.is_primary ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => {
                void handleSetPrimary(currentPhoto)
              }}
              disabled={isSettingPrimary === currentPhoto.id || currentPhoto.is_primary}
            >
              <Star
                className={`h-4 w-4 mr-2 ${currentPhoto.is_primary ? 'fill-yellow-500 text-yellow-500' : ''}`}
              />
              {isSettingPrimary === currentPhoto.id
                ? 'Setting...'
                : currentPhoto.is_primary
                  ? 'Current Avatar'
                  : 'Set as Avatar'}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                void handleDelete(currentPhoto)
              }}
              disabled={isDeleting === currentPhoto.id}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isDeleting === currentPhoto.id ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

interface PetPhotoGalleryProps {
  pet: Pet
  onPetUpdate: (updatedPet: Pet) => void
}

export function PetPhotoGallery({ pet, onPetUpdate }: PetPhotoGalleryProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0)
  const [thumbnailCarouselApi, setThumbnailCarouselApi] = useState<CarouselApi>()
  const previousPhotosCountRef = useRef<number>(0)

  const photos = pet.photos ?? []

  // Scroll to end when a new photo is added
  useEffect(() => {
    if (photos.length > previousPhotosCountRef.current && thumbnailCarouselApi) {
      // New photo was added, scroll to the end
      thumbnailCarouselApi.scrollTo(photos.length - 1)
    }
    previousPhotosCountRef.current = photos.length
  }, [photos.length, thumbnailCarouselApi])

  const openModal = (index: number) => {
    setSelectedPhotoIndex(index)
    setModalOpen(true)
  }

  // Don't render if no photos
  if (photos.length === 0) {
    return null
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Photo Gallery ({photos.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {photos.length === 1 && photos[0] ? (
            // Single photo - simple centered view
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => {
                  openModal(0)
                }}
                className="relative aspect-square w-32 overflow-hidden rounded-lg border bg-muted cursor-pointer hover:opacity-90 transition-opacity"
              >
                <PhotoImage
                  photo={photos[0]}
                  className="h-full w-full object-cover"
                  useThumbnail={true}
                />
                {photos[0].is_primary && (
                  <div className="absolute top-2 right-2 bg-yellow-500 text-white rounded-full p-1 border border-white/20">
                    <Star className="h-3 w-3 fill-current" />
                  </div>
                )}
              </button>
            </div>
          ) : (
            // Multiple photos - carousel view
            <div className="px-10">
              <Carousel
                opts={{
                  align: 'start',
                  loop: photos.length > 2,
                }}
                setApi={setThumbnailCarouselApi}
                className="w-full"
              >
                <CarouselContent className="-ml-2 md:-ml-4">
                  {photos.map((photo, index) => (
                    <CarouselItem key={photo.id} className="pl-2 md:pl-4 basis-1/2 md:basis-1/3">
                      <button
                        type="button"
                        onClick={() => {
                          openModal(index)
                        }}
                        className="relative aspect-square w-full overflow-hidden rounded-lg border bg-muted cursor-pointer hover:opacity-90 transition-opacity"
                      >
                        <PhotoImage
                          photo={photo}
                          className="h-full w-full object-cover"
                          useThumbnail={true}
                        />
                        {photo.is_primary && (
                          <div className="absolute top-2 right-2 bg-yellow-500 text-white rounded-full p-1 border border-white/20">
                            <Star className="h-3 w-3 fill-current" />
                          </div>
                        )}
                      </button>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {photos.length > 2 && (
                  <>
                    <CarouselPrevious className="-left-10" />
                    <CarouselNext className="-right-10" />
                  </>
                )}
              </Carousel>
            </div>
          )}
        </CardContent>
      </Card>

      <PetPhotoCarouselModal
        photos={photos}
        open={modalOpen}
        onOpenChange={setModalOpen}
        initialIndex={selectedPhotoIndex}
        petId={pet.id}
        onPetUpdate={onPetUpdate}
        showActions={true}
      />
    </>
  )
}
