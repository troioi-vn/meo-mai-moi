import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ChevronRight, ShieldAlert } from 'lucide-react'
import { usePetProfile } from '@/hooks/usePetProfile'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { WeightHistoryCard } from '@/components/pet-health/weights/WeightHistoryCard'
import { UpcomingVaccinationsSection } from '@/components/pet-health/vaccinations/UpcomingVaccinationsSection'
import { VaccinationStatusBadge } from '@/components/pet-health/vaccinations/VaccinationStatusBadge'
import { MedicalRecordsSection } from '@/components/pet-health/medical/MedicalRecordsSection'
import { PetRelationshipsSection } from '@/components/pets/PetRelationshipsSection'
import { PetPhoto } from '@/components/pets/PetPhoto'
import { PetPhotoCarouselModal } from '@/components/pets/PetPhotoGallery'
import { useVaccinations } from '@/hooks/useVaccinations'
import { calculateVaccinationStatus } from '@/utils/vaccinationStatus'
import { petSupportsCapability, formatPetAge } from '@/types/pet'
import type { Pet } from '@/types/pet'
import { formatRequestType, formatStatus } from '@/types/placement'
import { useTranslation } from 'react-i18next'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

// Check if pet is publicly viewable (lost or has active placement request)
const isPubliclyViewable = (petData: Pet | null): boolean => {
  if (!petData) return false
  if (petData.status === 'lost') return true
  const placementRequests = petData.placement_requests ?? []
  return placementRequests.some((pr) => pr.status === 'open')
}

const PetProfilePage: React.FC = () => {
  const { t } = useTranslation(['pets', 'common'])
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { pet, setPet, loading, error } = usePetProfile(id)
  // Track vaccination updates to refresh the badge
  const [vaccinationVersion, setVaccinationVersion] = useState(0)
  const [galleryOpen, setGalleryOpen] = useState(false)

  const handleVaccinationChange = () => {
    setVaccinationVersion((v) => v + 1)
  }

  const handleEdit = () => {
    if (pet) {
      void navigate(`/pets/${String(pet.id)}/edit`)
    }
  }

  // Check if user is owner
  const canEdit = pet ? Boolean(pet.viewer_permissions?.can_edit) : false

  // Redirect non-owners to public view if pet is publicly viewable or user is a viewer
  useEffect(() => {
    if (loading || !pet || !id) return

    const isViewer = Boolean(pet.viewer_permissions?.is_viewer)

    // If user is not owner but pet is publicly viewable, or if user is specifically a viewer, redirect to view page
    if (!canEdit && (isPubliclyViewable(pet) || isViewer)) {
      void navigate(`/pets/${id}/view`, { replace: true })
    }
  }, [loading, pet, canEdit, id, navigate])

  if (loading) {
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

  // If user is not owner and pet is not publicly viewable, show access denied
  if (!canEdit && !isPubliclyViewable(pet)) {
    return (
      <div className="min-h-screen">
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
                  <BreadcrumbPage>{pet.name}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </div>
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
  const ageDisplay = formatPetAge(pet, t)
  const isDeceased = pet.status === 'deceased'
  const hasAvatar = Boolean(pet.photo_url)

  // Check capabilities for this pet type
  const supportsWeight = petSupportsCapability(pet.pet_type, 'weight')
  const supportsVaccinations = petSupportsCapability(pet.pet_type, 'vaccinations')
  const supportsMedical = petSupportsCapability(pet.pet_type, 'medical')
  const supportsPlacement = petSupportsCapability(pet.pet_type, 'placement')
  const placementRequests = pet.placement_requests ?? []
  const hasPlacementRequests = placementRequests.length > 0
  const sortedPlacementRequests = [...placementRequests].sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
    return bTime - aTime
  })

  const getRequestTypeBadgeVariant = (
    type: string
  ): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (type === 'permanent') return 'default'
    if (type.includes('foster')) return 'secondary'
    return 'outline'
  }

  const getStatusBadgeVariant = (
    status: string
  ): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'open':
        return 'default'
      case 'pending_transfer':
        return 'secondary'
      case 'active':
      case 'finalized':
        return 'outline'
      case 'expired':
        return 'secondary'
      case 'cancelled':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  return (
    <div className="min-h-screen">
      {/* Navigation Buttons */}
      <div className="px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/">{t('common:nav.home')}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{pet.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          {canEdit && (
            <Button variant="ghost" size="default" onClick={handleEdit} className="text-base">
              {t('common:actions.edit')}
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main className="px-4 pb-8">
        <div className="max-w-lg mx-auto space-y-6">
          {/* Pet Profile Header */}
          <section className="flex flex-col items-center gap-4">
            <PetPhoto
              pet={pet}
              onPhotoUpdate={(updatedPet: Pet) => {
                setPet(updatedPet)
              }}
              showUploadControls={canEdit && !hasAvatar}
              className={`w-24 h-24 rounded-full object-cover border-4 border-border ${isDeceased ? 'grayscale' : ''}`}
              onClick={() => {
                if (pet.photos && pet.photos.length > 0) {
                  setGalleryOpen(true)
                }
              }}
            />
            <div className="flex flex-col items-center gap-1">
              <h1 className="text-2xl font-bold text-foreground">{pet.name}</h1>
              <p className="text-muted-foreground">{ageDisplay}</p>
              {supportsVaccinations && (
                <PetVaccinationStatusBadge key={vaccinationVersion} petId={pet.id} />
              )}
            </div>
          </section>

          {/* Weight History */}
          {supportsWeight && <WeightHistoryCard petId={pet.id} canEdit={canEdit} mode="view" />}

          {/* Upcoming Vaccinations */}
          {supportsVaccinations && (
            <UpcomingVaccinationsSection
              petId={pet.id}
              canEdit={canEdit}
              onVaccinationChange={handleVaccinationChange}
              mode="view"
            />
          )}

          {/* Medical Records */}
          {supportsMedical && (
            <MedicalRecordsSection petId={pet.id} canEdit={canEdit} mode="view" />
          )}

          {/* People & History */}
          {canEdit && pet.relationships && (
            <PetRelationshipsSection relationships={pet.relationships} />
          )}

          {/* Placement Requests Section */}
          {supportsPlacement && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold">
                  {t('pets:placementRequests.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!hasPlacementRequests && (
                  <p className="text-sm text-muted-foreground py-2">
                    {t('pets:placementRequests.none')}
                  </p>
                )}

                {sortedPlacementRequests.map((request) => (
                  <Link
                    key={request.id}
                    to={`/requests/${String(request.id)}`}
                    aria-label={`Open placement request ${String(request.id)}`}
                    className="block rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="p-4 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              {t('pets:placementRequests.type')}
                            </p>
                            <div className="mt-1">
                              <Badge
                                variant={getRequestTypeBadgeVariant(request.request_type)}
                                className="w-fit"
                              >
                                {formatRequestType(request.request_type)}
                              </Badge>
                            </div>
                          </div>

                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              {t('pets:placementRequests.created')}
                            </p>
                            <p className="text-sm font-medium">
                              {request.created_at
                                ? new Date(request.created_at).toLocaleDateString()
                                : '—'}
                            </p>
                          </div>

                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              {t('pets:placementRequests.status')}
                            </p>
                            <div className="mt-1">
                              <Badge
                                variant={getStatusBadgeVariant(request.status)}
                                className="w-fit"
                              >
                                {formatStatus(request.status)}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>

                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
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
          onPetUpdate={(p) => {
            setPet(p)
          }}
          showActions={canEdit}
        />
      )}
    </div>
  )
}

export default PetProfilePage

// Helper component to fetch vaccination status for a pet
function PetVaccinationStatusBadge({ petId }: { petId: number }) {
  const { items, loading } = useVaccinations(petId)

  if (loading) {
    return null
  }

  const status = calculateVaccinationStatus(items)
  return <VaccinationStatusBadge status={status} />
}
