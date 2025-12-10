import React from 'react'
import { FormField } from '@/components/ui/FormField'
import { CheckboxField } from '@/components/ui/CheckboxField'
import { CountrySelect } from '@/components/ui/CountrySelect'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { CircleHelp } from 'lucide-react'
import type { PlacementRequestType } from '@/types/helper-profile'
import { CitySelect } from '@/components/location/CitySelect'
import type { City } from '@/types/pet'

const REQUEST_TYPE_OPTIONS: { value: PlacementRequestType; label: string }[] = [
  { value: 'foster_payed', label: 'Foster (Paid)' },
  { value: 'foster_free', label: 'Foster (Free)' },
  { value: 'permanent', label: 'Permanent Adoption' },
]

interface Props {
  formData: {
    country: string
    address: string
    city_id?: number | null
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
  cityValue?: City | null
  onCityChange?: (city: City | null) => void
}

export const HelperProfileFormFields: React.FC<Props> = ({
  formData,
  errors,
  updateField,
  cityValue,
  onCityChange,
}) => {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="country" className={errors.country ? 'text-destructive' : ''}>
          Country <span className="text-destructive">*</span>
        </Label>
        <CountrySelect
          value={formData.country}
          onValueChange={(value) => {
            updateField('country')(value)
          }}
          data-testid="country-select"
        />
        {errors.country && <p className="text-sm font-medium text-destructive">{errors.country}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormField
          id="state"
          label="State/Province"
          value={formData.state}
          onChange={updateField('state')}
          error={errors.state}
          placeholder="Enter state or province"
        />
        <CitySelect
          country={formData.country || null}
          value={cityValue ?? null}
          onChange={onCityChange ?? (() => {})}
        />
      </div>
      <FormField
        id="address"
        label="Address"
        value={formData.address}
        onChange={updateField('address')}
        error={errors.address}
        placeholder="Enter your address"
      />
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
          <Label htmlFor="contact_info" className={errors.contact_info ? 'text-destructive' : ''}>
            Contact Info
          </Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger type="button" aria-label="Contact info help">
                <CircleHelp className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  You can add additional contact info here, this info and your phone number will be
                  visible for pet owners when you reply to their Placement Requests
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Textarea
          id="contact_info"
          name="contact_info"
          value={formData.contact_info}
          onChange={(e) => updateField('contact_info')(e.target.value)}
          placeholder="Add any additional contact info (e.g., Telegram, Zalo, WhatsApp, preferred contact times)"
          rows={3}
          aria-invalid={!!errors.contact_info}
          aria-describedby={errors.contact_info ? 'contact_info-error' : undefined}
        />
        {errors.contact_info && (
          <p id="contact_info-error" className="text-sm font-medium text-destructive">
            {errors.contact_info}
          </p>
        )}
      </div>
      <FormField
        id="experience"
        label="Experience"
        type="textarea"
        value={formData.experience}
        onChange={updateField('experience')}
        error={errors.experience}
        placeholder="Describe your experience"
      />
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
      <div className="space-y-3">
        <Label className={errors.request_types ? 'text-destructive' : ''}>
          Request Types <span className="text-destructive">*</span>
        </Label>
        <p className="text-sm text-muted-foreground">
          Select which types of placement requests you can respond to
        </p>
        <div className="space-y-2">
          {REQUEST_TYPE_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
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
              <Label htmlFor={`request_type_${option.value}`} className="font-normal">
                {option.label}
              </Label>
            </div>
          ))}
        </div>
        {errors.request_types && (
          <p className="text-sm font-medium text-destructive">{errors.request_types}</p>
        )}
      </div>
    </>
  )
}
