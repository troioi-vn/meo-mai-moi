import React from 'react'
import { useNavigate } from 'react-router-dom'
import type { Pet } from '@/types/pet'
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
import { formatPetAge, petSupportsCapability } from '@/types/pet'
import { useVaccinations } from '@/hooks/useVaccinations'
import { calculateVaccinationStatus } from '@/utils/vaccinationStatus'
import { VaccinationStatusBadge } from '@/components/pet-health/vaccinations/VaccinationStatusBadge'
import { useTranslation } from 'react-i18next'

interface PetCardProps {
  pet: Pet
}

export const PetCard: React.FC<PetCardProps> = ({ pet }) => {
  const { t } = useTranslation(['pets', 'common'])
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const [isLoginPromptOpen, setIsLoginPromptOpen] = React.useState(false)

  // Determine active/open placement requests: status in {open,finalized}
  const hasAnyPlacementRequests = (pet.placement_requests?.length ?? 0) > 0
  const isStatusOpen = (status?: string) => {
    const s = (status ?? '').toLowerCase()
    // Fulfilled should not count as open so we can surface the fulfilled badge
    return ['open', 'pending_transfer', 'active', 'finalized', 'pending'].includes(s)
  }
  // Get the most recent active request by sorting by ID descending
  const activePlacementRequest = pet.placement_requests
    ?.filter((req) => isStatusOpen(req.status))
    .sort((a, b) => b.id - a.id)[0]
  const activePlacementRequestId = activePlacementRequest?.id
  // Show Fulfilled only when there were requests but none are currently active/open
  const hasActivePlacementRequests = Boolean(activePlacementRequest)
  const hasFulfilledPlacement = hasAnyPlacementRequests && !hasActivePlacementRequests

  // Check if this pet type supports placement requests
  const supportsPlacement = petSupportsCapability(pet.pet_type, 'placement')
  // Check if this pet type supports vaccinations
  const supportsVaccinations = petSupportsCapability(pet.pet_type, 'vaccinations')

  // Check if current user is an owner of this pet
  const isOwner =
    (pet.viewer_permissions?.is_owner ?? false) ||
    (pet.relationships?.some((r) => r.relationship_type === 'owner' && r.user_id === user?.id) ??
      false) ||
    (user?.id !== undefined && pet.user_id === user.id)

  // Check if current user has a pending response (status='responded')
  const myPendingResponse = React.useMemo(() => {
    if (!user?.id || !pet.placement_requests) return undefined
    for (const pr of pet.placement_requests) {
      const found = pr.responses?.find((r) => {
        if (r.status !== 'responded') return false
        return r.helper_profile?.user?.id === user.id
      })
      if (found) return found
    }
    return undefined
  }, [pet.placement_requests, user])

  // Check if current user has an accepted response (status='accepted')
  const myAcceptedResponse = React.useMemo(() => {
    if (!user?.id || !pet.placement_requests) return undefined
    for (const pr of pet.placement_requests) {
      const found = pr.responses?.find((r) => {
        if (r.status !== 'accepted') return false
        return r.helper_profile?.user?.id === user.id
      })
      if (found) return found
    }
    return undefined
  }, [pet.placement_requests, user])

  // User has any active involvement with this placement
  const hasActiveInvolvement = Boolean(myPendingResponse ?? myAcceptedResponse)

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
      target.closest('[role="dialog"]') ||
      target.closest('[role="alertdialog"]')
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
          {pet.sex && pet.sex !== 'not_specified' && (
            <span>{t(`pets:sexLabels.${pet.sex}`)} • </span>
          )}
          {formatPetAge(pet, t)}
        </CardDescription>
        <div className="mt-2 flex flex-wrap gap-2">
          {supportsVaccinations && <PetVaccinationStatusBadge petId={pet.id} />}
          {hasFulfilledPlacement && (
            <Badge variant="success" className="rounded-full">
              {t('pets:status.fulfilled')}
            </Badge>
          )}
          {pet.status === 'lost' && (
            <Badge variant="destructive" className="rounded-full">
              {t('pets:status.lost')}
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
          {(!isAuthenticated || !isOwner) &&
            supportsPlacement &&
            // Prefer backend convenience flag; fallback to derived active/open state
            (pet.placement_request_active ?? hasActivePlacementRequests) &&
            activePlacementRequestId !== undefined && (
              <>
                {isAuthenticated && hasActiveInvolvement ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground text-center">
                      {myAcceptedResponse
                        ? t('pets:placement.accepted')
                        : t('pets:placement.responded')}
                    </p>
                    <Button
                      variant={myAcceptedResponse ? 'default' : 'outline'}
                      size="sm"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation()
                        void navigate(`/requests/${String(activePlacementRequestId)}`)
                      }}
                    >
                      {t('pets:placement.viewDetails')}
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (isAuthenticated) {
                        void navigate(`/requests/${String(activePlacementRequestId)}`)
                      } else {
                        setIsLoginPromptOpen(true)
                      }
                    }}
                  >
                    {t('pets:placement.respond')}
                  </Button>
                )}
              </>
            )}

          {/* Login prompt modal for non-authenticated users */}
          <AlertDialog open={isLoginPromptOpen} onOpenChange={setIsLoginPromptOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('pets:loginRequired.title')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('pets:loginRequired.description')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel
                  onClick={(e) => {
                    e.stopPropagation()
                  }}
                >
                  {t('common:actions.cancel')}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.stopPropagation()
                    const redirectUrl = activePlacementRequestId
                      ? `/requests/${String(activePlacementRequestId)}`
                      : `/pets/${String(pet.id)}`
                    void navigate(`/login?redirect=${encodeURIComponent(redirectUrl)}`)
                  }}
                >
                  {t('common:nav.login')}
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
