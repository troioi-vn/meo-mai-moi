import { api } from '@/api/axios'
import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePetProfile } from '@/hooks/usePetProfile'
import { Button } from '@/components/ui/button'
import { OwnerButtonGroup } from '@/components/OwnerButtonGroup'
import { HelperProfileDialog } from '@/components/HelperProfileDialog'
import type { HelperProfile } from '@/types/helper-profile'
import type { TransferRequest } from '@/types/pet'
import { petSupportsCapability } from '@/types/pet'
import { getResponderHelperProfile } from '@/api/helper-profiles'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import PetDetails from '@/components/PetDetails'
import { PlacementRequestModal } from '@/components/PlacementRequestModal'
import { toast } from 'sonner'
import { ScheduleHandoverModal } from '@/components/ScheduleHandoverModal'
import {
  getTransferHandover,
  helperConfirmHandover,
  cancelHandover,
  completeHandover,
  type TransferHandoverDto,
} from '@/api/handovers'
import { useAuth } from '@/hooks/use-auth'
// Badge is used inside extracted components
import { WeightHistorySection } from '@/components/weights/WeightHistorySection'
import { MedicalNotesSection } from '@/components/medical/MedicalNotesSection'
import { VaccinationsSection } from '@/components/vaccinations/VaccinationsSection'
import { MicrochipsSection } from '@/components/microchips/MicrochipsSection'
import { ResponseSection } from '@/components/pet-profile/ResponseSection'
import { AcceptedSection } from '@/components/pet-profile/AcceptedSection'

const PetProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { pet, loading, error, refresh } = usePetProfile(id)
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
  const [existingHandoverByTransfer, setExistingHandoverByTransfer] = useState<
    Record<number, TransferHandoverDto>
  >({})
  const [myAcceptedTransferId, setMyAcceptedTransferId] = useState<number | null>(null)
  const [myHandover, setMyHandover] = useState<TransferHandoverDto | null>(null)

  // Load existing handovers for accepted transfers to hide schedule button
  React.useEffect(() => {
    async function load() {
      if (!pet?.placement_requests) return
      const accepted = pet.placement_requests.flatMap((pr) =>
        (pr.transfer_requests ?? []).filter((tr) => tr.status === 'accepted')
      )
      const map: Record<number, TransferHandoverDto> = {}
      await Promise.all(
        accepted.map(async (tr) => {
          try {
            const ho = await getTransferHandover(tr.id)
            if (ho) map[tr.id] = ho
          } catch {
            /* ignore */
          }
        })
      )
      setExistingHandoverByTransfer(map)
    }
    void load()
  }, [pet])

  // For helper: find my accepted transfer and its handover
  React.useEffect(() => {
    if (!pet?.placement_requests || !authUser?.id) {
      setMyAcceptedTransferId(null)
      setMyHandover(null)
      return
    }
    let foundId: number | null = null
    for (const pr of pet.placement_requests) {
      for (const tr of pr.transfer_requests ?? []) {
        const helperId = tr.initiator_user_id ?? tr.helper_profile?.user?.id
        if (tr.status === 'accepted' && helperId === authUser.id) {
          foundId = tr.id
          break
        }
      }
      if (foundId != null) break
    }
    setMyAcceptedTransferId(foundId)
    if (foundId != null) {
      void (async () => {
        try {
          const ho = await getTransferHandover(foundId)
          setMyHandover(ho)
        } catch {
          setMyHandover(null)
        }
      })()
    } else {
      setMyHandover(null)
    }
  }, [pet, authUser?.id])

  const handleDeletePlacementRequest = async (id: number) => {
    try {
      await api.delete('placement-requests/' + String(id))
      toast.success('Placement request deleted')
      refresh()
    } catch {
      toast.error('Failed to delete placement request')
    }
  }

  // Note: confirm/reject actions are handled per-transfer below

  const handleConfirmTransferRequest = async (transferRequestId: number) => {
    try {
      await api.post('transfer-requests/' + String(transferRequestId) + '/accept')
      toast.success('Transfer accepted')
      refresh()
      // After accept, prompt owner to schedule the handover
      setHandoverForTransferId(transferRequestId)
      setHandoverModalOpen(true)
    } catch {
      toast.error('Failed to accept transfer')
    }
  }
  const handleCancelMyTransferRequest = async (transferRequestId: number) => {
    try {
      await api.post('transfer-requests/' + String(transferRequestId) + '/reject')
      toast.success('Your response was cancelled')
      refresh()
    } catch {
      toast.error('Failed to cancel your response')
    }
  }

  const handleRejectTransferRequest = async (transferRequestId: number) => {
    try {
      await api.post('transfer-requests/' + String(transferRequestId) + '/reject')
      toast.success('Transfer rejected')
      refresh()
    } catch {
      toast.error('Failed to reject transfer')
    }
  }

  const handleViewResponderProfile = async (transfer: TransferRequest) => {
    try {
      setLoadingProfile(true)
      setProfileError(null)
      const p = await getResponderHelperProfile(transfer.id)
      setSelectedProfile(p)
      setSelectedTransferId(transfer.id)
      setSelectedTransfer(transfer)
      setProfileModalOpen(true)
    } catch (e: unknown) {
      console.error('Failed to load helper profile', e)
      const err = e as { response?: { status?: number } }
      const message =
        err.response?.status === 403
          ? 'Access denied to helper profile.'
          : 'Failed to load helper profile'
      setProfileError(message)
      toast.error('Failed to load helper profile')
    } finally {
      setLoadingProfile(false)
    }
  }

  const handleMyPetsClick = () => {
    void navigate('/account/pets')
  }

  const handleOpenModal = () => {
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  if (loading) {
    return <LoadingState message="Loading pet information..." />
  }

  if (error) {
    return (
      <ErrorState
        error={error}
        onRetry={() => {
          void navigate('/')
        }}
      />
    )
  }

  if (!pet) {
    return (
      <ErrorState
        error="Pet not found"
        onRetry={() => {
          void navigate('/')
        }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Navigation Buttons */}
        <div className="mb-6">
          {pet.viewer_permissions?.can_edit && (
            <OwnerButtonGroup
              onPlacementRequest={handleOpenModal}
              onMyCats={handleMyPetsClick}
              showPlacementRequest={false}
            />
          )}
        </div>
        {/* Pet Profile Content */}
        <PetDetails
          pet={pet}
          onDeletePlacementRequest={handleDeletePlacementRequest}
          onCancelTransferRequest={handleCancelMyTransferRequest}
          onTransferResponseSuccess={refresh}
          onOpenPlacementRequest={handleOpenModal}
        />{' '}
        {/* Weight history (owner) */}
        {petSupportsCapability(pet.pet_type, 'weight') && (
          <WeightHistorySection
            petId={pet.id}
            canEdit={Boolean(pet.viewer_permissions?.can_edit)}
          />
        )}
        {/* Vaccinations below weight history */}
        {petSupportsCapability(pet.pet_type, 'vaccinations') && (
          <VaccinationsSection petId={pet.id} canEdit={Boolean(pet.viewer_permissions?.can_edit)} />
        )}
        {/* Medical notes (owner) */}
        {petSupportsCapability(pet.pet_type, 'medical') && (
          <MedicalNotesSection petId={pet.id} canEdit={Boolean(pet.viewer_permissions?.can_edit)} />
        )}
        {/* Microchips (owner) */}
        {petSupportsCapability(pet.pet_type, 'microchips') && (
          <MicrochipsSection petId={pet.id} canEdit={Boolean(pet.viewer_permissions?.can_edit)} />
        )}
        {/* Responses Section */}
        {pet.viewer_permissions?.can_edit && hasPendingTransfers(pet) && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4">Responses</h2>
            {pet.placement_requests?.map((placementRequest) => (
              <ResponseSection
                key={String(placementRequest.id)}
                placementRequest={placementRequest}
                onViewProfile={(tr) => {
                  void handleViewResponderProfile(tr)
                }}
                onConfirm={(id) => {
                  void handleConfirmTransferRequest(id)
                }}
                onReject={(id) => {
                  void handleRejectTransferRequest(id)
                }}
              />
            ))}
          </div>
        )}
        {pet.viewer_permissions?.can_edit && hasAcceptedTransfers(pet) && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4">Accepted Transfer</h2>
            {pet.placement_requests?.map((placementRequest) => (
              <AcceptedSection
                key={'acc-' + String(placementRequest.id)}
                placementRequest={placementRequest}
                hasHandover={(id: number) => Boolean(existingHandoverByTransfer[id])}
                getHandover={(id: number) => existingHandoverByTransfer[id]}
                onSchedule={(id: number) => {
                  setHandoverForTransferId(id)
                  setHandoverModalOpen(true)
                }}
              />
            ))}
          </div>
        )}
        {/* Schedule Handover modal after acceptance */}
        {handoverForTransferId != null && (
          <ScheduleHandoverModal
            transferRequestId={handoverForTransferId}
            isOpen={handoverModalOpen}
            onClose={() => {
              setHandoverModalOpen(false)
            }}
            onSuccess={() => {
              refresh()
            }}
          />
        )}
        <PlacementRequestModal
          petId={pet.id}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSuccess={() => {
            refresh()
          }}
        />
        {/* Owner-only helper profile preview */}
        <HelperProfileDialog
          open={profileModalOpen}
          onOpenChange={setProfileModalOpen}
          profile={selectedProfile}
          transfer={selectedTransfer}
          loading={loadingProfile}
          error={profileError}
          onConfirm={() => {
            if (selectedTransferId != null) {
              void handleConfirmTransferRequest(selectedTransferId)
            }
          }}
          onReject={() => {
            if (selectedTransferId != null) {
              void handleRejectTransferRequest(selectedTransferId)
            }
          }}
        />
        {/* Helper-facing handover confirmation panel */}
        {!pet.viewer_permissions?.can_edit &&
          myAcceptedTransferId != null &&
          myHandover?.status === 'pending' && (
            <div className="mt-8 border rounded-lg p-4">
              <h2 className="text-xl font-semibold mb-2">Handover scheduled</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Please confirm the pet's condition at meeting. Scheduled at{' '}
                {myHandover.scheduled_at
                  ? new Date(myHandover.scheduled_at).toLocaleString()
                  : 'TBD'}
                {myHandover.location ? `, Location: ${myHandover.location}` : ''}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    void helperConfirmHandover(myHandover.id, true)
                      .then(() => {
                        toast.success('Handover confirmed')
                        refresh()
                      })
                      .catch(() => {
                        /* ignore */
                      })
                  }}
                >
                  Confirm
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    void helperConfirmHandover(myHandover.id, false)
                      .then(() => {
                        toast.info('Handover disputed')
                        refresh()
                      })
                      .catch(() => {
                        /* ignore */
                      })
                  }}
                >
                  Dispute
                </Button>
              </div>
            </div>
          )}
        {/* Meeting notice (confirmed) for both roles with cancel */}
        {(() => {
          const entries = Object.values(existingHandoverByTransfer)
          const anyHandover: TransferHandoverDto | null =
            myHandover ?? (entries.length > 0 ? entries[0] : null)
          if (!anyHandover) return null
          if (!(anyHandover.status === 'confirmed' || anyHandover.status === 'pending')) return null
          return (
            <div className="mt-8 rounded-md border border-emerald-300 bg-emerald-50 p-4">
              <h3 className="text-emerald-900 font-semibold mb-1">
                Handover {anyHandover.status === 'confirmed' ? 'confirmed' : 'scheduled'}
              </h3>
              <p className="text-sm text-emerald-800 mb-3">
                Meeting at{' '}
                {anyHandover.scheduled_at
                  ? new Date(anyHandover.scheduled_at).toLocaleString()
                  : 'TBD'}
                {anyHandover.location ? `, Location: ${anyHandover.location}` : ''}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void cancelHandover(anyHandover.id)
                      .then(() => {
                        toast.info('Handover canceled')
                        refresh()
                      })
                      .catch(() => {
                        /* ignore */
                      })
                  }}
                >
                  Cancel meeting
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    void completeHandover(anyHandover.id)
                      .then(() => {
                        toast.success("Handover completed. We'll refresh your view.")
                        refresh()
                      })
                      .catch(() => {
                        /* ignore */
                      })
                  }}
                >
                  Mark as completed
                </Button>
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}

export default PetProfilePage

// Helper: Check if there are any pending transfers
function hasPendingTransfers(pet: {
  placement_requests?: { transfer_requests?: { status?: string }[] }[]
}) {
  return pet.placement_requests?.some(
    (pr) => (pr.transfer_requests ?? []).filter((tr) => tr.status === 'pending').length > 0
  )
}

function hasAcceptedTransfers(pet: {
  placement_requests?: { transfer_requests?: { status?: string }[] }[]
}) {
  return pet.placement_requests?.some(
    (pr) => (pr.transfer_requests ?? []).filter((tr) => tr.status === 'accepted').length > 0
  )
}

// extracted components moved to '@/components/pet-profile/*'
