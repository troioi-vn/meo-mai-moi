import React from 'react'
import { FormField } from '@/components/ui/FormField'
import { YearMonthDatePicker } from '@/components/ui/YearMonthDatePicker'
import { CountrySelect } from '@/components/ui/CountrySelect'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CitySelect } from '@/components/location/CitySelect'
import type { City } from '@/types/pet'
import type { PetSex } from '@/api/generated/model/petSex'
import { useTranslation } from 'react-i18next'

interface Data {
  name: string
  sex: PetSex
  birthday: string
  birthday_year?: string
  birthday_month?: string
  birthday_day?: string
  birthday_precision?: 'day' | 'month' | 'year' | 'unknown'
  country: string
  state?: string
  city?: string
  city_id?: number | null
  address?: string
  description: string
}

interface Props {
  formData: Data
  errors: Partial<Record<keyof Data, string>>
  updateField: (field: keyof Data) => (value: unknown) => void
  cityValue?: City | null
  onCityChange?: (city: City | null) => void
  /** Whether to show description and location fields (hidden in create mode) */
  showOptionalFields?: boolean
  /** Whether to skip rendering the Name field (when rendered by parent) */
  skipName?: boolean
}

export const PetFormFields: React.FC<Props> = ({
  formData,
  errors,
  updateField,
  cityValue,
  onCityChange,
  showOptionalFields = true,
  skipName = false,
}) => {
  const { t } = useTranslation('pets')

  return (
    <>
      {!skipName && (
        <FormField
          id="name"
          label={t('form.nameLabel')}
          value={formData.name}
          onChange={updateField('name')}
          error={errors.name}
          placeholder={t('form.namePlaceholder')}
        />
      )}

      {/* Sex Selection */}
      <div className="space-y-2">
        <Label htmlFor="sex">{t('form.gender')}</Label>
        <Select
          value={formData.sex}
          onValueChange={(value) => {
            updateField('sex')(value)
          }}
        >
          <SelectTrigger id="sex">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="not_specified">{t('form.genderOptions.not_specified')}</SelectItem>
            <SelectItem value="male">{t('form.genderOptions.male')}</SelectItem>
            <SelectItem value="female">{t('form.genderOptions.female')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Birthday Precision Selection */}
      <div className="space-y-2">
        <Label htmlFor="birthday_precision">{t('form.birthdayPrecision')}</Label>
        <Select
          value={formData.birthday_precision ?? 'unknown'}
          onValueChange={(value) => {
            updateField('birthday_precision')(value)
          }}
        >
          <SelectTrigger id="birthday_precision">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unknown">{t('form.birthdayPrecisionOptions.unknown')}</SelectItem>
            <SelectItem value="year">{t('form.birthdayPrecisionOptions.year')}</SelectItem>
            <SelectItem value="month">{t('form.birthdayPrecisionOptions.month')}</SelectItem>
            <SelectItem value="day">{t('form.birthdayPrecisionOptions.day')}</SelectItem>
          </SelectContent>
        </Select>
        {errors.birthday_precision && (
          <p className="text-xs text-destructive mt-1">{errors.birthday_precision}</p>
        )}
      </div>

      {formData.birthday_precision === 'day' && (
        <div className="space-y-2">
          <Label htmlFor="birthday" className={errors.birthday ? 'text-destructive' : ''}>
            {t('form.birthday')}
          </Label>
          <YearMonthDatePicker
            id="birthday"
            value={formData.birthday}
            onChange={updateField('birthday')}
            error={errors.birthday}
            placeholder={t('form.birthdayPlaceholder')}
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
            label={t('form.birthYear')}
            type="number"
            value={formData.birthday_year ?? ''}
            onChange={updateField('birthday_year')}
            error={errors.birthday_year}
            placeholder="YYYY"
          />
          <FormField
            id="birthday_month"
            label={t('form.birthMonth')}
            type="number"
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
          label={t('form.birthYear')}
          type="number"
          value={formData.birthday_year ?? ''}
          onChange={updateField('birthday_year')}
          error={errors.birthday_year}
          placeholder="YYYY"
        />
      )}

      {/* Country is always shown since it's required */}
      <div className="space-y-2">
        <Label htmlFor="country" className={errors.country ? 'text-destructive' : ''}>
          {t('form.country')}
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

      {/* Location */}
      <div className="grid grid-cols-1 gap-4">
        <CitySelect
          country={formData.country || null}
          value={cityValue ?? null}
          onChange={onCityChange ?? (() => undefined)}
          disabled={false}
          error={errors.city}
        />
      </div>

      {showOptionalFields && (
        <>
          <FormField
            id="address"
            label={t('form.address')}
            value={formData.address ?? ''}
            onChange={updateField('address')}
            error={errors.address}
            placeholder={t('form.addressPlaceholder')}
          />

          <FormField
            id="description"
            label={t('form.description')}
            type="textarea"
            value={formData.description}
            onChange={updateField('description')}
            error={errors.description}
            placeholder={t('form.descriptionPlaceholder')}
          />
        </>
      )}
    </>
  )
}
