import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { FileInput } from '@/components/ui/FileInput'
import useHelperProfileForm from '@/hooks/useHelperProfileForm'
import { getPetTypes } from '@/api/pets'
import type { PetType } from '@/types/pet'
import { toast } from 'sonner'
import { HelperProfileFormFields } from '@/components/helper/HelperProfileFormFields'
import { PetTypesSelector } from '@/components/helper/PetTypesSelector'

const CreateHelperProfilePage: React.FC = () => {
  const { formData, errors, isSubmitting, updateField, handleSubmit, handleCancel } =
    useHelperProfileForm(undefined, {})
  
  const [petTypes, setPetTypes] = useState<PetType[]>([])
  const [loadingPetTypes, setLoadingPetTypes] = useState(true)

  // Load pet types on component mount
  useEffect(() => {
    const loadPetTypes = async () => {
      try {
        const types = await getPetTypes()
        setPetTypes(types)
      } catch (err) {
        console.error('Failed to load pet types:', err)
        toast.error('Failed to load pet types. Please try again.')
      } finally {
        setLoadingPetTypes(false)
      }
    }
    void loadPetTypes()
  }, [])

  // Filter handled by PetTypesSelector

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-2xl p-8 space-y-8 bg-card rounded-lg shadow-lg border">
        <h1 className="text-3xl font-bold text-center text-card-foreground mb-6">
          Create Helper Profile
        </h1>
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <HelperProfileFormFields formData={formData} errors={errors} updateField={updateField} />
          <PetTypesSelector
            petTypes={petTypes}
            selectedPetTypeIds={formData.pet_type_ids}
            onChangePetTypeIds={(ids) => { updateField('pet_type_ids')(ids); }}
            loading={loadingPetTypes}
            label="Pet Types Available for Placement Requests"
            error={errors.pet_type_ids}
          />

          <FileInput
            id="photos"
            label="Photos"
            onChange={updateField('photos')}
            error={errors.photos}
            multiple
          />

          <div className="flex gap-4">
            <Button type="submit" aria-label="Create Helper Profile" disabled={isSubmitting || loadingPetTypes}>
              {isSubmitting ? 'Creating...' : 'Create'}
            </Button>
            <Button type="button" variant="outline" onClick={() => { handleCancel() }} disabled={isSubmitting}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateHelperProfilePage
