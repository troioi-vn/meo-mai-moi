import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChevronLeft } from 'lucide-react'

import { useCreatePetForm } from '@/hooks/useCreatePetForm'
import { deletePet, updatePetStatus, getPet } from '@/api/pets'
import type { Pet } from '@/types/pet'
import { petSupportsCapability } from '@/types/pet'
import { toast } from 'sonner'
import { PetTypeSelect } from '@/components/pets/PetTypeSelect'
import { PetFormFields } from '@/components/pets/PetFormFields'
import { PetStatusControls } from '@/components/pets/PetStatusControls'
import { PetDangerZone } from '@/components/pets/PetDangerZone'
import { PetPhoto } from '@/components/pets/PetPhoto'
import { PetPhotoGallery } from '@/components/pets/PetPhotoGallery'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { WeightHistoryCard } from '@/components/pet-health/weights/WeightHistoryCard'
import { UpcomingVaccinationsSection } from '@/components/pet-health/vaccinations/UpcomingVaccinationsSection'
import { MicrochipsSection } from '@/components/pet-health/microchips/MicrochipsSection'

type TabValue = 'general' | 'health' | 'status'

const CreatePetPage: React.FC = () => {
  const { id: petId } = useParams<{ id: string }>()
  const isEditMode = !!petId
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabValue>('general')
  const [currentStatus, setCurrentStatus] = useState<
    'active' | 'lost' | 'deceased' | 'deleted' | ''
  >('')
  const [newStatus, setNewStatus] = useState<'active' | 'lost' | 'deceased' | ''>('')
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [loadedPet, setLoadedPet] = useState<Pet | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const {
    formData,
    petTypes,
    loadingPetTypes,
    errors,
    error,
    isSubmitting,
    isLoadingPet,
    updateField,
    handleSubmit,
    handleCancel,
  } = useCreatePetForm(petId)

  // Load current status in edit mode
  useEffect(() => {
    if (!isEditMode || !petId) return
    const loadPet = async () => {
      try {
        const pet = await getPet(petId)
        setLoadedPet(pet)
        const st = pet.status
        setCurrentStatus(st)
        setNewStatus(st === 'deleted' ? 'active' : st)
      } catch {
        setLoadError('Pet not found')
      }
    }
    void loadPet().catch(() => {
      setLoadError('Failed to load pet')
    })
  }, [isEditMode, petId])

  const handleUpdateStatusClick = async () => {
    if (!petId) return
    if (!newStatus) {
      toast.error('Please select a status')
      return
    }
    try {
      setIsUpdatingStatus(true)
      // No password required - just confirmation dialog in component
      const updated = await updatePetStatus(petId, newStatus)
      setCurrentStatus(updated.status)
      toast.success('Status updated')
      // Redirect to pet profile after status change
      void navigate(`/pets/${petId}`, { replace: true })
    } catch {
      toast.error('Failed to update status')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleDeletePetClick = async (password: string) => {
    if (!petId) return
    if (!password.trim()) {
      toast.error('Please enter your password to confirm')
      return
    }
    try {
      setIsDeleting(true)
      await deletePet(petId, password)
      toast.success('Pet removed')
      // Navigate to My Pets
      void navigate('/', { replace: true })
    } catch {
      toast.error('Failed to remove pet')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleBack = () => {
    void navigate(-1)
  }

  // Show loading state for edit mode
  if (isEditMode && isLoadingPet) {
    return <LoadingState message="Loading pet data..." />
  }

  // Show error state if pet not found (edit mode only)
  if (isEditMode && loadError) {
    return (
      <ErrorState
        error={loadError}
        onRetry={() => {
          void navigate('/')
        }}
        retryText="Back to My Pets"
      />
    )
  }

  // Check capabilities for tabs
  const petType = loadedPet?.pet_type
  const supportsWeight = petType ? petSupportsCapability(petType, 'weight') : false
  const supportsVaccinations = petType ? petSupportsCapability(petType, 'vaccinations') : false
  const supportsHealth = supportsWeight || supportsVaccinations
  const supportsMicrochips = petType ? petSupportsCapability(petType, 'microchips') : false

  // Create mode - simple form without tabs
  if (!isEditMode) {
    return (
      <div className="min-h-screen bg-background">
        {/* Navigation */}
        <div className="px-4 py-3">
          <div className="max-w-2xl mx-auto">
            <Button
              variant="ghost"
              size="default"
              onClick={handleBack}
              className="flex items-center gap-1 -ml-2 text-base"
            >
              <ChevronLeft className="h-6 w-6" />
              Back
            </Button>
          </div>
        </div>

        <div className="w-full max-w-2xl mx-auto px-4 pb-8">
          <h1 className="text-3xl font-bold text-center text-foreground mb-6">Add a New Pet</h1>

          {isLoadingPet ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : (
            <div className="bg-card rounded-lg shadow-lg border p-6">
              <form
                onSubmit={(e) => {
                  void handleSubmit(e)
                }}
                className="space-y-6"
                noValidate
              >
                <PetTypeSelect
                  petTypes={petTypes}
                  loading={loadingPetTypes}
                  value={formData.pet_type_id ?? ''}
                  onChange={(id) => {
                    updateField('pet_type_id')(id)
                  }}
                  error={errors.pet_type_id}
                />

                <PetFormFields
                  formData={formData}
                  errors={errors}
                  updateField={updateField}
                  showOptionalFields={false}
                />

                {error && (
                  <p className="text-destructive" data-testid="form-error">
                    {error}
                  </p>
                )}

                <div className="flex gap-4">
                  <Button
                    type="submit"
                    aria-label="Create Pet"
                    disabled={isSubmitting || loadingPetTypes}
                  >
                    {isSubmitting ? 'Creating...' : 'Create Pet'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      handleCancel()
                    }}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Edit mode - with tabs
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <div className="px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <Button
            variant="ghost"
            size="default"
            onClick={handleBack}
            className="flex items-center gap-1 -ml-2 text-base"
          >
            <ChevronLeft className="h-6 w-6" />
            Back
          </Button>
        </div>
      </div>

      <div className="w-full max-w-2xl mx-auto px-4 pb-8">
        <h1 className="text-3xl font-bold text-center text-foreground mb-6">Edit Pet</h1>
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value as TabValue)
          }}
          className="space-y-6"
        >
          <TabsList className={`grid w-full ${supportsHealth ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <TabsTrigger value="general">General</TabsTrigger>
            {supportsHealth && <TabsTrigger value="health">Health</TabsTrigger>}
            <TabsTrigger value="status">Status</TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-6">
            {/* Pet Photo */}
            {loadedPet && (
              <div className="flex justify-center">
                <PetPhoto
                  pet={loadedPet}
                  onPhotoUpdate={(updatedPet) => {
                    setLoadedPet(updatedPet)
                  }}
                  showUploadControls={true}
                  className="h-40 w-40 object-cover rounded-full border"
                />
              </div>
            )}

            {/* Photo Gallery */}
            {loadedPet && (
              <PetPhotoGallery
                pet={loadedPet}
                onPetUpdate={(updatedPet) => {
                  setLoadedPet(updatedPet)
                }}
              />
            )}

            {/* Pet Form */}
            <div className="bg-card rounded-lg shadow-lg border p-6">
              <form
                onSubmit={(e) => {
                  void handleSubmit(e)
                }}
                className="space-y-6"
                noValidate
              >
                <PetTypeSelect
                  petTypes={petTypes}
                  loading={loadingPetTypes}
                  value={formData.pet_type_id ?? ''}
                  onChange={(id) => {
                    updateField('pet_type_id')(id)
                  }}
                  error={errors.pet_type_id}
                />

                <PetFormFields
                  formData={formData}
                  errors={errors}
                  updateField={updateField}
                  showOptionalFields={true}
                />

                {error && (
                  <p className="text-destructive" data-testid="form-error">
                    {error}
                  </p>
                )}

                <div className="flex gap-4">
                  <Button
                    type="submit"
                    aria-label="Update Pet"
                    disabled={isSubmitting || loadingPetTypes}
                  >
                    {isSubmitting ? 'Updating...' : 'Update Pet'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      handleCancel()
                    }}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>

            {/* Microchips Section */}
            {supportsMicrochips && loadedPet && (
              <MicrochipsSection petId={loadedPet.id} canEdit={true} />
            )}
          </TabsContent>

          {/* Health Tab */}
          {supportsHealth && (
            <TabsContent value="health" className="space-y-6">
              {supportsVaccinations && loadedPet && (
                <UpcomingVaccinationsSection petId={loadedPet.id} canEdit={true} mode="edit" />
              )}
              {supportsWeight && loadedPet && (
                <WeightHistoryCard petId={loadedPet.id} canEdit={true} mode="edit" />
              )}
            </TabsContent>
          )}

          {/* Status Tab */}
          <TabsContent value="status" className="space-y-6">
            {/* Status Controls */}
            <PetStatusControls
              currentStatus={currentStatus || 'active'}
              newStatus={newStatus || 'active'}
              setNewStatus={(s) => {
                setNewStatus(s)
              }}
              onUpdateStatus={() => {
                void handleUpdateStatusClick()
              }}
              isUpdating={isUpdatingStatus}
            />

            {/* Danger Zone */}
            <PetDangerZone
              isDeleting={isDeleting}
              onDelete={(password) => {
                void handleDeletePetClick(password)
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default CreatePetPage
