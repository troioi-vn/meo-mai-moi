import React from 'react'
import { useNavigate } from 'react-router-dom'
import type { Pet } from '@/types/pet'
import { PlacementResponseModal } from '@/components/placement/PlacementResponseModal'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
// Using default avatar as placeholder for pets
import placeholderCatImage from '@/assets/images/default-avatar.webp'
import { formatPetAge, petSupportsCapability, PetSexLabels } from '@/types/pet'
import { useVaccinations } from '@/hooks/useVaccinations'
import { calculateVaccinationStatus } from '@/utils/vaccinationStatus'
import { VaccinationStatusBadge } from '@/components/pet-health/vaccinations/VaccinationStatusBadge'

interface PetCardProps {
  pet: Pet
}

export const PetCard: React.FC<PetCardProps> = ({ pet }) => {
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [isLoginPromptOpen, setIsLoginPromptOpen] = React.useState(false)

  // Determine active/open placement requests: status in {open,finalized}
  const hasAnyPlacementRequests = (pet.placement_requests?.length ?? 0) > 0
  const isStatusOpen = (status?: string) => {
    const s = (status ?? '').toLowerCase()
    return ['open', 'fulfilled', 'pending_transfer', 'active', 'finalized', 'pending'].includes(s)
  }
  const activePlacementRequest = pet.placement_requests?.find((req) => isStatusOpen(req.status))
  const activePlacementRequestId = activePlacementRequest?.id
  // Show Fulfilled only when there were requests but none are currently active/open
  const hasActivePlacementRequests = Boolean(activePlacementRequest)
  const hasFulfilledPlacement = hasAnyPlacementRequests && !hasActivePlacementRequests

  // Check if this pet type supports placement requests
  const supportsPlacement = petSupportsCapability(pet.pet_type, 'placement')
  // Check if this pet type supports vaccinations
  const supportsVaccinations = petSupportsCapability(pet.pet_type, 'vaccinations')

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
  const isDeceased = pet.status === 'deceased'

  // Handle card click - navigate to pet profile
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on interactive elements
    const target = e.target as HTMLElement
    if (
      target.closest('button') ||
      target.closest('a') ||
      target.closest('[role="button"]') ||
      target.closest('.modal')
    ) {
      return
    }
    void navigate(petRoute)
  }

  return (
    <Card
      className="flex flex-col overflow-hidden rounded-lg shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="block">
        <img
          src={imageUrl}
          alt={pet.name}
          className={`h-48 w-full object-cover ${isDeceased ? 'grayscale' : ''}`}
        />
      </div>
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-primary">{pet.name}</CardTitle>
        <CardDescription className="text-muted-foreground">
          {pet.sex && pet.sex !== 'not_specified' && <span>{PetSexLabels[pet.sex]} • </span>}
          {formatPetAge(pet)}
        </CardDescription>
        <div className="mt-2 flex flex-wrap gap-2">
          {supportsVaccinations && <PetVaccinationStatusBadge petId={pet.id} />}
          {hasFulfilledPlacement && (
            <Badge variant="success" className="rounded-full">
              Fulfilled
            </Badge>
          )}
          {pet.status === 'lost' && (
            <Badge variant="destructive" className="rounded-full">
              Lost
            </Badge>
          )}
          {pet.placement_requests?.map((request) => {
            const key = `${String(pet.id)}-${String(request.id)}-${request.expires_at ?? request.start_date ?? ''}`
            return (
              <Badge key={key} variant="secondary" className="rounded-full">
                {request.request_type.replace('_', ' ').toUpperCase()}
              </Badge>
            )
          })}
        </div>
      </CardHeader>
      <CardContent className="flex grow flex-col justify-between p-4">
        <div className="mt-4">
          {/* Show Respond button for all users (except pet owner) when there's an active placement request */}
          {(!isAuthenticated || user?.id !== pet.user_id) &&
            supportsPlacement &&
            // Prefer backend convenience flag; fallback to derived active/open state
            (pet.placement_request_active ?? hasActivePlacementRequests) &&
            activePlacementRequestId !== undefined && (
              <>
                {isAuthenticated && myPendingTransfer ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground text-center">
                      You responded... Waiting for approval
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation()
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
                    onClick={(e) => {
                      e.stopPropagation()
                      if (isAuthenticated) {
                        setIsModalOpen(true)
                      } else {
                        setIsLoginPromptOpen(true)
                      }
                    }}
                  >
                    Respond
                  </Button>
                )}
                {isAuthenticated && (
                  <PlacementResponseModal
                    isOpen={isModalOpen}
                    onClose={() => {
                      setIsModalOpen(false)
                    }}
                    petName={pet.name}
                    petId={pet.id}
                    placementRequestId={activePlacementRequestId}
                    requestType={activePlacementRequest?.request_type ?? ''}
                    petCity={pet.city}
                    petCountry={pet.country}
                  />
                )}
              </>
            )}

          {/* Login prompt modal for non-authenticated users */}
          <AlertDialog open={isLoginPromptOpen} onOpenChange={setIsLoginPromptOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Login Required</AlertDialogTitle>
                <AlertDialogDescription>
                  Please login to respond to this placement request.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel
                  onClick={(e) => {
                    e.stopPropagation()
                  }}
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.stopPropagation()
                    void navigate(`/login?redirect=/pets/${String(pet.id)}`)
                  }}
                >
                  Login
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  )
}

// Helper component to fetch and display vaccination status for a pet card
function PetVaccinationStatusBadge({ petId }: { petId: number }) {
  const { items, loading } = useVaccinations(petId)

  if (loading) {
    return null
  }

  const status = calculateVaccinationStatus(items)
  return <VaccinationStatusBadge status={status} className="rounded-full" />
}
