import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import { useTranslation } from 'react-i18next'

interface Photo {
  id: number
  path?: string
  url?: string
  thumb_url?: string | null
}

export function HelperProfilePhotoGalleryCard({ photos }: { photos: Photo[] }) {
  const { t } = useTranslation('helper')

  if (photos.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">{t('view.sections.photos')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Carousel className="w-full">
          <CarouselContent>
            {photos.map((photo) => (
              <CarouselItem key={photo.id}>
                <div className="aspect-video rounded-lg overflow-hidden">
                  <img
                    src={photo.url ?? (photo.path ? `/storage/${photo.path}` : '')}
                    alt={t('photos.photoAlt')}
                    className="w-full h-full object-cover"
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          {photos.length > 1 && (
            <>
              <CarouselPrevious className="left-2" />
              <CarouselNext className="right-2" />
            </>
          )}
        </Carousel>
      </CardContent>
    </Card>
  )
}
