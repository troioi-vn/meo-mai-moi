import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'

import { useCreatePetForm } from '@/hooks/useCreatePetForm'
import { PetFormSection } from '@/components/pets/PetFormSection'

const CreatePetPage: React.FC = () => {
  const navigate = useNavigate()
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
  } = useCreatePetForm()

  const handleBack = () => {
    void navigate(-1)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <div className="px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <Button
            variant="ghost"
            size="default"
            onClick={handleBack}
            className="flex items-center gap-1 -ml-2 text-base"
          >
            <ChevronLeft className="h-6 w-6" />
            Back
          </Button>
        </div>
      </div>

      <div className="w-full max-w-2xl mx-auto px-4 pb-8">
        <h1 className="text-3xl font-bold text-center text-foreground mb-6">Add a New Pet</h1>

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
          submitLabel={isSubmitting ? 'Creating...' : 'Create Pet'}
        />
      </div>
    </div>
  )
}

export default CreatePetPage
