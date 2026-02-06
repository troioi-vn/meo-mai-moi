import { describe, it, expect } from 'vitest'
import { validateHelperProfileForm, buildHelperProfileFormData } from './useHelperProfileForm'
import type { HelperProfileForm } from './useHelperProfileForm'

describe('useHelperProfileForm helpers', () => {
  const baseFormData: HelperProfileForm = {
    country: 'VN',
    address: '123 Street',
    city: 'Hanoi',
    city_ids: [1],
    cities_selected: [],
    state: 'Hanoi',
    phone_number: '123456789',
    contact_info: 'Email me',
    experience: '5 years',
    has_pets: true,
    has_children: false,
    request_types: ['foster_free'],
    photos: [],
    pet_type_ids: [1],
  }

  describe('validateHelperProfileForm', () => {
    it('returns empty errors for valid data', () => {
      const errors = validateHelperProfileForm(baseFormData)
      expect(errors).toEqual({})
    })

    it('requires country', () => {
      const errors = validateHelperProfileForm({ ...baseFormData, country: '' })
      expect(errors.country).toBe('Country is required')
    })

    it('requires at least one city', () => {
      const errors = validateHelperProfileForm({ ...baseFormData, city_ids: [] })
      expect(errors.city).toBe('At least one city is required')
    })

    it('requires phone number', () => {
      const errors = validateHelperProfileForm({ ...baseFormData, phone_number: '' })
      expect(errors.phone_number).toBe('Phone number is required')
    })
  })

  describe('buildHelperProfileFormData', () => {
    it('appends basic fields', () => {
      const formData = buildHelperProfileFormData(baseFormData)
      expect(formData.get('country')).toBe('VN')
      expect(formData.get('phone_number')).toBe('123456789')
    })

    it('converts booleans to 1/0 strings', () => {
      const formData = buildHelperProfileFormData(baseFormData)
      expect(formData.get('has_pets')).toBe('1')
      expect(formData.get('has_children')).toBe('0')
    })

    it('appends multiple city_ids and request_types', () => {
      const formData = buildHelperProfileFormData({
        ...baseFormData,
        city_ids: [1, 2],
        request_types: ['foster_free', 'permanent'],
      })
      expect(formData.getAll('city_ids[]')).toEqual(['1', '2'])
      expect(formData.getAll('request_types[]')).toEqual(['foster_free', 'permanent'])
    })
  })
})
