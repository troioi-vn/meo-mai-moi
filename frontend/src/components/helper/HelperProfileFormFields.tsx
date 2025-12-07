import React from 'react'
import { FormField } from '@/components/ui/FormField'
import { CheckboxField } from '@/components/ui/CheckboxField'
import { CountrySelect } from '@/components/ui/CountrySelect'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { CircleHelp } from 'lucide-react'

interface Props {
  formData: {
    country: string
    address: string
    city: string
    state: string
    phone_number: string
    contact_info: string
    experience: string
    has_pets: boolean
    has_children: boolean
    can_foster: boolean
    can_adopt: boolean
    is_public: boolean
  }
  errors: Record<string, string>
  updateField: (field: keyof Props['formData']) => (value: unknown) => void
}

export const HelperProfileFormFields: React.FC<Props> = ({ formData, errors, updateField }) => {
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
        <FormField
          id="city"
          label="City"
          value={formData.city}
          onChange={updateField('city')}
          error={errors.city}
          placeholder="Enter your city"
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
      <CheckboxField
        id="can_foster"
        label="Can Foster"
        checked={formData.can_foster}
        onChange={updateField('can_foster')}
        error={errors.can_foster}
      />
      <CheckboxField
        id="can_adopt"
        label="Can Adopt"
        checked={formData.can_adopt}
        onChange={updateField('can_adopt')}
        error={errors.can_adopt}
      />
      <CheckboxField
        id="is_public"
        label="Is Public"
        checked={formData.is_public}
        onChange={updateField('is_public')}
        error={errors.is_public}
      />
    </>
  )
}
