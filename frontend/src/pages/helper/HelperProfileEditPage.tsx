import React, { useMemo } from 'react'
import { Button } from '@/components/ui/button'
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
import { HelperProfileFormFields } from '@/components/helper/HelperProfileFormFields'
import { PetTypesSelector } from '@/components/helper/PetTypesSelector'
import { PhotosGrid } from '@/components/helper/PhotosGrid'

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

  // Pet types managed by PetTypesSelector

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

  if (isLoading)
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>
  if (isError)
    return (
      <div className="flex justify-center items-center min-h-screen">
        Error fetching helper profile
      </div>
    )
  if (!data?.data)
    return (
      <div className="flex justify-center items-center min-h-screen">Helper profile not found</div>
    )

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-2xl p-8 space-y-8 bg-card rounded-lg shadow-lg border">
        <h1 className="text-3xl font-bold text-center text-card-foreground mb-6">
          Edit Helper Profile
        </h1>
        <PhotosGrid
          photos={data.data.photos as { id: number; path: string }[]}
          onDelete={(photoId) => {
            deletePhotoMutation.mutate(photoId)
          }}
          deleting={deletePhotoMutation.isPending}
        />
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <HelperProfileFormFields formData={formData} errors={errors} updateField={updateField} />
          <PetTypesSelector
            petTypes={petTypes ?? []}
            selectedPetTypeIds={formData.pet_type_ids}
            onChangePetTypeIds={(ids) => {
              updateField('pet_type_ids')(ids)
            }}
            label="Pet Types"
          />
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
