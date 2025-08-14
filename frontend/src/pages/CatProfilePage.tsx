import { api } from '@/api/axios';
import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useCatProfile } from '@/hooks/useCatProfile'
import { Button } from '@/components/ui/button'
import { OwnerButtonGroup } from '@/components/OwnerButtonGroup'
import { HelperProfileDialog } from '@/components/HelperProfileDialog'
import type { HelperProfile } from '@/types/helper-profile'
import type { TransferRequest } from '@/types/cat'
import { getResponderHelperProfile } from '@/api/helper-profiles'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { CatDetails } from '@/components/CatDetails'
import { PlacementRequestModal } from '@/components/PlacementRequestModal'
import { toast } from 'sonner'
import { ScheduleHandoverModal } from '@/components/ScheduleHandoverModal'
import { getTransferHandover, helperConfirmHandover, cancelHandover, completeHandover } from '@/api/handovers'
import { useAuth } from '@/hooks/use-auth'
import { Badge } from '@/components/ui/badge'

const CatProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { cat, loading, error, refresh } = useCatProfile(id)
  const { user: authUser } = useAuth()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [selectedProfile, setSelectedProfile] = useState<HelperProfile | null>(null)
  const [selectedTransferId, setSelectedTransferId] = useState<number | null>(null)
  const [selectedTransfer, setSelectedTransfer] = useState<TransferRequest | null>(null)
  const [handoverForTransferId, setHandoverForTransferId] = useState<number | null>(null)
  const [handoverModalOpen, setHandoverModalOpen] = useState(false)
  const [existingHandoverByTransfer, setExistingHandoverByTransfer] = useState<Record<number, any>>({})
  const [myAcceptedTransferId, setMyAcceptedTransferId] = useState<number | null>(null)
  const [myHandover, setMyHandover] = useState<any | null>(null)

  // Load existing handovers for accepted transfers to hide schedule button
  React.useEffect(() => {
    async function load() {
      if (!cat?.placement_requests) return
      const accepted = cat.placement_requests.flatMap((pr: any) => (pr.transfer_requests ?? []).filter((tr: any) => tr.status === 'accepted'))
      const map: Record<number, any> = {}
      await Promise.all(accepted.map(async (tr: any) => {
        try {
          const ho = await getTransferHandover(Number(tr.id))
          if (ho) map[Number(tr.id)] = ho
        } catch (_) {
          /* ignore */
        }
      }))
      setExistingHandoverByTransfer(map)
    }
    void load()
  }, [cat])

  // For helper: find my accepted transfer and its handover
  React.useEffect(() => {
    if (!cat?.placement_requests || !authUser?.id) { setMyAcceptedTransferId(null); setMyHandover(null); return }
    let foundId: number | null = null
    for (const pr of cat.placement_requests as any[]) {
      for (const tr of (pr.transfer_requests ?? []) as any[]) {
        const helperId = tr.initiator_user_id ?? tr.helper_profile?.user?.id
        if (tr.status === 'accepted' && helperId === authUser.id) {
          foundId = Number(tr.id)
          break
        }
      }
      if (foundId != null) break
    }
    setMyAcceptedTransferId(foundId)
    if (foundId != null) {
      void (async () => {
        try {
          const ho = await getTransferHandover(foundId!)
          setMyHandover(ho ?? null)
        } catch {
          setMyHandover(null)
        }
      })()
    } else {
      setMyHandover(null)
    }
  }, [cat, authUser?.id])

  

  const handleDeletePlacementRequest = async (id: number) => {
    try {
      await api.delete(`placement-requests/${id}`);
      toast.success('Placement request deleted');
      refresh();
    } catch (e) {
      toast.error('Failed to delete placement request');
    }
  };

  // Note: confirm/reject actions are handled per-transfer below

  const handleConfirmTransferRequest = async (transferRequestId: number) => {
    try {
      await api.post(`transfer-requests/${transferRequestId}/accept`)
      toast.success('Transfer accepted');
  refresh();
  // After accept, prompt owner to schedule the handover
  setHandoverForTransferId(transferRequestId)
  setHandoverModalOpen(true)
    } catch (e) {
      toast.error('Failed to accept transfer');
    }
  }
  const handleCancelMyTransferRequest = async (transferRequestId: number) => {
    try {
      await api.post(`transfer-requests/${transferRequestId}/reject`)
      toast.success('Your response was cancelled');
      refresh();
    } catch (e) {
      toast.error('Failed to cancel your response');
    }
  }

  const handleRejectTransferRequest = async (transferRequestId: number) => {
    try {
      await api.post(`transfer-requests/${transferRequestId}/reject`)
      toast.success('Transfer rejected');
      refresh();
    } catch (e) {
      toast.error('Failed to reject transfer');
    }
  }

  const handleViewResponderProfile = async (transfer: TransferRequest) => {
    try {
      setLoadingProfile(true)
      setProfileError(null)
      const p = await getResponderHelperProfile(Number(transfer.id))
      setSelectedProfile(p)
      setSelectedTransferId(Number(transfer.id))
      setSelectedTransfer(transfer)
      setProfileModalOpen(true)
    } catch (e: any) {
      console.error('Failed to load helper profile', e)
      const message = (e?.response?.status === 403)
        ? 'Access denied to helper profile.'
        : 'Failed to load helper profile'
      setProfileError(message)
      toast.error('Failed to load helper profile')
    } finally {
      setLoadingProfile(false)
    }
  }

  const handleEditClick = () => {
    if (cat?.id) {
      void navigate(`/cats/${String(cat.id)}/edit`)
    }
  }

  const handleMyCatsClick = () => {
    void navigate('/account/cats')
  }

  const handleOpenModal = () => {
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  if (loading) {
    return <LoadingState message="Loading cat information..." />
  }

  if (error) {
    return <ErrorState error={error} onRetry={() => navigate('/')} />
  }

  if (!cat) {
    return <ErrorState error="Cat not found" onRetry={() => navigate('/')} />
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Navigation Buttons */}
        <div className="mb-6">
          {cat.viewer_permissions?.can_edit && (
            <OwnerButtonGroup
              onEdit={handleEditClick}
              onPlacementRequest={handleOpenModal}
              onMyCats={handleMyCatsClick}
            />
          )}
        </div>

        {/* Cat Profile Content */}
  <CatDetails
    cat={cat}
    onDeletePlacementRequest={handleDeletePlacementRequest}
    onCancelTransferRequest={handleCancelMyTransferRequest}
    onTransferResponseSuccess={refresh}
  />

        {/* Responses Section */}
  {cat.viewer_permissions?.can_edit && hasPendingTransfers(cat) && (
    <div className="mt-8">
      <h2 className="text-2xl font-bold mb-4">Responses</h2>
      {cat.placement_requests?.map((placementRequest) => (
        <ResponseSection
          key={placementRequest.id}
          placementRequest={placementRequest}
          onViewProfile={handleViewResponderProfile}
          onConfirm={handleConfirmTransferRequest}
          onReject={handleRejectTransferRequest}
        />
      ))}
    </div>
  )}

  {cat.viewer_permissions?.can_edit && hasAcceptedTransfers(cat) && (
    <div className="mt-8">
      <h2 className="text-2xl font-bold mb-4">Accepted Transfer</h2>
      {cat.placement_requests?.map((placementRequest) => (
        <AcceptedSection
          key={`acc-${placementRequest.id}`}
          placementRequest={placementRequest}
          hasHandover={(id: number) => Boolean(existingHandoverByTransfer[id])}
          getHandover={(id: number) => existingHandoverByTransfer[id]}
          onSchedule={(id: number) => { setHandoverForTransferId(id); setHandoverModalOpen(true) }}
        />
      ))}
    </div>
  )}

        {/* Schedule Handover modal after acceptance */}
        {handoverForTransferId != null && (
          <ScheduleHandoverModal
            transferRequestId={handoverForTransferId}
            isOpen={handoverModalOpen}
            onClose={() => setHandoverModalOpen(false)}
            onSuccess={refresh}
          />
        )}

        <PlacementRequestModal
          catId={cat.id}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSuccess={refresh}
        />

        {/* Owner-only helper profile preview */}
        <HelperProfileDialog
          open={profileModalOpen}
          onOpenChange={setProfileModalOpen}
          profile={selectedProfile}
          transfer={selectedTransfer}
          loading={loadingProfile}
          error={profileError}
          onConfirm={() => selectedTransferId != null && handleConfirmTransferRequest(selectedTransferId)}
          onReject={() => selectedTransferId != null && handleRejectTransferRequest(selectedTransferId)}
        />

        {/* Helper-facing handover confirmation panel */}
        {!cat.viewer_permissions?.can_edit && myAcceptedTransferId != null && myHandover && (myHandover.status === 'pending') && (
          <div className="mt-8 border rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-2">Handover scheduled</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Please confirm the cat’s condition at meeting. Scheduled at {myHandover.scheduled_at ? new Date(myHandover.scheduled_at).toLocaleString() : 'TBD'}
              {myHandover.location ? `, Location: ${myHandover.location}` : ''}
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={async () => { await helperConfirmHandover(Number(myHandover.id), true); toast.success('Handover confirmed'); refresh() }}>Confirm</Button>
              <Button variant="destructive" size="sm" onClick={async () => { await helperConfirmHandover(Number(myHandover.id), false); toast.info('Handover disputed'); refresh() }}>Dispute</Button>
            </div>
          </div>
        )}

        {/* Meeting notice (confirmed) for both roles with cancel */}
        {(() => {
          const anyHandover = myHandover || Object.values(existingHandoverByTransfer)[0]
          const show = anyHandover && (anyHandover.status === 'confirmed' || anyHandover.status === 'pending')
          if (!show) return null
          const canCancel = true // both parties can cancel
          return (
            <div className="mt-8 rounded-md border border-emerald-300 bg-emerald-50 p-4">
              <h3 className="text-emerald-900 font-semibold mb-1">Handover {anyHandover.status === 'confirmed' ? 'confirmed' : 'scheduled'}</h3>
              <p className="text-sm text-emerald-800 mb-3">
                Meeting at {anyHandover.scheduled_at ? new Date(anyHandover.scheduled_at).toLocaleString() : 'TBD'}
                {anyHandover.location ? `, Location: ${anyHandover.location}` : ''}
              </p>
              {canCancel && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={async () => { await cancelHandover(Number(anyHandover.id)); toast.info('Handover canceled'); refresh() }}>Cancel meeting</Button>
                  <Button size="sm" onClick={async () => { await completeHandover(Number(anyHandover.id)); toast.success('Handover completed. We\'ll refresh your view.'); refresh() }}>Mark as completed</Button>
                </div>
              )}
            </div>
          )
        })()}
      </div>
    </div>
  )
}

export default CatProfilePage

// ...existing code...

// Helper: Check if there are any pending transfers
function hasPendingTransfers(cat: any) {
  return cat.placement_requests?.some((pr: any) => (pr.transfer_requests?.filter((tr: any) => tr.status === 'pending').length ?? 0) > 0)
}

function hasAcceptedTransfers(cat: any) {
  return cat.placement_requests?.some((pr: any) => (pr.transfer_requests?.filter((tr: any) => tr.status === 'accepted').length ?? 0) > 0)
}

// Helper: Response section for a placement request
function ResponseSection({ placementRequest, onViewProfile, onConfirm, onReject }: {
  placementRequest: any
  onViewProfile: (tr: any) => void
  onConfirm: (id: number) => void
  onReject: (id: number) => void
}) {
  const pendingTransfers = placementRequest.transfer_requests?.filter((tr: any) => tr.status === 'pending') ?? []
  if (pendingTransfers.length === 0) return null
  return (
    <div className="mb-4 p-4 border rounded-lg">
      <div className="flex justify-between items-center">
        <h3 className="font-bold">
          Responses for{' '}
          <span>{placementRequest.request_type.replace('_', ' ').toUpperCase()}</span>
        </h3>
      </div>
      <ul>
  {pendingTransfers.map((transferRequest: any) => (
          <li key={transferRequest.id} className="flex justify-between items-center">
            <span>{transferRequest.helper_profile?.user?.name}</span>
            <div>
              <Button
                variant="secondary"
                size="sm"
                className="mr-2"
                onClick={() => onViewProfile(transferRequest)}
              >
                View helper profile
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="mr-2"
                onClick={() => onConfirm(transferRequest.id)}
              >
                Confirm
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onReject(transferRequest.id)}
              >
                Reject
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

// Accepted transfers section
function AcceptedSection({ placementRequest, onSchedule, hasHandover, getHandover }: {
  placementRequest: any
  onSchedule: (id: number) => void
  hasHandover: (id: number) => boolean
  getHandover: (id: number) => any | undefined
}) {
  const accepted = placementRequest.transfer_requests?.filter((tr: any) => tr.status === 'accepted') ?? []
  if (accepted.length === 0) return null
  return (
    <div className="mb-4 p-4 border rounded-lg">
      <div className="flex justify-between items-center">
        <h3 className="font-bold">
          Accepted for <span>{placementRequest.request_type.replace('_', ' ').toUpperCase()}</span>
        </h3>
      </div>
      <ul>
        {accepted.map((tr: any) => {
          const ho = getHandover(Number(tr.id))
          const status = (ho?.status as string | undefined) ?? undefined
          const chip = status
            ? (
              <Badge variant={status === 'confirmed' ? 'default' : status === 'disputed' ? 'destructive' : status === 'canceled' ? 'outline' : 'secondary'}>
                {status.toUpperCase()}
              </Badge>
            )
            : (hasHandover(tr.id) ? <Badge variant="secondary">PENDING</Badge> : null)
          return (
            <li key={`acc-${tr.id}`} className="flex justify-between items-center">
              <div className="flex flex-col">
                <span className="flex items-center gap-2">
                  {tr.helper_profile?.user?.name}
                  {chip}
                </span>
                {ho && (
                  <span className="text-xs text-muted-foreground mt-1">
                    Meeting: {ho.scheduled_at ? new Date(ho.scheduled_at).toLocaleString() : 'TBD'}{ho.location ? `, ${ho.location}` : ''}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!hasHandover(tr.id) && (
                  <Button size="sm" onClick={() => onSchedule(tr.id)}>Schedule handover</Button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
