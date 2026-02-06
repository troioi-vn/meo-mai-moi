import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { FileInput } from '@/components/ui/FileInput'
import useHelperProfileForm from '@/hooks/useHelperProfileForm'
import { getPetTypes } from '@/api/generated/pet-types/pet-types'
import type { PetType } from '@/types/pet'
import { toast } from '@/lib/i18n-toast'
import { HelperProfileFormFields } from '@/components/helper/HelperProfileFormFields'
import { PetTypesSelector } from '@/components/helper/PetTypesSelector'
import { Heart, Camera, UserPlus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation(['helper', 'common'])
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
        setPetTypes(types as PetType[])
      } catch (err: unknown) {
        console.error('Failed to load pet types:', err)
        toast.error('common:errors.generic')
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
    <div className="min-h-[calc(100vh-4rem)]">
      {/* Navigation */}
      <div className="px-4 py-4">
        <div className="max-w-3xl mx-auto">
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
                  <Link to="/helper">{t('common:nav.helperProfiles')}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{t('common:actions.create')}</BreadcrumbPage>
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
            <h1 className="text-3xl font-bold tracking-tight mb-2">{t('helper:createTitle')}</h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              {t('helper:createDescription')}
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
                  <FormSectionHeader icon={Heart} title={t('helper:form.petPreferencesSection')} />
                  <PetTypesSelector
                    petTypes={petTypes}
                    selectedPetTypeIds={formData.pet_type_ids}
                    onChangePetTypeIds={(ids) => {
                      updateField('pet_type_ids')(ids)
                    }}
                    loading={loadingPetTypes}
                    label={t('helper:form.petTypesLabel')}
                    error={errors.pet_type_ids}
                  />
                </section>

                <section>
                  <FormSectionHeader icon={Camera} title={t('helper:form.photosSection')} />
                  <div className="bg-muted/30 rounded-lg p-4 border-2 border-dashed border-muted-foreground/20">
                    <FileInput
                      id="photos"
                      label={t('helper:form.uploadPhotos')}
                      onChange={updateField('photos')}
                      error={errors.photos}
                      multiple
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      {t('helper:form.photosDescription')}
                    </p>
                  </div>
                </section>

                <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t">
                  <Button
                    type="submit"
                    aria-label={t('helper:actions.createProfile')}
                    disabled={isSubmitting || loadingPetTypes}
                  >
                    {isSubmitting
                      ? t('helper:actions.creatingProfile')
                      : t('helper:actions.createProfile')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      handleCancel()
                    }}
                    disabled={isSubmitting}
                  >
                    {t('common:actions.cancel')}
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
