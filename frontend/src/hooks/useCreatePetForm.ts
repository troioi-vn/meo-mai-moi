import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPet, getPetTypes, getPet, updatePet } from '@/api/pets'
import type { PetType, Category, PetSex, City } from '@/types/pet'
import { toast } from 'sonner'

interface FormErrors {
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

interface CreatePetFormData {
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

const VALIDATION_MESSAGES = {
  REQUIRED_NAME: 'Name is required',
  REQUIRED_BIRTHDAY_COMPONENTS: 'Complete date required for day precision',
  REQUIRED_YEAR: 'Year required',
  REQUIRED_MONTH: 'Month required',
  REQUIRED_PET_TYPE: 'Pet type is required',
  REQUIRED_COUNTRY: 'Country is required',
  REQUIRED_CITY: 'City is required',
  INVALID_YEAR: 'Year must be between 1900 and current year',
  INVALID_MONTH: 'Month must be between 1 and 12',
  INVALID_DAY: 'Day must be between 1 and 31',
} as const

const SUCCESS_MESSAGES = {
  PET_CREATED: 'Pet created successfully!',
} as const

const ERROR_MESSAGES = {
  CREATE_FAILED: 'Failed to create pet.',
  LOAD_PET_TYPES_FAILED: 'Failed to load pet types.',
} as const

const ROUTES = {
  MY_PETS: '/',
} as const

export const useCreatePetForm = (petId?: string) => {
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
    birthday_precision: 'unknown',
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
        const types = await getPetTypes()
        setPetTypes(types)
        // Default to cat if available
        const catType = types.find((t) => t.slug === 'cat')
        if (catType) {
          setFormData((prev) => ({ ...prev, pet_type_id: catType.id }))
        }
      } catch (err: unknown) {
        console.error('Failed to load pet types:', err)
        toast.error(ERROR_MESSAGES.LOAD_PET_TYPES_FAILED)
      } finally {
        setLoadingPetTypes(false)
      }
    }
    void loadPetTypes()
  }, [])

  // Load existing pet data in edit mode
  useEffect(() => {
    if (isEditMode && petId) {
      const loadPetData = async () => {
        try {
          setIsLoadingPet(true)
          const pet = await getPet(petId)
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
            birthday: pet.birthday ? formatDate(pet.birthday) : '',
            birthday_year: pet.birthday_year ? String(pet.birthday_year) : '',
            birthday_month: pet.birthday_month ? String(pet.birthday_month) : '',
            birthday_day: pet.birthday_day ? String(pet.birthday_day) : '',
            birthday_precision: pet.birthday_precision ?? (pet.birthday ? 'day' : 'unknown'),
            country: pet.country,
            state: pet.state ?? '',
            city: typeof pet.city === 'object' && pet.city ? pet.city.name : (pet.city ?? ''),
            city_id: pet.city_id ?? (typeof pet.city === 'object' && pet.city ? pet.city.id : null),
            city_selected: typeof pet.city === 'object' && pet.city ? pet.city : null,
            address: pet.address ?? '',
            description: pet.description,
            pet_type_id: pet.pet_type.id,
            categories: pet.categories ?? [],
          })
        } catch (err: unknown) {
          console.error('Failed to load pet data:', err)
          toast.error('Failed to load pet data')
        } finally {
          setIsLoadingPet(false)
        }
      }
      void loadPetData()
    }
  }, [isEditMode, petId])

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

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = VALIDATION_MESSAGES.REQUIRED_NAME
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
        newErrors.birthday = VALIDATION_MESSAGES.REQUIRED_BIRTHDAY_COMPONENTS
      } else if (!formData.birthday.trim()) {
        if (!validateYear(formData.birthday_year)) {
          newErrors.birthday_year = VALIDATION_MESSAGES.INVALID_YEAR
        }
        if (!validateMonth(formData.birthday_month)) {
          newErrors.birthday_month = VALIDATION_MESSAGES.INVALID_MONTH
        }
        if (!validateDay(formData.birthday_day)) {
          newErrors.birthday_day = VALIDATION_MESSAGES.INVALID_DAY
        }
      }
    } else if (formData.birthday_precision === 'month') {
      if (!formData.birthday_year) {
        newErrors.birthday_year = VALIDATION_MESSAGES.REQUIRED_YEAR
      } else if (!validateYear(formData.birthday_year)) {
        newErrors.birthday_year = VALIDATION_MESSAGES.INVALID_YEAR
      }

      if (!formData.birthday_month) {
        newErrors.birthday_month = VALIDATION_MESSAGES.REQUIRED_MONTH
      } else if (!validateMonth(formData.birthday_month)) {
        newErrors.birthday_month = VALIDATION_MESSAGES.INVALID_MONTH
      }
    } else if (formData.birthday_precision === 'year') {
      if (!formData.birthday_year) {
        newErrors.birthday_year = VALIDATION_MESSAGES.REQUIRED_YEAR
      } else if (!validateYear(formData.birthday_year)) {
        newErrors.birthday_year = VALIDATION_MESSAGES.INVALID_YEAR
      }
    }
    // Country is required, other location fields are optional
    if (!formData.country.trim()) {
      newErrors.country = VALIDATION_MESSAGES.REQUIRED_COUNTRY
    }
    if (!formData.city_id) {
      newErrors.city = VALIDATION_MESSAGES.REQUIRED_CITY
    }
    if (!formData.pet_type_id) {
      newErrors.pet_type_id = VALIDATION_MESSAGES.REQUIRED_PET_TYPE
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!validateForm()) {
      return
    }

    if (!formData.pet_type_id) {
      setError('Pet type is required')
      return
    }

    setIsSubmitting(true)
    try {
      // Build payload with precision rules
      const payload: import('@/api/pets').CreatePetPayload = {
        name: formData.name,
        sex: formData.sex,
        country: formData.country,
        state: formData.state || undefined,
        city_id: formData.city_id ?? undefined,
        city: formData.city || undefined,
        address: formData.address || undefined,
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

      if (isEditMode && petId) {
        await updatePet(petId, payload)
      } else {
        await createPet(payload)
      }

      const successMessage = isEditMode ? 'Pet updated successfully' : SUCCESS_MESSAGES.PET_CREATED
      toast.success(successMessage)

      if (isEditMode && petId) {
        // Use replace: true to prevent back button returning to edit page
        void navigate(`/pets/${petId}`, { replace: true })
      } else {
        void navigate(ROUTES.MY_PETS)
      }
    } catch (err: unknown) {
      const errorMessage = isEditMode ? 'Failed to update pet' : ERROR_MESSAGES.CREATE_FAILED
      setError(errorMessage)
      console.error(err)

      // Handle Axios 422 error
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as {
          response: { status: number; data: { errors?: Record<string, string[]> } }
        }
        if (axiosErr.response?.status === 422 && axiosErr.response.data?.errors) {
          const backendErrors = axiosErr.response.data.errors
          const newFormErrors: FormErrors = {}
          Object.keys(backendErrors).forEach((key) => {
            const field = key as keyof FormErrors
            if (backendErrors[key]?.[0]) {
              newFormErrors[field] = backendErrors[key][0]
            }
          })
          setErrors(newFormErrors)
          toast.error('Please check the form for errors.')
          return
        }
      }

      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    void navigate(ROUTES.MY_PETS)
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
