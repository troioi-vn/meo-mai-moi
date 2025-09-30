import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
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

const CreatePetPage: React.FC = () => {
  const { id: petId } = useParams<{ id: string }>()
  const isEditMode = Boolean(petId)
  const [currentStatus, setCurrentStatus] = useState<'active' | 'lost' | 'deceased' | 'deleted' | ''>('')
  const [newStatus, setNewStatus] = useState<'active' | 'lost' | 'deceased' | ''>('')
  const [statusPassword, setStatusPassword] = useState('')
  const [deletePassword, setDeletePassword] = useState('')
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

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
    let cancelled = false
    void (async () => {
      try {
        const pet = await getPet(petId)
        if (!cancelled) {
          const st = (pet.status ?? 'active') as 'active' | 'lost' | 'deceased' | 'deleted'
          setCurrentStatus(st)
          setNewStatus(st === 'deleted' ? 'active' : (st as 'active' | 'lost' | 'deceased'))
        }
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
    }
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
      setCurrentStatus(updated.status as 'active' | 'lost' | 'deceased' | 'deleted')
      toast.success('Status updated')
    } catch (e) {
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
    } catch (e) {
      toast.error('Failed to remove pet')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-2xl p-8 space-y-8 bg-card rounded-lg shadow-lg border">
        <h1 className="text-3xl font-bold text-center text-card-foreground mb-6">
          {isEditMode ? 'Edit Pet' : 'Add a New Pet'}
        </h1>
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
              value={formData.pet_type_id || ''}
              onChange={(id) => updateField('pet_type_id')(id)}
              error={errors.pet_type_id}
            />

            <PetFormFields formData={formData} errors={errors} updateField={updateField as any} />

            <FileInput id="photos" label="Photos" onChange={updateField('photos')} multiple />

            {error && (
              <p className="text-destructive" data-testid="form-error">
                {error}
              </p>
            )}

            <div className="flex gap-4">
              <Button type="submit" aria-label={isEditMode ? 'Update Pet' : 'Create Pet'} disabled={isSubmitting || loadingPetTypes}>
                {isSubmitting ? (isEditMode ? 'Updating...' : 'Creating...') : isEditMode ? 'Update Pet' : 'Create Pet'}
              </Button>
              <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {isEditMode && (
          <div className="mt-10 space-y-6">
            <PetStatusControls
              currentStatus={currentStatus || 'active'}
              newStatus={newStatus || 'active'}
              setNewStatus={(s) => setNewStatus(s)}
              statusPassword={statusPassword}
              setStatusPassword={setStatusPassword}
              onUpdateStatus={() => void handleUpdateStatusClick()}
              isUpdating={isUpdatingStatus}
            />

            <PetDangerZone
              deletePassword={deletePassword}
              setDeletePassword={setDeletePassword}
              isDeleting={isDeleting}
              onDelete={() => void handleDeletePetClick()}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default CreatePetPage