import { api } from '@/api/axios';
import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useCatProfile } from '@/hooks/useCatProfile'
import { Button } from '@/components/ui/button'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { CatDetails } from '@/components/CatDetails'
import { PlacementRequestModal } from '@/components/PlacementRequestModal'

const CatProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { cat, loading, error } = useCatProfile(id)
  const [isModalOpen, setIsModalOpen] = useState(false)

  

  const handleDeletePlacementRequest = async (id: number) => {
    await api.delete(`/api/placement-requests/${id}`);
  };

  const handleConfirmPlacementRequest = async (id: number) => {
    await api.post(`/api/placement-requests/${id}/confirm`);
  };

  const handleRejectPlacementRequest = async (id: number) => {
    await api.post(`/api/placement-requests/${id}/reject`);
  };

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
        <CatDetails cat={cat} />

        {/* Responses Section */}
        {cat.viewer_permissions?.can_edit && (
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4">Responses</h2>
            {cat.placement_requests?.map((placementRequest) => (
              <div key={placementRequest.id} className="mb-4 p-4 border rounded-lg">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold">Responses for {placementRequest.request_type.replace('_', ' ').toUpperCase()}</h3>
                  <Button variant="destructive" size="sm" onClick={() => handleDeletePlacementRequest(placementRequest.id)}>Delete</Button>
                </div>
                {placementRequest.transfer_requests?.length > 0 ? (
                  <ul>
                    {placementRequest.transfer_requests.map((transferRequest) => (
                      <li key={transferRequest.id} className="flex justify-between items-center">
                        <span>{transferRequest.helper_profile?.user?.name}</span>
                        <div>
                          <Button variant="outline" size="sm" className="mr-2">Confirm</Button>
                          <Button variant="destructive" size="sm">Reject</Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No responses yet.</p>
                )}
              </div>
            ))}
          </div>
        )}

        <PlacementRequestModal
          catId={cat.id}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      </div>
    </div>
  )
}

export default CatProfilePage
