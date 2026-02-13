import { useState, useEffect, useRef, useCallback } from 'react'
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
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/lib/i18n-toast'
import { Star, Trash2, ImageIcon } from 'lucide-react'
import type { Pet, PetPhoto } from '@/types/pet'
import { useTranslation } from 'react-i18next'
import {
  deletePetsPetPhotosPhoto as deletePetPhoto,
  postPetsPetPhotosPhotoSetPrimary as setPrimaryPetPhoto,
} from '@/api/generated/pet-photos/pet-photos'
import { getPetsId as getPet } from '@/api/generated/pets/pets'

type PhotoLoadState = 'loading' | 'loaded' | 'error'

// Image component with loading skeleton and thumbnail→full fallback
function PhotoImage({
  photo,
  className,
  useThumbnail = true,
}: {
  photo: PetPhoto
  className: string
  useThumbnail?: boolean
}) {
  const [state, setState] = useState<PhotoLoadState>('loading')
  const [fallback, setFallback] = useState(false)
  useEffect(() => {
    setState('loading')
    setFallback(false)
  }, [photo.id])

  const src = useThumbnail && photo.thumb_url && !fallback ? photo.thumb_url : photo.url

  const handleLoad = () => {
    setState('loaded')
  }

  const handleError = () => {
    if (useThumbnail && photo.thumb_url && !fallback) {
      // Thumbnail failed — try the full URL
      setFallback(true)
      setState('loading')
    } else {
      setState('error')
    }
  }

  if (state === 'error') {
    return (
      <div className={`${className} flex items-center justify-center bg-muted`}>
        <ImageIcon className="h-8 w-8 text-muted-foreground" />
      </div>
    )
  }

  return (
    <>
      {state === 'loading' && <Skeleton className={className} />}
      <img
        src={src}
        alt="Pet photo"
        className={`${className} ${state === 'loading' ? 'hidden' : ''}`}
        onLoad={handleLoad}
        onError={handleError}
      />
    </>
  )
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
  const { t } = useTranslation('pets')
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
      toast.info('pets:photos.alreadyPrimary')
      return
    }

    setIsSettingPrimary(photo.id)

    try {
      const updatedPet = await setPrimaryPetPhoto(petId, photo.id)
      toast.success('pets:photos.setPrimarySuccess')
      onOpenChange(false) // Close modal after setting avatar
      onPetUpdate(updatedPet)
    } catch {
      toast.error('pets:photos.setPrimaryError')
    } finally {
      setIsSettingPrimary(null)
    }
  }

  const handleDelete = async (photo: PetPhoto) => {
    if (!petId || !onPetUpdate) return

    setIsDeleting(photo.id)

    try {
      await deletePetPhoto(petId, String(photo.id))
      toast.success('pets:photos.deleteSuccess')

      // Refetch the pet to get updated photos list
      const updatedPet = await getPet(petId)
      onPetUpdate(updatedPet)

      // Close modal if we deleted the last photo or navigate to previous
      const remainingPhotos = (updatedPet.photos ?? []).length
      if (remainingPhotos === 0) {
        onOpenChange(false)
      } else if (selectedPhotoIndex >= remainingPhotos) {
        setSelectedPhotoIndex(remainingPhotos - 1)
      }
    } catch {
      toast.error('pets:photos.deleteError')
    } finally {
      setIsDeleting(null)
    }
  }

  const [carouselApi, setCarouselApi] = useState<CarouselApi>()
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([])

  // Sync carousel with selected index when modal opens
  const handleCarouselApi = useCallback(
    (api: CarouselApi) => {
      setCarouselApi(api)
      if (api) {
        api.scrollTo(selectedPhotoIndex, true)
        api.on('select', () => {
          setSelectedPhotoIndex(api.selectedScrollSnap())
        })
      }
    },
    [selectedPhotoIndex]
  )

  // Auto-scroll active thumbnail into view
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
      <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black border-none">
        <DialogHeader className="sr-only">
          <DialogTitle>
            {t('photos.counter', { current: selectedPhotoIndex + 1, total: photos.length })}
          </DialogTitle>
          <DialogDescription>{t('photos.description')}</DialogDescription>
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
        </div>

        {/* Thumbnail strip */}
        {photos.length > 1 && (
          <div className="flex gap-2 px-4 py-3 overflow-x-auto justify-center bg-black">
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
                className={`shrink-0 w-12 h-12 rounded overflow-hidden border-2 transition-all ${
                  index === selectedPhotoIndex
                    ? 'border-white opacity-100'
                    : 'border-transparent opacity-50 hover:opacity-75'
                }`}
              >
                <PhotoImage
                  photo={photo}
                  className="w-full h-full object-cover"
                  useThumbnail={true}
                />
              </button>
            ))}
          </div>
        )}

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
                ? t('photos.settingPrimary')
                : currentPhoto.is_primary
                  ? t('photos.currentAvatar')
                  : t('photos.setAsAvatar')}
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
              {isDeleting === currentPhoto.id ? t('photos.deleting') : t('photos.delete')}
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
  const { t } = useTranslation('pets')
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
            {t('photos.gallery')} ({photos.length})
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
