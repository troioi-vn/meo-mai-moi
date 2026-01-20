import React from 'react'
import { Link } from 'react-router-dom'

import { useCreatePetForm } from '@/hooks/useCreatePetForm'
import { PetFormSection } from '@/components/pets/PetFormSection'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

const CreatePetPage: React.FC = () => {
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

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <div className="px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Add New Pet</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
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
