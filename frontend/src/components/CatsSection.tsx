import { useEffect, useState } from 'react'
import { getAllCats } from '@/api/cats'
import type { Cat } from '@/types/cat'
import { CatCard } from '@/components/CatCard'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'

export function CatsSection() {
  const [cats, setCats] = useState<Cat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchCats = async () => {
      try {
        setLoading(true)
        const data = await getAllCats()
        setCats(data)
      } catch (err) {
        setError('Failed to load cats.')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    void fetchCats()
  }, [])

  if (loading) {
    return <LoadingState message="Loading cats..." />
  }

  if (error) {
    return <ErrorState error={error} />
  }

  return (
    <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
      <div className="container mx-auto px-4 md:px-6">
        <h2 className="text-3xl font-bold tracking-tighter text-center mb-8 text-foreground">
          Cats Looking for Homes Now
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {cats.map((cat) => (
            <CatCard key={cat.id} cat={cat} />
          ))}
        </div>
      </div>
    </section>
  )
}