import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPet, getPetTypes, getPet, updatePet } from '@/api/pets'
import type { PetType } from '@/types/pet'
import { toast } from 'sonner'

interface FormErrors {
  name?: string
  breed?: string
  birthday?: string
  birthday_year?: string
  birthday_month?: string
  birthday_day?: string
  birthday_precision?: string
  location?: string
  description?: string
  pet_type_id?: string
}

interface CreatePetFormData {
  name: string
  breed: string
  birthday: string // exact date only when precision=day
  birthday_year: string
  birthday_month: string
  birthday_day: string
  birthday_precision: 'day' | 'month' | 'year' | 'unknown'
  location: string
  description: string
  pet_type_id: number | null
}

const VALIDATION_MESSAGES = {
  REQUIRED_NAME: 'Name is required',
  REQUIRED_BREED: 'Breed is required',
  REQUIRED_BIRTHDAY_COMPONENTS: 'Complete date required for day precision',
  REQUIRED_YEAR: 'Year required',
  REQUIRED_MONTH: 'Month required',
  REQUIRED_LOCATION: 'Location is required',
  REQUIRED_DESCRIPTION: 'Description is required',
  REQUIRED_PET_TYPE: 'Pet type is required',
} as const

const SUCCESS_MESSAGES = {
  PET_CREATED: 'Pet created successfully!',
} as const

const ERROR_MESSAGES = {
  CREATE_FAILED: 'Failed to create pet.',
  LOAD_PET_TYPES_FAILED: 'Failed to load pet types.',
} as const

const ROUTES = {
  MY_PETS: '/account/pets',
} as const

export const useCreatePetForm = (petId?: string) => {
  const navigate = useNavigate()
  const isEditMode = Boolean(petId)
  const [isLoadingPet, setIsLoadingPet] = useState(isEditMode)

  const [formData, setFormData] = useState<CreatePetFormData>({
    name: '',
    breed: '',
    birthday: '',
    birthday_year: '',
    birthday_month: '',
    birthday_day: '',
    birthday_precision: 'unknown',
    location: '',
    description: '',
    pet_type_id: null,
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
      } catch (err) {
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
            breed: pet.breed,
            birthday: pet.birthday ? formatDate(pet.birthday) : '',
            birthday_year: pet.birthday_year ? String(pet.birthday_year) : '',
            birthday_month: pet.birthday_month ? String(pet.birthday_month) : '',
            birthday_day: pet.birthday_day ? String(pet.birthday_day) : '',
            birthday_precision: pet.birthday_precision ?? (pet.birthday ? 'day' : 'unknown'),
            location: pet.location,
            description: pet.description,
            pet_type_id: pet.pet_type.id,
          })
        } catch (err) {
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
    if (!formData.breed.trim()) {
      newErrors.breed = VALIDATION_MESSAGES.REQUIRED_BREED
    }
    // Precision-specific validation
    if (formData.birthday_precision === 'day') {
      if (
        !formData.birthday.trim() &&
        (!formData.birthday_year || !formData.birthday_month || !formData.birthday_day)
      ) {
        newErrors.birthday = VALIDATION_MESSAGES.REQUIRED_BIRTHDAY_COMPONENTS
      }
    } else if (formData.birthday_precision === 'month') {
      if (!formData.birthday_year) newErrors.birthday_year = VALIDATION_MESSAGES.REQUIRED_YEAR
      if (!formData.birthday_month) newErrors.birthday_month = VALIDATION_MESSAGES.REQUIRED_MONTH
    } else if (formData.birthday_precision === 'year') {
      if (!formData.birthday_year) newErrors.birthday_year = VALIDATION_MESSAGES.REQUIRED_YEAR
    }
    if (!formData.location.trim()) {
      newErrors.location = VALIDATION_MESSAGES.REQUIRED_LOCATION
    }
    if (!formData.description.trim()) {
      newErrors.description = VALIDATION_MESSAGES.REQUIRED_DESCRIPTION
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
        breed: formData.breed,
        location: formData.location,
        description: formData.description,
        pet_type_id: formData.pet_type_id,
        birthday_precision: formData.birthday_precision,
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
        void navigate(`/pets/${petId}`)
      } else {
        void navigate(ROUTES.MY_PETS)
      }
    } catch (err: unknown) {
      const errorMessage = isEditMode ? 'Failed to update pet' : ERROR_MESSAGES.CREATE_FAILED
      setError(errorMessage)
      console.error(err)
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    void navigate(ROUTES.MY_PETS)
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
    handleSubmit,
    handleCancel,
  }
}
