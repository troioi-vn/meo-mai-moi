import React from 'react'
import { FormField } from '@/components/ui/FormField'
import { CheckboxField } from '@/components/ui/CheckboxField'
import { CountrySelect } from '@/components/ui/CountrySelect'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { MapPin, Phone, Briefcase, ClipboardList, CircleHelp } from 'lucide-react'
import { type PlacementRequestType } from '@/types/helper-profile'
import { CitySelect } from '@/components/location/CitySelect'
import type { City } from '@/types/pet'
import { useTranslation } from 'react-i18next'

// Form section header with icon and title
const FormSectionHeader = ({ icon: Icon, title }: { icon: React.ElementType; title: string }) => (
  <div className="flex items-center gap-2 pb-2 border-b mb-4">
    <Icon className="h-5 w-5 text-primary" />
    <h3 className="text-lg font-semibold">{title}</h3>
  </div>
)

interface Props {
  formData: {
    country: string
    address: string
    city_ids?: number[]
    city: string
    state: string
    phone_number: string
    contact_info: string
    experience: string
    has_pets: boolean
    has_children: boolean
    request_types: PlacementRequestType[]
  }
  errors: Record<string, string>
  updateField: (field: keyof Props['formData']) => (value: unknown) => void
  citiesValue?: City[]
  onCitiesChange?: (cities: City[]) => void
}

export const HelperProfileFormFields: React.FC<Props> = ({
  formData,
  errors,
  updateField,
  citiesValue = [],
  onCitiesChange,
}) => {
  const { t } = useTranslation(['helper', 'pets', 'common'])

  const REQUEST_TYPE_OPTIONS: { value: PlacementRequestType; label: string }[] = [
    { value: 'foster_paid', label: t('helper:form.types.foster_paid') },
    { value: 'foster_free', label: t('helper:form.types.foster_free') },
    { value: 'permanent', label: t('helper:form.types.permanent') },
    { value: 'pet_sitting', label: t('helper:form.types.pet_sitting') },
  ]

  return (
    <div className="space-y-8">
      {/* Location Section */}
      <section>
        <FormSectionHeader icon={MapPin} title={t('common:location.title')} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="country" className={errors.country ? 'text-destructive' : ''}>
              {t('pets:form.country')}
            </Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-full">
                    <CountrySelect
                      value={formData.country}
                      onValueChange={(value) => {
                        updateField('country')(value)
                      }}
                      disabled={citiesValue.length > 0}
                      data-testid="country-select"
                    />
                  </div>
                </TooltipTrigger>
                {citiesValue.length > 0 && (
                  <TooltipContent>
                    <p>{t('helper:form.clearCitiesToChangeCountry')}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
            {errors.country && (
              <p className="text-sm font-medium text-destructive">{errors.country}</p>
            )}
          </div>
          <div className="space-y-2">
            <CitySelect
              id="cities"
              label={t('helper:form.cities')}
              multiple
              country={formData.country || null}
              value={citiesValue}
              onChange={
                onCitiesChange ??
                (() => {
                  /* noop */
                })
              }
              error={errors.city}
            />
          </div>
        </div>
        <div className="mt-4">
          <FormField
            id="address"
            label={t('helper:form.address')}
            value={formData.address}
            onChange={updateField('address')}
            error={errors.address}
            placeholder={t('helper:form.addressPlaceholder')}
          />
        </div>
      </section>

      {/* Contact Section */}
      <section>
        <FormSectionHeader icon={Phone} title={t('helper:form.contactInfo')} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            id="phone_number"
            label={t('helper:form.phoneNumber')}
            value={formData.phone_number}
            onChange={updateField('phone_number')}
            error={errors.phone_number}
            placeholder={t('helper:form.phoneNumber')}
          />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label
                htmlFor="contact_info"
                className={errors.contact_info ? 'text-destructive' : ''}
              >
                {t('helper:form.additionalContact')}
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger type="button" aria-label="Contact info help">
                    <CircleHelp className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>{t('helper:form.additionalContactHelp')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Textarea
              id="contact_info"
              name="contact_info"
              value={formData.contact_info}
              onChange={(e) => {
                updateField('contact_info')(e.target.value)
              }}
              placeholder={t('helper:form.contactInfoPlaceholder')}
              rows={1}
              className="min-h-10"
              aria-invalid={!!errors.contact_info}
              aria-describedby={errors.contact_info ? 'contact_info-error' : undefined}
            />
            {errors.contact_info && (
              <p id="contact_info-error" className="text-sm font-medium text-destructive">
                {errors.contact_info}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Experience & Household Section */}
      <section>
        <FormSectionHeader icon={Briefcase} title={t('helper:form.experienceHouseholdSection')} />
        <div className="space-y-4">
          <FormField
            id="experience"
            label={t('helper:form.experience')}
            type="textarea"
            value={formData.experience}
            onChange={updateField('experience')}
            error={errors.experience}
            placeholder={t('helper:form.experiencePlaceholder')}
          />
          <div className="flex flex-wrap gap-6">
            <CheckboxField
              id="has_pets"
              label={t('helper:form.hasPets')}
              checked={formData.has_pets}
              onChange={updateField('has_pets')}
              error={errors.has_pets}
            />
            <CheckboxField
              id="has_children"
              label={t('helper:form.hasChildren')}
              checked={formData.has_children}
              onChange={updateField('has_children')}
              error={errors.has_children}
            />
          </div>
        </div>
      </section>

      {/* Request Types Section */}
      <section>
        <FormSectionHeader icon={ClipboardList} title={t('helper:form.placementTypes')} />
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {t('helper:form.requestTypesDescription')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {REQUEST_TYPE_OPTIONS.map((option) => (
              <div
                key={option.value}
                className="flex items-center space-x-2 border rounded-md p-3 hover:bg-accent transition-colors"
              >
                <Checkbox
                  id={`request_type_${option.value}`}
                  checked={formData.request_types.includes(option.value)}
                  onCheckedChange={(checked) => {
                    const currentTypes = formData.request_types
                    if (checked) {
                      updateField('request_types')([...currentTypes, option.value])
                    } else {
                      updateField('request_types')(currentTypes.filter((t) => t !== option.value))
                    }
                  }}
                />
                <Label
                  htmlFor={`request_type_${option.value}`}
                  className="font-normal cursor-pointer"
                >
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
          {errors.request_types && (
            <p className="text-sm font-medium text-destructive">{errors.request_types}</p>
          )}
        </div>
      </section>
    </div>
  )
}
