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
import { toast } from '@/lib/i18n-toast'
import { Clock, ImageIcon, Star, Trash2 } from 'lucide-react'
import type { Pet, PetPhoto } from '@/types/pet'
import { useTranslation } from 'react-i18next'
import {
  deletePetsPetPhotosPhoto as deletePetPhoto,
  postPetsPetPhotosPhotoSetPrimary as setPrimaryPetPhoto,
} from '@/api/generated/pet-photos/pet-photos'
import { getGetPetsIdQueryKey } from '@/api/generated/pets/pets'
import { useQueryClient } from '@tanstack/react-query'
import { MediaImage } from '@/components/ui/MediaImage'
import { usePendingUploads } from '@/hooks/use-pending-uploads'

const buildPetAfterPhotoDelete = (
  photos: PetPhoto[],
  deletedPhotoId: number
): Pick<Pet, 'photo_url' | 'photos'> => {
  const remainingPhotos = photos.filter((photo) => photo.id !== deletedPhotoId)
  const nextPrimaryPhoto = remainingPhotos.find((photo) => photo.is_primary) ?? remainingPhotos[0]

  return {
    photo_url: nextPrimaryPhoto?.url,
    photos: remainingPhotos,
  }
}

interface PetPhotoCarouselModalProps {
  photos: PetPhoto[]
  open: boolean
  onOpenChange: (open: boolean) => void
  initialIndex?: number
  petId?: number
  pet?: Pet
  onPetUpdate?: (updatedPet: Pet) => void
  showActions?: boolean
}

export function PetPhotoCarouselModal({
  photos,
  open,
  onOpenChange,
  initialIndex = 0,
  petId,
  pet,
  onPetUpdate,
  showActions = false,
}: PetPhotoCarouselModalProps) {
  const { t } = useTranslation(['pets', 'media'])
  const queryClient = useQueryClient()
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
      void queryClient.invalidateQueries({ queryKey: getGetPetsIdQueryKey(petId) })
      onPetUpdate(updatedPet as Pet)
    } catch {
      toast.error('pets:photos.setPrimaryError')
    } finally {
      setIsSettingPrimary(null)
    }
  }

  const handleDelete = async (photo: PetPhoto) => {
    if (!petId || !onPetUpdate || !pet) return

    setIsDeleting(photo.id)

    try {
      await deletePetPhoto(petId, String(photo.id))
      toast.success('pets:photos.deleteSuccess')

      const updatedPet = { ...pet, ...buildPetAfterPhotoDelete(photos, photo.id) }

      // Invalidate the pet query to get updated photos list
      void queryClient.invalidateQueries({ queryKey: getGetPetsIdQueryKey(petId) })
      onPetUpdate(updatedPet)

      const remainingPhotos = updatedPet.photos?.length ?? 0
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
      const reduceMotion =
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      thumb.scrollIntoView({
        inline: 'center',
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'nearest',
      })
    }
  }, [selectedPhotoIndex])

  if (photos.length === 0) return null

  const currentPhoto = photos[selectedPhotoIndex]
  const petPhotoName = pet?.name ?? t('media:alt.placeholder')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="!flex h-[calc(100dvh-1rem)] max-h-[100dvh] w-[calc(100vw-1rem)] max-w-3xl flex-col gap-0 overflow-hidden border-none bg-black p-0 sm:h-[90vh] sm:max-h-[90vh]"
        data-testid="pet-photo-lightbox"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>
            {t('photos.counter', { current: selectedPhotoIndex + 1, total: photos.length })}
          </DialogTitle>
          <DialogDescription>{t('photos.description')}</DialogDescription>
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
              {photos.map((photo, index) => (
                <CarouselItem key={photo.id} className="h-full !pl-0">
                  <div className="flex h-full min-h-0 items-center justify-center bg-black">
                    <MediaImage
                      src={photo.url}
                      containerClassName="h-full w-full bg-black"
                      className="h-full w-full object-contain"
                      alt={t('media:alt.petPhotoIndexed', {
                        name: petPhotoName,
                        index: index + 1,
                        total: photos.length,
                      })}
                      fit="contain"
                      loading="eager"
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            {photos.length > 1 && (
              <>
                <CarouselPrevious className="left-4 opacity-0 transition-opacity group-hover:opacity-100 motion-reduce:transition-none" />
                <CarouselNext className="right-4 opacity-0 transition-opacity group-hover:opacity-100 motion-reduce:transition-none" />
              </>
            )}
          </Carousel>
        </div>

        {/* Thumbnail strip */}
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
                aria-current={index === selectedPhotoIndex ? 'true' : undefined}
                aria-label={t('media:alt.thumbnailIndexed', {
                  index: index + 1,
                  total: photos.length,
                })}
                className={`h-12 w-12 shrink-0 overflow-hidden rounded border-2 transition-all motion-reduce:transition-none ${
                  index === selectedPhotoIndex
                    ? 'border-white opacity-100'
                    : 'border-transparent opacity-50 hover:opacity-75'
                }`}
              >
                <MediaImage
                  src={photo.thumb_url ?? photo.url}
                  thumbSrc={photo.thumb_url}
                  containerClassName="h-full w-full"
                  className="h-full w-full object-cover"
                  alt={t('media:alt.petPhotoIndexed', {
                    name: petPhotoName,
                    index: index + 1,
                    total: photos.length,
                  })}
                />
              </button>
            ))}
          </div>
        )}

        {/* Action buttons */}
        {showActions && currentPhoto && (
          <div className="flex shrink-0 flex-wrap justify-center gap-3 border-t bg-background p-4">
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
  const { t } = useTranslation(['pets', 'media'])
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0)
  const [thumbnailCarouselApi, setThumbnailCarouselApi] = useState<CarouselApi>()
  const previousPhotosCountRef = useRef(0)

  const photos = pet.photos ?? []
  const pendingUploads = usePendingUploads({ kind: 'pet-photo', petId: pet.id })
  const totalVisiblePhotos = photos.length + pendingUploads.length

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
  if (photos.length === 0 && pendingUploads.length === 0) {
    return null
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            {t('photos.gallery')} ({totalVisiblePhotos})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {photos.length === 0 && pendingUploads.length > 0 ? (
            <div className="flex justify-center">
              {pendingUploads.slice(0, 1).map((upload) => (
                <div
                  key={upload.id}
                  className="relative aspect-square w-32 overflow-hidden rounded-lg border bg-muted"
                >
                  <MediaImage
                    src={upload.previewUrl}
                    thumbSrc={upload.previewUrl}
                    className="h-full w-full object-cover"
                    alt={t('media:alt.petPhoto', { name: pet.name })}
                  />
                  <div
                    className="absolute left-2 top-2 rounded-full bg-black/65 px-2 py-1 text-xs font-medium text-white"
                    aria-label={t('media:upload.pending')}
                  >
                    <Clock className="mr-1 inline h-3 w-3" aria-hidden="true" />
                    {t('media:upload.pending')}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-10">
              <Carousel
                opts={{
                  align: 'start',
                  loop: totalVisiblePhotos > 2,
                }}
                setApi={setThumbnailCarouselApi}
                className="w-full"
              >
                <CarouselContent className="-ml-2 md:-ml-4">
                  {pendingUploads.map((upload) => (
                    <CarouselItem key={upload.id} className="pl-2 md:basis-1/3 md:pl-4">
                      <div className="relative aspect-square w-full overflow-hidden rounded-lg border bg-muted">
                        <MediaImage
                          src={upload.previewUrl}
                          thumbSrc={upload.previewUrl}
                          className="h-full w-full object-cover"
                          alt={t('media:alt.petPhoto', { name: pet.name })}
                        />
                        <div
                          className="absolute left-2 top-2 rounded-full bg-black/65 px-2 py-1 text-xs font-medium text-white"
                          aria-label={t('media:upload.pending')}
                        >
                          <Clock className="mr-1 inline h-3 w-3" aria-hidden="true" />
                          {t('media:upload.pending')}
                        </div>
                      </div>
                    </CarouselItem>
                  ))}
                  {photos.map((photo, index) => (
                    <CarouselItem key={photo.id} className="pl-2 md:pl-4 basis-1/2 md:basis-1/3">
                      <button
                        type="button"
                        onClick={() => {
                          openModal(index)
                        }}
                        aria-label={t('media:alt.thumbnailIndexed', {
                          index: index + 1,
                          total: photos.length,
                        })}
                        className="relative aspect-square w-full overflow-hidden rounded-lg border bg-muted cursor-pointer transition-opacity hover:opacity-90 motion-reduce:transition-none"
                      >
                        <MediaImage
                          src={photo.thumb_url ?? photo.url}
                          thumbSrc={photo.thumb_url}
                          className="h-full w-full object-cover"
                          alt={t('media:alt.petPhotoIndexed', {
                            name: pet.name,
                            index: index + 1,
                            total: photos.length,
                          })}
                        />
                        {photo.is_primary && (
                          <div
                            className="absolute top-2 right-2 bg-yellow-500 text-white rounded-full p-1 border border-white/20"
                            aria-hidden="true"
                          >
                            <Star className="h-3 w-3 fill-current" aria-hidden="true" />
                          </div>
                        )}
                      </button>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {totalVisiblePhotos > 2 && (
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
        pet={pet}
        onPetUpdate={onPetUpdate}
        showActions={true}
      />
    </>
  )
}
