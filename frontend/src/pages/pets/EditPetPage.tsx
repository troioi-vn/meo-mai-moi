import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/lib/i18n-toast'

import { useCreatePetForm } from '@/hooks/useCreatePetForm'
import {
  deletePetsId as deletePet,
  getPetsId as getPet,
  putPetsIdStatus as updatePetStatus,
} from '@/api/generated/pets/pets'
import type { Pet } from '@/types/pet'
import { petSupportsCapability } from '@/types/pet'
import { PetPhoto } from '@/components/pets/PetPhoto'
import { PetPhotoGallery } from '@/components/pets/PetPhotoGallery'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { WeightHistoryCard } from '@/components/pet-health/weights/WeightHistoryCard'
import { UpcomingVaccinationsSection } from '@/components/pet-health/vaccinations/UpcomingVaccinationsSection'
import { MicrochipsSection } from '@/components/pet-health/microchips/MicrochipsSection'
import { MedicalRecordsSection } from '@/components/pet-health/medical/MedicalRecordsSection'
import { PetStatusControls } from '@/components/pets/PetStatusControls'
import { PetDangerZone } from '@/components/pets/PetDangerZone'
import { PetFormSection } from '@/components/pets/PetFormSection'
import { useTranslation } from 'react-i18next'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

type TabValue = 'general' | 'health' | 'status'

const EditPetPage: React.FC = () => {
  const { t } = useTranslation(['pets', 'common'])
  const { id: petId } = useParams<{ id: string }>()
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
    updateCategories,
    updateCity,
    handleSubmit,
    handleCancel,
  } = useCreatePetForm(petId)

  useEffect(() => {
    if (!petId) return
    const loadPet = async () => {
      try {
        const pet = await getPet(Number(petId))
        setLoadedPet(pet)
        const st = pet.status
        setCurrentStatus(st)
        setNewStatus(st === 'deleted' ? 'active' : st)
      } catch {
        setLoadError(t('pets:messages.notFound'))
      }
    }
    void loadPet().catch(() => {
      setLoadError(t('pets:messages.loadError'))
    })
  }, [petId, t])

  const handleUpdateStatusClick = async () => {
    if (!petId) return
    if (!newStatus) {
      toast.error(t('pets:messages.selectStatus'))
      return
    }
    try {
      setIsUpdatingStatus(true)
      const updated = await updatePetStatus(Number(petId), { status: newStatus })
      setCurrentStatus(updated.status)
      toast.success(t('pets:messages.statusUpdated'))
      void navigate(`/pets/${petId}`, { replace: true })
    } catch {
      toast.error(t('pets:messages.updateStatusError'))
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleDeletePetClick = async (password: string) => {
    if (!petId) return
    if (!password.trim()) {
      toast.error(t('pets:messages.passwordRequired'))
      return
    }
    try {
      setIsDeleting(true)
      await deletePet(Number(petId), { password })
      toast.success(t('pets:messages.removed'))
      void navigate('/', { replace: true })
    } catch {
      toast.error(t('pets:messages.removeError'))
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoadingPet) {
    return <LoadingState message={t('pets:messages.loadingData')} />
  }

  if (loadError) {
    return (
      <ErrorState
        error={loadError}
        onRetry={() => {
          void navigate('/')
        }}
        retryText={t('common:nav.pets')}
      />
    )
  }

  const petType = loadedPet?.pet_type
  const supportsWeight = petType ? petSupportsCapability(petType, 'weight') : false
  const supportsVaccinations = petType ? petSupportsCapability(petType, 'vaccinations') : false
  const supportsMedical = petType ? petSupportsCapability(petType, 'medical') : false
  const supportsHealth = supportsWeight || supportsVaccinations || supportsMedical
  const supportsMicrochips = petType ? petSupportsCapability(petType, 'microchips') : false

  return (
    <div className="min-h-screen bg-background">
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
                <BreadcrumbLink asChild>
                  <Link to={`/pets/${petId ?? ''}`}>
                    {loadedPet?.name ?? t('pets:species.other')}
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{t('common:actions.edit')}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      <div className="w-full max-w-2xl mx-auto px-4 pb-8">
        <h1 className="text-3xl font-bold text-center text-foreground mb-6">{t('pets:editPet')}</h1>
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value as TabValue)
          }}
          className="space-y-6"
        >
          <TabsList className={`grid w-full ${supportsHealth ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <TabsTrigger value="general">{t('pets:tabs.general')}</TabsTrigger>
            {supportsHealth && <TabsTrigger value="health">{t('pets:tabs.health')}</TabsTrigger>}
            <TabsTrigger value="status">{t('pets:tabs.status')}</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
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

            {loadedPet && (
              <PetPhotoGallery
                pet={loadedPet}
                onPetUpdate={(updatedPet) => {
                  setLoadedPet(updatedPet)
                }}
              />
            )}

            <PetFormSection
              formData={formData}
              errors={errors}
              error={error}
              petTypes={petTypes}
              loadingPetTypes={loadingPetTypes}
              showOptionalFields={true}
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
              submitLabel={isSubmitting ? t('pets:messages.updating') : t('pets:messages.updated')}
            />

            {supportsMicrochips && loadedPet && (
              <MicrochipsSection petId={loadedPet.id} canEdit={true} />
            )}
          </TabsContent>

          {supportsHealth && (
            <TabsContent value="health" className="space-y-6">
              {supportsWeight && loadedPet && (
                <WeightHistoryCard petId={loadedPet.id} canEdit={true} mode="edit" />
              )}
              {supportsVaccinations && loadedPet && (
                <UpcomingVaccinationsSection petId={loadedPet.id} canEdit={true} mode="edit" />
              )}
              {supportsMedical && loadedPet && (
                <MedicalRecordsSection petId={loadedPet.id} canEdit={true} mode="edit" />
              )}
            </TabsContent>
          )}

          <TabsContent value="status" className="space-y-6">
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

export default EditPetPage
