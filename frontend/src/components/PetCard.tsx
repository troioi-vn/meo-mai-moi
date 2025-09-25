import React from 'react'
import { Link } from 'react-router-dom'
import type { Pet } from '@/types/pet'
import { PlacementResponseModal } from '@/components/PlacementResponseModal'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
// Using default avatar as placeholder for pets
import placeholderCatImage from '@/assets/images/default-avatar.webp'
import { calculateAge } from '@/utils/date'
import { petSupportsCapability } from '@/types/pet'

interface PetCardProps {
  pet: Pet
}

export const PetCard: React.FC<PetCardProps> = ({ pet }) => {
  const { isAuthenticated, user } = useAuth()
  const [isModalOpen, setIsModalOpen] = React.useState(false)

  // Determine active/open placement requests per docs: is_active || status in {open,pending_review}
  const hasAnyPlacementRequests = (pet.placement_requests?.length ?? 0) > 0
  const isStatusOpen = (status?: string) => {
    const s = (status ?? '').toLowerCase()
    return s === 'open' || s === 'pending_review' || s === 'pending'
  }
  const activePlacementRequest = pet.placement_requests?.find(
    (req) => req.is_active === true || isStatusOpen(req.status)
  )
  const activePlacementRequestId = activePlacementRequest?.id
  // Show Fulfilled only when there were requests but none are currently active/open
  const hasActivePlacementRequests = Boolean(activePlacementRequest)
  const hasFulfilledPlacement = hasAnyPlacementRequests && !hasActivePlacementRequests

  // Check if this pet type supports placement requests
  const supportsPlacement = petSupportsCapability(pet.pet_type, 'placement')

  // Check if current user has a pending response
  const myPendingTransfer = React.useMemo(() => {
    if (!user?.id || !pet.placement_requests) return undefined
    for (const pr of pet.placement_requests) {
      const found = pr.transfer_requests?.find((tr) => {
        if (tr.status !== 'pending') return false
        if (tr.initiator_user_id && tr.initiator_user_id === user.id) return true
        return tr.helper_profile?.user?.id === user.id
      })
      if (found) return found
    }
    return undefined
  }, [pet.placement_requests, user?.id])

  // Prefer photos[0].url, then photo_url, then placeholder
  const imageUrl =
    (Array.isArray((pet as { photos?: { url?: string }[] }).photos)
      ? (pet as { photos?: { url?: string }[] }).photos?.[0]?.url
      : undefined) ??
    pet.photo_url ??
    placeholderCatImage // TODO: Add different placeholders for different pet types

  // Use unified pet route
  const petRoute = `/pets/${String(pet.id)}`

  return (
    <Card className="flex flex-col overflow-hidden rounded-lg shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl">
      <Link to={petRoute} className="block">
        <img src={imageUrl} alt={pet.name} className="h-48 w-full object-cover" />
      </Link>
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-primary">{pet.name}</CardTitle>
        <CardDescription className="text-muted-foreground">
          {pet.breed} - {calculateAge(pet.birthday)} years old
          <span className="ml-2 inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
            {pet.pet_type.name}
          </span>
        </CardDescription>
        <div className="mt-2 flex flex-wrap gap-2">
          {hasFulfilledPlacement && (
            <span className="inline-block bg-emerald-600 text-white px-2 py-1 rounded-full text-xs font-semibold">
              Fulfilled
            </span>
          )}
          {pet.placement_requests?.map((request) => {
            const key = `${String(pet.id)}-${String(request.id)}-${request.expires_at ?? request.start_date ?? ''}`
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
        <p className="text-sm text-gray-600">Location: {pet.location}</p>
        <div className="mt-4">
          {isAuthenticated &&
            user?.id !== pet.user_id &&
            supportsPlacement &&
            // Prefer backend convenience flag; fallback to derived active/open state
            (pet.placement_request_active ?? hasActivePlacementRequests) &&
            activePlacementRequestId !== undefined && (
              <>
                {myPendingTransfer ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground text-center">
                      You responded... Waiting for approval
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        // TODO: Add cancel functionality
                        console.log('Cancel response for transfer:', myPendingTransfer.id)
                      }}
                    >
                      Cancel Response
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => {
                      setIsModalOpen(true)
                    }}
                  >
                    Respond
                  </Button>
                )}
                <PlacementResponseModal
                  isOpen={isModalOpen}
                  onClose={() => {
                    setIsModalOpen(false)
                  }}
                  petName={pet.name}
                  petId={pet.id}
                  placementRequestId={activePlacementRequestId}
                />
              </>
            )}

        </div>
      </CardContent>
    </Card>
  )
}

