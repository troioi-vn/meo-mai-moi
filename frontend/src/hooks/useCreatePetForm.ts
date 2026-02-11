import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  postPets as createPet,
  getPetsId as getPet,
  putPetsId as updatePet,
} from '@/api/generated/pets/pets'
import { getPetTypes } from '@/api/generated/pet-types/pet-types'
import type { PetType, Category, City } from '@/types/pet'
import type { PetSex } from '@/api/generated/model/petSex'
import { toast } from '@/lib/i18n-toast'

export interface FormErrors {
  name?: string
  birthday?: string
  birthday_year?: string
  birthday_month?: string
  birthday_day?: string
  birthday_precision?: string
  country?: string
  state?: string
  city?: string
  address?: string
  description?: string
  pet_type_id?: string
}

export interface CreatePetFormData {
  name: string
  sex: PetSex
  birthday: string // exact date only when precision=day
  birthday_year: string
  birthday_month: string
  birthday_day: string
  birthday_precision: 'day' | 'month' | 'year' | 'unknown'
  country: string
  state: string
  city: string
  city_id: number | null
  city_selected: City | null
  address: string
  description: string
  pet_type_id: number | null
  categories: Category[]
}

export const ROUTES = {
  MY_PETS: '/',
} as const

export const validatePetForm = (
  formData: CreatePetFormData,
  t: (key: string) => string
): FormErrors => {
  const newErrors: FormErrors = {}

  if (!formData.name.trim()) {
    newErrors.name = t('pets:validation.nameRequired')
  }

  const currentYear = new Date().getFullYear()
  const validateYear = (year: string) => {
    const y = parseInt(year)
    return !isNaN(y) && y >= 1900 && y <= currentYear
  }
  const validateMonth = (month: string) => {
    const m = parseInt(month)
    return !isNaN(m) && m >= 1 && m <= 12
  }
  const validateDay = (day: string) => {
    const d = parseInt(day)
    return !isNaN(d) && d >= 1 && d <= 31
  }

  // Precision-specific validation
  if (formData.birthday_precision === 'day') {
    if (
      !formData.birthday.trim() &&
      (!formData.birthday_year || !formData.birthday_month || !formData.birthday_day)
    ) {
      newErrors.birthday = t('pets:validation.birthdayComponentsRequired')
    } else if (!formData.birthday.trim()) {
      if (!validateYear(formData.birthday_year)) {
        newErrors.birthday_year = t('pets:validation.invalidYear')
      }
      if (!validateMonth(formData.birthday_month)) {
        newErrors.birthday_month = t('pets:validation.invalidMonth')
      }
      if (!validateDay(formData.birthday_day)) {
        newErrors.birthday_day = t('pets:validation.invalidDay')
      }
    }
  } else if (formData.birthday_precision === 'month') {
    if (!formData.birthday_year) {
      newErrors.birthday_year = t('pets:validation.yearRequired')
    } else if (!validateYear(formData.birthday_year)) {
      newErrors.birthday_year = t('pets:validation.invalidYear')
    }

    if (!formData.birthday_month) {
      newErrors.birthday_month = t('pets:validation.monthRequired')
    } else if (!validateMonth(formData.birthday_month)) {
      newErrors.birthday_month = t('pets:validation.invalidMonth')
    }
  } else if (formData.birthday_precision === 'year') {
    if (!formData.birthday_year) {
      newErrors.birthday_year = t('pets:validation.yearRequired')
    } else if (!validateYear(formData.birthday_year)) {
      newErrors.birthday_year = t('pets:validation.invalidYear')
    }
  }
  // Country is required, other location fields are optional
  if (!formData.country.trim()) {
    newErrors.country = t('pets:validation.countryRequired')
  }
  if (!formData.pet_type_id) {
    newErrors.pet_type_id = t('pets:validation.petTypeRequired')
  }

  return newErrors
}

export interface CreatePetPayload {
  name: string
  sex: import('@/api/generated/model').PetSex
  country: string
  state?: string | null
  city_id?: number | null
  address?: string | null
  description: string
  pet_type_id: number | null
  birthday_precision: string
  category_ids?: number[]
  birthday?: string
  birthday_year?: number | null
  birthday_month?: number | null
  birthday_day?: number | null
}

export const buildPetPayload = (formData: CreatePetFormData): CreatePetPayload => {
  const payload: CreatePetPayload = {
    name: formData.name,
    sex: formData.sex,
    country: formData.country,
    state: formData.state || null,
    city_id: formData.city_id ?? null,
    address: formData.address || null,
    description: formData.description,
    pet_type_id: formData.pet_type_id,
    birthday_precision: formData.birthday_precision,
    category_ids: formData.categories.map((c) => c.id),
  }

  if (formData.birthday_precision === 'day') {
    if (formData.birthday) {
      payload.birthday = formData.birthday
    } else if (formData.birthday_year && formData.birthday_month && formData.birthday_day) {
      payload.birthday_year = Number(formData.birthday_year)
      payload.birthday_month = Number(formData.birthday_month)
      payload.birthday_day = Number(formData.birthday_day)
    }
  } else if (formData.birthday_precision === 'month') {
    payload.birthday_year = formData.birthday_year ? Number(formData.birthday_year) : null
    payload.birthday_month = formData.birthday_month ? Number(formData.birthday_month) : null
  } else if (formData.birthday_precision === 'year') {
    payload.birthday_year = formData.birthday_year ? Number(formData.birthday_year) : null
  }

  return payload
}

export const useCreatePetForm = (
  petId?: string,
  onAfterCreate?: (petId: number) => Promise<void>,
  onSuccess?: () => void
) => {
  const { t } = useTranslation(['pets', 'common'])
  const navigate = useNavigate()
  const isEditMode = Boolean(petId)
  const [isLoadingPet, setIsLoadingPet] = useState(isEditMode)

  const [formData, setFormData] = useState<CreatePetFormData>({
    name: '',
    sex: 'not_specified',
    birthday: '',
    birthday_year: '',
    birthday_month: '',
    birthday_day: '',
    birthday_precision: 'day',
    country: 'VN', // Default to Vietnam
    state: '',
    city: '',
    city_id: null,
    city_selected: null,
    address: '',
    description: '',
    pet_type_id: null,
    categories: [],
  })
  const [petTypes, setPetTypes] = useState<PetType[]>([])
  const [loadingPetTypes, setLoadingPetTypes] = useState(true)
  const [errors, setErrors] = useState<FormErrors>({})
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load pet types on component mount
  useEffect(() => {
    const loadPetTypes = async () => {
      try {
        const response = await getPetTypes()
        // Map API response to PetType with required properties
        const types: PetType[] = response.map((item) => ({
          id: item.id ?? 0,
          name: item.name ?? '',
          slug: item.slug ?? '',
          description: item.description,
          is_active: true,
          is_system: false,
          display_order: 0,
          placement_requests_allowed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }))
        setPetTypes(types)
        // Default to cat if available
        const catType = types.find((t) => t.slug === 'cat')
        if (catType) {
          setFormData((prev) => ({ ...prev, pet_type_id: catType.id }))
        }
      } catch (err: unknown) {
        console.error('Failed to load pet types:', err)
        toast.error(t('pets:messages.loadPetTypesError'))
      } finally {
        setLoadingPetTypes(false)
      }
    }
    void loadPetTypes()
  }, [t])

  // Load existing pet data in edit mode
  useEffect(() => {
    if (isEditMode && petId) {
      const loadPetData = async () => {
        try {
          setIsLoadingPet(true)
          const pet = await getPet(parseInt(petId, 10))
          // Convert ISO date to YYYY-MM-DD format for HTML date input
          const formatDate = (dateStr: string | undefined | null): string => {
            if (!dateStr) return ''
            const iso: string = new Date(dateStr).toISOString()
            // toISOString always produces 'YYYY-MM-DDTHH:mm:ss.sssZ'
            const [ymd] = iso.split('T')
            return ymd ?? ''
          }
          setFormData({
            name: pet.name,
            sex: pet.sex ?? 'not_specified',
            // eslint-disable-next-line @typescript-eslint/no-deprecated
            birthday: pet.birthday ? formatDate(pet.birthday) : '',
            birthday_year: pet.birthday_year ? String(pet.birthday_year) : '',
            birthday_month: pet.birthday_month ? String(pet.birthday_month) : '',
            birthday_day: pet.birthday_day ? String(pet.birthday_day) : '',

            birthday_precision: pet.birthday_precision ?? 'unknown',
            country: pet.country,
            state: pet.state ?? '',
            city:
              typeof pet.city === 'object' && pet.city
                ? pet.city.name
                : ((pet.city as string | undefined | null) ?? ''),
            city_id: typeof pet.city === 'object' && pet.city ? pet.city.id : null,
            city_selected: typeof pet.city === 'object' ? pet.city : null,
            address: pet.address ?? '',
            description: pet.description,
            pet_type_id: pet.pet_type?.id ?? null,
            categories: (pet.categories ?? []).map((cat) => ({
              ...cat,
              usage_count: cat.usage_count ?? 0,
              created_at: cat.created_at ?? new Date().toISOString(),
              updated_at: cat.updated_at ?? new Date().toISOString(),
            })) as import('@/types/pet').Category[],
          })
        } catch (err: unknown) {
          console.error('Failed to load pet data:', err)
          toast.error(t('pets:messages.loadError'))
        } finally {
          setIsLoadingPet(false)
        }
      }
      void loadPetData()
    }
  }, [isEditMode, petId, t])

  const updateField = (field: keyof CreatePetFormData) => (valueOrEvent: unknown) => {
    let value: unknown
    if (valueOrEvent && typeof valueOrEvent === 'object' && 'target' in valueOrEvent) {
      const { target } = valueOrEvent as {
        target: { value?: unknown }
      }
      value = target.value
    } else {
      value = valueOrEvent
    }

    setFormData((prev) => ({ ...prev, [field]: value as never }))
    // Clear field error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field as keyof FormErrors]: undefined }))
    }
  }

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault()
    setError(null)

    const newErrors = validatePetForm(formData, t)
    setErrors(newErrors)

    if (Object.keys(newErrors).length > 0) {
      return
    }

    if (!formData.pet_type_id) {
      setError(t('pets:validation.typeRequired'))
      return
    }

    setIsSubmitting(true)
    try {
      const payload = buildPetPayload(formData)

      if (isEditMode && petId) {
        await updatePet(
          parseInt(petId, 10),
          payload as unknown as import('@/api/generated/model').Pet
        )
      } else {
        const newPet = await createPet(payload as unknown as import('@/api/generated/model').Pet)
        if (onAfterCreate && newPet.id) {
          await onAfterCreate(newPet.id)
        }
      }

      const successKey = isEditMode ? 'pets:messages.updateSuccess' : 'pets:messages.createSuccess'
      toast.success(t(successKey, { name: formData.name }))

      if (isEditMode && petId) {
        if (onSuccess) {
          onSuccess()
        } else {
          void navigate(`/pets/${petId}`, { replace: true })
        }
      } else {
        void navigate(ROUTES.MY_PETS)
      }
    } catch (err: unknown) {
      const errorKey = isEditMode ? 'pets:messages.updateError' : 'pets:messages.createError'
      const errorMessage = t(errorKey)
      setError(errorMessage)
      console.error(err)

      // Handle Axios 422 error
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as {
          response: { status: number; data: { errors?: Record<string, string[]> } }
        }
        if (axiosErr.response.status === 422 && axiosErr.response.data.errors) {
          const backendErrors = axiosErr.response.data.errors
          const newFormErrors: FormErrors = {}
          Object.keys(backendErrors).forEach((key) => {
            const field = key as keyof FormErrors
            if (backendErrors[key]?.[0]) {
              newFormErrors[field] = backendErrors[key][0]
            }
          })
          setErrors(newFormErrors)
          toast.error(t('common:errors.validation'))
          return
        }
      }

      toast.error(errorKey)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    if (onSuccess) {
      onSuccess()
    } else {
      void navigate(ROUTES.MY_PETS)
    }
  }

  const updateCategories = (categories: Category[]) => {
    setFormData((prev) => ({ ...prev, categories }))
  }

  const updateCity = (city: City | null) => {
    setFormData((prev) => ({
      ...prev,
      city_selected: city,
      city_id: city?.id ?? null,
      city: city?.name ?? '',
    }))
    if (errors.city) {
      setErrors((prev) => ({ ...prev, city: undefined }))
    }
  }

  return {
    formData,
    petTypes,
    loadingPetTypes,
    errors,
    error,
    isSubmitting,
    isLoadingPet,
    updateField,
    updateCategories,
    updateCity,
    handleSubmit,
    handleCancel,
  }
}
