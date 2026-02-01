/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  postHelperProfiles as createHelperProfile,
  putHelperProfilesId as updateHelperProfile,
} from '@/api/generated/helper-profiles/helper-profiles'
import { toast } from '@/lib/i18n-toast'
import type React from 'react'
import type { PlacementRequestType } from '@/types/helper-profile'
import type { City } from '@/types/pet'

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
  status?: string
  photos: FileList | File[]
  pet_type_ids: number[]
}

export const validateHelperProfileForm = (formData: HelperProfileForm): Record<string, string> => {
  const newErrors: Record<string, string> = {}
  if (!formData.country) newErrors.country = 'Country is required'
  if (formData.city_ids.length === 0) newErrors.city = 'At least one city is required'
  // address, state are now optional
  if (!formData.phone_number) newErrors.phone_number = 'Phone number is required'
  if (!formData.experience) newErrors.experience = 'Experience is required'
  if (formData.request_types.length === 0) {
    newErrors.request_types = 'At least one request type is required'
  }
  if (formData.pet_type_ids.length === 0) {
    newErrors.pet_type_ids = 'Select at least one pet type'
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
      dataToSend.append(key, String(value))
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

const useHelperProfileForm = (profileId?: number, initialData?: Partial<HelperProfileForm>) => {
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
    photos: [],
    pet_type_ids: [],
    ...initialData,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lastSyncedId, setLastSyncedId] = useState<number | undefined>(profileId)

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
      photos: [],
      pet_type_ids: [],
      ...initialData,
    })
  }

  // Wrapper functions to handle FormData for API calls
  const createHelperProfileWithFormData = (data: FormData) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return createHelperProfile(data as any)
  }

  const updateHelperProfileWithFormData = (id: number, data: FormData) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return updateHelperProfile(id, data as any)
  }

  const createMutation = useMutation({
    mutationFn: createHelperProfileWithFormData,
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['/helper-profiles'] })
      toast.success(
        profileId ? t('settings:helperProfiles.updated') : t('settings:helperProfiles.created')
      )
      void navigate(
        `/helper/${String((data as { data?: { id?: string | number } }).data?.id ?? '')}`
      )
    },
    onError: (error: ApiError) => {
      setErrors(error.response?.data?.errors ?? {})
      toast.error(
        profileId
          ? t('settings:helperProfiles.updateError')
          : t('settings:helperProfiles.createError')
      )
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
    const newErrors = validateHelperProfileForm(formData)
    setErrors(newErrors)

    if (Object.keys(newErrors).length > 0) return
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
