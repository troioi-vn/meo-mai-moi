import { describe, it, expect } from 'vitest'
import { validatePetForm, buildPetPayload } from './useCreatePetForm'
import type { CreatePetFormData } from './useCreatePetForm'

// Mock translation function that returns the key
const mockT = (key: string) => key

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
      const errors = validatePetForm(baseFormData, mockT)
      expect(errors).toEqual({})
    })

    it('requires name', () => {
      const errors = validatePetForm({ ...baseFormData, name: '  ' }, mockT)
      expect(errors.name).toBe('pets:validation.nameRequired')
    })

    it('requires pet_type_id', () => {
      const errors = validatePetForm({ ...baseFormData, pet_type_id: null }, mockT)
      expect(errors.pet_type_id).toBe('pets:validation.petTypeRequired')
    })

    it('requires country', () => {
      const errors = validatePetForm({ ...baseFormData, country: '' }, mockT)
      expect(errors.country).toBe('pets:validation.countryRequired')
    })

    describe('precision: day', () => {
      it('requires full date components if birthday string is empty', () => {
        const errors = validatePetForm(
          {
            ...baseFormData,
            birthday_precision: 'day',
            birthday: '',
            birthday_year: '',
          },
          mockT
        )
        expect(errors.birthday).toBe('pets:validation.birthdayComponentsRequired')
      })

      it('validates year range', () => {
        const errors = validatePetForm(
          {
            ...baseFormData,
            birthday_precision: 'day',
            birthday_year: '1899',
          },
          mockT
        )
        expect(errors.birthday_year).toBe('pets:validation.invalidYear')
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
