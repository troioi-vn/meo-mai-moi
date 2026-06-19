import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { HelperProfilePhoto } from '@/types/helper-profile'
import { Star, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { MediaImage } from '@/components/ui/MediaImage'

const helperPhotoUrl = (photo: HelperProfilePhoto) =>
  photo.url ?? (photo.path ? `/storage/${photo.path}` : '')

const helperPhotoThumbUrl = (photo: HelperProfilePhoto) => photo.thumb_url ?? helperPhotoUrl(photo)

function HelperProfilePhotoCarouselModal({
  photos,
  open,
  onOpenChange,
  initialIndex = 0,
  canManage = false,
  deletingPhotoId = null,
  settingPrimaryPhotoId = null,
  onDeletePhoto,
  onSetPrimaryPhoto,
}: {
  photos: HelperProfilePhoto[]
  open: boolean
  onOpenChange: (open: boolean) => void
  initialIndex?: number
  canManage?: boolean
  deletingPhotoId?: number | null
  settingPrimaryPhotoId?: number | null
  onDeletePhoto?: (photo: HelperProfilePhoto) => Promise<void>
  onSetPrimaryPhoto?: (photo: HelperProfilePhoto) => Promise<void>
}) {
  const { t } = useTranslation(['helper', 'media'])
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(initialIndex)
  const [carouselApi, setCarouselApi] = useState<CarouselApi>()
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    if (open) {
      setSelectedPhotoIndex(initialIndex)
    }
  }, [initialIndex, open])

  const handleCarouselApi = useCallback(
    (api: CarouselApi | undefined) => {
      if (!api) {
        return
      }

      setCarouselApi(api)
      api.scrollTo(selectedPhotoIndex, true)
      api.on('select', () => {
        setSelectedPhotoIndex(api.selectedScrollSnap())
      })
    },
    [selectedPhotoIndex]
  )

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

  useEffect(() => {
    if (photos.length === 0) {
      onOpenChange(false)
      return
    }

    if (selectedPhotoIndex >= photos.length) {
      setSelectedPhotoIndex(photos.length - 1)
    }
  }, [onOpenChange, photos.length, selectedPhotoIndex])

  if (photos.length === 0) return null

  const currentPhoto = photos[selectedPhotoIndex]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl overflow-hidden border-none bg-black p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>
            {t('photos.counter', { current: selectedPhotoIndex + 1, total: photos.length })}
          </DialogTitle>
          <DialogDescription>{t('photos.description')}</DialogDescription>
        </DialogHeader>

        <div className="group relative">
          {photos.length === 1 && currentPhoto ? (
            <div className="flex min-h-[50vh] items-center justify-center bg-black">
              <MediaImage
                src={helperPhotoUrl(currentPhoto)}
                className="h-auto max-h-[85vh] w-full object-contain"
                alt={t('media:alt.helperPhoto')}
                fit="contain"
                loading="eager"
              />
            </div>
          ) : (
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
                    <div className="flex min-h-[50vh] items-center justify-center bg-black">
                      <MediaImage
                        src={helperPhotoUrl(photo)}
                        className="h-auto max-h-[85vh] w-full object-contain"
                        alt={t('media:alt.helperPhoto')}
                        fit="contain"
                        loading="eager"
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-4 opacity-0 transition-opacity group-hover:opacity-100 motion-reduce:transition-none" />
              <CarouselNext className="right-4 opacity-0 transition-opacity group-hover:opacity-100 motion-reduce:transition-none" />
            </Carousel>
          )}
        </div>

        {photos.length > 1 && (
          <div className="flex justify-center gap-2 overflow-x-auto bg-black px-4 py-3">
            {photos.map((photo, index) => (
              <button
                key={photo.id}
                ref={(element) => {
                  thumbRefs.current[index] = element
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
                  src={helperPhotoThumbUrl(photo)}
                  thumbSrc={photo.thumb_url}
                  alt={t('media:alt.helperPhoto')}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        )}

        {canManage && currentPhoto && (onDeletePhoto ?? onSetPrimaryPhoto) && (
          <div className="flex justify-center gap-3 border-t bg-background p-4">
            {onSetPrimaryPhoto && (
              <Button
                variant={currentPhoto.is_primary ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => {
                  void onSetPrimaryPhoto(currentPhoto)
                }}
                disabled={settingPrimaryPhotoId === currentPhoto.id || currentPhoto.is_primary}
              >
                <Star
                  className={`mr-2 h-4 w-4 ${
                    currentPhoto.is_primary ? 'fill-yellow-500 text-yellow-500' : ''
                  }`}
                />
                {settingPrimaryPhotoId === currentPhoto.id
                  ? t('photos.settingPrimary')
                  : currentPhoto.is_primary
                    ? t('photos.currentMain')
                    : t('photos.setAsMain')}
              </Button>
            )}
            {onDeletePhoto && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={deletingPhotoId === currentPhoto.id}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {deletingPhotoId === currentPhoto.id
                      ? t('photos.deleting')
                      : t('photos.delete')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('photos.deletePhotoConfirm.title')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('photos.deletePhotoConfirm.description')}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('common:actions.cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        void onDeletePhoto(currentPhoto)
                      }}
                      disabled={deletingPhotoId === currentPhoto.id}
                    >
                      {deletingPhotoId === currentPhoto.id
                        ? t('photos.deleting')
                        : t('photos.delete')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function HelperProfilePhotoGalleryCard({
  photos,
  canManage = false,
  deletingPhotoId = null,
  settingPrimaryPhotoId = null,
  onDeletePhoto,
  onSetPrimaryPhoto,
}: {
  photos: HelperProfilePhoto[]
  canManage?: boolean
  deletingPhotoId?: number | null
  settingPrimaryPhotoId?: number | null
  onDeletePhoto?: (photo: HelperProfilePhoto) => Promise<void>
  onSetPrimaryPhoto?: (photo: HelperProfilePhoto) => Promise<void>
}) {
  const { t } = useTranslation(['helper', 'media'])
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0)
  const [visiblePhotos, setVisiblePhotos] = useState(photos)
  const [thumbnailCarouselApi, setThumbnailCarouselApi] = useState<CarouselApi>()
  const previousPhotosCountRef = useRef(0)

  useEffect(() => {
    setVisiblePhotos(photos)
  }, [photos])

  useEffect(() => {
    if (visiblePhotos.length > previousPhotosCountRef.current && thumbnailCarouselApi) {
      thumbnailCarouselApi.scrollTo(visiblePhotos.length - 1)
    }

    previousPhotosCountRef.current = visiblePhotos.length
  }, [thumbnailCarouselApi, visiblePhotos.length])

  if (visiblePhotos.length === 0) return null

  const openModal = (index: number) => {
    setSelectedPhotoIndex(index)
    setModalOpen(true)
  }

  const handleDeletePhoto = async (photo: HelperProfilePhoto) => {
    if (!onDeletePhoto) return

    await onDeletePhoto(photo)
    setVisiblePhotos((currentPhotos) => currentPhotos.filter((item) => item.id !== photo.id))
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">
            {t('view.sections.photos')} ({visiblePhotos.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {visiblePhotos.length === 1 && visiblePhotos[0] ? (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => {
                  openModal(0)
                }}
                aria-label={t('media:alt.thumbnailIndexed', {
                  index: 1,
                  total: visiblePhotos.length,
                })}
                className="relative aspect-square w-32 cursor-pointer overflow-hidden rounded-lg border bg-muted transition-opacity hover:opacity-90 motion-reduce:transition-none"
              >
                <MediaImage
                  src={helperPhotoThumbUrl(visiblePhotos[0])}
                  thumbSrc={visiblePhotos[0].thumb_url}
                  alt={t('media:alt.helperPhoto')}
                  className="h-full w-full object-cover"
                />
                {visiblePhotos[0].is_primary && (
                  <div
                    className="absolute right-2 top-2 rounded-full border border-white/20 bg-yellow-500 p-1 text-white"
                    aria-hidden="true"
                  >
                    <Star className="h-3 w-3 fill-current" aria-hidden="true" />
                  </div>
                )}
              </button>
            </div>
          ) : (
            <div className="px-10">
              <Carousel
                opts={{
                  align: 'start',
                  loop: visiblePhotos.length > 2,
                }}
                setApi={setThumbnailCarouselApi}
                className="w-full"
              >
                <CarouselContent className="-ml-2 md:-ml-4">
                  {visiblePhotos.map((photo, index) => (
                    <CarouselItem key={photo.id} className="basis-1/2 pl-2 md:basis-1/3 md:pl-4">
                      <button
                        type="button"
                        onClick={() => {
                          openModal(index)
                        }}
                        aria-label={t('media:alt.thumbnailIndexed', {
                          index: index + 1,
                          total: visiblePhotos.length,
                        })}
                        className="relative aspect-square w-full cursor-pointer overflow-hidden rounded-lg border bg-muted transition-opacity hover:opacity-90 motion-reduce:transition-none"
                      >
                        <MediaImage
                          src={helperPhotoThumbUrl(photo)}
                          thumbSrc={photo.thumb_url}
                          alt={t('media:alt.helperPhoto')}
                          className="h-full w-full object-cover"
                        />
                        {photo.is_primary && (
                          <div
                            className="absolute right-2 top-2 rounded-full border border-white/20 bg-yellow-500 p-1 text-white"
                            aria-hidden="true"
                          >
                            <Star className="h-3 w-3 fill-current" aria-hidden="true" />
                          </div>
                        )}
                      </button>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {visiblePhotos.length > 2 && (
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

      <HelperProfilePhotoCarouselModal
        photos={visiblePhotos}
        open={modalOpen}
        onOpenChange={setModalOpen}
        initialIndex={selectedPhotoIndex}
        canManage={canManage}
        deletingPhotoId={deletingPhotoId}
        settingPrimaryPhotoId={settingPrimaryPhotoId}
        onDeletePhoto={onDeletePhoto ? handleDeletePhoto : undefined}
        onSetPrimaryPhoto={onSetPrimaryPhoto}
      />
    </>
  )
}
