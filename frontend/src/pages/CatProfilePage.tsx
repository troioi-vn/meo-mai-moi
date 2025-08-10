import { api } from '@/api/axios';
import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useCatProfile } from '@/hooks/useCatProfile'
import { Button } from '@/components/ui/button'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
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

  

  const handleDeletePlacementRequest = async (id: number) => {
    try {
      await api.delete(`placement-requests/${id}`);
      toast.success('Placement request deleted');
      refresh();
    } catch (e) {
      toast.error('Failed to delete placement request');
    }
  };

  const handleConfirmPlacementRequest = async (id: number) => {
    try {
      await api.post(`placement-requests/${id}/confirm`);
      toast.success('Placement request confirmed');
      refresh();
    } catch (e) {
      toast.error('Failed to confirm placement request');
    }
  };

  const handleRejectPlacementRequest = async (id: number) => {
    try {
      await api.post(`placement-requests/${id}/reject`);
      toast.success('Placement request rejected');
      refresh();
    } catch (e) {
      toast.error('Failed to reject placement request');
    }
  };

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
      </div>
    </div>
  )
}

export default CatProfilePage
