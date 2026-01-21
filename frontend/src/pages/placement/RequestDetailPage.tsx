import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import {
  getPlacementRequest,
  acceptPlacementResponse,
  rejectPlacementResponse,
  cancelPlacementResponse,
  confirmTransfer,
  finalizePlacementRequest,
  deletePlacementRequest,
} from '@/api/placement'
import type { PlacementRequestDetail, PlacementRequestResponse } from '@/types/placement'
import type { PlacementRequestType } from '@/types/helper-profile'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import { useCreateChat } from '@/hooks/useMessaging'
import { api } from '@/api/axios'
import type { HelperProfile } from '@/types/helper-profile'
import { RequestDetailHeader } from './request-detail/RequestDetailHeader'
import { MyResponseSection } from './request-detail/MyResponseSection'
import { OwnerResponsesSection } from './request-detail/OwnerResponsesSection'
import { PendingTransferSection } from './request-detail/PendingTransferSection'
import { ActivePlacementSection } from './request-detail/ActivePlacementSection'
import { PetInformationCard } from './request-detail/PetInformationCard'
import { TimelineCard } from './request-detail/TimelineCard'
import { DangerZoneCard } from './request-detail/DangerZoneCard'

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { create: createChat, creating: creatingChat } = useCreateChat()

  const [request, setRequest] = useState<PlacementRequestDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // For respond form
  const [helperProfiles, setHelperProfiles] = useState<HelperProfile[]>([])
  const [loadingProfiles, setLoadingProfiles] = useState(false)
  const [selectedProfileId, setSelectedProfileId] = useState<string>('')
  const [responseMessage, setResponseMessage] = useState('')
  const [submittingResponse, setSubmittingResponse] = useState(false)

  const fetchRequest = useCallback(async () => {
    if (!id) return
    try {
      setLoading(true)
      setError(null)
      const data = await getPlacementRequest(Number(id))
      setRequest(data)
    } catch (err) {
      console.error('Failed to fetch placement request', err)
      const anyErr = err as { response?: { status?: number } }
      if (anyErr.response?.status === 403) {
        setError('You do not have permission to view this request.')
      } else if (anyErr.response?.status === 404) {
        setError('Placement request not found.')
      } else {
        setError('Failed to load placement request. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void fetchRequest()
  }, [fetchRequest])

  // Fetch helper profiles when user can respond or might want to
  useEffect(() => {
    if (!request || !user) return

    const isOwnerOrAdmin = request.viewer_role === 'owner' || request.viewer_role === 'admin'
    const isPotentialHelper = !isOwnerOrAdmin && request.status === 'open'

    if (!request.available_actions.can_respond && !isPotentialHelper) return

    const fetchProfiles = async () => {
      try {
        setLoadingProfiles(true)
        const response = await api.get<{ data: HelperProfile[] }>('helper-profiles', {
          params: { _t: Date.now() },
        })
        const profiles = response.data.data
        // Filter to only include active profiles
        const activeProfiles = profiles.filter((p) => p.status === 'active' || !p.status)
        setHelperProfiles(activeProfiles)

        // Auto-select if only one active profile exists
        if (activeProfiles.length === 1 && activeProfiles[0]) {
          setSelectedProfileId(String(activeProfiles[0].id))
        }
      } catch (err) {
        console.error('Failed to fetch helper profiles', err)
      } finally {
        setLoadingProfiles(false)
      }
    }

    void fetchProfiles()
  }, [request, user])

  const handleAcceptResponse = useCallback(
    async (responseId: number) => {
      setActionLoading(`accept-${String(responseId)}`)
      try {
        await acceptPlacementResponse(responseId)
        toast.success('Response accepted!')
        void fetchRequest()
      } catch (err) {
        console.error('Failed to accept response', err)
        toast.error('Failed to accept response. Please try again.')
      } finally {
        setActionLoading(null)
      }
    },
    [fetchRequest]
  )

  const handleRejectResponse = useCallback(
    async (responseId: number) => {
      setActionLoading(`reject-${String(responseId)}`)
      try {
        await rejectPlacementResponse(responseId)
        toast.success('Response rejected')
        void fetchRequest()
      } catch (err) {
        console.error('Failed to reject response', err)
        toast.error('Failed to reject response. Please try again.')
      } finally {
        setActionLoading(null)
      }
    },
    [fetchRequest]
  )

  const handleCancelMyResponse = useCallback(
    async (responseId: number) => {
      setActionLoading('cancel-response')
      try {
        await cancelPlacementResponse(responseId)
        toast.success('Your response has been cancelled')
        void fetchRequest()
      } catch (err) {
        console.error('Failed to cancel response', err)
        toast.error('Failed to cancel your response')
      } finally {
        setActionLoading(null)
      }
    },
    [fetchRequest]
  )

  const handleConfirmHandover = useCallback(
    async (transferId: number) => {
      setActionLoading('confirm-handover')
      try {
        await confirmTransfer(transferId)
        toast.success('Handover confirmed! You are now responsible for this pet.')
        void fetchRequest()
      } catch (err) {
        console.error('Failed to confirm handover', err)
        toast.error('Failed to confirm handover. Please try again.')
      } finally {
        setActionLoading(null)
      }
    },
    [fetchRequest]
  )

  const handleFinalize = useCallback(async () => {
    if (!request) return
    setActionLoading('finalize')
    try {
      await finalizePlacementRequest(request.id)
      toast.success('Pet has been marked as returned!')
      void fetchRequest()
    } catch (err) {
      console.error('Failed to finalize placement', err)
      toast.error('Failed to mark pet as returned. Please try again.')
    } finally {
      setActionLoading(null)
    }
  }, [request, fetchRequest])

  const handleDelete = useCallback(async () => {
    if (!request) return
    setActionLoading('delete')
    try {
      await deletePlacementRequest(request.id)
      toast.success('Placement request deleted')
      void navigate('/requests')
    } catch (err) {
      console.error('Failed to delete placement request', err)
      toast.error('Failed to delete placement request. Please try again.')
    } finally {
      setActionLoading(null)
    }
  }, [request, navigate])

  const handleChat = useCallback(
    async (counterpartyId: number) => {
      if (!request) return
      const chat = await createChat(counterpartyId, 'PlacementRequest', request.id)
      if (chat) {
        void navigate(`/messages/${String(chat.id)}`)
      }
    },
    [request, createChat, navigate]
  )

  const handleSubmitResponse = useCallback(async () => {
    if (!request || !selectedProfileId) return
    setSubmittingResponse(true)
    try {
      await api.post(`placement-requests/${String(request.id)}/responses`, {
        helper_profile_id: Number(selectedProfileId),
        message: responseMessage || undefined,
      })
      toast.success('Your response has been submitted!')
      setSelectedProfileId('')
      setResponseMessage('')
      void fetchRequest()
    } catch (err) {
      console.error('Failed to submit response', err)
      const anyErr = err as {
        response?: {
          status?: number
          data?: { message?: string; errors?: Record<string, string[]> }
        }
      }
      if (anyErr.response?.status === 409) {
        toast.info("You've already responded to this request.")
        void fetchRequest()
      } else if (anyErr.response?.status === 422) {
        const errs = anyErr.response.data?.errors ?? {}
        const joined = Object.values(errs).flat().join('\n')
        const msg = joined !== '' ? joined : (anyErr.response.data?.message ?? 'Validation error.')
        toast.error(msg)
      } else {
        toast.error('Failed to submit response. Please try again.')
      }
    } finally {
      setSubmittingResponse(false)
    }
  }, [request, selectedProfileId, responseMessage, fetchRequest])

  // Get selected helper profile for validation warnings
  const selectedHelperProfile = helperProfiles.find((p) => String(p.id) === selectedProfileId)

  // Warning: request type mismatch
  const requestTypeWarning = (() => {
    if (!selectedHelperProfile || !request) return undefined
    const allowedTypes = selectedHelperProfile.request_types ?? []
    if (allowedTypes.length === 0) return undefined
    if (!allowedTypes.includes(request.request_type as PlacementRequestType)) {
      const formattedType = request.request_type.replace(/_/g, ' ')
      return `This helper profile doesn't accept ${formattedType} requests. Please select another profile or update your profile settings.`
    }
    return undefined
  })()

  // Warning: city mismatch
  const cityWarning = (() => {
    if (!selectedHelperProfile || !request?.pet) return undefined
    const petCity = typeof request.pet.city === 'string' ? request.pet.city : request.pet.city?.name
    if (!petCity) return undefined
    const profileCity =
      typeof selectedHelperProfile.city === 'string'
        ? selectedHelperProfile.city
        : selectedHelperProfile.city?.name
    if (profileCity && petCity.toLowerCase().trim() !== profileCity.toLowerCase().trim()) {
      return 'This pet is located in a different city than your helper profile.'
    }
    return undefined
  })()

  // Warning: country mismatch
  const countryWarning = (() => {
    if (!selectedHelperProfile || !request?.pet.country) return undefined
    const profileCountry = selectedHelperProfile.country?.toLowerCase().trim()
    const petCountry = request.pet.country.toLowerCase().trim()
    if (profileCountry && petCountry && profileCountry !== petCountry) {
      return 'This pet is located in a different country than your helper profile.'
    }
    return undefined
  })()

  // Can submit response
  const canSubmitResponse = selectedProfileId && !requestTypeWarning

  // Find my response and transfer from the responses array
  const myResponse = request?.responses?.find((r) => r.id === request.my_response_id)
  const myTransfer = myResponse?.transfer_request

  // Find accepted response for owner view
  const acceptedResponse = request?.responses?.find((r) => r.status === 'accepted')

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-64 w-full mb-4" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-destructive mb-4">{error}</p>
              <Button
                variant="outline"
                onClick={() => {
                  void navigate(-1)
                }}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!request) {
    return null
  }

  const actions = request.available_actions
  const isOwnerOrAdmin = request.viewer_role === 'owner' || request.viewer_role === 'admin'
  const isHelper = request.viewer_role === 'helper'

  // Potential helper: logged in, not the owner/admin, and request is open
  const isPotentialHelper = !!user && !isOwnerOrAdmin && request.status === 'open'

  // Show respond section for helpers, users who already responded, or potential helpers
  const canShowRespondSection = isHelper || actions.can_respond || !!myResponse || isPotentialHelper

  const petCity =
    typeof request.pet.city === 'object' && request.pet.city
      ? request.pet.city.name
      : request.pet.city

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <RequestDetailHeader request={request} petCity={petCity} />

      <MyResponseSection
        request={request}
        canShow={canShowRespondSection}
        isHelper={isHelper}
        isPotentialHelper={isPotentialHelper}
        actions={actions}
        myResponse={myResponse}
        myTransferId={myTransfer?.id}
        helperProfiles={helperProfiles}
        loadingProfiles={loadingProfiles}
        selectedProfileId={selectedProfileId}
        onSelectedProfileIdChange={setSelectedProfileId}
        responseMessage={responseMessage}
        onResponseMessageChange={setResponseMessage}
        requestTypeWarning={requestTypeWarning}
        cityWarning={cityWarning}
        countryWarning={countryWarning}
        canSubmitResponse={!!canSubmitResponse}
        submittingResponse={submittingResponse}
        onSubmitResponse={handleSubmitResponse}
        actionLoading={actionLoading}
        onCancelMyResponse={handleCancelMyResponse}
        onConfirmHandover={handleConfirmHandover}
        canChatWithOwner={!!request.user_id}
        creatingChat={creatingChat}
        onChatOwner={async () => {
          if (request.user_id) {
            await handleChat(request.user_id)
          }
        }}
        onCreateHelperProfile={() => {
          void navigate('/helper/create')
        }}
      />

      {isOwnerOrAdmin && (
        <OwnerResponsesSection
          request={request}
          actionLoading={actionLoading}
          creatingChat={creatingChat}
          onAccept={handleAcceptResponse}
          onReject={handleRejectResponse}
          onChat={handleChat}
        />
      )}

      {isOwnerOrAdmin && acceptedResponse && (
        <PendingTransferSection
          request={request}
          acceptedResponse={acceptedResponse}
          creatingChat={creatingChat}
          onChat={handleChat}
        />
      )}

      <ActivePlacementSection
        request={request}
        actionLoading={actionLoading}
        onFinalize={handleFinalize}
      />

      <PetInformationCard request={request} petCity={petCity} />
      <TimelineCard request={request} />
      <DangerZoneCard
        canDelete={actions.can_delete_request}
        actionLoading={actionLoading}
        onDelete={handleDelete}
      />
    </div>
  )
}
