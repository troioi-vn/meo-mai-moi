import React from 'react'
import { FormField } from '@/components/ui/FormField'
import { CheckboxField } from '@/components/ui/CheckboxField'

type Props = {
  formData: {
    country: string
    address: string
    city: string
    state: string
    phone_number: string
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
      <FormField
        id="country"
        label="Country"
        value={formData.country}
        onChange={updateField('country')}
        error={errors.country}
        placeholder="Enter your country"
      />
      <FormField
        id="address"
        label="Address"
        value={formData.address}
        onChange={updateField('address')}
        error={errors.address}
        placeholder="Enter your address"
      />
      <FormField
        id="city"
        label="City"
        value={formData.city}
        onChange={updateField('city')}
        error={errors.city}
        placeholder="Enter your city"
      />
      <FormField
        id="state"
        label="State"
        value={formData.state}
        onChange={updateField('state')}
        error={errors.state}
        placeholder="Enter your state"
      />
      <FormField
        id="phone_number"
        label="Phone Number"
        value={formData.phone_number}
        onChange={updateField('phone_number')}
        error={errors.phone_number}
        placeholder="Enter your phone number"
      />
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
