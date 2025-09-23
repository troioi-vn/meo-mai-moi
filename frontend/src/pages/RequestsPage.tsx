import { useEffect, useMemo, useState } from 'react'
import { CatCard } from '@/components/CatCard'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { getPlacementRequests } from '@/api/cats'
import type { Cat } from '@/types/cat'

const RequestsPage = () => {
  const [cats, setCats] = useState<Cat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<'all' | 'foster' | 'adoption'>('all')
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)

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

  const filteredCats = useMemo(() => {
    if (cats.length === 0) return [] as Cat[]
    return cats.filter((cat) => {
      const prs = cat.placement_requests
      if (!prs || prs.length === 0) return false

      // Hide cats with only fulfilled placement requests
      const hasActivePlacementRequest = prs.some(
        (pr) => pr.is_active === true || pr.status === 'open' || pr.status === 'pending_review'
      )
      if (!hasActivePlacementRequest) return false

      // Type filter
      const matchesType =
        typeFilter === 'all' ||
        prs.some((pr) => {
          const t = (pr.request_type ? pr.request_type : '').toLowerCase()
          const isFoster = t.includes('foster')
          const isAdoption = t === 'adoption' || t === 'permanent'
          return typeFilter === 'foster' ? isFoster : isAdoption
        })

      if (!matchesType) return false

      // Date filter (optional, applied if provided)
      const sd = startDate ? startDate.getTime() : undefined
      const ed = endDate ? endDate.getTime() : undefined
      if (!sd && !ed) return true

      return prs.some((pr) => {
        const prStart = pr.start_date ? new Date(pr.start_date).getTime() : undefined
        const prEnd = pr.end_date ? new Date(pr.end_date).getTime() : undefined
        if (sd && prEnd && prEnd < sd) return false
        if (ed && prStart && prStart > ed) return false
        return true
      })
    })
  }, [cats, typeFilter, startDate, endDate])

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-4xl font-bold text-center">Placement Requests</h1>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Select
            value={typeFilter}
            onValueChange={(v) => {
              setTypeFilter(v as 'all' | 'foster' | 'adoption')
            }}
          >
            <SelectTrigger className="w-[220px]" aria-label="Type Filter">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="foster">Foster</SelectItem>
              <SelectItem value="adoption">Adoption</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground">Start Date</span>
            <DatePicker date={startDate} setDate={setStartDate} />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground">End Date</span>
            <DatePicker date={endDate} setDate={setEndDate} />
          </div>
        </div>
      </div>

      {/* Derived list */}
      <>
        {loading && (
          <p className="text-muted-foreground text-center">Loading placement requests...</p>
        )}
        {error && <p className="text-destructive text-center">{error}</p>}

        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredCats.map((cat) => (
              <CatCard key={cat.id} cat={cat} />
            ))}
            {filteredCats.length === 0 && (
              <p className="col-span-full text-center text-muted-foreground">
                No results match your filters.
              </p>
            )}
          </div>
        )}
      </>
    </div>
  )
}

export default RequestsPage
