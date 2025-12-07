import React, { useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { ChevronLeft, Trash2 } from 'lucide-react'

const HelperProfileEditPage: React.FC = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isLoading, isError, refetch } = useQuery({
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
      contact_info: data.data.contact_info ?? '',
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

  const handleBack = () => {
    void navigate(-1)
  }

  if (isLoading) {
    return <LoadingState message="Loading helper profile..." />
  }

  if (isError) {
    return (
      <ErrorState
        error="Failed to load helper profile"
        onRetry={() => {
          void refetch()
        }}
      />
    )
  }

  if (!data?.data) {
    return (
      <ErrorState
        error="Helper profile not found"
        onRetry={() => {
          void navigate('/helper')
        }}
      />
    )
  }

  const photos = data.data.photos as { id: number; path: string }[]

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <div className="px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Button
            variant="ghost"
            size="default"
            onClick={handleBack}
            className="flex items-center gap-1 -ml-2 text-base"
          >
            <ChevronLeft className="h-6 w-6" />
            Back
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="default"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Helper Profile</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete your helper profile and
                  all associated data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    deleteMutation.mutate()
                  }}
                  disabled={deleteMutation.isPending}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete Profile'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <main className="px-4 pb-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Photos Section */}
          {photos.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold">Current Photos</CardTitle>
              </CardHeader>
              <CardContent>
                <PhotosGrid
                  photos={photos}
                  onDelete={(photoId) => {
                    deletePhotoMutation.mutate(photoId)
                  }}
                  deleting={deletePhotoMutation.isPending}
                />
              </CardContent>
            </Card>
          )}

          {/* Edit Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Edit Helper Profile</CardTitle>
              <CardDescription>Update your profile information</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                <HelperProfileFormFields
                  formData={formData}
                  errors={errors}
                  updateField={updateField}
                />
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
                  label="Add Photos"
                  onChange={updateField('photos')}
                  error={errors.photos}
                  multiple
                />

                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    aria-label="Update Helper Profile"
                    disabled={isSubmitting}
                    className="flex-1 sm:flex-none"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
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
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

export default HelperProfileEditPage
