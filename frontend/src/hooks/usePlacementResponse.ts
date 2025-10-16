import { useEffect, useState } from 'react'
import { api } from '@/api/axios'
import type { HelperProfile } from '@/types/helper-profile'
import { toast } from 'sonner'

export type RelationshipType = 'fostering' | 'permanent_foster' | ''
export type FosteringType = 'free' | 'paid'

interface Params {
  isOpen: boolean
  petName: string
  petId: number
  placementRequestId: number
  onSuccess?: () => void
  onClose: () => void
}

export function usePlacementResponse({
  isOpen,
  petName,
  petId,
  placementRequestId,
  onSuccess,
  onClose,
}: Params) {
  const actualPetName = petName || 'Pet'
  const actualPetId = petId

  const [helperProfiles, setHelperProfiles] = useState<HelperProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProfile, setSelectedProfile] = useState<string>('')
  const [requestedRelationshipType, setRequestedRelationshipType] = useState<RelationshipType>('')
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [fosteringType, setFosteringType] = useState<FosteringType>('free')
  const [price, setPrice] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

  // Load helper profiles when opened
  useEffect(() => {
    if (!isOpen) return
    ;(async () => {
      try {
        setLoading(true)
        const response = await api.get<{ data: HelperProfile[] }>('helper-profiles')
        setHelperProfiles(response.data.data)
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

  // Reset fostering fields when type changes
  useEffect(() => {
    if (requestedRelationshipType !== 'fostering') {
      setFosteringType('free')
      setPrice('')
    }
  }, [requestedRelationshipType])

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
    setRequestedRelationshipType,
    fosteringType,
    setFosteringType,
    price,
    setPrice,
    // ui state
    showConfirmation,
    setShowConfirmation,
    submitting,
    // actions
    handleInitialSubmit,
    handleConfirmSubmit,
  }
}
