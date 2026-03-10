import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Mars, Venus, ChevronUp, ChevronDown, Pencil } from 'lucide-react'
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
import placeholderCatImage from '@/assets/images/default-avatar.webp'
import { formatBirthDate, formatPetAge, petSupportsCapability } from '@/types/pet'
import { useVaccinations } from '@/hooks/useVaccinations'
import { calculateVaccinationStatus } from '@/utils/vaccinationStatus'
import { VaccinationStatusBadge } from '@/components/pet-health/vaccinations/VaccinationStatusBadge'
import { useWeights } from '@/hooks/useWeights'
import { useTranslation } from 'react-i18next'
import { saveListScrollPosition } from '@/lib/scroll-restoration'

interface PetCardProps {
  pet: Pet
}

export const PetCard: React.FC<PetCardProps> = ({ pet }) => {
  const { t } = useTranslation(['pets', 'common'])
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isLoginPromptOpen, setIsLoginPromptOpen] = React.useState(false)

  // Determine active/open placement requests
  const hasAnyPlacementRequests = (pet.placement_requests?.length ?? 0) > 0
  const isStatusOpen = (status?: string) => {
    const s = (status ?? '').toLowerCase()
    return ['open', 'pending_transfer', 'active', 'finalized', 'pending'].includes(s)
  }
  const activePlacementRequest = pet.placement_requests
    ?.filter((req) => isStatusOpen(req.status))
    .sort((a, b) => b.id - a.id)[0]
  const activePlacementRequestId = activePlacementRequest?.id
  const hasActivePlacementRequests = Boolean(activePlacementRequest)
  const hasFulfilledPlacement = hasAnyPlacementRequests && !hasActivePlacementRequests

  const supportsPlacement = petSupportsCapability(pet.pet_type, 'placement')
  const supportsVaccinations = petSupportsCapability(pet.pet_type, 'vaccinations')
  const supportsWeight = petSupportsCapability(pet.pet_type, 'weight')

  const petOwnerId = pet.created_by ?? pet.user_id

  const isOwner =
    (pet.viewer_permissions?.is_owner ?? false) ||
    (pet.relationships?.some((r) => r.relationship_type === 'owner' && r.user_id === user?.id) ??
      false) ||
    (user?.id !== undefined && petOwnerId === user.id)

  // Owner or editor can navigate to edit page
  const canEdit = isOwner || (isAuthenticated && (pet.viewer_permissions?.can_edit ?? false))

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

  const hasActiveInvolvement = Boolean(myPendingResponse ?? myAcceptedResponse)

  const imageUrl =
    (Array.isArray((pet as { photos?: { url?: string }[] }).photos)
      ? (pet as { photos?: { url?: string }[] }).photos?.[0]?.url
      : undefined) ??
    pet.photo_url ??
    placeholderCatImage

  const petRoute = `/pets/${String(pet.id)}`
  const petEditRoute = `/pets/${String(pet.id)}?edit=general`
  const isDeceased = pet.status === 'deceased'

  const showRespondButton =
    (!isAuthenticated || !isOwner) &&
    supportsPlacement &&
    (pet.placement_request_active ?? hasActivePlacementRequests) &&
    activePlacementRequestId !== undefined

  const birthDateStr = formatBirthDate(pet)
  const ageStr = formatPetAge(pet, t)
  const handleEnterDetail = () => {
    saveListScrollPosition(location.pathname)
  }

  return (
    <Card className="flex flex-col overflow-hidden rounded-lg pt-0 shadow-sm transition-shadow duration-200 hover:shadow-lg">
      {/* Clickable photo → pet profile */}
      <Link to={petRoute} className="block" aria-label={pet.name} onClick={handleEnterDetail}>
        <img
          src={imageUrl}
          alt={pet.name}
          className={`aspect-square w-full object-cover transition-opacity hover:opacity-90 ${isDeceased ? 'grayscale' : ''}`}
        />
      </Link>

      <CardHeader className="pb-2">
        {/* Pet name + optional edit icon */}
        <CardTitle className="flex items-center gap-2 text-2xl font-bold">
          <Link to={petRoute} className="text-primary hover:underline leading-tight" onClick={handleEnterDetail}>
            {pet.name}
          </Link>
          {canEdit && (
            <Link
              to={petEditRoute}
              onClick={handleEnterDetail}
              className="text-muted-foreground/60 hover:text-foreground transition-colors"
              aria-label={t('pets:actions.editProfile')}
            >
              <Pencil className="h-4 w-4" />
            </Link>
          )}
        </CardTitle>

        {/* Sex icon + birth date + age */}
        <CardDescription className="flex items-center gap-1.5">
          {pet.sex &&
            pet.sex !== 'not_specified' &&
            (pet.sex === 'male' ? (
              <Mars className="h-4 w-4 shrink-0 text-blue-500" />
            ) : (
              <Venus className="h-4 w-4 shrink-0 text-pink-500" />
            ))}
          <span>
            {birthDateStr ? (
              <>
                {birthDateStr}
                <span className="text-muted-foreground/60"> ({ageStr})</span>
              </>
            ) : (
              ageStr
            )}
          </span>
        </CardDescription>

        {/* Weight with trend indicator */}
        {supportsWeight && <PetWeightDisplay petId={pet.id} />}

        {/* Status / placement badges */}
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

      {/* Only render the action area when there is a button to show */}
      {showRespondButton && (
        <CardContent className="p-4 pt-0">
          {isAuthenticated && hasActiveInvolvement ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground text-center">
                {myAcceptedResponse ? t('pets:placement.accepted') : t('pets:placement.responded')}
              </p>
              <Button
                variant={myAcceptedResponse ? 'default' : 'outline'}
                size="sm"
                className="w-full"
                onClick={() => {
                  handleEnterDetail()
                  void navigate(`/requests/${String(activePlacementRequestId)}`)
                }}
              >
                {t('pets:placement.viewDetails')}
              </Button>
            </div>
          ) : (
            <Button
              className="w-full"
              onClick={() => {
                if (isAuthenticated) {
                  handleEnterDetail()
                  void navigate(`/requests/${String(activePlacementRequestId)}`)
                } else {
                  setIsLoginPromptOpen(true)
                }
              }}
            >
              {t('pets:placement.respond')}
            </Button>
          )}

          {/* Login prompt for non-authenticated users */}
          <AlertDialog open={isLoginPromptOpen} onOpenChange={setIsLoginPromptOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('pets:loginRequired.title')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('pets:loginRequired.description')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('common:actions.cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
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
        </CardContent>
      )}
    </Card>
  )
}

// TODO: PetVaccinationStatusBadge and PetWeightDisplay each fire individual API
// requests per card. On pages with many pets this creates an N+1 problem.
// Consider batch-loading or including this data in the pet list response.

function PetVaccinationStatusBadge({ petId }: { petId: number }) {
  const { items, loading } = useVaccinations(petId)
  if (loading) return null
  const status = calculateVaccinationStatus(items)
  return <VaccinationStatusBadge status={status} className="rounded-full" />
}

function PetWeightDisplay({ petId }: { petId: number }) {
  const { items, loading } = useWeights(petId)

  if (loading || items.length === 0) return null

  const sorted = [...items].sort(
    (a, b) => new Date(b.record_date ?? '').getTime() - new Date(a.record_date ?? '').getTime()
  )

  const latest = sorted[0]
  const previous = sorted[1]

  const trend =
    previous?.weight_kg !== undefined && latest.weight_kg !== undefined
      ? latest.weight_kg > previous.weight_kg
        ? 'up'
        : latest.weight_kg < previous.weight_kg
          ? 'down'
          : null
      : null

  return (
    <div className="flex items-center gap-1 text-sm text-muted-foreground">
      <span>{latest.weight_kg} kg</span>
      {trend === 'up' && <ChevronUp className="h-3.5 w-3.5 text-amber-500" />}
      {trend === 'down' && <ChevronDown className="h-3.5 w-3.5 text-sky-500" />}
    </div>
  )
}
