import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/axios'
import { toast } from '@/lib/i18n-toast'
import type React from 'react'
import type { HelperProfileStatus, PlacementRequestType } from '@/types/helper-profile'
import type { City } from '@/types/pet'

/**
 * Scroll to the first field that has a validation error.
 * Uses requestAnimationFrame to wait for React to render the error messages,
 * then finds the first .text-destructive error paragraph and scrolls its
 * parent field container into view.
 */
const scrollToFirstError = () => {
  requestAnimationFrame(() => {
    const firstError = document.querySelector('.text-destructive')
    if (firstError) {
      const fieldContainer =
        firstError.closest('.space-y-2, .space-y-3') ?? firstError.parentElement
      ;(fieldContainer ?? firstError).scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  })
}

export const DEFAULT_REQUEST_TYPES: PlacementRequestType[] = [
  'foster_paid',
  'foster_free',
  'permanent',
  'pet_sitting',
]

export interface HelperProfileForm {
  country: string
  address: string
  city: string
  city_ids: number[]
  cities_selected?: City[]
  state: string
  phone_number: string
  contact_info: string
  experience: string
  has_pets: boolean
  has_children: boolean
  request_types: PlacementRequestType[]
  status?: HelperProfileStatus
  photos: FileList | File[]
  pet_type_ids: number[]
}

export const validateHelperProfileForm = (
  formData: HelperProfileForm,
  t: (key: string) => string
): Record<string, string> => {
  const newErrors: Record<string, string> = {}
  if (!formData.country) newErrors.country = t('validation:required')
  if (formData.city_ids.length === 0) newErrors.city = t('helper:form.cities_required_error')
  // address, state are now optional
  const trimmedPhoneNumber = formData.phone_number.trim()
  if (!trimmedPhoneNumber) {
    newErrors.phone_number = t('validation:phone.required')
  } else {
    // Composed value from split UI: +[country calling code][local digits]
    const phoneRegex = /^\+\d{1,6}\d+$/
    if (!phoneRegex.test(trimmedPhoneNumber)) {
      newErrors.phone_number = t('validation:phone.invalid')
    }
  }
  if (!formData.experience) newErrors.experience = t('validation:required')
  if (formData.request_types.length === 0) {
    newErrors.request_types = t('helper:form.request_types_required_error')
  }
  if (formData.pet_type_ids.length === 0) {
    newErrors.pet_type_ids = t('helper:form.pet_types_required_error')
  }
  return newErrors
}

export const buildHelperProfileFormData = (formData: HelperProfileForm): FormData => {
  const dataToSend = new FormData()
  const fieldsToSubmit = [
    'country',
    'address',
    'state',
    'phone_number',
    'contact_info',
    'experience',
    'has_pets',
    'has_children',
    'status',
  ]

  for (const key of fieldsToSubmit) {
    const value = formData[key as keyof HelperProfileForm] as unknown
    if (typeof value === 'boolean') {
      dataToSend.append(key, value ? '1' : '0')
    } else if (typeof value === 'string' || typeof value === 'number') {
      const stringValue = String(value)
      dataToSend.append(key, key === 'phone_number' ? stringValue.trim() : stringValue)
    }
  }

  // Append city_ids array
  for (const id of formData.city_ids) {
    dataToSend.append('city_ids[]', String(id))
  }

  // Append request_types array
  for (const type of formData.request_types) {
    dataToSend.append('request_types[]', type)
  }

  // Append photos if present
  const photos = formData.photos
  if (photos instanceof FileList) {
    for (const f of Array.from(photos)) {
      dataToSend.append('photos[]', f)
    }
  } else if (Array.isArray(photos)) {
    for (const f of photos) {
      dataToSend.append('photos[]', f)
    }
  }

  // Append pet type ids
  for (const id of formData.pet_type_ids) {
    dataToSend.append('pet_type_ids[]', String(id))
  }

  return dataToSend
}

interface ApiError {
  response?: { data?: { errors?: Record<string, string> } }
}

const useHelperProfileForm = (
  profileId?: number,
  initialData?: Partial<HelperProfileForm>,
  options?: { redirectTo?: string }
) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const [formData, setFormData] = useState<HelperProfileForm>({
    country: '',
    address: '',
    city: '',
    city_ids: [],
    cities_selected: [],
    state: '',
    phone_number: '',
    contact_info: '',
    experience: '',
    has_pets: false,
    has_children: false,
    request_types: initialData?.request_types ?? DEFAULT_REQUEST_TYPES,
    status: 'private',
    photos: [],
    pet_type_ids: [],
    ...initialData,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lastSyncedId, setLastSyncedId] = useState(profileId)

  // Sync form data when profileId/initialData changes (during render, not in effect)
  if (profileId && initialData && profileId !== lastSyncedId) {
    setLastSyncedId(profileId)
    setFormData({
      country: '',
      address: '',
      city: '',
      city_ids: [],
      cities_selected: [],
      state: '',
      phone_number: '',
      contact_info: '',
      experience: '',
      has_pets: false,
      has_children: false,
      request_types: initialData.request_types ?? DEFAULT_REQUEST_TYPES,
      status: 'private',
      photos: [],
      pet_type_ids: [],
      ...initialData,
    })
  }

  // Wrapper functions to handle FormData for API calls
  const createHelperProfileWithFormData = (data: FormData) => {
    return api.post('/helper-profiles', data)
  }

  const updateHelperProfileWithFormData = (id: number, data: FormData) => {
    return api.put(`/helper-profiles/${String(id)}`, data)
  }

  const createMutation = useMutation({
    mutationFn: createHelperProfileWithFormData,
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['/helper-profiles'] })
      toast.success(
        profileId ? t('settings:helperProfiles.updated') : t('settings:helperProfiles.created')
      )
      const fallback = `/helper/${String((data as { data?: { id?: string | number } }).data?.id ?? '')}`
      void navigate(options?.redirectTo?.startsWith('/') ? options.redirectTo : fallback)
    },
    onError: (error: ApiError) => {
      setErrors(error.response?.data?.errors ?? {})
      toast.error(
        profileId
          ? t('settings:helperProfiles.updateError')
          : t('settings:helperProfiles.createError')
      )
      scrollToFirstError()
    },
    onSettled: () => {
      setIsSubmitting(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: (vars: { id: number; data: FormData }) =>
      updateHelperProfileWithFormData(vars.id, vars.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['/helper-profiles'] })
      if (profileId) {
        void queryClient.invalidateQueries({ queryKey: ['helper-profile', profileId] })
      }
      toast.success(t('settings:helperProfiles.updated'))
      if (profileId) {
        void navigate(`/helper/${String(profileId)}`)
      }
    },
    onError: (error: ApiError) => {
      setErrors(error.response?.data?.errors ?? {})
      toast.error(t('settings:helperProfiles.updateError'))
      scrollToFirstError()
    },
    onSettled: () => {
      setIsSubmitting(false)
    },
  })

  const updateField = (field: keyof HelperProfileForm) => (valueOrEvent: unknown) => {
    let value: unknown
    if (valueOrEvent && typeof valueOrEvent === 'object' && 'target' in valueOrEvent) {
      const { target } = valueOrEvent as {
        target: { type?: string; checked?: boolean; files?: FileList; value?: unknown }
      }
      if (target.type === 'checkbox') {
        value = Boolean(target.checked)
      } else if (target.files) {
        value = target.files
      } else {
        value = target.value
      }
    } else {
      value = valueOrEvent
    }
    setFormData((prev) => ({ ...prev, [field]: value as never }))
  }

  const updateCities = (cities: City[]) => {
    setFormData((prev) => ({
      ...prev,
      cities_selected: cities,
      city_ids: cities.map((c) => c.id),
      city: cities.map((c) => c.name).join(', '),
    }))
    if (errors.city) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors.city
        return newErrors
      })
    }
  }

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    const newErrors = validateHelperProfileForm(formData, t)
    setErrors(newErrors)

    if (Object.keys(newErrors).length > 0) {
      toast.error(t('validation:fixErrors'))
      scrollToFirstError()
      return
    }
    setIsSubmitting(true)

    const dataToSend = buildHelperProfileFormData(formData)

    if (profileId) {
      updateMutation.mutate({ id: profileId, data: dataToSend })
    } else {
      createMutation.mutate(dataToSend)
    }
  }

  const handleCancel = () => {
    void navigate('/helper')
  }

  return {
    formData,
    errors,
    isSubmitting,
    updateField,
    updateCities,
    handleSubmit,
    handleCancel,
    setFormData,
  }
}

export default useHelperProfileForm
