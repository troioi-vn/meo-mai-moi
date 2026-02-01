import { Camera } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PhotosGrid } from '@/components/helper/PhotosGrid'
import { useTranslation } from 'react-i18next'

export function CurrentPhotosCard({
  photos,
  onDelete,
  deleting,
}: {
  photos: { id: number; path: string }[]
  onDelete: (photoId: number) => void
  deleting: boolean
}) {
  const { t } = useTranslation('common')

  if (photos.length === 0) return null

  return (
    <Card className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Camera className="h-5 w-5 text-primary" />
          {t('common:helperProfiles.edit.currentPhotos')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <PhotosGrid photos={photos} onDelete={onDelete} deleting={deleting} />
      </CardContent>
    </Card>
  )
}
