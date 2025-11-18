import { useEffect, useMemo, useState } from 'react'
import { PetCard } from '@/components/PetCard'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { getPlacementRequests, getPetTypes } from '@/api/pets'
import type { Pet, PetType } from '@/types/pet'

const RequestsPage = () => {
  const [pets, setPets] = useState<Pet[]>([])
  const [petTypes, setPetTypes] = useState<PetType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<'all' | 'foster' | 'adoption'>('all')
  const [petTypeFilter, setPetTypeFilter] = useState<string>('all')
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true)
        const [petsResponse, petTypesResponse] = await Promise.all([
          getPlacementRequests(),
          getPetTypes(),
        ])
        setPets(petsResponse)
        setPetTypes(petTypesResponse)
        setError(null)
      } catch (err) {
        setError('Failed to fetch data. Please try again later.')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    void fetchInitialData()
  }, [])

  const filteredPets = useMemo(() => {
    if (pets.length === 0) return [] as Pet[]
    return pets.filter((pet) => {
      const prs = pet.placement_requests
      if (!prs || prs.length === 0) return false

      // Hide pets with only fulfilled placement requests
      const hasActivePlacementRequest = prs.some(
        (pr) => pr.is_active === true || pr.status === 'open' || pr.status === 'pending_review'
      )
      if (!hasActivePlacementRequest) return false

      // Pet Type filter
      if (petTypeFilter !== 'all' && pet.pet_type.slug !== petTypeFilter) {
        return false
      }

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
  }, [pets, typeFilter, petTypeFilter, startDate, endDate])

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-4xl font-bold text-center">Placement Requests</h1>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground">Request Type</span>
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
                <SelectItem value="all">All Request Types</SelectItem>
                <SelectItem value="foster">Foster</SelectItem>
                <SelectItem value="adoption">Adoption</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground">Pet Type</span>
            <Select value={petTypeFilter} onValueChange={setPetTypeFilter}>
              <SelectTrigger className="w-[220px]" aria-label="Pet Type Filter">
                <SelectValue placeholder="All Pet Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Pet Types</SelectItem>
                {petTypes.map((pt) => (
                  <SelectItem key={pt.id} value={pt.slug}>
                    {pt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
            {filteredPets.map((pet) => (
              <PetCard key={pet.id} pet={pet} />
            ))}
            {filteredPets.length === 0 && (
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
