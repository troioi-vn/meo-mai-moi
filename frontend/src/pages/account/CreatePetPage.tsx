import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/FormField'
import { FileInput } from '@/components/ui/FileInput'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreatePetForm } from '@/hooks/useCreatePetForm'
import { Input } from '@/components/ui/input'
import { deletePet, updatePetStatus, getPet } from '@/api/pets'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

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
            <div className="space-y-2">
              <label htmlFor="pet_type_id" className="text-sm font-medium">
                Pet Type
              </label>
              {loadingPetTypes ? (
                <div className="text-sm text-muted-foreground">Loading pet types...</div>
              ) : (
                <Select
                  value={formData.pet_type_id ? String(formData.pet_type_id) : ''}
                  onValueChange={(value) => {
                    updateField('pet_type_id')(Number(value))
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a pet type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {petTypes.map((petType) => (
                      <SelectItem key={petType.id} value={String(petType.id)}>
                        {petType.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {errors.pet_type_id && <p className="text-sm text-destructive">{errors.pet_type_id}</p>}
            </div>

            <FormField id="name" label="Name" value={formData.name} onChange={updateField('name')} error={errors.name} placeholder="Enter pet's name" />

            <FormField id="breed" label="Breed" value={formData.breed} onChange={updateField('breed')} error={errors.breed} placeholder="Enter pet's breed" />

            <FormField id="birthday" label="Birthday" type="date" value={formData.birthday} onChange={updateField('birthday')} error={errors.birthday} />

            <FormField id="location" label="Location" value={formData.location} onChange={updateField('location')} error={errors.location} placeholder="Enter pet's location" />

            <FormField id="description" label="Description" type="textarea" value={formData.description} onChange={updateField('description')} error={errors.description} placeholder="Describe the pet's personality and characteristics" />

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
            <div className="border-t pt-6">
              <h2 className="text-xl font-semibold text-card-foreground">Status</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Current status: <span className="font-medium">{currentStatus || '...'}</span>
              </p>
              <div className="grid gap-3 sm:grid-cols-[200px_1fr] items-center">
                <div className="text-sm font-medium">New status</div>
                <div>
                  <Select value={newStatus} onValueChange={(v) => setNewStatus(v as 'active' | 'lost' | 'deceased')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                      <SelectItem value="deceased">Deceased</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="text-sm font-medium">Password</div>
                <div>
                  <Input type="password" placeholder="Confirm with your password" value={statusPassword} onChange={(e) => setStatusPassword(e.target.value)} />
                </div>
              </div>
              <div className="mt-4">
                <Button onClick={() => void handleUpdateStatusClick()} disabled={isUpdatingStatus}>
                  {isUpdatingStatus ? 'Updating...' : 'Update status'}
                </Button>
              </div>
            </div>

            <div className="border-t pt-6">
              <h2 className="text-xl font-semibold text-destructive">Danger zone</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Removing this pet is irreversible. All associated data will be deleted.
              </p>
              <div className="grid gap-3 sm:grid-cols-[200px_1fr] items-center">
                <div className="text-sm font-medium">Password</div>
                <div>
                  <Input type="password" placeholder="Confirm with your password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} />
                </div>
              </div>
              <div className="mt-4">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={isDeleting}>
                      {isDeleting ? 'Removing...' : 'Remove pet'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove pet?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action is irreversible. Type your password and click confirm to proceed.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => void handleDeletePetClick()}>
                        Confirm remove
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CreatePetPage