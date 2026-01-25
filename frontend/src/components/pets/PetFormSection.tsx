import React from 'react'

import { Button } from '@/components/ui/button'
import { PetTypeSelect } from '@/components/pets/PetTypeSelect'
import { CategorySelect } from '@/components/pets/CategorySelect'
import { PetFormFields } from '@/components/pets/PetFormFields'
import type { useCreatePetForm } from '@/hooks/useCreatePetForm'
import type { PetType } from '@/types/pet'

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
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  updateField: UpdateField
  updateCategories: UpdateCategories
  submitLabel: string
  cityValue?: CityValue
  onCityChange?: UpdateCity
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
}) => {
  return (
    <div className="bg-card rounded-lg shadow-lg border p-6">
      <form
        onSubmit={(e) => {
          onSubmit(e)
        }}
        className="space-y-6"
        noValidate
      >
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

        <PetFormFields
          formData={formData}
          errors={errors}
          updateField={updateField}
          cityValue={cityValue}
          onCityChange={onCityChange}
          showOptionalFields={showOptionalFields}
        />

        {error && (
          <p className="text-destructive" data-testid="form-error">
            {error}
          </p>
        )}

        <div className="flex gap-4">
          <Button type="submit" aria-label={submitLabel} disabled={isSubmitting || loadingPetTypes}>
            {submitLabel}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}

export default PetFormSection
