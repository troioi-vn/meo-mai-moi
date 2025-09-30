import React from 'react'
import { FormField } from '@/components/ui/FormField'

type Data = {
  name: string
  breed: string
  birthday: string
  location: string
  description: string
}

type Props = {
  formData: Data
  errors: Partial<Record<keyof Data, string>>
  updateField: (field: keyof Data) => (value: unknown) => void
}

export const PetFormFields: React.FC<Props> = ({ formData, errors, updateField }) => {
  return (
    <>
      <FormField id="name" label="Name" value={formData.name} onChange={updateField('name')} error={errors.name} placeholder="Enter pet's name" />

      <FormField id="breed" label="Breed" value={formData.breed} onChange={updateField('breed')} error={errors.breed} placeholder="Enter pet's breed" />

      <FormField id="birthday" label="Birthday" type="date" value={formData.birthday} onChange={updateField('birthday')} error={errors.birthday} />

      <FormField id="location" label="Location" value={formData.location} onChange={updateField('location')} error={errors.location} placeholder="Enter pet's location" />

      <FormField id="description" label="Description" type="textarea" value={formData.description} onChange={updateField('description')} error={errors.description} placeholder="Describe the pet's personality and characteristics" />
    </>
  )
}
