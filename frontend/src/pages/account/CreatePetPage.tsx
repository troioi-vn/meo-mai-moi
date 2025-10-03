import React, { useEffect, useState, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { FileInput } from '@/components/ui/FileInput'
import { useCreatePetForm } from '@/hooks/useCreatePetForm'
import { deletePet, updatePetStatus, getPet } from '@/api/pets'
import { toast } from 'sonner'
// alert-dialog primitives used in PetDangerZone
import { PetTypeSelect } from '@/components/pets/PetTypeSelect'
import { PetFormFields } from '@/components/pets/PetFormFields'
import { PetStatusControls } from '@/components/pets/PetStatusControls'
import { PetDangerZone } from '@/components/pets/PetDangerZone'
import { ArrowLeft } from 'lucide-react'
import { deriveImageUrl } from '@/utils/petImages'

const CreatePetPage: React.FC = () => {
  const { id: petId } = useParams<{ id: string }>()
  const isEditMode = !!petId
  const navigate = useNavigate()
  const [currentStatus, setCurrentStatus] = useState<'active' | 'lost' | 'deceased' | 'deleted' | ''>('')
  const [newStatus, setNewStatus] = useState<'active' | 'lost' | 'deceased' | ''>('')
  const [statusPassword, setStatusPassword] = useState('')
  const [deletePassword, setDeletePassword] = useState('')
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [loadedPet, setLoadedPet] = useState<any | null>(null)

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
    void (async () => {
      try {
        const pet = await getPet(petId)
        setLoadedPet(pet)
        const st: 'active' | 'lost' | 'deceased' | 'deleted' = pet.status
        setCurrentStatus(st)
        setNewStatus(st === 'deleted' ? 'active' : st)
      } catch {
        /* ignore */
      }
    })()
  }, [isEditMode, petId])

  const handleUpdateStatusClick = async () => {
    if (!petId) return
    if (!newStatus) {
      toast.error('Please select a status')
      return
    }
    if (!statusPassword.trim()) {
      toast.error('Please enter your password to confirm')
      return
    }
    try {
      setIsUpdatingStatus(true)
      const updated = await updatePetStatus(petId, newStatus, statusPassword)
      setCurrentStatus(updated.status)
      toast.success('Status updated')
      // Redirect to pet profile after status change
      navigate(`/pets/${petId}`)
    } catch {
      toast.error('Failed to update status')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleDeletePetClick = async () => {
    if (!petId) return
    if (!deletePassword.trim()) {
      toast.error('Please enter your password to confirm')
      return
    }
    try {
      setIsDeleting(true)
      await deletePet(petId, deletePassword)
      toast.success('Pet removed')
      // Reuse cancel navigation to go back to My Pets
      handleCancel()
    } catch {
      toast.error('Failed to remove pet')
    } finally {
      setIsDeleting(false)
    }
  }

  const currentImageUrl = useMemo(() => {
    if (!isEditMode || !loadedPet) return null
    try {
      return deriveImageUrl(loadedPet)
    } catch {
      return null
    }
  }, [isEditMode, loadedPet])

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-2xl p-8 space-y-8 bg-card rounded-lg shadow-lg border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to={isEditMode ? `/pets/${petId}` : '/account/pets'} className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                {isEditMode ? 'Back to Pet' : 'Back to My Pets'}
              </Link>
            </Button>
          </div>
        </div>
        <h1 className="text-3xl font-bold text-center text-card-foreground mb-2">
          {isEditMode ? 'Edit Pet' : 'Add a New Pet'}
        </h1>
        {isEditMode && currentImageUrl && (
          <div className="flex justify-center">
            <img
              src={currentImageUrl}
              alt={formData.name || 'Current Pet Photo'}
              className="h-40 w-40 object-cover rounded-full border"
              data-testid="current-photo-preview"
            />
          </div>
        )}
        {isLoadingPet ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Loading pet data...</p>
          </div>
        ) : (
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
              onChange={(id) => { updateField('pet_type_id')(id); }}
              error={errors.pet_type_id}
            />

            <PetFormFields formData={formData} errors={errors} updateField={updateField} />

            <FileInput id="photos" label={isEditMode ? 'Add More Photos' : 'Photos'} onChange={updateField('photos')} multiple />

            {error && (
              <p className="text-destructive" data-testid="form-error">
                {error}
              </p>
            )}

            <div className="flex gap-4">
              <Button type="submit" aria-label={isEditMode ? 'Update Pet' : 'Create Pet'} disabled={isSubmitting || loadingPetTypes}>
                {isSubmitting ? (isEditMode ? 'Updating...' : 'Creating...') : isEditMode ? 'Update Pet' : 'Create Pet'}
              </Button>
              <Button type="button" variant="outline" onClick={() => { handleCancel() }} disabled={isSubmitting}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {isEditMode && (
          <div className="mt-10 space-y-6">
            <PetStatusControls
              currentStatus={(currentStatus || 'active')}
              newStatus={(newStatus || 'active')}
              setNewStatus={(s) => { setNewStatus(s); }}
              statusPassword={statusPassword}
              setStatusPassword={setStatusPassword}
              onUpdateStatus={() => { void handleUpdateStatusClick() }}
              isUpdating={isUpdatingStatus}
            />

            <PetDangerZone
              deletePassword={deletePassword}
              setDeletePassword={setDeletePassword}
              isDeleting={isDeleting}
              onDelete={() => { void handleDeletePetClick() }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default CreatePetPage