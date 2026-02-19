import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Mars, Venus } from 'lucide-react'
import type { Pet } from '@/types/pet'
import { Badge } from '@/components/ui/badge'
import placeholderCatImage from '@/assets/images/default-avatar.webp'
import { formatPetAge, petSupportsCapability } from '@/types/pet'
import { useVaccinations } from '@/hooks/useVaccinations'
import { calculateVaccinationStatus } from '@/utils/vaccinationStatus'
import { VaccinationStatusBadge } from '@/components/pet-health/vaccinations/VaccinationStatusBadge'
import { useTranslation } from 'react-i18next'

interface PetCardCompactProps {
  pet: Pet
}

export const PetCardCompact: React.FC<PetCardCompactProps> = ({ pet }) => {
  const { t } = useTranslation(['pets', 'common'])
  const navigate = useNavigate()

  const imageUrl = pet.photos?.[0]?.url ?? pet.photo_url ?? placeholderCatImage

  const petRoute = `/pets/${String(pet.id)}`
  const isDeceased = pet.status === 'deceased'
  const supportsVaccinations = petSupportsCapability(pet.pet_type, 'vaccinations')

  const hasAnyPlacementRequests = (pet.placement_requests?.length ?? 0) > 0
  const isStatusOpen = (status?: string) => {
    const s = (status ?? '').toLowerCase()
    return ['open', 'pending_transfer', 'active', 'finalized', 'pending'].includes(s)
  }
  const activePlacementRequest = pet.placement_requests
    ?.filter((req) => isStatusOpen(req.status))
    .sort((a, b) => b.id - a.id)[0]
  const hasActivePlacementRequests = Boolean(activePlacementRequest)
  const hasFulfilledPlacement = hasAnyPlacementRequests && !hasActivePlacementRequests

  const handleClick = () => {
    void navigate(petRoute)
  }

  return (
    <div
      className="group cursor-pointer overflow-hidden rounded-lg border bg-card shadow-sm transition-shadow hover:shadow-md"
      onClick={handleClick}
    >
      <div className="relative aspect-square overflow-hidden">
        <img
          src={imageUrl}
          alt={pet.name}
          className={`h-full w-full object-cover transition-transform duration-200 group-hover:scale-105 ${isDeceased ? 'grayscale' : ''}`}
        />
        {pet.status === 'lost' && (
          <div className="absolute top-1 left-1">
            <Badge variant="destructive" className="rounded-full px-1.5 py-0 text-[10px] leading-4">
              {t('pets:status.lost')}
            </Badge>
          </div>
        )}
      </div>
      <div className="px-1.5 pt-1 pb-1.5">
        <div className="flex items-center gap-0.5 min-w-0">
          {pet.sex && pet.sex !== 'not_specified' && (
            <>
              {pet.sex === 'male' ? (
                <Mars className="h-2.5 w-2.5 shrink-0 text-blue-500" />
              ) : (
                <Venus className="h-2.5 w-2.5 shrink-0 text-pink-500" />
              )}
            </>
          )}
          <p className="truncate text-xs font-semibold text-foreground leading-tight">{pet.name}</p>
        </div>
        <p className="text-[10px] text-muted-foreground leading-tight truncate">
          {formatPetAge(pet, t)}
        </p>
        {(supportsVaccinations || hasFulfilledPlacement) && (
          <div className="mt-0.5 flex flex-wrap gap-0.5">
            {supportsVaccinations && <PetVaccinationStatusBadgeCompact petId={pet.id} />}
            {hasFulfilledPlacement && (
              <Badge variant="success" className="rounded-full px-1.5 py-0 text-[10px] leading-4">
                {t('pets:status.fulfilled')}
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function PetVaccinationStatusBadgeCompact({ petId }: { petId: number }) {
  const { items, loading } = useVaccinations(petId)

  if (loading) return null

  const status = calculateVaccinationStatus(items)
  return (
    <VaccinationStatusBadge
      status={status}
      className="rounded-full px-1.5 py-0 text-[10px] leading-4"
    />
  )
}
