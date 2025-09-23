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
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="show-all"
              checked={showAll}
              onCheckedChange={setShowAll}
              className="scale-75"
            />
            <label htmlFor="show-all" className="text-xs font-medium cursor-pointer">
              Show all (including deceased)
            </label>
          </div>
          <Button onClick={() => void navigate('/account/cats/create')}>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Cat
          </Button>
        </div>
      </div>

      {loading && <p className="text-muted-foreground">Loading your cats...</p>}
      {error && <p className="text-destructive">{error}</p>}

      {!loading && !error && (
        <div className="space-y-10">
          {/* Owned */}
          {(() => {
            const ownedCats = showAll
              ? sections.owned
              : sections.owned.filter((c) => c.status !== 'deceased')
            return (
              ownedCats.length > 0 && (
                <section>
                  <h2 className="text-2xl font-semibold mb-3">Owned</h2>
                  <SectionGrid cats={ownedCats} />
                </section>
              )
            )
          })()}

          {/* Fostering (Active) */}
          {sections.fostering_active.length > 0 && (
            <section>
              <h2 className="text-2xl font-semibold mb-3">Fostering (Active)</h2>
              <SectionGrid cats={sections.fostering_active} />
            </section>
          )}

          {/* Fostering (Past) */}
          {sections.fostering_past.length > 0 && (
            <section>
              <h2 className="text-2xl font-semibold mb-3">Fostering (Past)</h2>
              <SectionGrid cats={sections.fostering_past} />
            </section>
          )}

          {/* Transferred Away */}
          {sections.transferred_away.length > 0 && (
            <section>
              <h2 className="text-2xl font-semibold mb-3">Transferred Away</h2>
              <SectionGrid cats={sections.transferred_away} />
            </section>
          )}

          {/* Show message when no cats at all or no visible cats */}
          {(() => {
            const ownedCats = showAll
              ? sections.owned
              : sections.owned.filter((c) => c.status !== 'deceased')
            const hasVisibleCats =
              ownedCats.length > 0 ||
              sections.fostering_active.length > 0 ||
              sections.fostering_past.length > 0 ||
              sections.transferred_away.length > 0

            return (
              !hasVisibleCats && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">You don't have any cats yet.</p>
                  <Button onClick={() => void navigate('/account/cats/create')}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Your First Cat
                  </Button>
                </div>
              )
            )
          })()}
        </div>
      )}
    </div>
  )
}

function SectionGrid({ cats }: { cats: Cat[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
      {cats.map((cat) => (
        <CatCard key={cat.id} cat={cat} />
      ))}
    </div>
  )
}
