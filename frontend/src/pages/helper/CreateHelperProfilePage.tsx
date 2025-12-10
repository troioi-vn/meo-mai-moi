import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { FileInput } from '@/components/ui/FileInput'
import useHelperProfileForm from '@/hooks/useHelperProfileForm'
import { getPetTypes } from '@/api/pets'
import type { PetType, City } from '@/types/pet'
import { toast } from 'sonner'
import { HelperProfileFormFields } from '@/components/helper/HelperProfileFormFields'
import { PetTypesSelector } from '@/components/helper/PetTypesSelector'
import { ChevronLeft } from 'lucide-react'

const CreateHelperProfilePage: React.FC = () => {
  const navigate = useNavigate()
  const { formData, errors, isSubmitting, updateField, updateCity, handleSubmit, handleCancel } =
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

  const handleBack = () => {
    void navigate(-1)
  }

  return (
    <div className="min-h-screen">
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

      <main className="px-4 pb-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Create Helper Profile</CardTitle>
              <CardDescription>
                Set up your profile to let pet owners know you're available to help
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                <HelperProfileFormFields
                  formData={formData}
                  errors={errors}
                  updateField={updateField}
                  cityValue={formData.city_selected as City | null}
                  onCityChange={updateCity}
                />
                <PetTypesSelector
                  petTypes={petTypes}
                  selectedPetTypeIds={formData.pet_type_ids}
                  onChangePetTypeIds={(ids) => {
                    updateField('pet_type_ids')(ids)
                  }}
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

                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    aria-label="Create Helper Profile"
                    disabled={isSubmitting || loadingPetTypes}
                    className="flex-1 sm:flex-none"
                  >
                    {isSubmitting ? 'Creating...' : 'Create Profile'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      handleCancel()
                    }}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

export default CreateHelperProfilePage
