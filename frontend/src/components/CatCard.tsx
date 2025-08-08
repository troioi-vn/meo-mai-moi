import React from 'react'
import { Link } from 'react-router-dom'
import type { Cat } from '@/types/cat'
import { PlacementResponseModal } from '@/components/PlacementResponseModal';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import placeholderImage from '@/assets/images/placeholder--cat.webp'
import { calculateAge } from '@/utils/date'

interface CatCardProps {
  cat: Cat
}

export const CatCard: React.FC<CatCardProps> = ({ cat }) => {
  const { isAuthenticated, user } = useAuth()
  const [isModalOpen, setIsModalOpen] = React.useState(false)

  const activePlacementRequestId = cat.placement_requests?.find((req) => req.is_active)?.id
  const hasAnyPlacementRequests = (cat.placement_requests?.length ?? 0) > 0
  const hasFulfilledPlacement = hasAnyPlacementRequests && !cat.placement_request_active

  // Prefer photos[0].url, then photo_url, then placeholder
  const imageUrl =
    (Array.isArray((cat as { photos?: { url?: string }[] }).photos)
      ? (cat as { photos?: { url?: string }[] }).photos?.[0]?.url
      : undefined) ??
    cat.photo_url ??
    placeholderImage
  return (
    <Card className="flex flex-col overflow-hidden rounded-lg shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl">
      <Link to={`/cats/${String(cat.id)}`} className="block">
        <img src={imageUrl} alt={cat.name} className="h-48 w-full object-cover" />
      </Link>
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-primary">{cat.name}</CardTitle>
        <CardDescription className="text-muted-foreground">
          {cat.breed} - {calculateAge(cat.birthday)} years old
        </CardDescription>
        <div className="mt-2 flex flex-wrap gap-2">
          {hasFulfilledPlacement && (
            <span className="inline-block bg-emerald-600 text-white px-2 py-1 rounded-full text-xs font-semibold">
              Fulfilled
            </span>
          )}
          {cat.placement_requests?.map((request) => {
            const key = `${cat.id}-${request.id ?? request.request_type}-${request.expires_at ?? request.start_date ?? ''}`
            return (
              <span
                key={key}
                className="inline-block bg-secondary text-secondary-foreground px-2 py-1 rounded-full text-xs font-medium"
              >
                {request.request_type.replace('_', ' ').toUpperCase()}
              </span>
            )
          })}
        </div>
      </CardHeader>
      <CardContent className="flex flex-grow flex-col justify-between p-4">
        <p className="text-sm text-gray-600">Location: {cat.location}</p>
        <div className="mt-4">
          {isAuthenticated &&
            user?.id !== cat.user_id &&
            cat.placement_request_active &&
            activePlacementRequestId !== undefined && (
              <>
                <Button className="w-full" onClick={() => setIsModalOpen(true)}>
                  Respond
                </Button>
                <PlacementResponseModal
                  isOpen={isModalOpen}
                  onClose={() => setIsModalOpen(false)}
                  catName={cat.name}
                  catId={cat.id}
                  placementRequestId={activePlacementRequestId}
                />
              </>
            )}
        </div>
      </CardContent>
    </Card>
  )
}
