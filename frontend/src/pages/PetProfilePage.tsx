import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { usePetProfile } from '@/hooks/usePetProfile'
import { Button } from '@/components/ui/button'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { PlacementRequestModal } from '@/components/PlacementRequestModal'
import { WeightHistoryCard } from '@/components/weights/WeightHistoryCard'
import { UpcomingVaccinationsSection } from '@/components/vaccinations/UpcomingVaccinationsSection'
import { VaccinationStatusBadge } from '@/components/vaccinations/VaccinationStatusBadge'
import { useVaccinations } from '@/hooks/useVaccinations'
import { calculateVaccinationStatus } from '@/utils/vaccinationStatus'
import { petSupportsCapability, formatPetAge } from '@/types/pet'
import { deriveImageUrl } from '@/utils/petImages'
import { PlacementRequestsSection } from '@/components/pet-profile/PlacementRequestsSection'
import { api } from '@/api/axios'
import { toast } from 'sonner'

const PetProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { pet, loading, error, refresh } = usePetProfile(id)
  const [isModalOpen, setIsModalOpen] = useState(false)
  // Track vaccination updates to refresh the badge
  const [vaccinationVersion, setVaccinationVersion] = useState(0)
  const handleVaccinationChange = () => setVaccinationVersion((v) => v + 1)

  const handleBack = () => {
    navigate(-1)
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

  const canEdit = Boolean(pet.viewer_permissions?.can_edit)
  const imageUrl = deriveImageUrl(pet)
  const ageDisplay = formatPetAge(pet)
  const isDeceased = pet.status === 'deceased'

  // Check capabilities for this pet type
  const supportsWeight = petSupportsCapability(pet.pet_type, 'weight')
  const supportsVaccinations = petSupportsCapability(pet.pet_type, 'vaccinations')
  const supportsPlacement = petSupportsCapability(pet.pet_type, 'placement')
  const placementRequests = pet.placement_requests ?? []
  const hasPlacementRequests = placementRequests.length > 0

  return (
    <div className="min-h-screen">
      {/* Custom Header */}
      <header className="sticky top-0 z-40 backdrop-blur-sm px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="flex items-center gap-1 -ml-2"
          >
            <ChevronLeft className="h-5 w-5" />
            Back
          </Button>
          {canEdit && (
            <Button variant="ghost" size="sm" onClick={handleEdit}>
              Edit
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 pb-8">
        <div className="max-w-lg mx-auto space-y-6">
          {/* Pet Profile Header */}
          <section className="flex items-center gap-4">
            <div className="shrink-0">
              <img
                src={imageUrl}
                alt={pet.name}
                className={`w-24 h-24 rounded-full object-cover border-4 border-green-200 dark:border-green-900 ${isDeceased ? 'grayscale' : ''}`}
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
          {supportsWeight && <WeightHistoryCard petId={pet.id} canEdit={canEdit} />}

          {/* Upcoming Vaccinations */}
          {supportsVaccinations && (
            <UpcomingVaccinationsSection
              petId={pet.id}
              canEdit={canEdit}
              onVaccinationChange={handleVaccinationChange}
            />
          )}

          {/* Placement Requests Section */}
          {supportsPlacement && (
            <section className="space-y-3">
              {hasPlacementRequests && (
                <PlacementRequestsSection
                  placementRequests={placementRequests}
                  canEdit={canEdit}
                  onDeletePlacementRequest={handleDeletePlacementRequest}
                />
              )}

              {canEdit && (
                <Button variant="outline" className="w-full" onClick={() => setIsModalOpen(true)}>
                  + Placement Requests
                </Button>
              )}
            </section>
          )}
        </div>
      </main>

      {/* Placement Request Modal */}
      <PlacementRequestModal
        petId={pet.id}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          refresh()
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
