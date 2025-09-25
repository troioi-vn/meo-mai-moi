import React, { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/FormField'
import { CheckboxField } from '@/components/ui/CheckboxField'
import { FileInput } from '@/components/ui/FileInput'
import useHelperProfileForm from '@/hooks/useHelperProfileForm'
import { getPetTypes } from '@/api/pets'
import type { PetType } from '@/types/pet'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getHelperProfile,
  deleteHelperProfile,
  deleteHelperProfilePhoto,
} from '@/api/helper-profiles'
import { useParams, useNavigate } from 'react-router-dom'
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

const HelperProfileEditPage: React.FC = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  const { data, isLoading, isError } = useQuery({
    queryKey: ['helper-profile', id],
    queryFn: () => (id ? getHelperProfile(id) : Promise.reject(new Error('missing id'))),
    enabled: Boolean(id),
  })

  const { data: petTypes } = useQuery<PetType[]>({
    queryKey: ['pet-types'],
    queryFn: getPetTypes,
  })

  const numericId = id ? Number(id) : undefined
  
  // Prepare initial form data from loaded data
  const initialFormData = useMemo(() => {
    if (!data?.data) return {}
    
    return {
      country: data.data.country ?? '',
      address: data.data.address ?? '',
      city: data.data.city ?? '',
      state: data.data.state ?? '',
      phone_number: data.data.phone_number ?? data.data.phone ?? '',
      experience: data.data.experience ?? '',
      has_pets: Boolean(data.data.has_pets),
      has_children: Boolean(data.data.has_children),
      can_foster: Boolean(data.data.can_foster),
      can_adopt: Boolean(data.data.can_adopt),
      is_public: Boolean(data.data.is_public),
      status: data.data.status,
      photos: [],
      pet_type_ids: data.data.pet_types?.map((pt) => pt.id) ?? [],
    }
  }, [data?.data])
  
  // Initialize the form hook with proper initial data
  const { formData, errors, isSubmitting, updateField, handleSubmit, handleCancel } =
    useHelperProfileForm(numericId, initialFormData)

  const handlePetTypeChange = (petTypeId: number) => {
    const currentPetTypeIds = formData.pet_type_ids || []
    const updatedPetTypeIds = currentPetTypeIds.includes(petTypeId)
      ? currentPetTypeIds.filter((id) => id !== petTypeId)
      : [...currentPetTypeIds, petTypeId]
    updateField('pet_type_ids')(updatedPetTypeIds)
  }

  const deleteMutation = useMutation({
    mutationFn: () => (id ? deleteHelperProfile(id) : Promise.reject(new Error('missing id'))),
    onSuccess: () => {
      toast.success('Helper profile deleted successfully!')
      void queryClient.invalidateQueries({ queryKey: ['helper-profiles'] })
      void navigate('/helper')
    },
    onError: (error) => {
      console.error('Delete error:', error)
      toast.error('Failed to delete helper profile. Please try again.')
    },
  })

  const deletePhotoMutation = useMutation({
    mutationFn: (photoId: number) =>
      id ? deleteHelperProfilePhoto(id, photoId) : Promise.reject(new Error('missing id')),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['helper-profile', id] })
      toast.success('Photo deleted successfully!')
    },
    onError: (error) => {
      console.error('Delete photo error:', error)
      toast.error('Failed to delete photo. Please try again.')
    },
  })

  if (isLoading) return <div className="flex justify-center items-center min-h-screen">Loading...</div>
  if (isError) return <div className="flex justify-center items-center min-h-screen">Error fetching helper profile</div>
  if (!data?.data) return <div className="flex justify-center items-center min-h-screen">Helper profile not found</div>

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-2xl p-8 space-y-8 bg-card rounded-lg shadow-lg border">
        <h1 className="text-3xl font-bold text-center text-card-foreground mb-6">
          Edit Helper Profile
        </h1>
        <div className="grid grid-cols-3 gap-4">
          {(() => {
            const photos: { id: number; path: string }[] =
              (data.data.photos as { id: number; path: string }[] | undefined) ?? []
            return photos.map((photo) => (
              <div key={photo.id} className="relative">
                <img
                  src={'http://localhost:8000/storage/' + photo.path}
                  alt="Helper profile photo"
                  className="w-full h-full object-cover"
                />
                <Button
                  aria-label={'Delete photo ' + String(photo.id)}
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    deletePhotoMutation.mutate(photo.id)
                  }}
                  disabled={deletePhotoMutation.isPending}
                >
                  Delete
                </Button>
              </div>
            ))
          })()}
        </div>
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <FormField
            id="country"
            label="Country"
            value={formData.country}
            onChange={updateField('country')}
            error={errors.country}
            placeholder="Enter your country"
          />
          <FormField
            id="address"
            label="Address"
            value={formData.address}
            onChange={updateField('address')}
            error={errors.address}
            placeholder="Enter your address"
          />
          <FormField
            id="city"
            label="City"
            value={formData.city}
            onChange={updateField('city')}
            error={errors.city}
            placeholder="Enter your city"
          />
          <FormField
            id="state"
            label="State"
            value={formData.state}
            onChange={updateField('state')}
            error={errors.state}
            placeholder="Enter your state"
          />
          <FormField
            id="phone_number"
            label="Phone Number"
            value={formData.phone_number}
            onChange={updateField('phone_number')}
            error={errors.phone_number}
            placeholder="Enter your phone number"
          />
          <FormField
            id="experience"
            label="Experience"
            type="textarea"
            value={formData.experience}
            onChange={updateField('experience')}
            error={errors.experience}
            placeholder="Describe your experience"
          />
          <CheckboxField
            id="has_pets"
            label="Has Pets"
            checked={formData.has_pets}
            onChange={updateField('has_pets')}
            error={errors.has_pets}
          />
          <CheckboxField
            id="has_children"
            label="Has Children"
            checked={formData.has_children}
            onChange={updateField('has_children')}
            error={errors.has_children}
          />
          <CheckboxField
            id="can_foster"
            label="Can Foster"
            checked={formData.can_foster}
            onChange={updateField('can_foster')}
            error={errors.can_foster}
          />
          <CheckboxField
            id="can_adopt"
            label="Can Adopt"
            checked={formData.can_adopt}
            onChange={updateField('can_adopt')}
            error={errors.can_adopt}
          />
          <CheckboxField
            id="is_public"
            label="Is Public"
            checked={formData.is_public}
            onChange={updateField('is_public')}
            error={errors.is_public}
          />
          <div>
            <label className="block text-sm font-medium text-card-foreground">Pet Types</label>
            <div className="grid grid-cols-2 gap-4 mt-2">
              {petTypes
                ?.filter((pt) => pt.placement_requests_allowed)
                .map((petType) => (
                  <CheckboxField
                    key={petType.id}
                    id={`pet_type_${petType.id}`}
                    label={petType.name}
                    checked={formData.pet_type_ids?.includes(petType.id)}
                    onChange={() => handlePetTypeChange(petType.id)}
                  />
                ))}
            </div>
          </div>
          <FileInput
            id="photos"
            label="Photos"
            onChange={updateField('photos')}
            error={errors.photos}
            multiple
          />

          <div className="flex gap-4">
            <Button type="submit" aria-label="Update Helper Profile" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update'}
            </Button>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" disabled={deleteMutation.isPending}>
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your helper profile.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => {
                      deleteMutation.mutate()
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </form>
      </div>
    </div>
  )
}

export default HelperProfileEditPage
