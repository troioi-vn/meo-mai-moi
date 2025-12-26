import React from 'react'
import { FormField } from '@/components/ui/FormField'
import { CheckboxField } from '@/components/ui/CheckboxField'
import { CountrySelect } from '@/components/ui/CountrySelect'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { MapPin, Phone, Briefcase, ClipboardList, CircleHelp } from 'lucide-react'
import { PlacementRequestType } from '@/types/helper-profile'
import { CitySelect } from '@/components/location/CitySelect'
import type { City } from '@/types/pet'

// Form section header with icon and title
const FormSectionHeader = ({ icon: Icon, title }: { icon: React.ElementType; title: string }) => (
  <div className="flex items-center gap-2 pb-2 border-b mb-4">
    <Icon className="h-5 w-5 text-primary" />
    <h3 className="text-lg font-semibold">{title}</h3>
  </div>
)

const REQUEST_TYPE_OPTIONS: { value: PlacementRequestType; label: string }[] = [
  { value: 'foster_payed', label: 'Foster (Paid)' },
  { value: 'foster_free', label: 'Foster (Free)' },
  { value: 'permanent', label: 'Permanent Adoption' },
]

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
  return (
    <div className="space-y-8">
      {/* Location Section */}
      <section>
        <FormSectionHeader icon={MapPin} title="Location" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="country" className={errors.country ? 'text-destructive' : ''}>
              Country
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
                    <p>Clear selected cities to change country</p>
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
              label="Cities"
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
            label="Address"
            value={formData.address}
            onChange={updateField('address')}
            error={errors.address}
            placeholder="Enter your address"
          />
        </div>
      </section>

      {/* Contact Section */}
      <section>
        <FormSectionHeader icon={Phone} title="Contact Information" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            id="phone_number"
            label="Phone Number"
            value={formData.phone_number}
            onChange={updateField('phone_number')}
            error={errors.phone_number}
            placeholder="Enter your phone number"
          />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label
                htmlFor="contact_info"
                className={errors.contact_info ? 'text-destructive' : ''}
              >
                Contact Info
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger type="button" aria-label="Contact info help">
                    <CircleHelp className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>
                      You can add any additional contact info here, this info and your phone number
                      will be visible for pet owners when you reply to their Placement Requests
                    </p>
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
              placeholder="Telegram, Zalo, WhatsApp, etc."
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
        <FormSectionHeader icon={Briefcase} title="Experience & Household" />
        <div className="space-y-4">
          <FormField
            id="experience"
            label="Experience"
            type="textarea"
            value={formData.experience}
            onChange={updateField('experience')}
            error={errors.experience}
            placeholder="Describe your experience with pets..."
          />
          <div className="flex flex-wrap gap-6">
            <CheckboxField
              id="has_pets"
              label="Has Pets"
              checked={formData.has_pets}
              onChange={updateField('has_pets')}
              error={errors.has_pets}
            />
            <CheckboxField
              id="has_children"
              label="Has Children"
              checked={formData.has_children}
              onChange={updateField('has_children')}
              error={errors.has_children}
            />
          </div>
        </div>
      </section>

      {/* Request Types Section */}
      <section>
        <FormSectionHeader icon={ClipboardList} title="Request Types" />
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Select which types of placement requests you can respond to
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
