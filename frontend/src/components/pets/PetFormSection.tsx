import React, { useRef } from 'react'

import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/FormField'
import { Separator } from '@/components/ui/separator'
import { PetTypeSelect } from '@/components/pets/PetTypeSelect'
import { CategorySelect } from '@/components/pets/CategorySelect'
import { PetFormFields } from '@/components/pets/PetFormFields'
import type { useCreatePetForm } from '@/hooks/useCreatePetForm'
import type { PetType } from '@/types/pet'
import { Camera } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/lib/i18n-toast'
import { useTranslation } from 'react-i18next'

type FormData = ReturnType<typeof useCreatePetForm>['formData']
type FormErrors = ReturnType<typeof useCreatePetForm>['errors']
type UpdateField = ReturnType<typeof useCreatePetForm>['updateField']
type UpdateCategories = ReturnType<typeof useCreatePetForm>['updateCategories']
type UpdateCity = ReturnType<typeof useCreatePetForm>['updateCity']
type CityValue = ReturnType<typeof useCreatePetForm>['formData']['city_selected']

interface PetFormSectionProps {
  formData: FormData
  errors: FormErrors
  error: string | null
  petTypes: PetType[]
  loadingPetTypes: boolean
  showOptionalFields: boolean
  isSubmitting: boolean
  onSubmit: (e: React.SubmitEvent) => void
  onCancel: () => void
  updateField: UpdateField
  updateCategories: UpdateCategories
  submitLabel: string
  cityValue?: CityValue
  onCityChange?: UpdateCity
  photoPreview?: string | null
  onPhotoChange?: (file: File | null) => void
}

export const PetFormSection: React.FC<PetFormSectionProps> = ({
  formData,
  errors,
  error,
  petTypes,
  loadingPetTypes,
  showOptionalFields,
  isSubmitting,
  onSubmit,
  onCancel,
  updateField,
  updateCategories,
  submitLabel,
  cityValue,
  onCityChange,
  photoPreview,
  onPhotoChange,
}) => {
  const { t } = useTranslation(['pets', 'common'])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handlePhotoClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('pets:photos.selectImageError')
      return
    }

    const MAX_SIZE_MB = 10
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.raw.error(t('pets:photos.maxSizeError', { size: MAX_SIZE_MB }))
      return
    }

    onPhotoChange?.(file)

    // Reset input so same file can be re-selected
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="bg-card rounded-lg shadow-lg border p-6">
      <form
        onSubmit={(e) => {
          onSubmit(e)
        }}
        className="space-y-6"
        noValidate
      >
        {/* === Identity Section === */}
        <FormField
          id="name"
          label={t('pets:form.nameLabel')}
          value={formData.name}
          onChange={updateField('name')}
          error={errors.name}
          placeholder={t('pets:form.namePlaceholder')}
        />

        {/* Photo Upload */}
        {onPhotoChange && (
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('pets:form.photoLabel')}</label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={handlePhotoClick}
                disabled={isSubmitting}
                className="relative h-24 w-24 shrink-0 rounded-full border-2 border-dashed border-muted-foreground/30 hover:border-muted-foreground/60 transition-colors flex items-center justify-center overflow-hidden bg-muted/30"
              >
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt={t('pets:form.photoLabel')}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Camera className="h-8 w-8 text-muted-foreground/50" />
                )}
                {isSubmitting && photoPreview && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/60">
                    <Spinner className="size-6" />
                  </div>
                )}
              </button>
              <div className="text-sm text-muted-foreground">
                {t('pets:form.photoHint')}
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        )}

        <PetTypeSelect
          petTypes={petTypes}
          loading={loadingPetTypes}
          value={formData.pet_type_id ?? ''}
          onChange={(id) => {
            updateField('pet_type_id')(id)
          }}
          error={errors.pet_type_id}
        />

        <CategorySelect
          petTypeId={formData.pet_type_id}
          selectedCategories={formData.categories}
          onChange={updateCategories}
        />

        <Separator />

        {/* === Details & Location Section === */}
        <PetFormFields
          formData={formData}
          errors={errors}
          updateField={updateField}
          cityValue={cityValue}
          onCityChange={onCityChange}
          showOptionalFields={showOptionalFields}
          skipName
        />

        {error && (
          <p className="text-destructive" data-testid="form-error">
            {error}
          </p>
        )}

        <Separator />

        <div className="flex gap-4">
          <Button type="submit" aria-label={submitLabel} disabled={isSubmitting || loadingPetTypes}>
            {submitLabel}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            {t('common:actions.cancel')}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default PetFormSection
