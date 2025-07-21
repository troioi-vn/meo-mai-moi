import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useNavigate } from 'react-router-dom'
import { CatCard } from '@/components/CatCard'
import { PlusCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getMyCats } from '@/api/cats'
import type { Cat } from '@/types/cat'
import { useAuth } from '@/hooks/use-auth'

export default function MyCatsPage() {
  const [cats, setCats] = useState<Cat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const { isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const fetchCats = async () => {
      try {
        setLoading(true)
        const response = await getMyCats()
        setCats(Array.isArray(response) ? response : [])
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
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading authentication status...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Please log in to view your cats.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 bg-background min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-foreground">My Cats</h1>
        <Button onClick={() => void navigate('/account/cats/create')}>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Cat
        </Button>
      </div>

      {loading && <p className="text-muted-foreground">Loading your cats...</p>}
      {error && <p className="text-destructive">{error}</p>}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 mb-6">
            {cats
              .filter((cat) => showAll || cat.status !== 'deceased')
              .map((cat) => (
                <CatCard key={cat.id} cat={cat} />
              ))}
          </div>

          {/* Show All Toggle - Below the cards */}
          <div className="flex items-center justify-center space-x-2 mt-8">
            <Switch
              id="show-all"
              checked={showAll}
              onCheckedChange={setShowAll}
              className="scale-75"
            />
            <label
              htmlFor="show-all"
              className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Show all (including deceased)
            </label>
          </div>
        </>
      )}
    </div>
  )
}
