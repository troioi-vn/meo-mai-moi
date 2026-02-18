import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { usePetProfile } from '@/hooks/usePetProfile'
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
import { PetRelationshipsSection } from '@/components/pets/PetRelationshipsSection'
import { PlacementRequestsCard } from '@/components/pets/PlacementRequestsCard'
import { PetPhotoCarouselModal } from '@/components/pets/PetPhotoGallery'
import { petSupportsCapability, isPubliclyViewable } from '@/types/pet'
import type { Pet } from '@/types/pet'
import { useTranslation } from 'react-i18next'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

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
  const { t } = useTranslation(['pets', 'common'])
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { pet, setPet, loading, error, refresh } = usePetProfile(id)
  const { user: currentUser } = useAuth()
  // Track vaccination updates to refresh the badge
  const [vaccinationVersion, setVaccinationVersion] = useState(0)
  const [galleryOpen, setGalleryOpen] = useState(false)

  const handleVaccinationChange = () => {
    setVaccinationVersion((v) => v + 1)
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

  const handlePetUpdate = (updatedPet: Pet) => {
    setPet(updatedPet)
    refresh()
  }

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <PetBreadcrumb petName={pet.name} />

      {/* Main Content */}
      <main className="px-4 pb-8">
        <div className="max-w-lg mx-auto space-y-6">
          {/* Pet Info Card (avatar, name, age, badge, description + inline edit) */}
          <PetInfoCard
            pet={pet}
            canEdit={canEdit}
            onPetUpdate={handlePetUpdate}
            vaccinationVersion={vaccinationVersion}
            onAvatarClick={() => {
              setGalleryOpen(true)
            }}
          />

          {/* Weight History */}
          {supportsWeight && <WeightHistoryCard petId={pet.id} canEdit={canEdit} />}

          {/* Vaccinations */}
          {supportsVaccinations && (
            <UpcomingVaccinationsSection
              petId={pet.id}
              petName={pet.name}
              canEdit={canEdit}
              onVaccinationChange={handleVaccinationChange}
              petBirthday={pet.birthday}
            />
          )}

          {/* Medical Records */}
          {supportsMedical && <MedicalRecordsSection petId={pet.id} canEdit={canEdit} />}

          {/* Microchips */}
          {supportsMicrochips && <MicrochipsSection petId={pet.id} canEdit={canEdit} />}

          {/* People & History */}
          {pet.relationships && (canEdit || pet.viewer_permissions?.can_manage_people) && (
            <PetRelationshipsSection
              relationships={pet.relationships}
              petId={pet.id}
              viewerPermissions={pet.viewer_permissions}
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
