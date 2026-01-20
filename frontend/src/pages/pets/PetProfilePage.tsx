import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { usePetProfile } from '@/hooks/usePetProfile'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { PlacementRequestModal } from '@/components/placement/PlacementRequestModal'
import { WeightHistoryCard } from '@/components/pet-health/weights/WeightHistoryCard'
import { UpcomingVaccinationsSection } from '@/components/pet-health/vaccinations/UpcomingVaccinationsSection'
import { VaccinationStatusBadge } from '@/components/pet-health/vaccinations/VaccinationStatusBadge'
import { MedicalRecordsSection } from '@/components/pet-health/medical/MedicalRecordsSection'
import { PetRelationshipsSection } from '@/components/pets/PetRelationshipsSection'
import { useVaccinations } from '@/hooks/useVaccinations'
import { calculateVaccinationStatus } from '@/utils/vaccinationStatus'
import { petSupportsCapability, formatPetAge } from '@/types/pet'
import { deriveImageUrl } from '@/utils/petImages'
import { PlacementRequestsSection } from '@/components/placement/pet-profile/PlacementRequestsSection'
import { api } from '@/api/axios'
import { toast } from 'sonner'
import type { Pet } from '@/types/pet'
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
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { pet, loading, error, refresh } = usePetProfile(id)
  const [isModalOpen, setIsModalOpen] = useState(false)
  // Track vaccination updates to refresh the badge
  const [vaccinationVersion, setVaccinationVersion] = useState(0)
  const handleVaccinationChange = () => {
    setVaccinationVersion((v) => v + 1)
  }

  const handleEdit = () => {
    if (pet) {
      void navigate(`/pets/${String(pet.id)}/edit`)
    }
  }

  const handleDeletePlacementRequest = async (prId: number) => {
    try {
      await api.delete('placement-requests/' + String(prId))
      toast.success('Placement request deleted')
      refresh()
    } catch {
      toast.error('Failed to delete placement request')
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
    return <LoadingState message="Loading pet information..." />
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
        error="Pet not found"
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
                    <Link to="/">Home</Link>
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
                <h2 className="text-xl font-semibold text-foreground">Access Restricted</h2>
                <p className="text-muted-foreground">This pet profile is not publicly available.</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    void navigate('/')
                  }}
                >
                  Go to Home
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    )
  }
  const imageUrl = deriveImageUrl(pet)
  const ageDisplay = formatPetAge(pet)
  const isDeceased = pet.status === 'deceased'

  // Check capabilities for this pet type
  const supportsWeight = petSupportsCapability(pet.pet_type, 'weight')
  const supportsVaccinations = petSupportsCapability(pet.pet_type, 'vaccinations')
  const supportsMedical = petSupportsCapability(pet.pet_type, 'medical')
  const supportsPlacement = petSupportsCapability(pet.pet_type, 'placement')
  const placementRequests = pet.placement_requests ?? []
  const hasPlacementRequests = placementRequests.length > 0

  return (
    <div className="min-h-screen">
      {/* Navigation Buttons */}
      <div className="px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/">Home</Link>
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
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main className="px-4 pb-8">
        <div className="max-w-lg mx-auto space-y-6">
          {/* Pet Profile Header */}
          <section className="flex items-center gap-4">
            <div className="shrink-0">
              <img
                src={imageUrl}
                alt={pet.name}
                className={`w-24 h-24 rounded-full object-cover border-4 border-border ${isDeceased ? 'grayscale' : ''}`}
              />
            </div>
            <div className="flex flex-col gap-1">
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
                <CardTitle className="text-lg font-semibold">Placement Requests</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {hasPlacementRequests ? (
                  <PlacementRequestsSection
                    placementRequests={placementRequests}
                    canEdit={canEdit}
                    onDeletePlacementRequest={handleDeletePlacementRequest}
                    onRefresh={refresh}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground py-2">
                    No active placement requests.
                  </p>
                )}

                {canEdit && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setIsModalOpen(true)
                    }}
                  >
                    + Add Placement Request
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Placement Request Modal */}
      <PlacementRequestModal
        petId={pet.id}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
        }}
        onSuccess={() => {
          refresh()
          void navigate('/requests?sort=newest')
        }}
      />
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
