import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { CatCard } from '@/components/CatCard'
import { PlusCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getMyCats } from '@/api/cats'
import type { Cat } from '@/types/cat'
import { useAuth } from '@/hooks/use-auth'
import React from 'react'

export default function MyCatsPage() {
  const [cats, setCats] = useState<Cat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const fetchCats = async () => {
      try {
        setLoading(true)
        const myCats = await getMyCats()
        setCats(myCats)
        setError(null)
      } catch (err) {
        setError('Failed to fetch your cats. Please try again later.')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    if (isAuthenticated && !isLoading) {
      void fetchCats()
    }
  }, [isAuthenticated, isLoading])

  if (isLoading) {
    return <p>Loading authentication status...</p>
  }

  if (!isAuthenticated) {
    return <p>Please log in to view your cats.</p>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Cats</h1>
        <Button onClick={() => void navigate('/account/cats/create')}>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Cat
        </Button>
      </div>

      {loading && <p>Loading your cats...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {cats.map((cat) => (
            <CatCard key={cat.id} {...cat} id={String(cat.id)} />
          ))}
        </div>
      )}
    </div>
  )
}
