import { api } from '@/api/axios';
import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useCatProfile } from '@/hooks/useCatProfile'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { HelperProfile } from '@/types/helper-profile'
import type { TransferRequest } from '@/types/cat'
import { getResponderHelperProfile } from '@/api/helper-profiles'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { CatDetails } from '@/components/CatDetails'
import { PlacementRequestModal } from '@/components/PlacementRequestModal'
import { toast } from 'sonner'

const CatProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { cat, loading, error, refresh } = useCatProfile(id)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [selectedProfile, setSelectedProfile] = useState<HelperProfile | null>(null)
  const [selectedTransferId, setSelectedTransferId] = useState<number | null>(null)
  const [selectedTransfer, setSelectedTransfer] = useState<TransferRequest | null>(null)

  

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
          <div className="flex gap-3 mb-4">
            

            {/* Owner-only buttons */}
            {cat.viewer_permissions?.can_edit && (
              <>
                <Button onClick={handleEditClick} variant="outline">
                  Edit
                </Button>
                <Button onClick={handleOpenModal} variant="outline">
                  Placement Request
                </Button>
                <Button onClick={handleMyCatsClick} variant="outline">
                  My Cats
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Cat Profile Content */}
  <CatDetails
    cat={cat}
    onDeletePlacementRequest={handleDeletePlacementRequest}
    onCancelTransferRequest={handleCancelMyTransferRequest}
    onTransferResponseSuccess={refresh}
  />

        {/* Responses Section */}
  {cat.viewer_permissions?.can_edit && cat.placement_requests?.some(pr => (pr.transfer_requests?.length ?? 0) > 0) && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4">Responses</h2>
            {cat.placement_requests?.map((placementRequest) => {
              const pendingTransfers = placementRequest.transfer_requests?.filter((tr) => tr.status === 'pending') ?? []
              return (
                <div key={placementRequest.id} className="mb-4 p-4 border rounded-lg">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold">
                      Responses for{' '}
                      <span>{placementRequest.request_type.replace('_', ' ').toUpperCase()}</span>
                    </h3>
                  </div>
                  {pendingTransfers.length > 0 ? (
                    <ul>
                      {pendingTransfers.map((transferRequest) => (
                        <li key={transferRequest.id} className="flex justify-between items-center">
                          <span>{transferRequest.helper_profile?.user?.name}</span>
                          <div>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="mr-2"
                              onClick={() => handleViewResponderProfile(transferRequest)}
                            >
                              View helper profile
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mr-2"
                              onClick={() => handleConfirmTransferRequest(transferRequest.id)}
                            >
                              Confirm
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRejectTransferRequest(transferRequest.id)}
                            >
                              Reject
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No responses yet.</p>
                  )}
                </div>
              )
            })}
          </div>
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
      </div>
    </div>
  )
}

export default CatProfilePage

// Inline UI dialog for viewing a helper profile (kept simple and private to the owner)
function HelperProfileDialog({ open, onOpenChange, profile, transfer, loading, error, onConfirm, onReject }: {
  open: boolean
  onOpenChange: (o: boolean) => void
  profile: HelperProfile | null
  transfer: TransferRequest | null
  loading: boolean
  error: string | null
  onConfirm: () => void
  onReject: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Helper Profile</DialogTitle>
        </DialogHeader>
        {loading ? (
          <p>Loading…</p>
        ) : error ? (
          <p className="text-destructive">{error}</p>
        ) : profile ? (
          <div className="space-y-3">
            {transfer && (
              <div className="rounded border p-3 bg-muted/50">
                <p className="font-semibold mb-1">Response Details</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <p><strong>Relationship:</strong> {transfer.requested_relationship_type ?? 'N/A'}</p>
                  {'fostering_type' in (transfer as any) && (
                    <p><strong>Fostering Type:</strong> {(transfer as any).fostering_type ?? 'N/A'}</p>
                  )}
                  {'price' in (transfer as any) && (
                    <p><strong>Price:</strong> {(transfer as any).price ?? 'N/A'}</p>
                  )}
                  <p><strong>Status:</strong> {transfer.status ?? 'pending'}</p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <p><strong>Name:</strong> {profile.user?.name ?? 'N/A'}</p>
              <p><strong>Email:</strong> {profile.user?.email ?? 'N/A'}</p>
              <p><strong>Phone:</strong> {profile.phone_number ?? profile.phone ?? 'N/A'}</p>
              <p><strong>City:</strong> {profile.city ?? 'N/A'}</p>
              <p><strong>State:</strong> {profile.state ?? 'N/A'}</p>
              <p><strong>Country:</strong> {profile.country ?? 'N/A'}</p>
              <p><strong>Zip Code:</strong> {profile.zip_code ?? 'N/A'}</p>
              <p><strong>Has pets:</strong> {profile.has_pets ? 'Yes' : 'No'}</p>
              <p><strong>Has children:</strong> {profile.has_children ? 'Yes' : 'No'}</p>
              <p><strong>Can foster:</strong> {profile.can_foster ? 'Yes' : 'No'}</p>
              <p><strong>Can adopt:</strong> {profile.can_adopt ? 'Yes' : 'No'}</p>
              <p><strong>Status:</strong> {profile.status ?? 'N/A'}</p>
            </div>
            {profile.experience && (
              <div>
                <p className="font-semibold">Experience</p>
                <p className="text-muted-foreground whitespace-pre-line">{profile.experience}</p>
              </div>
            )}
            {Array.isArray(profile.photos) && profile.photos.length > 0 && (
              <div>
                <p className="font-semibold mb-1">Photos</p>
                <div className="grid grid-cols-3 gap-2">
                  {profile.photos.map((ph: any, idx: number) => (
                    <img key={idx} src={typeof ph === 'string' ? ph : (`/storage/${ph.path ?? ''}`)} alt="Helper" className="rounded object-cover w-full h-24" />
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={onConfirm}>Confirm</Button>
              <Button variant="destructive" onClick={onReject}>Reject</Button>
            </div>
          </div>
        ) : (
          <p>No profile available.</p>
        )}
      </DialogContent>
    </Dialog>
  )
}
