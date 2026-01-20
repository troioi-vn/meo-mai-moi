import React, { useMemo } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileInput } from '@/components/ui/FileInput'
import useHelperProfileForm from '@/hooks/useHelperProfileForm'
import { getPetTypes } from '@/api/pets'
import type { PetType, City } from '@/types/pet'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getHelperProfile,
  deleteHelperProfile,
  archiveHelperProfile,
  restoreHelperProfile,
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
import { Trash2, Heart, Camera, UserCog } from 'lucide-react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

interface ApiError {
  response?: {
    data?: {
      message?: string
    }
  }
}

const FormSectionHeader = ({ icon: Icon, title }: { icon: React.ElementType; title: string }) => (
  <div className="flex items-center gap-2 pb-2 border-b mb-4">
    <Icon className="h-5 w-5 text-primary" />
    <h3 className="text-lg font-semibold">{title}</h3>
  </div>
)

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

    const citiesSelected = data.data.cities ?? []

    // Fallback for old data if cities is empty but city_id exists
    if (citiesSelected.length === 0 && data.data.city_id) {
      const cityValue =
        typeof data.data.city === 'string'
          ? {
              id: data.data.city_id,
              name: data.data.city,
              slug: data.data.city.toLowerCase().replace(/\s+/g, '-'),
              country: data.data.country ?? '',
              description: null,
              created_by: null,
              approved_at: null,
              created_at: '',
              updated_at: '',
            }
          : (data.data.city as unknown as City)
      citiesSelected.push(cityValue)
    }

    return {
      country: data.data.country ?? '',
      address: data.data.address ?? '',
      city: citiesSelected.map((c) => c.name).join(', '),
      city_ids: citiesSelected.map((c) => c.id),
      cities_selected: citiesSelected,
      state: data.data.state ?? '',
      phone_number: data.data.phone_number ?? data.data.phone ?? '',
      contact_info: data.data.contact_info ?? '',
      experience: data.data.experience ?? '',
      has_pets: Boolean(data.data.has_pets),
      has_children: Boolean(data.data.has_children),
      request_types: data.data.request_types ?? [],
      status: data.data.status,
      photos: [],
      pet_type_ids: data.data.pet_types?.map((pt) => pt.id) ?? [],
    }
  }, [data])

  // Initialize the form hook with proper initial data
  const { formData, errors, isSubmitting, updateField, updateCities, handleSubmit, handleCancel } =
    useHelperProfileForm(numericId, initialFormData)

  const deleteMutation = useMutation({
    mutationFn: () => (id ? deleteHelperProfile(id) : Promise.reject(new Error('missing id'))),
    onSuccess: () => {
      toast.success('Helper profile deleted successfully!')
      void queryClient.invalidateQueries({ queryKey: ['helper-profiles'] })
      void navigate('/helper')
    },
    onError: (error: unknown) => {
      const message =
        (error as ApiError).response?.data?.message ?? 'Failed to delete helper profile'
      toast.error(message)
    },
  })

  const archiveMutation = useMutation({
    mutationFn: () => (id ? archiveHelperProfile(id) : Promise.reject(new Error('missing id'))),
    onSuccess: () => {
      toast.success('Helper profile archived successfully!')
      void queryClient.invalidateQueries({ queryKey: ['helper-profiles'] })
      void queryClient.invalidateQueries({ queryKey: ['helper-profile', id] })
      void navigate('/helper')
    },
    onError: (error: unknown) => {
      const message =
        (error as ApiError).response?.data?.message ?? 'Failed to archive helper profile'
      toast.error(message)
    },
  })

  const restoreMutation = useMutation({
    mutationFn: () => (id ? restoreHelperProfile(id) : Promise.reject(new Error('missing id'))),
    onSuccess: () => {
      toast.success('Helper profile restored successfully!')
      void queryClient.invalidateQueries({ queryKey: ['helper-profiles'] })
      void queryClient.invalidateQueries({ queryKey: ['helper-profile', id] })
    },
    onError: (error: unknown) => {
      const message =
        (error as ApiError).response?.data?.message ?? 'Failed to restore helper profile'
      toast.error(message)
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

  const helperName = data.data.user?.name ?? 'Helper'

  const photos = data.data.photos as { id: number; path: string }[]

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <div className="px-4 py-4">
        <div className="max-w-3xl mx-auto">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/helper">Helper</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{helperName}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      <main className="px-4 pb-12">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
              <UserCog className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Edit Helper Profile</h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Keep your profile up to date to help pet owners find the best match for their pets.
            </p>
          </div>

          <div className="space-y-8">
            {/* Photos Section */}
            {photos.length > 0 && (
              <Card className="border-none shadow-lg bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Camera className="h-5 w-5 text-primary" />
                    Current Photos
                  </CardTitle>
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
            <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
              <CardContent className="p-6 sm:p-8">
                <form onSubmit={handleSubmit} className="space-y-10" noValidate>
                  <HelperProfileFormFields
                    formData={formData}
                    errors={errors}
                    updateField={updateField}
                    citiesValue={formData.cities_selected}
                    onCitiesChange={updateCities}
                  />

                  <section>
                    <FormSectionHeader icon={Heart} title="Pet Preferences" />
                    <PetTypesSelector
                      petTypes={petTypes ?? []}
                      selectedPetTypeIds={formData.pet_type_ids}
                      onChangePetTypeIds={(ids) => {
                        updateField('pet_type_ids')(ids)
                      }}
                      label="Pet Types Available for Placement Requests"
                      error={errors.pet_type_ids}
                    />
                  </section>

                  <section>
                    <FormSectionHeader icon={Camera} title="Add More Photos" />
                    <div className="bg-muted/30 rounded-lg p-4 border-2 border-dashed border-muted-foreground/20">
                      <FileInput
                        id="photos"
                        label="Upload Photos"
                        onChange={updateField('photos')}
                        error={errors.photos}
                        multiple
                      />
                    </div>
                  </section>

                  <section className="pt-6 border-t space-y-4">
                    <FormSectionHeader icon={UserCog} title="Profile Status" />
                    <div className="flex flex-wrap gap-4">
                      {data.data.status === 'active' && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            archiveMutation.mutate()
                          }}
                          disabled={archiveMutation.isPending}
                        >
                          {archiveMutation.isPending ? 'Archiving...' : 'Archive Profile'}
                        </Button>
                      )}
                      {data.data.status === 'archived' && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            restoreMutation.mutate()
                          }}
                          disabled={restoreMutation.isPending}
                        >
                          {restoreMutation.isPending ? 'Restoring...' : 'Restore Profile'}
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            type="button"
                            variant="destructive"
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {deleteMutation.isPending ? 'Deleting...' : 'Delete Profile'}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete your helper
                              profile and remove your data from our servers.
                              {data.data.placement_responses &&
                                data.data.placement_responses.length > 0 && (
                                  <p className="mt-2 font-semibold text-destructive">
                                    Note: Profiles with associated placement requests cannot be
                                    deleted.
                                  </p>
                                )}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => {
                                deleteMutation.mutate()
                              }}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </section>

                  <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t">
                    <Button
                      type="submit"
                      aria-label="Update Helper Profile"
                      disabled={isSubmitting}
                      className="flex-1 h-12 text-lg font-semibold"
                    >
                      {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        handleCancel()
                      }}
                      disabled={isSubmitting}
                      className="h-12 px-8"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

export default HelperProfileEditPage
