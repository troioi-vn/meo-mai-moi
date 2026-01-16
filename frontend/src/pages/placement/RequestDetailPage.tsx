import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
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
import {
  formatRequestType,
  formatStatus,
  isTemporaryType,
  PlacementResponseStatusLabels,
} from '@/types/placement'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  HandshakeIcon,
  Home,
  Loader2,
  MessageCircle,
  Send,
  Trash2,
  User,
  UserPlus,
  X,
  XCircle,
} from 'lucide-react'
import { useCreateChat } from '@/hooks/useMessaging'
import { api } from '@/api/axios'
import type { HelperProfile, PlacementRequestType } from '@/types/helper-profile'

// Status badge variants
const getStatusBadgeVariant = (
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'open':
      return 'default'
    case 'pending_transfer':
    case 'active':
    case 'finalized':
      return 'secondary'
    default:
      return 'outline'
  }
}

const getResponseStatusBadgeVariant = (
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'responded':
      return 'secondary'
    case 'accepted':
      return 'secondary'
    case 'rejected':
      return 'destructive'
    case 'cancelled':
      return 'outline'
    default:
      return 'outline'
  }
}

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
      {/* Sticky Header */}
      <div className="sticky top-16 z-10 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 pb-4 mb-6 -mx-4 px-4 border-b">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <Link to="/requests" className="hover:text-foreground">
            Requests
          </Link>
          <span>/</span>
          <Link to={`/pets/${String(request.pet.id)}/view`} className="hover:text-foreground">
            {request.pet.name}
          </Link>
          <span>/</span>
          <span className="text-foreground">Request #{request.id}</span>
        </div>

        {/* Header with pet info and status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {request.pet.photo_url && (
              <img
                src={request.pet.photo_url}
                alt={request.pet.name}
                className="h-12 w-12 rounded-full object-cover"
              />
            )}
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                {formatRequestType(request.request_type)}
                <Badge variant={getStatusBadgeVariant(request.status)}>
                  {formatStatus(request.status)}
                </Badge>
              </h1>
              <p className="text-sm text-muted-foreground">
                {request.pet.name}
                {petCity && ` • ${petCity}`}
                {request.pet.country && `, ${request.pet.country}`}
              </p>
            </div>
          </div>

          {/* Primary CTA */}
          <div className="flex items-center gap-2">
            {request.chat_id && (
              <Button variant="outline" size="sm" asChild>
                <Link to={`/messages/${String(request.chat_id)}`}>
                  <MessageCircle className="h-4 w-4 mr-1" />
                  Chat
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Your Response Section (Helper or users who can respond) */}
      {canShowRespondSection && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Your Response</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {myResponse ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Your Response Status</span>
                  <Badge variant={getResponseStatusBadgeVariant(myResponse.status)}>
                    {PlacementResponseStatusLabels[myResponse.status] ?? myResponse.status}
                  </Badge>
                </div>
                {myResponse.message && (
                  <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                    {myResponse.message}
                  </p>
                )}

                {/* Pending response - can cancel */}
                {actions.can_cancel_my_response && (
                  <Button
                    variant="outline"
                    onClick={() => void handleCancelMyResponse(myResponse.id)}
                    disabled={actionLoading === 'cancel-response'}
                    className="w-full"
                  >
                    {actionLoading === 'cancel-response' ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <X className="h-4 w-4 mr-2" />
                    )}
                    Cancel My Response
                  </Button>
                )}

                {/* Accepted - needs handover confirmation */}
                {actions.can_confirm_handover && myTransfer && (
                  <div className="rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="font-medium">Your response was accepted!</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Please confirm once you have received the pet physically.
                    </p>
                    <Button
                      onClick={() => void handleConfirmHandover(myTransfer.id)}
                      disabled={actionLoading === 'confirm-handover'}
                      className="w-full"
                    >
                      {actionLoading === 'confirm-handover' ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <HandshakeIcon className="h-4 w-4 mr-2" />
                      )}
                      Confirm Handover
                    </Button>
                  </div>
                )}

                {/* Active placement - currently caring for pet */}
                {request.status === 'active' && myResponse.status === 'accepted' && (
                  <div className="rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-4">
                    <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                      <Home className="h-4 w-4" />
                      <span className="font-medium">
                        You are currently caring for {request.pet.name}
                      </span>
                    </div>
                    {isTemporaryType(request.request_type) && (
                      <p className="text-xs text-muted-foreground mt-2">
                        The owner will mark the placement as complete when the pet is returned.
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : actions.can_respond || isPotentialHelper ? (
              <div className="space-y-4">
                {loadingProfiles ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">
                      Loading your helper profiles...
                    </span>
                  </div>
                ) : helperProfiles.length === 0 ? (
                  <div className="rounded-md bg-muted/50 p-6 text-center space-y-4">
                    <div className="mx-auto rounded-full bg-muted p-3 w-fit">
                      <UserPlus className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">No Helper Profile Found</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        To respond to this placement request, please create your Helper Profile
                        first.
                      </p>
                    </div>
                    <Button onClick={() => void navigate('/helper/create')} className="w-full">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Create Helper Profile
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Helper Profile Selector */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Select Helper Profile</label>
                      <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a profile..." />
                        </SelectTrigger>
                        <SelectContent>
                          {helperProfiles.map((profile) => (
                            <SelectItem key={profile.id} value={String(profile.id)}>
                              {typeof profile.city === 'string' ? profile.city : profile.city?.name}
                              {profile.state ? `, ${profile.state}` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Validation Warnings */}
                    {requestTypeWarning && (
                      <Alert variant="destructive">
                        <XCircle className="h-4 w-4" />
                        <AlertDescription>{requestTypeWarning}</AlertDescription>
                      </Alert>
                    )}
                    {countryWarning && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{countryWarning}</AlertDescription>
                      </Alert>
                    )}
                    {cityWarning && !countryWarning && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{cityWarning}</AlertDescription>
                      </Alert>
                    )}

                    {/* Message Input */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Message to Owner{' '}
                        <span className="text-muted-foreground font-normal">(optional)</span>
                      </label>
                      <Textarea
                        placeholder="Introduce yourself and explain why you'd like to help..."
                        value={responseMessage}
                        onChange={(e) => {
                          setResponseMessage(e.target.value)
                        }}
                        rows={4}
                      />
                    </div>

                    {/* Submit Button */}
                    <Button
                      onClick={() => void handleSubmitResponse()}
                      disabled={!canSubmitResponse || submittingResponse}
                      className="w-full"
                    >
                      {submittingResponse ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Send Response
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                You cannot respond to this placement request.
              </p>
            )}

            {/* Chat with owner */}
            {request.user_id && (isHelper || myResponse) && (
              <Button
                variant="outline"
                onClick={() => {
                  if (request.user_id) {
                    void handleChat(request.user_id)
                  }
                }}
                disabled={creatingChat}
                className="w-full"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                {creatingChat ? 'Starting chat...' : 'Chat with Owner'}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Responses Section (Owner/Admin) */}
      {isOwnerOrAdmin && request.status === 'open' && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Responses</span>
              <Badge variant="secondary">{request.response_count}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {request.responses && request.responses.length > 0 ? (
              <div className="space-y-4">
                {request.responses
                  .filter((r) => r.status === 'responded')
                  .map((response) => (
                    <ResponseCard
                      key={response.id}
                      response={response}
                      placementRequestId={request.id}
                      onAccept={handleAcceptResponse}
                      onReject={handleRejectResponse}
                      onChat={handleChat}
                      actionLoading={actionLoading}
                      creatingChat={creatingChat}
                    />
                  ))}
                {request.responses.filter((r) => r.status === 'responded').length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No pending responses yet.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No responses yet. Helpers will appear here when they respond.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pending Transfer Section (Owner) */}
      {isOwnerOrAdmin && request.status === 'pending_transfer' && acceptedResponse && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Awaiting Handover</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm text-yellow-700 dark:text-yellow-400">
                <Clock className="h-4 w-4" />
                <span>
                  Waiting for {acceptedResponse.helper_profile?.user?.name ?? 'the helper'} to
                  confirm handover
                </span>
              </div>
              {acceptedResponse.helper_profile?.user?.id && (
                <Button
                  variant="outline"
                  onClick={() => {
                    if (acceptedResponse.helper_profile?.user?.id) {
                      void handleChat(acceptedResponse.helper_profile.user.id)
                    }
                  }}
                  disabled={creatingChat}
                  className="w-full"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  {creatingChat ? 'Starting chat...' : 'Chat with Helper'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Placement Section (Owner) - Finalize */}
      {actions.can_finalize && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Active Placement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                <Home className="h-4 w-4" />
                <span>
                  {request.request_type === 'pet_sitting'
                    ? 'Pet is currently with sitter'
                    : 'Pet is currently with foster'}
                </span>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={actionLoading === 'finalize'}
                  >
                    {actionLoading === 'finalize' ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    )}
                    Pet is Returned
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Pet Return</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you confirming that {request.pet.name} has been returned to you? This will
                      end the {request.request_type === 'pet_sitting' ? 'pet sitting' : 'fostering'}{' '}
                      period and mark the placement as completed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void handleFinalize()}>
                      Confirm Return
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pet Info Section */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Pet Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {request.pet.photo_url && (
              <img
                src={request.pet.photo_url}
                alt={request.pet.name}
                className="h-20 w-20 rounded-lg object-cover"
              />
            )}
            <div>
              <h3 className="font-semibold">{request.pet.name}</h3>
              {request.pet.pet_type && (
                <p className="text-sm text-muted-foreground">{request.pet.pet_type.name}</p>
              )}
              <p className="text-sm text-muted-foreground">
                {petCity}
                {request.pet.state && `, ${request.pet.state}`}
                {request.pet.country && `, ${request.pet.country}`}
              </p>
              <Link
                to={`/pets/${String(request.pet.id)}/view`}
                className="text-sm text-primary hover:underline"
              >
                View Pet Profile →
              </Link>
            </div>
          </div>
          {request.notes && (
            <div className="mt-4 p-3 bg-muted rounded-md">
              <p className="text-sm font-medium mb-1">Notes</p>
              <p className="text-sm text-muted-foreground">{request.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline Stepper */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm">
            <div
              className={`flex items-center gap-1 ${request.status === 'open' ? 'text-primary font-medium' : 'text-muted-foreground'}`}
            >
              <div
                className={`h-3 w-3 rounded-full ${request.status === 'open' ? 'bg-primary' : 'bg-muted-foreground'}`}
              />
              Open
            </div>
            <div className="flex-1 h-px bg-border" />
            <div
              className={`flex items-center gap-1 ${request.status === 'pending_transfer' ? 'text-primary font-medium' : 'text-muted-foreground'}`}
            >
              <div
                className={`h-3 w-3 rounded-full ${request.status === 'pending_transfer' ? 'bg-primary' : 'bg-muted-foreground'}`}
              />
              Pending Transfer
            </div>
            <div className="flex-1 h-px bg-border" />
            <div
              className={`flex items-center gap-1 ${request.status === 'active' ? 'text-primary font-medium' : 'text-muted-foreground'}`}
            >
              <div
                className={`h-3 w-3 rounded-full ${request.status === 'active' ? 'bg-primary' : 'bg-muted-foreground'}`}
              />
              Active
            </div>
            <div className="flex-1 h-px bg-border" />
            <div
              className={`flex items-center gap-1 ${request.status === 'finalized' ? 'text-green-600 font-medium' : 'text-muted-foreground'}`}
            >
              <div
                className={`h-3 w-3 rounded-full ${request.status === 'finalized' ? 'bg-green-600' : 'bg-muted-foreground'}`}
              />
              Completed
            </div>
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            Created {new Date(request.created_at).toLocaleDateString()}
            {request.start_date && ` • Starts ${new Date(request.start_date).toLocaleDateString()}`}
            {request.end_date && ` • Ends ${new Date(request.end_date).toLocaleDateString()}`}
          </div>
        </CardContent>
      </Card>

      {/* Admin/Danger Zone */}
      {actions.can_delete_request && (
        <Card className="border-destructive/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-destructive">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={actionLoading === 'delete'}>
                  {actionLoading === 'delete' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Delete Placement Request
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Placement Request</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this placement request? This action cannot be
                    undone and will reject all pending responses.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => void handleDelete()}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Response Card Component
interface ResponseCardProps {
  response: PlacementRequestResponse
  placementRequestId: number
  onAccept: (id: number) => Promise<void>
  onReject: (id: number) => Promise<void>
  onChat: (userId: number) => Promise<void>
  actionLoading: string | null
  creatingChat: boolean
}

function ResponseCard({
  response,
  onAccept,
  onReject,
  onChat,
  actionLoading,
  creatingChat,
}: ResponseCardProps) {
  const helperName = response.helper_profile?.user?.name ?? 'Unknown Helper'
  const helperUserId = response.helper_profile?.user?.id

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
            <User className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">{helperName}</p>
            {response.helper_profile?.city && (
              <p className="text-xs text-muted-foreground">{response.helper_profile.city}</p>
            )}
          </div>
        </div>
        <span className="text-xs text-muted-foreground">
          {new Date(response.responded_at).toLocaleDateString()}
        </span>
      </div>

      {response.message && (
        <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">{response.message}</p>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          onClick={() => void onAccept(response.id)}
          disabled={actionLoading === `accept-${String(response.id)}`}
          className="flex-1"
        >
          {actionLoading === `accept-${String(response.id)}` ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4 mr-2" />
          )}
          Accept
        </Button>
        <Button
          variant="outline"
          onClick={() => void onReject(response.id)}
          disabled={actionLoading === `reject-${String(response.id)}`}
          className="flex-1"
        >
          {actionLoading === `reject-${String(response.id)}` ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <X className="h-4 w-4 mr-2" />
          )}
          Reject
        </Button>
        {helperUserId && (
          <Button
            variant="outline"
            onClick={() => void onChat(helperUserId)}
            disabled={creatingChat}
          >
            <MessageCircle className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
