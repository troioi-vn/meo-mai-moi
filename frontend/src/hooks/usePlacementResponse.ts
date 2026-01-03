import { useEffect, useState, useMemo } from 'react'
import { api } from '@/api/axios'
import type { HelperProfile, PlacementRequestType } from '@/types/helper-profile'
import { toast } from 'sonner'

export type RelationshipType = 'fostering' | 'permanent_foster' | ''
export type FosteringType = 'free' | 'paid'

interface Params {
  isOpen: boolean
  petName: string
  petId: number
  placementRequestId: number
  requestType: string
  petCity?: string
  petCountry?: string
  onSuccess?: () => void
  onClose: () => void
}

/**
 * Derive relationship type and fostering type from placement request type
 */
function deriveFromRequestType(requestType: string): {
  relationshipType: RelationshipType
  fosteringType: FosteringType
} {
  switch (requestType) {
    case 'foster_paid':
      return { relationshipType: 'fostering', fosteringType: 'paid' }
    case 'foster_free':
      return { relationshipType: 'fostering', fosteringType: 'free' }
    case 'permanent':
      return { relationshipType: 'permanent_foster', fosteringType: 'free' }
    default:
      return { relationshipType: '', fosteringType: 'free' }
  }
}

export function usePlacementResponse({
  isOpen,
  petName,
  petId,
  placementRequestId,
  requestType,
  petCity,
  petCountry,
  onSuccess,
  onClose,
}: Params) {
  const actualPetName = petName || 'Pet'
  const actualPetId = petId

  const [helperProfiles, setHelperProfiles] = useState<HelperProfile[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState<string>('')
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [price, setPrice] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

  // Derive relationship type and fostering type from request type
  const { relationshipType: requestedRelationshipType, fosteringType: derivedFosteringType } =
    useMemo(() => deriveFromRequestType(requestType), [requestType])

  const [fosteringType, setFosteringType] = useState<FosteringType>(derivedFosteringType)

  // Update fostering type when request type changes
  useEffect(() => {
    setFosteringType(derivedFosteringType)
  }, [derivedFosteringType])

  // Load helper profiles when opened
  useEffect(() => {
    if (!isOpen) {
      setLoading(false)
      return
    }
    ;(async () => {
      try {
        setLoading(true)
        const response = await api.get<{ data: HelperProfile[] }>('helper-profiles', {
          params: { _t: Date.now() },
        })
        const profiles = response.data.data
        // Filter to only include active profiles (status === 'active' or undefined)
        const activeProfiles = profiles.filter((p) => p.status === 'active' || !p.status)
        setHelperProfiles(activeProfiles)

        // Auto-select if only one active profile exists
        if (activeProfiles.length === 1 && activeProfiles[0]) {
          setSelectedProfile(String(activeProfiles[0].id))
        }
      } catch (error) {
        console.error('Failed to fetch helper profiles', error)
        toast.error('Failed to fetch helper profiles.')
      } finally {
        setLoading(false)
      }
    })().catch(() => {
      /* no-op ensure awaited */
    })
  }, [isOpen])

  // Get selected helper profile object
  const selectedHelperProfile = useMemo(() => {
    if (!selectedProfile) return undefined
    return helperProfiles.find((hp) => String(hp.id) === selectedProfile)
  }, [selectedProfile, helperProfiles])

  // Warning: request type mismatch
  const requestTypeWarning = useMemo(() => {
    if (!selectedHelperProfile) return undefined
    const allowedTypes = selectedHelperProfile.request_types ?? []
    if (allowedTypes.length === 0) return undefined
    if (!allowedTypes.includes(requestType as PlacementRequestType)) {
      const formattedType = requestType.replace(/_/g, ' ')
      return `This helper profile is not allowed to handle ${formattedType} requests. Please select another profile or add this request type to the profile settings.`
    }
    return undefined
  }, [selectedHelperProfile, requestType])

  // Warning: city mismatch
  const cityWarning = useMemo(() => {
    if (!selectedHelperProfile || !petCity) return undefined
    const profileCity =
      typeof selectedHelperProfile.city === 'string'
        ? selectedHelperProfile.city.toLowerCase().trim()
        : selectedHelperProfile.city?.name.toLowerCase().trim()
    const requestCity = petCity.toLowerCase().trim()
    if (profileCity && requestCity && profileCity !== requestCity) {
      return 'Warning: You are trying to respond to a request outside of your city. Please make sure you can handle this request.'
    }
    return undefined
  }, [selectedHelperProfile, petCity])

  // Warning: country mismatch
  const countryWarning = useMemo(() => {
    if (!selectedHelperProfile || !petCountry) return undefined
    const profileCountry = selectedHelperProfile.country?.toLowerCase().trim()
    const requestCountry = petCountry.toLowerCase().trim()
    if (profileCountry && requestCountry && profileCountry !== requestCountry) {
      return 'Serious Warning: You are trying to respond to a request outside of your country. Please make sure you can handle this request.'
    }
    return undefined
  }, [selectedHelperProfile, petCountry])

  // Can submit only if profile is selected and request type is allowed
  const canSubmit = useMemo(() => {
    if (!selectedProfile) return false
    if (!requestedRelationshipType) return false
    if (requestTypeWarning) return false // Block submission if request type not allowed
    return true
  }, [selectedProfile, requestedRelationshipType, requestTypeWarning])

  const handleInitialSubmit = () => {
    if (!selectedProfile || !requestedRelationshipType) {
      toast.error('Please select a helper profile and a relationship type.')
      return
    }
    if (requestedRelationshipType === 'fostering' && fosteringType === 'paid') {
      const amount = parseFloat(price)
      if (Number.isNaN(amount) || amount <= 0) {
        toast.error('Please enter a valid price greater than 0 for paid fostering.')
        return
      }
    }
    setShowConfirmation(true)
  }

  const handleConfirmSubmit = async () => {
    if (submitting) return
    try {
      setSubmitting(true)
      await api.post('transfer-requests', {
        pet_id: actualPetId,
        placement_request_id: placementRequestId,
        helper_profile_id: selectedProfile ? Number(selectedProfile) : undefined,
        requested_relationship_type: requestedRelationshipType || undefined,
        fostering_type: requestedRelationshipType === 'fostering' ? fosteringType : undefined,
        price:
          requestedRelationshipType === 'fostering' && fosteringType === 'paid'
            ? parseFloat(price)
            : undefined,
      })
      toast.success('Placement response submitted successfully!')
      if (onSuccess) onSuccess()
      onClose()
      setShowConfirmation(false)
    } catch (error) {
      console.error('Failed to submit placement response', error)
      const anyErr = error as {
        response?: {
          status?: number
          data?: { message?: string; errors?: Record<string, string[]> }
        }
      }
      if (anyErr.response?.status === 409) {
        toast.info("You've already responded to this request. We'll refresh the page.")
        if (onSuccess) onSuccess()
        onClose()
        setShowConfirmation(false)
      } else if (anyErr.response?.status === 422) {
        const errs = anyErr.response.data?.errors ?? {}
        const joined = Object.values(errs).flat().join('\n')
        const msg = joined !== '' ? joined : (anyErr.response.data?.message ?? 'Validation error.')
        toast.error(msg)
      } else {
        toast.error('Failed to submit placement response.')
      }
    }
    setSubmitting(false)
  }

  return {
    // identity
    actualPetName,
    // data
    helperProfiles,
    loading,
    // selection
    selectedProfile,
    setSelectedProfile,
    requestedRelationshipType,
    fosteringType,
    setFosteringType,
    price,
    setPrice,
    // warnings
    requestTypeWarning,
    cityWarning,
    countryWarning,
    canSubmit,
    // ui state
    showConfirmation,
    setShowConfirmation,
    submitting,
    // actions
    handleInitialSubmit,
    handleConfirmSubmit,
  }
}
