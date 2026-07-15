import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Clock, Mars, Venus } from 'lucide-react'
import type { Pet, PetType } from '@/types/pet'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { formatPetAge, petSupportsCapability } from '@/types/pet'
import { useVaccinations } from '@/hooks/useVaccinations'
import { calculateVaccinationStatus } from '@/utils/vaccinationStatus'
import { VaccinationStatusBadge } from '@/components/pet-health/vaccinations/VaccinationStatusBadge'
import { useTranslation } from 'react-i18next'
import { toast } from '@/lib/i18n-toast'
import { cn } from '@/lib/utils'
import { saveListScrollPosition } from '@/lib/scroll-restoration'
import { MediaImage } from '@/components/ui/MediaImage'
import { deriveImageUrl, deriveThumbUrl } from '@/utils/petImages'
import { usePendingUploads } from '@/hooks/use-pending-uploads'
import {
  getPetOfflineLocalEntityId,
  getPetOfflineOperationStatus,
} from '@/offline/projections/pets'

const LONG_PRESS_MS = 500

export type CompactPetCardPet = Pick<Pet, 'id' | 'name'> &
  Partial<Omit<Pet, 'id' | 'name' | 'pet_type'>> & {
    pet_type?: Partial<PetType> | null
  }

interface PetCardCompactProps {
  pet: CompactPetCardPet
  selectionMode?: boolean
  selected?: boolean
  /** Owned pets only — from viewer_permissions.is_owner (with legacy fallbacks). */
  selectable?: boolean
  onToggleSelect?: () => void
  onLongPressEnterSelection?: () => void
}

export const PetCardCompact: React.FC<PetCardCompactProps> = ({
  pet,
  selectionMode = false,
  selected = false,
  selectable = false,
  onToggleSelect,
  onLongPressEnterSelection,
}) => {
  const { t } = useTranslation(['pets', 'common', 'media', 'groups'])
  const navigate = useNavigate()
  const location = useLocation()
  const longPressTimer = React.useRef<number | null>(null)
  const longPressTriggered = React.useRef(false)

  const offlineLocalEntityId = getPetOfflineLocalEntityId(pet)
  const offlineOperationStatus = getPetOfflineOperationStatus(pet)
  const pendingUploads = usePendingUploads(
    offlineLocalEntityId
      ? { kind: 'pending-pet', localEntityId: offlineLocalEntityId }
      : { kind: 'pet-photo', petId: pet.id }
  )
  const pendingUpload = pendingUploads[0]
  const primaryPhoto = pet.photos?.find((photo) => photo.is_primary) ?? pet.photos?.[0]
  const imageUrl = pendingUpload?.previewUrl ?? deriveImageUrl(pet)
  const thumbUrl = pendingUpload?.previewUrl ?? deriveThumbUrl(pet)

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

  const clearLongPress = () => {
    if (longPressTimer.current != null) {
      window.clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const handlePointerDown = () => {
    if (selectionMode || !selectable || !onLongPressEnterSelection) return
    longPressTriggered.current = false
    clearLongPress()
    longPressTimer.current = window.setTimeout(() => {
      longPressTriggered.current = true
      onLongPressEnterSelection()
    }, LONG_PRESS_MS)
  }

  const handlePointerUp = () => {
    clearLongPress()
  }

  const handleSelectionActivate = () => {
    if (!selectionMode) return
    if (!selectable) {
      toast.info('groups:selectionOwnedOnly')
      return
    }
    onToggleSelect?.()
  }

  const handleClick = () => {
    if (selectionMode) {
      handleSelectionActivate()
      return
    }
    if (longPressTriggered.current) {
      longPressTriggered.current = false
      return
    }
    saveListScrollPosition(location.pathname)
    void navigate(petRoute)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!selectionMode || (event.key !== 'Enter' && event.key !== ' ')) return
    event.preventDefault()
    handleSelectionActivate()
  }

  return (
    <div
      className={cn(
        'group cursor-pointer overflow-hidden rounded-lg border bg-card shadow-sm transition-shadow hover:shadow-md',
        selectionMode && selected && 'ring-2 ring-primary',
        selectionMode && !selectable && 'opacity-60'
      )}
      data-testid={`pet-card-compact-${String(pet.id)}`}
      data-selected={selected ? 'true' : 'false'}
      data-selectable={selectable ? 'true' : 'false'}
      role={selectionMode ? 'button' : undefined}
      tabIndex={selectionMode ? 0 : undefined}
      aria-pressed={selectionMode ? selected : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onContextMenu={(event) => {
        if (selectable && onLongPressEnterSelection) event.preventDefault()
      }}
    >
      <div className="relative aspect-square overflow-hidden">
        <MediaImage
          src={imageUrl}
          thumbSrc={thumbUrl}
          media={pendingUpload ? undefined : primaryPhoto}
          sizes="(min-width: 1280px) 20vw, (min-width: 768px) 25vw, 50vw"
          alt={t('media:alt.petPhoto', { name: pet.name })}
          aspect="square"
          className={`h-full w-full object-cover transition-transform duration-200 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100 ${isDeceased ? 'grayscale' : ''}`}
          loading="lazy"
          overlay={
            selectionMode ? (
              <div className="absolute left-1 top-1">
                <Checkbox
                  checked={selected}
                  disabled={!selectable}
                  className="pointer-events-none h-3.5 w-3.5 border-background bg-background/90"
                  aria-hidden
                />
              </div>
            ) : pendingUpload ? (
              <div
                className="absolute left-1 top-1 rounded-full bg-black/65 px-1.5 py-0.5 text-[10px] font-medium leading-4 text-white"
                aria-label={t('media:upload.pending')}
              >
                <Clock className="mr-0.5 inline h-2.5 w-2.5" aria-hidden="true" />
                {t('media:upload.pending')}
              </div>
            ) : null
          }
        />
        {!selectionMode && pet.status === 'lost' && (
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
          {offlineOperationStatus && (
            <Badge variant="secondary" className="rounded-full px-1 py-0 text-[9px] leading-3">
              {t(`common:status.operation.${offlineOperationStatus}`, {
                defaultValue: t('common:status.pending'),
              })}
            </Badge>
          )}
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
