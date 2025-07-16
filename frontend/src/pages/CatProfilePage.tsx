import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useCatProfile } from '@/hooks/useCatProfile'
import { Button } from '@/components/ui/button'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { CatDetails } from '@/components/cat/CatDetails'

const CatProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { cat, loading, error } = useCatProfile(id)

  const handleBackClick = () => {
    navigate('/')
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
        {/* Back Button */}
        <div className="mb-6">
          <Button onClick={handleBackClick} variant="outline" className="mb-4">
            ← Back to Cats
          </Button>
        </div>

        {/* Cat Profile Content */}
        <CatDetails cat={cat} />
      </div>
    </div>
  )
}

export default CatProfilePage
