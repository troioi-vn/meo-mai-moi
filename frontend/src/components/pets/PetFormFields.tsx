import React from 'react'
import { FormField } from '@/components/ui/FormField'
import { BirthdayDatePicker } from '@/components/ui/BirthdayDatePicker'
import { CountrySelect } from '@/components/ui/CountrySelect'
import { Label } from '@/components/ui/label'

interface Data {
  name: string
  breed: string
  birthday: string
  birthday_year?: string
  birthday_month?: string
  birthday_day?: string
  birthday_precision?: 'day' | 'month' | 'year' | 'unknown'
  country: string
  state?: string
  city?: string
  address?: string
  description: string
}

interface Props {
  formData: Data
  errors: Partial<Record<keyof Data, string>>
  updateField: (field: keyof Data) => (value: unknown) => void
  /** Whether to show description and location fields (hidden in create mode) */
  showOptionalFields?: boolean
}

export const PetFormFields: React.FC<Props> = ({
  formData,
  errors,
  updateField,
  showOptionalFields = true,
}) => {
  return (
    <>
      <FormField
        id="name"
        label="Name"
        value={formData.name}
        onChange={updateField('name')}
        error={errors.name}
        placeholder="Enter pet's name"
      />

      <FormField
        id="breed"
        label="Breed"
        value={formData.breed}
        onChange={updateField('breed')}
        error={errors.breed}
        placeholder="Enter pet's breed"
      />

      {/* Birthday Precision Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground" htmlFor="birthday_precision">
          Birthday Precision
        </label>
        <select
          id="birthday_precision"
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          value={formData.birthday_precision ?? 'unknown'}
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
        <div className="space-y-2">
          <Label htmlFor="birthday" className={errors.birthday ? 'text-destructive' : ''}>
            Birthday
          </Label>
          <BirthdayDatePicker
            id="birthday"
            value={formData.birthday}
            onChange={updateField('birthday')}
            error={errors.birthday}
            placeholder="Select pet's birthday"
          />
          {errors.birthday && (
            <p className="text-sm font-medium text-destructive">{errors.birthday}</p>
          )}
        </div>
      )}
      {formData.birthday_precision === 'month' && (
        <div className="grid grid-cols-2 gap-4">
          <FormField
            id="birthday_year"
            label="Birth Year"
            type="text"
            value={formData.birthday_year ?? ''}
            onChange={updateField('birthday_year')}
            error={errors.birthday_year}
            placeholder="YYYY"
          />
          <FormField
            id="birthday_month"
            label="Birth Month"
            type="text"
            value={formData.birthday_month ?? ''}
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
          value={formData.birthday_year ?? ''}
          onChange={updateField('birthday_year')}
          error={errors.birthday_year}
          placeholder="YYYY"
        />
      )}

      {/* Country is always shown since it's required */}
      <div className="space-y-2">
        <Label htmlFor="country" className={errors.country ? 'text-destructive' : ''}>
          Country <span className="text-destructive">*</span>
        </Label>
        <CountrySelect
          value={formData.country}
          onValueChange={(value) => updateField('country')(value)}
          data-testid="country-select"
        />
        {errors.country && <p className="text-sm font-medium text-destructive">{errors.country}</p>}
      </div>

      {showOptionalFields && (
        <>
          {/* Optional location fields */}
          <div className="grid grid-cols-2 gap-4">
            <FormField
              id="state"
              label="State/Province"
              value={formData.state ?? ''}
              onChange={updateField('state')}
              error={errors.state}
              placeholder="Enter state or province"
            />

            <FormField
              id="city"
              label="City"
              value={formData.city ?? ''}
              onChange={updateField('city')}
              error={errors.city}
              placeholder="Enter city"
            />
          </div>

          <FormField
            id="address"
            label="Address"
            value={formData.address ?? ''}
            onChange={updateField('address')}
            error={errors.address}
            placeholder="Enter street address"
          />

          <FormField
            id="description"
            label="Description"
            type="textarea"
            value={formData.description}
            onChange={updateField('description')}
            error={errors.description}
            placeholder="Describe the pet's personality and characteristics"
          />
        </>
      )}
    </>
  )
}
