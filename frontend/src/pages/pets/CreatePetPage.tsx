import React, { useState, useCallback, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { useCreatePetForm } from '@/hooks/useCreatePetForm'
import { PetFormSection } from '@/components/pets/PetFormSection'
import { postPetsPetPhotos } from '@/api/generated/pet-photos/pet-photos'
import { useQueryClient } from '@tanstack/react-query'
import { invalidatePetCollectionQueries } from '@/lib/pet-cache'
import { useNetworkStatus } from '@/hooks/use-network-status'
import { enqueuePendingPetPhoto } from '@/lib/media-upload-queue'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { toast } from '@/lib/i18n-toast'
import { ConnectionLostState } from '@/components/ui/ConnectionLostState'
import { LoadingState } from '@/components/ui/LoadingState'
import { WifiOff } from 'lucide-react'
import { useGroups } from '@/api/groups'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

const CreatePetPage: React.FC = () => {
  const { t } = useTranslation(['pets', 'common', 'groups'])
  const isOnline = useNetworkStatus()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const requestedGroupId = Number(searchParams.get('group_id'))
  const hasRequestedGroupId = Number.isInteger(requestedGroupId) && requestedGroupId > 0
  const { data: groups = [], isLoading: loadingGroups } = useGroups({ enabled: isOnline })
  const adminGroups = groups.filter((group) => group.viewer_role === 'admin')
  const requestedGroup = adminGroups.find((group) => group.id === requestedGroupId)
  const [selectedGroupId, setSelectedGroupId] = useState<string>(() =>
    Number.isInteger(requestedGroupId) && requestedGroupId > 0 ? String(requestedGroupId) : 'none'
  )
  const effectiveGroupId =
    selectedGroupId === 'none'
      ? undefined
      : adminGroups.find((group) => group.id === Number(selectedGroupId))?.id
  const [hasSelectedPhoto, setHasSelectedPhoto] = useState(false)
  const photoFileRef = useRef<File | null>(null)
  const [createdPetId, setCreatedPetId] = useState<number | null>(null)
  const [isRetryingPhoto, setIsRetryingPhoto] = useState(false)

  const handleAfterCreate = useCallback(
    async (petId: number) => {
      if (photoFileRef.current) {
        try {
          await postPetsPetPhotos(petId, { photo: photoFileRef.current })
          // The create step already refreshed the lists, before this photo existed.
          await invalidatePetCollectionQueries(queryClient)
        } catch (err) {
          console.error('Failed to upload photo:', err)
          setCreatedPetId(petId)
          return false
        }
      }
      return true
    },
    [queryClient]
  )

  const handleQueuedOfflineCreate = useCallback((localEntityId: string) => {
    if (photoFileRef.current) {
      void enqueuePendingPetPhoto(photoFileRef.current, localEntityId)
    }
  }, [])

  const {
    formData,
    petTypes,
    loadingPetTypes,
    errors,
    error,
    isSubmitting,
    updateField,
    updateCategories,
    updateCity,
    handleSubmit,
    handleCancel,
  } = useCreatePetForm(
    undefined,
    handleAfterCreate,
    requestedGroup
      ? () => {
          void navigate(`/groups/${String(requestedGroup.id)}`)
        }
      : undefined,
    handleQueuedOfflineCreate,
    effectiveGroupId
  )

  const handlePhotoChange = useCallback((file: File | null) => {
    photoFileRef.current = file
    setHasSelectedPhoto(Boolean(file))
  }, [])

  const retryPhoto = async () => {
    if (!createdPetId || !photoFileRef.current) return
    setIsRetryingPhoto(true)
    try {
      await postPetsPetPhotos(createdPetId, { photo: photoFileRef.current })
      await invalidatePetCollectionQueries(queryClient)
      toast.success('pets:photos.uploadSuccess')
      void navigate(
        requestedGroup ? `/groups/${String(requestedGroup.id)}` : `/pets/${String(createdPetId)}`
      )
    } catch {
      toast.error('pets:photos.uploadError')
    } finally {
      setIsRetryingPhoto(false)
    }
  }

  const petTypesUnavailableOffline = !isOnline && !loadingPetTypes && petTypes.length === 0

  if (hasRequestedGroupId && !isOnline) {
    return <ConnectionLostState />
  }

  if (hasRequestedGroupId && loadingGroups) {
    return <LoadingState message={t('groups:createPet.loadingGroup')} />
  }

  if (hasRequestedGroupId && !requestedGroup) {
    return (
      <div className="container mx-auto max-w-lg px-4 py-8">
        <Alert variant="destructive">
          <AlertTitle>{t('groups:createPet.unavailableTitle')}</AlertTitle>
          <AlertDescription>{t('groups:createPet.unavailableDescription')}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Navigation */}
      <div className="px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/">{t('common:nav.home')}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{t('pets:addPet')}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      <div className="w-full max-w-2xl mx-auto px-4 pb-8">
        <h1 className="text-3xl font-bold text-center text-foreground mb-6">{t('pets:addPet')}</h1>

        {createdPetId ? (
          <Alert>
            <AlertTitle>{t('pets:photos.createdWithoutPhoto')}</AlertTitle>
            <AlertDescription>
              <p>{t('pets:photos.createUploadError')}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={isRetryingPhoto}
                  onClick={() => {
                    void retryPhoto()
                  }}
                >
                  {isRetryingPhoto ? t('common:actions.uploading') : t('pets:photos.retryUpload')}
                </Button>
                <Button variant="outline" asChild>
                  <Link to={`/pets/${String(createdPetId)}`}>{t('common:actions.continue')}</Link>
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        ) : petTypesUnavailableOffline ? (
          <Alert>
            <WifiOff className="h-4 w-4" />
            <AlertTitle>{t('pets:messages.offlinePetTypesRequiredTitle')}</AlertTitle>
            <AlertDescription>{t('pets:messages.offlinePetTypesRequired')}</AlertDescription>
          </Alert>
        ) : (
          <PetFormSection
            formData={formData}
            errors={errors}
            error={error}
            petTypes={petTypes}
            loadingPetTypes={loadingPetTypes}
            showOptionalFields={false}
            isSubmitting={isSubmitting}
            onSubmit={(e) => {
              void handleSubmit(e)
            }}
            onCancel={() => {
              handleCancel()
            }}
            updateField={updateField}
            updateCategories={updateCategories}
            cityValue={formData.city_selected}
            onCityChange={updateCity}
            submitLabel={isSubmitting ? t('pets:messages.creating') : t('pets:addPet')}
            onPhotoChange={handlePhotoChange}
            showOfflinePhotoHint={!isOnline && hasSelectedPhoto}
          >
            {isOnline && adminGroups.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="create-pet-group">
                  {t('groups:createPet.groupLabel')}
                </label>
                <Select
                  value={effectiveGroupId == null ? 'none' : String(effectiveGroupId)}
                  disabled={requestedGroup != null}
                  onValueChange={setSelectedGroupId}
                >
                  <SelectTrigger
                    id="create-pet-group"
                    className="w-full"
                    aria-label={t('groups:createPet.groupLabel')}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('groups:createPet.noGroup')}</SelectItem>
                    {adminGroups.map((group) => (
                      <SelectItem key={group.id} value={String(group.id)}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {requestedGroup
                    ? t('groups:createPet.insideGroup', { name: requestedGroup.name })
                    : t('groups:createPet.optionalHint')}
                </p>
              </div>
            )}
          </PetFormSection>
        )}
      </div>
    </div>
  )
}

export default CreatePetPage
