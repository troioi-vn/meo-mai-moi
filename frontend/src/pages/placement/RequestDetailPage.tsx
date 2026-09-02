import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { toast } from '@/lib/i18n-toast'
import {
  useGetPlacementRequestsId,
  postPlacementRequestsIdFinalize as finalizePlacementRequest,
  deletePlacementRequestsId as deletePlacementRequest,
} from '@/api/generated/placement-requests/placement-requests'
import {
  postPlacementResponsesIdAccept as acceptPlacementResponse,
  postPlacementResponsesIdReject as rejectPlacementResponse,
  postPlacementResponsesIdCancel as cancelPlacementResponse,
  postPlacementRequestsIdResponses,
} from '@/api/generated/placement-request-responses/placement-request-responses'
import { postTransferRequestsIdConfirm as confirmTransfer } from '@/api/generated/transfer-requests/transfer-requests'
import {
  getGetHelperProfilesQueryKey,
  useGetHelperProfiles,
} from '@/api/generated/helper-profiles/helper-profiles'
import type { PlacementRequestDetail } from '@/types/placement'
import type { PlacementRequestType } from '@/types/helper-profile'
import { Skeleton } from '@/components/ui/skeleton'
import { LoadingState } from '@/components/ui/LoadingState'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import { useCreateChat } from '@/hooks/useMessaging'
import { usePendingResponseIntent } from '@/hooks/use-pending-response-intent'
import { isHelperProfileActiveStatus, type HelperProfile } from '@/types/helper-profile'
import { RequestDetailHeader } from './request-detail/RequestDetailHeader'
import { MyResponseSection } from './request-detail/MyResponseSection'
import { OwnerResponsesSection } from './request-detail/OwnerResponsesSection'
import { PendingTransferSection } from './request-detail/PendingTransferSection'
import { ActivePlacementSection } from './request-detail/ActivePlacementSection'
import { PetInformationCard } from './request-detail/PetInformationCard'
import { TimelineCard } from './request-detail/TimelineCard'
import { DangerZoneCard } from './request-detail/DangerZoneCard'
import { RespondCta, type RespondCtaVariant } from './request-detail/RespondCta'
import { resolveDetailLayout } from './request-detail/utils'
import { PageContainer } from '@/components/layout/PageLayout'

export default function RequestDetailPage() {
  const { t } = useTranslation('common')
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { create: createChat, creating: creatingChat } = useCreateChat()
  const [searchParams, setSearchParams] = useSearchParams()
  const {
    save: savePendingIntent,
    read: readPendingIntent,
    clear: clearPendingIntent,
  } = usePendingResponseIntent()

  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // For respond form
  const [selectedProfileId, setSelectedProfileId] = useState('')
  const [responseMessage, setResponseMessage] = useState('')
  const [submittingResponse, setSubmittingResponse] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [id])

  const numericId = id ? Number(id) : undefined

  const {
    data: requestData,
    isPending,
    isError,
    error: requestError,
    refetch,
  } = useGetPlacementRequestsId(numericId ?? 0, {
    query: { enabled: numericId !== undefined },
  })

  const request = (requestData ?? null) as PlacementRequestDetail | null

  const fetchRequest = useCallback(() => {
    void refetch()
  }, [refetch])

  // A pending translation polls every couple of seconds. Before this was a
  // query, each poll replaced the request object and re-ran a helper-profile
  // effect keyed on it, which blanked the response card to a spinner. React
  // Query keeps serving the cached list, so a refetch is now invisible.
  const handleTranslationPending = useCallback(() => {
    void refetch()
  }, [refetch])

  const isOwnerView = request?.viewer_role === 'owner'

  const { data: helperProfilesData, isPending: profilesPending } = useGetHelperProfiles({
    query: {
      // Only Boolean(user) feeds this, never the user object, so the auth
      // refresh on focus/visibilitychange cannot retrigger a fetch.
      enabled: Boolean(user) && request?.status === 'open' && !isOwnerView,
    },
  })

  const helperProfiles = useMemo(
    () =>
      ((helperProfilesData ?? []) as HelperProfile[]).filter(
        (profile) =>
          isHelperProfileActiveStatus(profile.status) &&
          // `GET /helper-profiles` also returns the profiles of helpers who
          // answered your own listings, which is what the owner view needs.
          // Here the list is "which of your profiles are you applying with",
          // and someone else's is not yours to apply with. Profiles without a
          // `user_id` are left alone so fixtures that omit it still resolve.
          (profile.user_id === undefined || profile.user_id === user?.id)
      ),
    [helperProfilesData, user?.id]
  )

  // Derived, not stored: writing this into state during the fetch caused a
  // second render cascade right after the list arrived.
  const effectiveProfileId =
    selectedProfileId ||
    (helperProfiles.length === 1 && helperProfiles[0] ? String(helperProfiles[0].id) : '')

  // The generated hook types its error as `void` (the spec declares no error
  // body), so the status has to be read off the real Axios error behind it.
  const error = isError
    ? (() => {
        const status = (requestError as unknown as { response?: { status?: number } } | null)
          ?.response?.status
        if (status === 403) return t('requestDetail.errors.noPermission')
        if (status === 404) return t('requestDetail.errors.notFound')
        return t('requestDetail.errors.loadFailed')
      })()
    : null

  const handleAcceptResponse = useCallback(
    async (responseId: number) => {
      setActionLoading(`accept-${String(responseId)}`)
      try {
        await acceptPlacementResponse(responseId)
        toast.success('pets:placement.messages.responseAccepted')
        fetchRequest()
      } catch (err) {
        console.error('Failed to accept response', err)
        toast.error('pets:placement.messages.acceptFailed')
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
        toast.success('pets:placement.messages.responseRejected')
        fetchRequest()
      } catch (err) {
        console.error('Failed to reject response', err)
        toast.error('pets:placement.messages.rejectFailed')
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
        toast.success('pets:placement.messages.responseCancelled')
        fetchRequest()
      } catch (err) {
        console.error('Failed to cancel response', err)
        toast.error('pets:placement.messages.cancelResponseFailed')
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
        toast.success('pets:placement.messages.handoverConfirmed')
        fetchRequest()
      } catch (err) {
        console.error('Failed to confirm handover', err)
        toast.error('pets:placement.messages.confirmHandoverFailed')
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
      toast.success('pets:placement.messages.petReturned')
      fetchRequest()
    } catch (err) {
      console.error('Failed to finalize placement', err)
      toast.error('pets:placement.messages.returnFailed')
    } finally {
      setActionLoading(null)
    }
  }, [request, fetchRequest])

  const handleDelete = useCallback(async () => {
    if (!request) return
    setActionLoading('delete')
    try {
      await deletePlacementRequest(request.id)
      toast.success('pets:placement.messages.placementRequestDeleted')
      void navigate('/requests')
    } catch (err) {
      console.error('Failed to delete placement request', err)
      toast.error('pets:placement.messages.placementRequestDeleteFailed')
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

  // Coming back from sign-in. Auto-completing here is not a surprise: they
  // tapped "Adopt now" before being sent to auth, so the intent is explicit and
  // recorded. The stored intent is cleared first so a refresh cannot double-post,
  // and the backend 409s on a second response regardless.
  const resumeAttempted = useRef(false)

  useEffect(() => {
    if (searchParams.get('resume') !== 'respond') return
    if (!request || !user || numericId === undefined) return
    if (resumeAttempted.current) return

    resumeAttempted.current = true

    const intent = readPendingIntent(numericId)
    const shouldSend = intent !== null && request.available_actions.can_quick_respond

    // Strip the param so a refresh does not retry.
    const next = new URLSearchParams(searchParams)
    next.delete('resume')
    setSearchParams(next, { replace: true })

    if (shouldSend) {
      clearPendingIntent()
      void handleQuickRespondRef.current()
    }
  }, [
    searchParams,
    setSearchParams,
    request,
    user,
    numericId,
    readPendingIntent,
    clearPendingIntent,
  ])

  const handleQuickRespondRef = useRef<() => Promise<void>>(() => Promise.resolve())

  const handleQuickRespond = useCallback(async () => {
    if (!request) return

    // Not signed in: record the intent and send them to auth. No form first —
    // filling one in only to hit a login wall is worse than being asked to sign
    // in up front, and Google or Telegram is a single verified tap.
    if (!user) {
      savePendingIntent({ requestId: request.id, message: '', phone: '' })
      void navigate(
        `/login?redirect=${encodeURIComponent(`/requests/${String(request.id)}?resume=respond`)}`
      )
      return
    }

    setSubmittingResponse(true)
    try {
      await postPlacementRequestsIdResponses(request.id, {})
      clearPendingIntent()
      await queryClient.invalidateQueries({ queryKey: getGetHelperProfilesQueryKey() })

      // toast.raw because the i18n-toast wrapper takes a key with no
      // interpolation values, which rendered "{{name}}" literally. Short on
      // purpose: the durable version of this is the bell notification, so the
      // toast only has to confirm the click.
      toast.raw.success(t('placement:respondCta.sentTitle', { name: request.pet.name }), {
        action: {
          label: t('placement:respondCta.sentMessageAction'),
          onClick: () => {
            if (request.user_id) void handleChat(request.user_id)
          },
        },
      })
      fetchRequest()
    } catch (err) {
      console.error('Failed to submit quick response', err)
      const status = (err as { response?: { status?: number } }).response?.status
      if (status === 409) {
        toast.info('common:requestDetail.warnings.alreadyResponded')
        clearPendingIntent()
        fetchRequest()
      } else {
        toast.error('common:errors.generic')
      }
    } finally {
      setSubmittingResponse(false)
    }
  }, [
    request,
    user,
    navigate,
    fetchRequest,
    savePendingIntent,
    clearPendingIntent,
    handleChat,
    queryClient,
    t,
  ])

  handleQuickRespondRef.current = handleQuickRespond

  const handleSubmitResponse = useCallback(async () => {
    if (!request || !effectiveProfileId) return
    setSubmittingResponse(true)
    try {
      await postPlacementRequestsIdResponses(request.id, {
        helper_profile_id: Number(effectiveProfileId),
        message: responseMessage || undefined,
      })
      toast.success('common:messages.success')
      setSelectedProfileId('')
      setResponseMessage('')
      fetchRequest()
    } catch (err) {
      console.error('Failed to submit response', err)
      const anyErr = err as {
        response?: {
          status?: number
          data?: { message?: string; errors?: Record<string, string[]> }
        }
      }
      if (anyErr.response?.status === 409) {
        toast.info('common:requestDetail.warnings.alreadyResponded')
        fetchRequest()
      } else if (anyErr.response?.status === 422) {
        const errs = anyErr.response.data?.errors ?? {}
        const joined = Object.values(errs).flat().join('\n')
        const msg =
          joined !== '' ? joined : (anyErr.response.data?.message ?? t('errors.validation'))
        toast.raw.error(msg)
      } else {
        toast.error('common:errors.generic')
      }
    } finally {
      setSubmittingResponse(false)
    }
  }, [request, effectiveProfileId, responseMessage, fetchRequest, t])

  // Get selected helper profile for validation warnings
  const selectedHelperProfile = helperProfiles.find((p) => String(p.id) === effectiveProfileId)

  // Warning: request type mismatch
  const requestTypeWarning = (() => {
    if (!selectedHelperProfile || !request) return undefined
    const allowedTypes = selectedHelperProfile.request_types ?? []
    if (allowedTypes.length === 0) return undefined
    if (!allowedTypes.includes(request.request_type as PlacementRequestType)) {
      const formattedType = request.request_type.replace(/_/g, ' ')
      return t('requestDetail.warnings.requestTypeMismatch', { type: formattedType })
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
      return t('requestDetail.warnings.cityMismatch')
    }
    return undefined
  })()

  // Warning: country mismatch
  const countryWarning = (() => {
    if (!selectedHelperProfile || !request?.pet.country) return undefined
    const profileCountry = selectedHelperProfile.country?.toLowerCase().trim()
    const petCountry = request.pet.country.toLowerCase().trim()
    if (profileCountry && petCountry && profileCountry !== petCountry) {
      return t('requestDetail.warnings.countryMismatch')
    }
    return undefined
  })()

  // Can submit response
  const canSubmitResponse = Boolean(effectiveProfileId) && !requestTypeWarning

  // Find my response and transfer from the responses array
  const myResponse = request?.responses?.find((r) => r.id === request.my_response_id)
  const myTransfer = myResponse?.transfer_request

  // Find accepted response for owner view
  const acceptedResponse = request?.responses?.find((r) => r.status === 'accepted')

  if (isPending && !request) {
    return (
      <PageContainer width="narrow">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-64 w-full mb-4" />
        <Skeleton className="h-48 w-full" />
      </PageContainer>
    )
  }

  if (error) {
    return (
      <PageContainer width="narrow">
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
                {t('actions.goBack')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </PageContainer>
    )
  }

  if (!request) {
    return <LoadingState message={t('actions.loading')} />
  }

  const actions = request.available_actions
  const isOwner = request.viewer_role === 'owner'
  const isHelper = request.viewer_role === 'helper'

  // Potential helper: logged in, not the owner, and request is open
  const isPotentialHelper = !!user && !isOwner && request.status === 'open'

  // Show respond section for helpers, users who already responded, or potential helpers
  const isVerified = !user || Boolean(user.email_verified_at)
  const hasAnyProfile = helperProfiles.length > 0
  const hasRespondedAlready = Boolean(myResponse)

  // The RespondCta owns the no-profile case now, so this section only appears
  // for people who have a profile to pick or a response already in flight.
  const canShowRespondSection =
    isHelper || !!myResponse || (isPotentialHelper && hasAnyProfile) || actions.can_respond

  // Sign-in destinations carry the intent, so the visitor lands back here with
  // the sheet open instead of on a dashboard wondering what happened.
  const returnPath = `/requests/${String(request.id)}?resume=respond`
  const signInHref = `/login?redirect=${encodeURIComponent(returnPath)}`

  // The CTA only speaks to people who have not answered yet. Owners, helpers
  // mid-handover and anyone already committed keep the existing sections.
  const showRespondCta =
    !isOwner && !hasRespondedAlready && request.status === 'open' && !hasAnyProfile

  const respondCtaVariant: RespondCtaVariant = !user
    ? actions.can_quick_respond
      ? 'guestQuick'
      : 'guestProfile'
    : !isVerified
      ? 'unverified'
      : actions.can_quick_respond
        ? 'quick'
        : 'profileRequired'

  const handleCreateHelperProfile = () => {
    void navigate(`/helper/create?redirect=${encodeURIComponent(returnPath)}`)
  }

  const petCity =
    typeof request.pet.city === 'object' && request.pet.city
      ? request.pet.city.name
      : request.pet.city

  const layout = resolveDetailLayout(request.viewer_role, hasRespondedAlready, request.status)

  const myResponseCard = (
    <MyResponseSection
      request={request}
      canShow={canShowRespondSection}
      isHelper={isHelper}
      isPotentialHelper={isPotentialHelper}
      actions={actions}
      myResponse={myResponse}
      myTransferId={myTransfer?.id}
      helperProfiles={helperProfiles}
      profilesPending={profilesPending}
      selectedProfileId={effectiveProfileId}
      onSelectedProfileIdChange={setSelectedProfileId}
      responseMessage={responseMessage}
      onResponseMessageChange={setResponseMessage}
      requestTypeWarning={requestTypeWarning}
      cityWarning={cityWarning}
      countryWarning={countryWarning}
      canSubmitResponse={canSubmitResponse}
      submittingResponse={submittingResponse}
      onSubmitResponse={handleSubmitResponse}
      actionLoading={actionLoading}
      onCancelMyResponse={handleCancelMyResponse}
      onConfirmHandover={handleConfirmHandover}
      canChatWithOwner={!!request.user_id}
      creatingChat={creatingChat}
      presentation={layout === 'discovery' ? 'embedded' : 'card'}
      onChatOwner={async () => {
        if (request.user_id) {
          await handleChat(request.user_id)
        }
      }}
    />
  )

  const respondCta = showRespondCta ? (
    <RespondCta
      variant={respondCtaVariant}
      petName={request.pet.name}
      requestType={request.request_type}
      email={user?.email}
      signInHref={signInHref}
      onQuickRespond={() => {
        void handleQuickRespond()
      }}
      submitting={submittingResponse}
      onCreateHelperProfile={handleCreateHelperProfile}
    />
  ) : null

  const discoveryAction = respondCta ?? (canShowRespondSection ? myResponseCard : null)

  const petCard = (
    <PetInformationCard
      request={request}
      petCity={petCity}
      onTranslationPending={handleTranslationPending}
      variant={layout === 'discovery' ? 'hero' : 'compact'}
      action={layout === 'discovery' ? discoveryAction : undefined}
    />
  )

  return (
    <PageContainer
      width={layout === 'discovery' ? 'default' : 'narrow'}
      className={layout === 'discovery' ? undefined : 'space-y-6'}
    >
      <RequestDetailHeader
        request={request}
        petCity={petCity}
        showQrCode={layout === 'owner'}
        variant={layout === 'discovery' ? 'discovery' : 'standard'}
      />

      {/* Three orders, one page. A stranger meets the animal first; an owner
          wants the responses they have to act on; someone mid-handover wants
          their own status. The old single order put a card about the viewer's
          missing records above the pet for everyone. */}
      {layout === 'discovery' && petCard}

      {layout === 'engaged' && (
        <>
          {myResponseCard}
          <ActivePlacementSection
            request={request}
            actionLoading={actionLoading}
            onFinalize={handleFinalize}
          />
          {petCard}
          <TimelineCard request={request} />
        </>
      )}

      {layout === 'owner' && (
        <>
          <OwnerResponsesSection
            request={request}
            actionLoading={actionLoading}
            creatingChat={creatingChat}
            onAccept={handleAcceptResponse}
            onReject={handleRejectResponse}
            onChat={handleChat}
          />
          {acceptedResponse && (
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
          {petCard}
          <TimelineCard request={request} />
          <DangerZoneCard
            canDelete={actions.can_delete_request}
            actionLoading={actionLoading}
            onDelete={handleDelete}
          />
        </>
      )}
    </PageContainer>
  )
}
