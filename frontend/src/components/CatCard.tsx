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

  // Determine active/open placement requests per docs: is_active || status in {open,pending_review}
  const hasAnyPlacementRequests = (cat.placement_requests?.length ?? 0) > 0
  const isStatusOpen = (status?: string) => {
    const s = (status ?? '').toLowerCase()
    return s === 'open' || s === 'pending_review' || s === 'pending'
  }
  const activePlacementRequest = cat.placement_requests?.find((req) => req.is_active || isStatusOpen(req.status))
  const activePlacementRequestId = activePlacementRequest?.id
  // Show Fulfilled only when there were requests but none are currently active/open
  const hasActivePlacementRequests = Boolean(activePlacementRequest)
  const hasFulfilledPlacement = hasAnyPlacementRequests && !hasActivePlacementRequests

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
            const key = `${String(cat.id)}-${String(request.id)}-${request.expires_at ?? request.start_date ?? ''}`
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
            // Prefer backend convenience flag; fallback to derived active/open state
            (cat.placement_request_active ?? hasActivePlacementRequests) &&
            activePlacementRequestId !== undefined && (
              <>
                <Button className="w-full" onClick={() => { setIsModalOpen(true); }}>
                  Respond
                </Button>
                <PlacementResponseModal
                  isOpen={isModalOpen}
                  onClose={() => { setIsModalOpen(false); }}
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
