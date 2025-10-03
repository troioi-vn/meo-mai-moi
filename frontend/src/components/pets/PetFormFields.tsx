import React from 'react'
import { FormField } from '@/components/ui/FormField'

interface Data {
  name: string
  breed: string
  birthday: string
  birthday_year?: string
  birthday_month?: string
  birthday_day?: string
  birthday_precision?: 'day' | 'month' | 'year' | 'unknown'
  location: string
  description: string
}

interface Props {
  formData: Data
  errors: Partial<Record<keyof Data, string>>
  updateField: (field: keyof Data) => (value: unknown) => void
}

export const PetFormFields: React.FC<Props> = ({ formData, errors, updateField }) => {
  return (
    <>
      <FormField id="name" label="Name" value={formData.name} onChange={updateField('name')} error={errors.name} placeholder="Enter pet's name" />

      <FormField id="breed" label="Breed" value={formData.breed} onChange={updateField('breed')} error={errors.breed} placeholder="Enter pet's breed" />

      {/* Birthday Precision Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground" htmlFor="birthday_precision">Birthday Precision</label>
        <select
          id="birthday_precision"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          value={formData.birthday_precision || 'unknown'}
          onChange={updateField('birthday_precision')}
        >
          <option value="unknown">Unknown</option>
          <option value="year">Year</option>
          <option value="month">Year + Month</option>
          <option value="day">Full Date</option>
        </select>
        {errors.birthday_precision && (
          <p className="text-xs text-destructive mt-1">{errors.birthday_precision}</p>
        )}
      </div>

      {formData.birthday_precision === 'day' && (
        <FormField id="birthday" label="Birthday" type="date" value={formData.birthday} onChange={updateField('birthday')} error={errors.birthday} />
      )}
      {formData.birthday_precision === 'month' && (
        <div className="grid grid-cols-2 gap-4">
          <FormField
            id="birthday_year"
            label="Birth Year"
            type="text"
            value={formData.birthday_year || ''}
            onChange={updateField('birthday_year')}
            error={errors.birthday_year}
            placeholder="YYYY"
          />
          <FormField
            id="birthday_month"
            label="Birth Month"
            type="text"
            value={formData.birthday_month || ''}
            onChange={updateField('birthday_month')}
            error={errors.birthday_month}
            placeholder="MM"
          />
        </div>
      )}
      {formData.birthday_precision === 'year' && (
        <FormField
          id="birthday_year"
          label="Birth Year"
          type="text"
          value={formData.birthday_year || ''}
          onChange={updateField('birthday_year')}
          error={errors.birthday_year}
          placeholder="YYYY"
        />
      )}

      <FormField id="location" label="Location" value={formData.location} onChange={updateField('location')} error={errors.location} placeholder="Enter pet's location" />

      <FormField id="description" label="Description" type="textarea" value={formData.description} onChange={updateField('description')} error={errors.description} placeholder="Describe the pet's personality and characteristics" />
    </>
  )
}
