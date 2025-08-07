import { useEffect, useState } from 'react'
import { CatCard } from '@/components/CatCard'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { getPlacementRequests } from '@/api/cats'
import type { Cat } from '@/types/cat'

const RequestsPage = () => {
  const [cats, setCats] = useState<Cat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoading(true)
        const response = await getPlacementRequests()
        setCats(response)
        setError(null)
      } catch (err) {
        setError('Failed to fetch placement requests. Please try again later.')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    void fetchRequests()
  }, [])

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-4xl font-bold text-center">Placement Requests</h1>

      

      {loading && <p className="text-muted-foreground text-center">Loading placement requests...</p>}
      {error && <p className="text-destructive text-center">{error}</p>}

      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {cats.map((cat) => (
            <CatCard key={cat.id} cat={cat} />
          ))}
        </div>
      )}
    </div>
  )
}

export default RequestsPage