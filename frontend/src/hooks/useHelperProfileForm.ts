import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createHelperProfile, updateHelperProfile } from '@/api/helper-profiles'
import { toast } from 'sonner'
import type React from 'react'
import type { PlacementRequestType } from '@/types/helper-profile'
import type { City } from '@/types/pet'

interface HelperProfileForm {
  country: string
  address: string
  city: string
  city_id: number | null
  city_selected?: City | null
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

interface ApiError {
  response?: { data?: { errors?: Record<string, string> } }
}

const useHelperProfileForm = (profileId?: number, initialData?: Partial<HelperProfileForm>) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<HelperProfileForm>({
    country: '',
    address: '',
    city: '',
    city_id: null,
    city_selected: null,
    state: '',
    phone_number: '',
    contact_info: '',
    experience: '',
    has_pets: false,
    has_children: false,
    request_types: [],
    photos: [],
    pet_type_ids: [],
    ...initialData,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (profileId && initialData) {
      setFormData({
        country: '',
        address: '',
        city: '',
        city_id: null,
        city_selected: null,
        state: '',
        phone_number: '',
        contact_info: '',
        experience: '',
        has_pets: false,
        has_children: false,
        request_types: [],
        photos: [],
        pet_type_ids: [],
        ...initialData,
      })
    }
  }, [initialData, profileId])

  const createMutation = useMutation({
    mutationFn: createHelperProfile,
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['helper-profiles'] })
      toast.success(
        profileId ? 'Helper profile updated successfully!' : 'Helper profile created successfully!'
      )
      void navigate(
        `/helper/${String((data as { data?: { id?: string | number } }).data?.id ?? '')}`
      )
    },
    onError: (error: ApiError) => {
      setErrors(error.response?.data?.errors ?? {})
      toast.error(
        profileId
          ? 'Failed to update helper profile. Please try again.'
          : 'Failed to create helper profile. Please try again.'
      )
    },
    onSettled: () => {
      setIsSubmitting(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: updateHelperProfile,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['helper-profiles'] })
      if (profileId) {
        void queryClient.invalidateQueries({ queryKey: ['helper-profile', profileId] })
      }
      toast.success('Helper profile updated successfully!')
      if (profileId) {
        void navigate(`/helper/${String(profileId)}`)
      }
    },
    onError: (error: ApiError) => {
      setErrors(error.response?.data?.errors ?? {})
      toast.error('Failed to update helper profile. Please try again.')
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

  const updateCity = (city: City | null) => {
    setFormData((prev) => ({
      ...prev,
      city_selected: city,
      city_id: city?.id ?? null,
      city: city?.name ?? '',
    }))
    if (errors.city) {
      setErrors((prev) => {
        const { city: _cityError, ...rest } = prev
        return rest
      })
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.country) newErrors.country = 'Country is required'
    if (!formData.city_id) newErrors.city = 'City is required'
    // address, state are now optional
    if (!formData.phone_number) newErrors.phone_number = 'Phone number is required'
    if (!formData.experience) newErrors.experience = 'Experience is required'
    if (!formData.request_types || formData.request_types.length === 0) {
      newErrors.request_types = 'At least one request type is required'
    }
    if (!formData.pet_type_ids || formData.pet_type_ids.length === 0) {
      newErrors.pet_type_ids = 'Select at least one pet type'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!validateForm()) return
    setIsSubmitting(true)

    const dataToSend = new FormData()
    const fieldsToSubmit = [
      'country',
      'address',
      'city_id',
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
    updateCity,
    handleSubmit,
    handleCancel,
    setFormData,
  }
}

export default useHelperProfileForm
