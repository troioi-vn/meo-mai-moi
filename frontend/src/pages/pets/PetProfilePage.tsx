import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link, useSearchParams, Navigate } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { getGetPetsIdQueryKey } from '@/api/generated/pets/pets'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { PetInfoCard } from '@/components/pets/PetInfoCard'
import { WeightHistoryCard } from '@/components/pet-health/weights/WeightHistoryCard'
import { UpcomingVaccinationsSection } from '@/components/pet-health/vaccinations/UpcomingVaccinationsSection'
import { MedicalRecordsSection } from '@/components/pet-health/medical/MedicalRecordsSection'
import { MicrochipsSection } from '@/components/pet-health/microchips/MicrochipsSection'
import { PetFinanceSection } from '@/components/finance/PetFinanceSection'
import { PetRelationshipsSection } from '@/components/pets/PetRelationshipsSection'
import { PlacementRequestsCard } from '@/components/pets/PlacementRequestsCard'
import { PetPhotoCarouselModal } from '@/components/pets/PetPhotoGallery'
import { petSupportsCapability, isPubliclyViewable } from '@/types/pet'
import type { Pet } from '@/types/pet'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import { useProjectedPet } from '@/hooks/use-projected-pets'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

const getExactBirthday = (pet: Pick<Pet, 'birthday_year' | 'birthday_month' | 'birthday_day'>) => {
  if (!pet.birthday_year || !pet.birthday_month || !pet.birthday_day) {
    return null
  }

  const month = String(pet.birthday_month).padStart(2, '0')
  const day = String(pet.birthday_day).padStart(2, '0')
  return `${String(pet.birthday_year)}-${month}-${day}`
}

const getPetQueryErrorMessage = (queryError: unknown, t: (key: string) => string): string => {
  if (axios.isAxiosError(queryError) && queryError.response?.status === 404) {
    return t('pets:messages.notFound')
  }

  return 'Failed to load pet information'
}

type EditTab = 'general' | 'details' | 'status'

const parseEditTab = (value: string | null): EditTab | null => {
  if (value === 'general' || value === 'details' || value === 'status') {
    return value
  }
  if (value === 'true' || value === '1' || value === 'yes') {
    return 'general'
  }
  return null
}

function getPetAccessFlags(pet: Pet | null | undefined) {
  const permissions = pet?.viewer_permissions
  const canEdit = Boolean(permissions?.can_edit)
  const isViewer = Boolean(permissions?.is_viewer)
  const canManagePeople = Boolean(
    permissions && 'can_manage_people' in permissions && permissions.can_manage_people
  )
  const hasCareAccess = [permissions?.is_foster, permissions?.is_sitter].includes(true)
  const hasResolvedAccess = permissions !== undefined && permissions !== null

  const normalizedViewerPermissions = permissions
    ? {
        can_edit: Boolean(permissions.can_edit),
        is_owner: Boolean(permissions.is_owner),
        is_editor: Boolean(permissions.is_editor),
        is_viewer: Boolean(permissions.is_viewer),
        can_manage_people: Boolean(permissions.can_manage_people),
      }
    : undefined

  return {
    canEdit,
    isViewer,
    canManagePeople,
    hasCareAccess,
    hasResolvedAccess,
    normalizedViewerPermissions,
  }
}

function PetBreadcrumb({ petName }: { petName: string }) {
  const { t } = useTranslation(['common'])
  return (
    <div className="px-4 py-3">
      <div className="max-w-lg mx-auto">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">{t('common:nav.home')}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{petName}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </div>
  )
}

const PetProfilePage: React.FC = () => {
  const { t } = useTranslation(['pets', 'common', 'groups'])
  const { id } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const petId = id ? Number(id) : 0
  const { pet, isLoading: loading, isFetching, isError, error: queryError } = useProjectedPet(petId)
  const error = isError ? getPetQueryErrorMessage(queryError, t) : null
  const { user: currentUser } = useAuth()
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: getGetPetsIdQueryKey(petId) })
  }
  // Track vaccination updates to refresh the badge
  const [vaccinationVersion, setVaccinationVersion] = useState(0)
  const [galleryOpen, setGalleryOpen] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [id])

  const handleVaccinationChange = () => {
    setVaccinationVersion((v) => v + 1)
  }

  const {
    canEdit,
    isViewer,
    canManagePeople,
    hasCareAccess,
    hasResolvedAccess,
    normalizedViewerPermissions,
  } = getPetAccessFlags(pet)
  const accessUnresolved = Boolean(pet) && !hasResolvedAccess && isFetching
  const shouldRedirectToView =
    pet && id && !canEdit && !hasCareAccess && (isPubliclyViewable(pet) || isViewer)
  const autoEditTab = canEdit ? parseEditTab(searchParams.get('edit')) : null
  const groupAccessSources =
    pet?.viewer_permissions?.access_sources?.filter((source) => source.type === 'group') ?? []

  const handleAutoEditDone = () => {
    if (!searchParams.has('edit')) return
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('edit')
    setSearchParams(nextParams, { replace: true })
  }

  if (loading || accessUnresolved) {
    return <LoadingState message={t('pets:messages.loadingInfo')} />
  }

  if (error) {
    return (
      <ErrorState
        error={error}
        onRetry={() => {
          void navigate('/')
        }}
      />
    )
  }

  if (!pet) {
    return (
      <ErrorState
        error={t('pets:messages.notFound')}
        onRetry={() => {
          void navigate('/')
        }}
      />
    )
  }

  if (shouldRedirectToView) {
    return <Navigate to={`/pets/${id}/view`} replace />
  }

  // Care roles keep the authenticated read-only profile even when the pet is private.
  if (!canEdit && !hasCareAccess && !isPubliclyViewable(pet) && !isViewer) {
    return (
      <div className="min-h-[calc(100vh-4rem)]">
        <PetBreadcrumb petName={pet.name} />
        <main className="px-4 pb-8">
          <div className="max-w-lg mx-auto">
            <Card>
              <CardContent className="py-12 text-center space-y-4">
                <ShieldAlert className="h-12 w-12 mx-auto text-muted-foreground" />
                <h2 className="text-xl font-semibold text-foreground">
                  {t('pets:accessRestricted')}
                </h2>
                <p className="text-muted-foreground">{t('pets:accessRestrictedDescription')}</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    void navigate('/')
                  }}
                >
                  {t('common:actions.goHome')}
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }

  // Check capabilities for this pet type
  const supportsWeight = petSupportsCapability(pet.pet_type, 'weight')
  const supportsVaccinations = petSupportsCapability(pet.pet_type, 'vaccinations')
  const supportsMedical = petSupportsCapability(pet.pet_type, 'medical')
  const supportsMicrochips = petSupportsCapability(pet.pet_type, 'microchips')
  const supportsPlacement = petSupportsCapability(pet.pet_type, 'placement')

  const handlePetUpdate = () => {
    if (petId > 0) {
      void queryClient.invalidateQueries({ queryKey: getGetPetsIdQueryKey(petId) })
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <PetBreadcrumb petName={pet.name} />

      {/* Main Content */}
      <main className="px-4 pb-8">
        <div className="max-w-lg mx-auto space-y-6">
          {/* Pet Info Card (avatar, name, age, badge, description + inline edit) */}
          <PetInfoCard
            key={`${String(pet.id)}:${autoEditTab ?? 'none'}`}
            pet={pet}
            canEdit={canEdit}
            onPetUpdate={handlePetUpdate}
            vaccinationVersion={vaccinationVersion}
            autoEditTab={autoEditTab}
            onAutoEditDone={handleAutoEditDone}
            onAvatarClick={() => {
              setGalleryOpen(true)
            }}
          />

          {groupAccessSources.length > 0 && (
            <Card data-testid="group-access-sources">
              <CardContent className="space-y-2">
                <h2 className="font-medium">{t('groups:access.title')}</h2>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {groupAccessSources.map((source) => (
                    <li key={`${String(source.id ?? source.name)}:${source.role}`}>
                      {t('groups:access.viaGroup', {
                        name: source.name ?? t('groups:detail.title'),
                        role: t(`groups:detail.role.${source.role}`),
                      })}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Weight History */}
          {supportsWeight && <WeightHistoryCard petId={pet.id} canEdit={canEdit} />}

          {/* Vaccinations */}
          {supportsVaccinations && (
            <UpcomingVaccinationsSection
              petId={pet.id}
              petName={pet.name}
              canEdit={canEdit}
              onVaccinationChange={handleVaccinationChange}
              petBirthday={getExactBirthday(pet)}
            />
          )}

          {/* Medical Records */}
          {supportsMedical && <MedicalRecordsSection petId={pet.id} canEdit={canEdit} />}

          {/* Microchips */}
          {supportsMicrochips && <MicrochipsSection petId={pet.id} canEdit={canEdit} />}
          <PetFinanceSection petId={pet.id} />

          {/* People & History */}
          {pet.relationships && (canEdit || canManagePeople) && (
            <PetRelationshipsSection
              relationships={pet.relationships}
              petId={pet.id}
              petName={pet.name}
              viewerPermissions={normalizedViewerPermissions}
              currentUserId={currentUser?.id}
              onRelationshipsChanged={refresh}
            />
          )}

          {/* Placement Requests */}
          {supportsPlacement && (
            <PlacementRequestsCard
              petId={pet.id}
              placementRequests={pet.placement_requests ?? []}
              canEdit={canEdit}
              onSuccess={refresh}
            />
          )}
        </div>
      </main>

      {pet.photos && pet.photos.length > 0 && (
        <PetPhotoCarouselModal
          photos={pet.photos}
          open={galleryOpen}
          onOpenChange={setGalleryOpen}
          initialIndex={0}
          petId={pet.id}
          pet={pet}
          onPetUpdate={() => {
            void queryClient.invalidateQueries({ queryKey: getGetPetsIdQueryKey(petId) })
          }}
          showActions={canEdit}
        />
      )}
    </div>
  )
}

export default PetProfilePage
