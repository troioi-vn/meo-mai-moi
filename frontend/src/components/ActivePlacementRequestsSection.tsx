import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CatCard } from '@/components/CatCard'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getPlacementRequests } from '@/api/cats'
import type { Cat } from '@/types/cat'

interface ActivePlacementRequestsSectionProps {
  className?: string
}

export const ActivePlacementRequestsSection: React.FC<ActivePlacementRequestsSectionProps> = ({ 
  className = '' 
}) => {
  const [cats, setCats] = useState<Cat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showMoreVisible, setShowMoreVisible] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchPlacementRequests = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await getPlacementRequests()
        
        // Client-side limiting to first 4 cats
        const limitedCats = response.slice(0, 4)
        setCats(limitedCats)
        
        // Show "Show more" button if there are more than 4 cats with active placement requests
        setShowMoreVisible(response.length > 4)
      } catch (err) {
        setError('Failed to load placement requests. Please try again later.')
        console.error('Error fetching placement requests:', err)
      } finally {
        setLoading(false)
      }
    }

    void fetchPlacementRequests()
  }, [])

  const handleShowMore = () => {
    void navigate('/requests')
  }

  const handleRetry = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await getPlacementRequests()
      
      // Client-side limiting to first 4 cats
      const limitedCats = response.slice(0, 4)
      setCats(limitedCats)
      
      // Show "Show more" button if there are more than 4 cats with active placement requests
      setShowMoreVisible(response.length > 4)
    } catch (err) {
      setError('Failed to load placement requests. Please try again later.')
      console.error('Error fetching placement requests:', err)
    } finally {
      setLoading(false)
    }
  }

  // Loading state - using skeleton cards to match the expected layout
  if (loading) {
    return (
      <section className={`container mx-auto px-4 py-8 ${className}`}>
        <h2 className="mb-8 text-3xl font-bold text-center">Active Placement Requests</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {/* Loading skeleton cards */}
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={`skeleton-${String(index)}`} className="rounded-lg border bg-card text-card-foreground shadow-sm">
              <Skeleton className="h-48 w-full rounded-t-lg" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-20" />
                </div>
                <Skeleton className="h-8 w-full" />
              </div>
            </div>
          ))}
        </div>
      </section>
    )
  }

  // Error state with user-friendly message and retry functionality
  if (error) {
    return (
      <section className={`container mx-auto px-4 py-8 ${className}`}>
        <h2 className="mb-8 text-3xl font-bold text-center">Active Placement Requests</h2>
        <div className="text-center space-y-4">
          <p className="text-destructive text-lg">{error}</p>
          <p className="text-muted-foreground">
            We're having trouble loading the placement requests. Please check your connection and try again.
          </p>
          <Button onClick={() => { void handleRetry() }} variant="outline" size="lg">
            Try Again
          </Button>
        </div>
      </section>
    )
  }

  // Empty state message when no active placement requests exist
  if (cats.length === 0) {
    return (
      <section className={`container mx-auto px-4 py-8 ${className}`}>
        <h2 className="mb-8 text-3xl font-bold text-center">Active Placement Requests</h2>
        <div className="text-center space-y-4">
          <div className="text-6xl">🐱</div>
          <p className="text-lg text-muted-foreground">
            No active placement requests at the moment.
          </p>
          <p className="text-muted-foreground">
            Check back soon for cats needing help!
          </p>
        </div>
      </section>
    )
  }

  // Main content
  return (
    <section className={`container mx-auto px-4 py-8 ${className}`}>
      <h2 className="mb-8 text-3xl font-bold text-center">Active Placement Requests</h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {cats.map((cat) => (
          <CatCard key={cat.id} cat={cat} />
        ))}
      </div>

      {showMoreVisible && (
        <div className="mt-8 text-center">
          <Button 
            onClick={handleShowMore} 
            variant="default" 
            size="lg"
            className="transition-all duration-200 hover:scale-105 focus:scale-105"
          >
            View All Requests
          </Button>
        </div>
      )}
    </section>
  )
}