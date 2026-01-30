import { describe, it, expect } from 'vitest'
import { validatePetForm, buildPetPayload, VALIDATION_MESSAGES } from './useCreatePetForm'
import type { CreatePetFormData } from './useCreatePetForm'

describe('useCreatePetForm helpers', () => {
  const baseFormData: CreatePetFormData = {
    name: 'Fluffy',
    sex: 'not_specified',
    birthday: '',
    birthday_year: '2020',
    birthday_month: '1',
    birthday_day: '1',
    birthday_precision: 'unknown',
    country: 'VN',
    state: '',
    city: 'Hanoi',
    city_id: 1,
    city_selected: null,
    address: '',
    description: 'A cute cat',
    pet_type_id: 1,
    categories: [],
  }

  describe('validatePetForm', () => {
    it('returns empty errors for valid data', () => {
      const errors = validatePetForm(baseFormData)
      expect(errors).toEqual({})
    })

    it('requires name', () => {
      const errors = validatePetForm({ ...baseFormData, name: '  ' })
      expect(errors.name).toBe(VALIDATION_MESSAGES.REQUIRED_NAME)
    })

    it('requires pet_type_id', () => {
      const errors = validatePetForm({ ...baseFormData, pet_type_id: null })
      expect(errors.pet_type_id).toBe(VALIDATION_MESSAGES.REQUIRED_PET_TYPE)
    })

    it('requires country', () => {
      const errors = validatePetForm({ ...baseFormData, country: '' })
      expect(errors.country).toBe(VALIDATION_MESSAGES.REQUIRED_COUNTRY)
    })

    describe('precision: day', () => {
      it('requires full date components if birthday string is empty', () => {
        const errors = validatePetForm({
          ...baseFormData,
          birthday_precision: 'day',
          birthday: '',
          birthday_year: '',
        })
        expect(errors.birthday).toBe(VALIDATION_MESSAGES.REQUIRED_BIRTHDAY_COMPONENTS)
      })

      it('validates year range', () => {
        const errors = validatePetForm({
          ...baseFormData,
          birthday_precision: 'day',
          birthday_year: '1899',
        })
        expect(errors.birthday_year).toBe(VALIDATION_MESSAGES.INVALID_YEAR)
      })
    })
  })

  describe('buildPetPayload', () => {
    it('maps base fields correctly', () => {
      const payload = buildPetPayload(baseFormData)
      expect(payload.name).toBe('Fluffy')
      expect(payload.country).toBe('VN')
      expect(payload.city_id).toBe(1)
    })

    it('handles birthday_precision: month', () => {
      const payload = buildPetPayload({
        ...baseFormData,
        birthday_precision: 'month',
        birthday_year: '2022',
        birthday_month: '5',
      })
      expect(payload.birthday_year).toBe(2022)
      expect(payload.birthday_month).toBe(5)
      expect(payload.birthday_day).toBeUndefined()
    })
  })
})
