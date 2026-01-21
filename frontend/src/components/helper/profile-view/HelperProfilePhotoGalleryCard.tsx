import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'

interface Photo {
  id: number
  path: string
  url?: string
}

export function HelperProfilePhotoGalleryCard({ photos }: { photos: Photo[] }) {
  if (photos.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Photos</CardTitle>
      </CardHeader>
      <CardContent>
        <Carousel className="w-full">
          <CarouselContent>
            {photos.map((photo) => (
              <CarouselItem key={photo.id}>
                <div className="aspect-video rounded-lg overflow-hidden">
                  <img
                    src={photo.url ?? `/storage/${photo.path}`}
                    alt="Helper profile photo"
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
