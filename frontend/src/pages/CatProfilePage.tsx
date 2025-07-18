import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useCatProfile } from '@/hooks/useCatProfile'
import { Button } from '@/components/ui/button'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { CatDetails } from '@/components/CatDetails'

const CatProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { cat, loading, error } = useCatProfile(id)

  const handleBackClick = () => {
    void navigate('/')
  }

  const handleEditClick = () => {
    if (cat?.id) {
      void navigate(`/cats/${String(cat.id)}/edit`)
    }
  }

  const handleMyCatsClick = () => {
    void navigate('/account/cats')
  }

  if (loading) {
    return <LoadingState message="Loading cat information..." />
  }

  if (error) {
    return <ErrorState error={error} onRetry={handleBackClick} />
  }

  if (!cat) {
    return <ErrorState error="Cat not found" onRetry={handleBackClick} />
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Navigation Buttons */}
        <div className="mb-6">
          <div className="flex gap-3 mb-4">
            <Button onClick={handleBackClick} variant="outline">
              ← Back
            </Button>

            {/* Owner-only buttons */}
            {cat.viewer_permissions?.can_edit && (
              <>
                <Button onClick={handleEditClick} variant="default">
                  Edit
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
      </div>
    </div>
  )
}

export default CatProfilePage
