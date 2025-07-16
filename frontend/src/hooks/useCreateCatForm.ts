import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createCat } from '@/api/cats'
import { toast } from 'sonner'

interface FormErrors {
  name?: string
  breed?: string
  birthday?: string
  location?: string
  description?: string
}

interface CreateCatFormData {
  name: string
  breed: string
  birthday: string
  location: string
  description: string
}

const VALIDATION_MESSAGES = {
  REQUIRED_NAME: 'Name is required',
  REQUIRED_BREED: 'Breed is required',
  REQUIRED_BIRTHDAY: 'Birthday is required',
  REQUIRED_LOCATION: 'Location is required',
  REQUIRED_DESCRIPTION: 'Description is required',
} as const

const SUCCESS_MESSAGES = {
  CAT_CREATED: 'Cat created successfully!',
} as const

const ERROR_MESSAGES = {
  CREATE_FAILED: 'Failed to create cat.',
} as const

const ROUTES = {
  MY_CATS: '/account/cats',
} as const

export const useCreateCatForm = () => {
  const [formData, setFormData] = useState<CreateCatFormData>({
    name: '',
    breed: '',
    birthday: '',
    location: '',
    description: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  const updateField = (field: keyof CreateCatFormData) => (value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
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
    if (!formData.birthday.trim()) {
      newErrors.birthday = VALIDATION_MESSAGES.REQUIRED_BIRTHDAY
    }
    if (!formData.location.trim()) {
      newErrors.location = VALIDATION_MESSAGES.REQUIRED_LOCATION
    }
    if (!formData.description.trim()) {
      newErrors.description = VALIDATION_MESSAGES.REQUIRED_DESCRIPTION
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

    setIsSubmitting(true)
    try {
      await createCat(formData)
      toast.success(SUCCESS_MESSAGES.CAT_CREATED)
      navigate(ROUTES.MY_CATS)
    } catch (err: unknown) {
      setError(ERROR_MESSAGES.CREATE_FAILED)
      console.error(err)
      toast.error(ERROR_MESSAGES.CREATE_FAILED)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    navigate(ROUTES.MY_CATS)
  }

  return {
    formData,
    errors,
    error,
    isSubmitting,
    updateField,
    handleSubmit,
    handleCancel,
  }
}
