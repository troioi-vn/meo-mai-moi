import { Camera } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PhotosGrid } from '@/components/helper/PhotosGrid'

export function CurrentPhotosCard({
  photos,
  onDelete,
  deleting,
}: {
  photos: { id: number; path: string }[]
  onDelete: (photoId: number) => void
  deleting: boolean
}) {
  if (photos.length === 0) return null

  return (
    <Card className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Camera className="h-5 w-5 text-primary" />
          Current Photos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <PhotosGrid photos={photos} onDelete={onDelete} deleting={deleting} />
      </CardContent>
    </Card>
  )
}
