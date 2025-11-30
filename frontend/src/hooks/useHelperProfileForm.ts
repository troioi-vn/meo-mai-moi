import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createHelperProfile, updateHelperProfile } from '@/api/helper-profiles'
import { toast } from 'sonner'
import type React from 'react'

interface HelperProfileForm {
  country: string
  address: string
  city: string
  state: string
  phone_number: string
  experience: string
  has_pets: boolean
  has_children: boolean
  can_foster: boolean
  can_adopt: boolean
  is_public: boolean
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
    state: '',
    phone_number: '',
    experience: '',
    has_pets: false,
    has_children: false,
    can_foster: false,
    can_adopt: false,
    is_public: true,
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
        state: '',
        phone_number: '',
        experience: '',
        has_pets: false,
        has_children: false,
        can_foster: false,
        can_adopt: false,
        is_public: true,
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

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.country) newErrors.country = 'Country is required'
    if (!formData.address) newErrors.address = 'Address is required'
    if (!formData.city) newErrors.city = 'City is required'
    if (!formData.state) newErrors.state = 'State is required'
    if (!formData.phone_number) newErrors.phone_number = 'Phone number is required'
    if (!formData.experience) newErrors.experience = 'Experience is required'
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
      'city',
      'state',
      'phone_number',
      'experience',
      'has_pets',
      'has_children',
      'can_foster',
      'can_adopt',
      'is_public',
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
    handleSubmit,
    handleCancel,
    setFormData,
  }
}

export default useHelperProfileForm
