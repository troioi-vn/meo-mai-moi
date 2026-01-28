import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { FileInput } from '@/components/ui/FileInput'
import useHelperProfileForm from '@/hooks/useHelperProfileForm'
import { getPetTypes } from '@/api/generated/pet-types/pet-types'
import type { PetType } from '@/types/pet'
import { toast } from 'sonner'
import { HelperProfileFormFields } from '@/components/helper/HelperProfileFormFields'
import { PetTypesSelector } from '@/components/helper/PetTypesSelector'
import { Heart, Camera, UserPlus } from 'lucide-react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

const FormSectionHeader = ({ icon: Icon, title }: { icon: React.ElementType; title: string }) => (
  <div className="flex items-center gap-2 pb-2 border-b mb-4">
    <Icon className="h-5 w-5 text-primary" />
    <h3 className="text-lg font-semibold">{title}</h3>
  </div>
)

const CreateHelperProfilePage: React.FC = () => {
  const {
    formData,
    errors,
    isSubmitting,
    updateField,
    updateCities,
    handleSubmit,
    handleCancel,
    setFormData,
  } = useHelperProfileForm(undefined, {})

  const [petTypes, setPetTypes] = useState<PetType[]>([])
  const [loadingPetTypes, setLoadingPetTypes] = useState(true)

  // Load pet types on component mount
  useEffect(() => {
    const loadPetTypes = async () => {
      try {
        const types = await getPetTypes()
        setPetTypes(types)
      } catch (err: unknown) {
        console.error('Failed to load pet types:', err)
        toast.error('Failed to load pet types. Please try again.')
      } finally {
        setLoadingPetTypes(false)
      }
    }
    void loadPetTypes()
  }, [])

  useEffect(() => {
    if (loadingPetTypes) return
    if (petTypes.length === 0) return
    if (formData.pet_type_ids.length > 0) return

    const defaultPetTypeIds = petTypes.filter((t) => t.placement_requests_allowed).map((t) => t.id)

    if (defaultPetTypeIds.length === 0) return

    setFormData((prev) => {
      if (prev.pet_type_ids.length > 0) return prev
      return { ...prev, pet_type_ids: defaultPetTypeIds }
    })
  }, [formData.pet_type_ids.length, loadingPetTypes, petTypes, setFormData])

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <div className="px-4 py-4">
        <div className="max-w-3xl mx-auto">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/helper">Helper</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Create</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      <main className="px-4 pb-12">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
              <UserPlus className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">Create Helper Profile</h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Join our community of helpers. Your profile will be shown to pet owners when you
              respond to their placement requests.
            </p>
          </div>

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
                    petTypes={petTypes}
                    selectedPetTypeIds={formData.pet_type_ids}
                    onChangePetTypeIds={(ids) => {
                      updateField('pet_type_ids')(ids)
                    }}
                    loading={loadingPetTypes}
                    label="Pet Types Available for Placement Requests"
                    error={errors.pet_type_ids}
                  />
                </section>

                <section>
                  <FormSectionHeader icon={Camera} title="Photos" />
                  <div className="bg-muted/30 rounded-lg p-4 border-2 border-dashed border-muted-foreground/20">
                    <FileInput
                      id="photos"
                      label="Upload Photos"
                      onChange={updateField('photos')}
                      error={errors.photos}
                      multiple
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Add photos of your home or previous pets to help owners get to know you
                      better.
                    </p>
                  </div>
                </section>

                <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t">
                  <Button
                    type="submit"
                    aria-label="Create Helper Profile"
                    disabled={isSubmitting || loadingPetTypes}
                  >
                    {isSubmitting ? 'Creating Profile...' : 'Create Helper Profile'}
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
