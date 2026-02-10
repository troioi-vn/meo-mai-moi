import React, { useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { useCreatePetForm } from '@/hooks/useCreatePetForm'
import { PetFormSection } from '@/components/pets/PetFormSection'
import { postPetsPetPhotos } from '@/api/generated/pet-photos/pet-photos'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

const CreatePetPage: React.FC = () => {
  const { t } = useTranslation(['pets', 'common'])
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const photoFileRef = useRef<File | null>(null)

  const handleAfterCreate = useCallback(async (petId: number) => {
    if (photoFileRef.current) {
      try {
        await postPetsPetPhotos(petId, { photo: photoFileRef.current })
      } catch (err) {
        console.error('Failed to upload photo:', err)
      }
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
  } = useCreatePetForm(undefined, handleAfterCreate)

  const handlePhotoChange = useCallback((file: File | null) => {
    photoFileRef.current = file
    if (file) {
      const url = URL.createObjectURL(file)
      setPhotoPreview(url)
    } else {
      setPhotoPreview(null)
    }
  }, [])

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
          photoPreview={photoPreview}
          onPhotoChange={handlePhotoChange}
        />
      </div>
    </div>
  )
}

export default CreatePetPage
