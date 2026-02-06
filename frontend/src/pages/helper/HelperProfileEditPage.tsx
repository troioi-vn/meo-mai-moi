import React, { useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { FileInput } from '@/components/ui/FileInput'
import useHelperProfileForm from '@/hooks/useHelperProfileForm'
import { getPetTypes } from '@/api/generated/pet-types/pet-types'
import type { PetType, City } from '@/types/pet'
import type { HelperProfile } from '@/types/helper-profile'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getHelperProfilesId as getHelperProfile,
  deleteHelperProfilesId as deleteHelperProfile,
  deleteHelperProfilesHelperProfilePhotosPhoto as deleteHelperProfilePhoto,
  postHelperProfilesIdArchive as archiveHelperProfile,
  postHelperProfilesIdRestore as restoreHelperProfile,
} from '@/api/generated/helper-profiles/helper-profiles'
import { toast } from '@/lib/i18n-toast'
import { HelperProfileFormFields } from '@/components/helper/HelperProfileFormFields'
import { PetTypesSelector } from '@/components/helper/PetTypesSelector'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { Heart, Camera } from 'lucide-react'
import { HelperProfileEditBreadcrumb } from '@/components/helper/profile-edit/HelperProfileEditBreadcrumb'
import { HelperProfileEditHero } from '@/components/helper/profile-edit/HelperProfileEditHero'
import { FormSectionHeader } from '@/components/helper/profile-edit/FormSectionHeader'
import { CurrentPhotosCard } from '@/components/helper/profile-edit/CurrentPhotosCard'
import { ProfileStatusSection } from '@/components/helper/profile-edit/ProfileStatusSection'
import { EditFormActions } from '@/components/helper/profile-edit/EditFormActions'

interface ApiError {
  response?: {
    data?: {
      message?: string
    }
  }
}

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
    if (!data) return {}

    // Cast to local HelperProfile type which has all needed fields
    const profile = data as unknown as HelperProfile
    const citiesSelected = profile.cities ?? []

    // Fallback for old data if cities is empty but city_id exists
    if (citiesSelected.length === 0 && profile.city_id) {
      const cityValue =
        typeof profile.city === 'string'
          ? {
              id: profile.city_id,
              name: profile.city,
              slug: profile.city.toLowerCase().replace(/\s+/g, '-'),
              country: profile.country ?? '',
              description: null,
              created_by: null,
              approved_at: null,
              created_at: '',
              updated_at: '',
            }
          : (profile.city as unknown as City)
      citiesSelected.push(cityValue)
    }

    return {
      country: profile.country ?? '',
      address: profile.address ?? '',
      city: citiesSelected.map((c) => c.name).join(', '),
      city_ids: citiesSelected.map((c) => c.id),
      cities_selected: citiesSelected,
      state: profile.state ?? '',
      phone_number: profile.phone_number ?? profile.phone ?? '',
      contact_info: profile.contact_info ?? '',
      experience: profile.experience ?? '',
      has_pets: Boolean(profile.has_pets),
      has_children: Boolean(profile.has_children),
      request_types: profile.request_types ?? [],
      status: profile.status,
      photos: [],
      pet_type_ids: profile.pet_types?.map((pt) => pt.id) ?? [],
    }
  }, [data])

  // Initialize the form hook with proper initial data
  const { formData, errors, isSubmitting, updateField, updateCities, handleSubmit, handleCancel } =
    useHelperProfileForm(numericId, initialFormData)

  const deleteMutation = useMutation({
    mutationFn: () => (id ? deleteHelperProfile(id) : Promise.reject(new Error('missing id'))),
    onSuccess: () => {
      toast.success('settings:helperProfiles.deleted')
      void queryClient.invalidateQueries({ queryKey: ['/helper-profiles'] })
      void navigate('/helper')
    },
    onError: (error: unknown) => {
      const message =
        (error as ApiError).response?.data?.message ?? 'settings:helperProfiles.deleteError'
      if (message.startsWith('settings:')) {
        toast.error(message)
      } else {
        toast.raw.error(message)
      }
    },
  })

  const archiveMutation = useMutation({
    mutationFn: () => (id ? archiveHelperProfile(id) : Promise.reject(new Error('missing id'))),
    onSuccess: () => {
      toast.success('settings:helperProfiles.archived')
      void queryClient.invalidateQueries({ queryKey: ['/helper-profiles'] })
      void queryClient.invalidateQueries({ queryKey: ['helper-profile', id] })
      void navigate('/helper')
    },
    onError: (error: unknown) => {
      const message =
        (error as ApiError).response?.data?.message ?? 'settings:helperProfiles.archiveError'
      if (message.startsWith('settings:')) {
        toast.error(message)
      } else {
        toast.raw.error(message)
      }
    },
  })

  const restoreMutation = useMutation({
    mutationFn: () => (id ? restoreHelperProfile(id) : Promise.reject(new Error('missing id'))),
    onSuccess: () => {
      toast.success('settings:helperProfiles.restored')
      void queryClient.invalidateQueries({ queryKey: ['/helper-profiles'] })
      void queryClient.invalidateQueries({ queryKey: ['helper-profile', id] })
    },
    onError: (error: unknown) => {
      const message =
        (error as ApiError).response?.data?.message ?? 'settings:helperProfiles.restoreError'
      if (message.startsWith('settings:')) {
        toast.error(message)
      } else {
        toast.raw.error(message)
      }
    },
  })

  const deletePhotoMutation = useMutation({
    mutationFn: (photoId: number) =>
      id ? deleteHelperProfilePhoto(id, photoId) : Promise.reject(new Error('missing id')),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['helper-profile', id] })
      toast.success('settings:helperProfiles.photoDeleted')
    },
    onError: (error) => {
      console.error('Delete photo error:', error)
      toast.error('settings:helperProfiles.photoDeleteError')
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

  if (!data) {
    return (
      <ErrorState
        error="Helper profile not found"
        onRetry={() => {
          void navigate('/helper')
        }}
      />
    )
  }

  // Cast to local HelperProfile type which has all needed fields
  const profile = data as unknown as HelperProfile

  const helperName = profile.user?.name ?? 'Helper'

  const photos = profile.photos as { id: number; path: string }[]

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <HelperProfileEditBreadcrumb helperName={helperName} />

      <main className="px-4 pb-12">
        <div className="max-w-3xl mx-auto">
          <HelperProfileEditHero />

          <div className="space-y-8">
            <CurrentPhotosCard
              photos={photos}
              onDelete={(photoId) => {
                deletePhotoMutation.mutate(photoId)
              }}
              deleting={deletePhotoMutation.isPending}
            />

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

                  <ProfileStatusSection
                    status={profile.status}
                    hasPlacementResponses={Boolean(
                      profile.placement_responses && profile.placement_responses.length > 0
                    )}
                    onArchive={() => {
                      archiveMutation.mutate()
                    }}
                    onRestore={() => {
                      restoreMutation.mutate()
                    }}
                    onDelete={() => {
                      deleteMutation.mutate()
                    }}
                    isArchiving={archiveMutation.isPending}
                    isRestoring={restoreMutation.isPending}
                    isDeleting={deleteMutation.isPending}
                  />

                  <EditFormActions
                    isSubmitting={isSubmitting}
                    onCancel={() => {
                      handleCancel()
                    }}
                  />
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
