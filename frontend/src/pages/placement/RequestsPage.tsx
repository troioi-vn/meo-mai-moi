import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PetCard } from '@/components/pets/PetCard'
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
import { getCountryName } from '@/components/ui/CountrySelect'

// Placement request type values matching backend enum
type PlacementRequestType = 'all' | 'foster_paid' | 'foster_free' | 'permanent'

const PLACEMENT_REQUEST_TYPE_LABELS: Record<PlacementRequestType, string> = {
  all: 'All Request Types',
  foster_paid: 'Foster (Paid)',
  foster_free: 'Foster (Free)',
  permanent: 'Permanent',
}

type SortDirection = 'newest' | 'oldest'

const SORT_DIRECTION_LABELS: Record<SortDirection, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
}

// Date comparison operators
type DateComparison = 'before' | 'on' | 'after'

const DATE_COMPARISON_LABELS: Record<DateComparison, string> = {
  before: 'Before',
  on: 'On',
  after: 'After',
}

const RequestsPage = () => {
  const [pets, setPets] = useState<Pet[]>([])
  const [petTypes, setPetTypes] = useState<PetType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [requestTypeFilter, setRequestTypeFilter] = useState<PlacementRequestType>('all')
  const [petTypeFilter, setPetTypeFilter] = useState<string>('all')
  const [countryFilter, setCountryFilter] = useState<string>('all')
  const [pickupDate, setPickupDate] = useState<Date | undefined>(undefined)
  const [pickupDateComparison, setPickupDateComparison] = useState<DateComparison>('on')
  const [dropoffDate, setDropoffDate] = useState<Date | undefined>(undefined)
  const [dropoffDateComparison, setDropoffDateComparison] = useState<DateComparison>('on')
  const [createdSortDirection, setCreatedSortDirection] = useState<SortDirection>('newest')
  const [searchParams, setSearchParams] = useSearchParams()

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
      } catch (err: unknown) {
        setError('Failed to fetch data. Please try again later.')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    void fetchInitialData()
  }, [])

  useEffect(() => {
    const sortParam = searchParams.get('sort')
    if (sortParam === 'newest' || sortParam === 'oldest') {
      if (sortParam !== createdSortDirection) {
        setCreatedSortDirection(sortParam)
      }
      return
    }

    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('sort', 'newest')
        return next
      },
      { replace: true }
    )
  }, [createdSortDirection, searchParams, setSearchParams])

  // Get unique countries from pets for the country filter
  const availableCountries = useMemo(() => {
    const countryCodes = new Set<string>()
    pets.forEach((pet) => {
      if (pet.country) {
        countryCodes.add(pet.country)
      }
    })
    return Array.from(countryCodes).sort((a, b) => {
      const nameA = getCountryName(a)
      const nameB = getCountryName(b)
      return nameA.localeCompare(nameB)
    })
  }, [pets])

  const filteredPets = useMemo(() => {
    if (pets.length === 0) return [] as Pet[]
    const filtered = pets.filter((pet) => {
      const prs = pet.placement_requests
      if (!prs || prs.length === 0) return false

      // Hide pets with no visible placement requests
      const visibleStatuses = ['open', 'fulfilled', 'pending_transfer', 'active', 'finalized']
      const hasVisiblePlacementRequest = prs.some((pr) =>
        visibleStatuses.includes(pr.status.toLowerCase())
      )
      if (!hasVisiblePlacementRequest) return false

      // Pet Type filter
      if (petTypeFilter !== 'all' && pet.pet_type.slug !== petTypeFilter) {
        return false
      }

      // Country filter
      if (countryFilter !== 'all' && pet.country !== countryFilter) {
        return false
      }

      // Request Type filter (matches placement request's request_type)
      const matchesRequestType =
        requestTypeFilter === 'all' ||
        prs.some((pr) => {
          const prType = pr.request_type.toLowerCase()
          return prType === requestTypeFilter
        })

      if (!matchesRequestType) return false

      // Date filters (optional, applied if provided)
      // Helper to compare dates based on comparison operator
      const compareDates = (
        prDate: number | undefined,
        filterDate: number,
        comparison: DateComparison
      ): boolean => {
        if (prDate === undefined) return false
        switch (comparison) {
          case 'before':
            return prDate < filterDate
          case 'on':
            // Compare dates only (ignore time)
            return new Date(prDate).toDateString() === new Date(filterDate).toDateString()
          case 'after':
            return prDate > filterDate
        }
      }

      // Apply pickup date filter
      if (pickupDate) {
        const filterTime = pickupDate.getTime()
        const matchesPickup = prs.some((pr) => {
          const prStart = pr.start_date ? new Date(pr.start_date).getTime() : undefined
          return compareDates(prStart, filterTime, pickupDateComparison)
        })
        if (!matchesPickup) return false
      }

      // Apply drop-off date filter (only for non-permanent requests)
      if (dropoffDate && requestTypeFilter !== 'permanent') {
        const filterTime = dropoffDate.getTime()
        const matchesDropoff = prs.some((pr) => {
          const prEnd = pr.end_date ? new Date(pr.end_date).getTime() : undefined
          return compareDates(prEnd, filterTime, dropoffDateComparison)
        })
        if (!matchesDropoff) return false
      }

      return true
    })

    const getLatestRequestCreatedAt = (pet: Pet): number => {
      const timestamps =
        pet.placement_requests
          ?.map((pr) => (pr.created_at ? new Date(pr.created_at).getTime() : NaN))
          .filter((t) => !Number.isNaN(t)) ?? []
      if (timestamps.length === 0) return 0
      return Math.max(...timestamps)
    }

    return filtered
      .map((pet) => ({
        pet,
        latestCreatedAt: getLatestRequestCreatedAt(pet),
      }))
      .sort((a, b) => {
        const diff = b.latestCreatedAt - a.latestCreatedAt
        return createdSortDirection === 'newest' ? diff : -diff
      })
      .map(({ pet }) => pet)
  }, [
    pets,
    requestTypeFilter,
    petTypeFilter,
    countryFilter,
    pickupDate,
    pickupDateComparison,
    dropoffDate,
    dropoffDateComparison,
    createdSortDirection,
  ])

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-4xl font-bold text-center">Placement Requests</h1>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4">
        {/* First row: Request Type, Pet Type, Country */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Select
            value={requestTypeFilter}
            onValueChange={(v) => {
              setRequestTypeFilter(v as PlacementRequestType)
            }}
          >
            <SelectTrigger className="w-full sm:w-180px" aria-label="Request Type Filter">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(PLACEMENT_REQUEST_TYPE_LABELS) as PlacementRequestType[]).map(
                (type) => (
                  <SelectItem key={type} value={type}>
                    {PLACEMENT_REQUEST_TYPE_LABELS[type]}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
          <Select value={petTypeFilter} onValueChange={setPetTypeFilter}>
            <SelectTrigger className="w-full sm:w-45" aria-label="Pet Type Filter">
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
          <Select value={countryFilter} onValueChange={setCountryFilter}>
            <SelectTrigger className="w-full sm:w-45" aria-label="Country Filter">
              <SelectValue placeholder="All Countries" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Countries</SelectItem>
              {availableCountries.map((code) => (
                <SelectItem key={code} value={code}>
                  {getCountryName(code)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={createdSortDirection}
            onValueChange={(v) => {
              const direction = v as SortDirection
              setCreatedSortDirection(direction)
              setSearchParams((prev) => {
                const next = new URLSearchParams(prev)
                next.set('sort', direction)
                return next
              })
            }}
          >
            <SelectTrigger className="w-full sm:w-45" aria-label="Created Date Sort">
              <SelectValue placeholder="Sort by Created Date" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SORT_DIRECTION_LABELS) as SortDirection[]).map((dir) => (
                <SelectItem key={dir} value={dir}>
                  {SORT_DIRECTION_LABELS[dir]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* Second row: Date filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Pickup Date filter */}
          <div className="flex gap-2 items-center">
            <span className="text-sm text-muted-foreground shrink-0">Pickup</span>
            <Select
              value={pickupDateComparison}
              onValueChange={(v) => {
                setPickupDateComparison(v as DateComparison)
              }}
            >
              <SelectTrigger className="w-20" aria-label="Pickup Date Comparison">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(DATE_COMPARISON_LABELS) as DateComparison[]).map((op) => (
                  <SelectItem key={op} value={op}>
                    {DATE_COMPARISON_LABELS[op]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DatePicker date={pickupDate} setDate={setPickupDate} className="w-32.5" />
          </div>

          {/* Drop-off Date filter - hidden for permanent requests */}
          {requestTypeFilter !== 'permanent' && (
            <div className="flex gap-2 items-center">
              <span className="text-sm text-muted-foreground shrink-0">Drop-off</span>
              <Select
                value={dropoffDateComparison}
                onValueChange={(v) => {
                  setDropoffDateComparison(v as DateComparison)
                }}
              >
                <SelectTrigger className="w-20" aria-label="Drop-off Date Comparison">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(DATE_COMPARISON_LABELS) as DateComparison[]).map((op) => (
                    <SelectItem key={op} value={op}>
                      {DATE_COMPARISON_LABELS[op]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <DatePicker date={dropoffDate} setDate={setDropoffDate} className="w-32.5" />
            </div>
          )}
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
