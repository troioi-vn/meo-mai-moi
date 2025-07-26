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
                <Button onClick={handleEditClick} variant="default">
                  Edit
                </Button>
                <Button onClick={handleOpenModal} variant="default">
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
