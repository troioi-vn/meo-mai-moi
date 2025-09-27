import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createPet, getPetTypes, getPet, updatePet, uploadPetPhoto } from '@/api/pets'
import type { PetType, Pet } from '@/types/pet'
import { toast } from 'sonner'

interface FormErrors {
  name?: string
  breed?: string
  birthday?: string
  location?: string
  description?: string
  pet_type_id?: string
}

interface CreatePetFormData {
  name: string
  breed: string
  birthday: string
  location: string
  description: string
  pet_type_id: number | null
  photos: FileList | File[] | []
}

const VALIDATION_MESSAGES = {
  REQUIRED_NAME: 'Name is required',
  REQUIRED_BREED: 'Breed is required',
  REQUIRED_BIRTHDAY: 'Birthday is required',
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
    location: '',
    description: '',
    pet_type_id: null,
    photos: [],
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
        const catType = types.find(t => t.slug === 'cat')
        if (catType) {
          setFormData(prev => ({ ...prev, pet_type_id: catType.id }))
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
          const formatDate = (dateStr: string): string => {
            const date = new Date(dateStr)
            return date.toISOString().split('T')[0]
          }
          setFormData({
            name: pet.name,
            breed: pet.breed,
            birthday: formatDate(pet.birthday),
            location: pet.location,
            description: pet.description,
            pet_type_id: pet.pet_type.id,
            photos: [], // Photos can't be pre-loaded from file inputs
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
        target: { type?: string; files?: FileList; value?: unknown }
      }
      if (target.type === 'file' && target.files) {
        value = target.files
      } else {
        value = target.value
      }
    } else {
      value = valueOrEvent
    }
    
    setFormData((prev) => ({ ...prev, [field]: value as never }))
    // Clear field error when user starts typing (only for non-photo fields)
    if (field !== 'photos' && errors[field as keyof FormErrors]) {
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
    if (!formData.birthday.trim()) {
      newErrors.birthday = VALIDATION_MESSAGES.REQUIRED_BIRTHDAY
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
      let pet: Pet
      
      if (isEditMode && petId) {
        pet = await updatePet(petId, {
          name: formData.name,
          breed: formData.breed,
          birthday: formData.birthday,
          location: formData.location,
          description: formData.description,
          pet_type_id: formData.pet_type_id,
        })
      } else {
        pet = await createPet({
          name: formData.name,
          breed: formData.breed,
          birthday: formData.birthday,
          location: formData.location,
          description: formData.description,
          pet_type_id: formData.pet_type_id,
        })
      }

      // Upload photos if any
      const photos = formData.photos
      const photoArray = photos instanceof FileList ? Array.from(photos) : photos
      if (photoArray.length > 0) {
        for (const photo of photoArray) {
          if (photo instanceof File) {
            await uploadPetPhoto(pet.id, photo)
          }
        }
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

