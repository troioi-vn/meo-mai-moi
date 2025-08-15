import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useNavigate } from 'react-router-dom'
import { CatCard } from '@/components/CatCard'
import { PlusCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getMyCatsSections } from '@/api/cats'
import type { Cat } from '@/types/cat'
import { useAuth } from '@/hooks/use-auth'

export default function MyCatsPage() {
  const [sections, setSections] = useState<{
    owned: Cat[]
    fostering_active: Cat[]
    fostering_past: Cat[]
    transferred_away: Cat[]
  }>({ owned: [], fostering_active: [], fostering_past: [], transferred_away: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const { isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const fetchCats = async () => {
      try {
        setLoading(true)
        const response = await getMyCatsSections()
        setSections(response)
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
        <div className="space-y-10">
          {/* Owned */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Owned</h2>
              <div className="flex items-center gap-2">
                <Switch id="show-all" checked={showAll} onCheckedChange={setShowAll} className="scale-75" />
                <label htmlFor="show-all" className="text-xs font-medium cursor-pointer">
                  Show all (including deceased)
                </label>
              </div>
            </div>
            <SectionGrid cats={showAll ? sections.owned : sections.owned.filter(c => c.status !== 'deceased')} />
          </section>

          {/* Fostering (Active) */}
          <section>
            <h2 className="text-2xl font-semibold mb-3">Fostering (Active)</h2>
            <SectionGrid cats={sections.fostering_active} emptyText="You are not currently fostering any cats." />
          </section>

          {/* Fostering (Past) */}
          <section>
            <h2 className="text-2xl font-semibold mb-3">Fostering (Past)</h2>
            <SectionGrid cats={sections.fostering_past} emptyText="No past fostering history yet." />
          </section>

          {/* Transferred Away */}
          <section>
            <h2 className="text-2xl font-semibold mb-3">Transferred Away</h2>
            <SectionGrid cats={sections.transferred_away} emptyText="No transferred-away cats to show yet." />
          </section>
        </div>
      )}
    </div>
  )
}

function SectionGrid({ cats, emptyText }: { cats: Cat[]; emptyText?: string }) {
  if (cats.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyText ?? 'Nothing here yet.'}</p>
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
      {cats.map((cat) => (
        <CatCard key={cat.id} cat={cat} />
      ))}
    </div>
  )
}
