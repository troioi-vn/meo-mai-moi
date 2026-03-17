import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Search, RotateCcw, SlidersHorizontal } from 'lucide-react'
import { getPetTypes } from '@/api/generated/pet-types/pet-types'
import { getPublicHelperProfiles } from '@/api/public-helpers'
import type { HelperProfile, PlacementRequestType } from '@/types/helper-profile'
import type { PetType } from '@/types/pet'
import { getCountryName } from '@/components/ui/CountrySelect'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingState } from '@/components/ui/LoadingState'
import { ErrorState } from '@/components/ui/ErrorState'
import { DiscoverPageSwitch } from '@/components/navigation/DiscoverPageSwitch'
import { setStoredDiscoverPage } from '@/lib/discover-page'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const REQUEST_TYPE_OPTIONS: PlacementRequestType[] = [
  'foster_paid',
  'foster_free',
  'permanent',
  'pet_sitting',
]

export default function PublicHelperProfilesPage() {
  const { t } = useTranslation(['common', 'helper'])
  const [searchParams, setSearchParams] = useSearchParams()
  const [profiles, setProfiles] = useState<HelperProfile[]>([])
  const [petTypes, setPetTypes] = useState<PetType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterOpen, setFilterOpen] = useState(false)

  const search = searchParams.get('search') ?? ''
  const country = searchParams.get('country') ?? 'all'
  const city = searchParams.get('city') ?? ''
  const requestType = searchParams.get('request_type') ?? 'all'
  const petTypeId = searchParams.get('pet_type_id') ?? 'all'

  useEffect(() => {
    setStoredDiscoverPage('helpers')
  }, [])

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true)
        setError(null)
        const [profilesResponse, petTypesResponse] = await Promise.all([
          getPublicHelperProfiles({
            search: search || undefined,
            country: country !== 'all' ? country : undefined,
            city: city || undefined,
            request_type: requestType !== 'all' ? (requestType as PlacementRequestType) : undefined,
            pet_type_id: petTypeId !== 'all' ? Number(petTypeId) : undefined,
          }),
          getPetTypes(),
        ])
        setProfiles(profilesResponse)
        setPetTypes(petTypesResponse as PetType[])
      } catch (err) {
        console.error(err)
        setError(t('helper:public.loadError'))
      } finally {
        setLoading(false)
      }
    })()
  }, [city, country, petTypeId, requestType, search, t])

  const availableCountries = useMemo(() => {
    const countries = new Set<string>()
    profiles.forEach((profile) => {
      if (profile.country) countries.add(profile.country)
    })

    return Array.from(countries).sort((a, b) => getCountryName(a).localeCompare(getCountryName(b)))
  }, [profiles])

  const updateFilter = (key: string, value: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (!value || value === 'all') {
          next.delete(key)
        } else {
          next.set(key, value)
        }
        return next
      },
      { replace: true }
    )
  }

  const resetFilters = () => {
    setSearchParams(new URLSearchParams(), { replace: true })
  }

  const hasActiveFilters =
    search.length > 0 ||
    city.length > 0 ||
    country !== 'all' ||
    requestType !== 'all' ||
    petTypeId !== 'all'

  if (loading) {
    return <LoadingState message={t('helper:public.loading')} />
  }

  if (error) {
    return (
      <ErrorState
        error={error}
        onRetry={() => {
          window.location.reload()
        }}
      />
    )
  }

  return (
    <main className="px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">{t('helper:public.title')}</h1>
            <DiscoverPageSwitch
              target="requests"
              label={t('nav.requests')}
              onSelect={setStoredDiscoverPage}
            />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => {
                      setFilterOpen((value) => !value)
                    }}
                    className={cn(
                      'relative rounded-md p-1.5 transition-all duration-200 hover:bg-muted',
                      filterOpen || hasActiveFilters
                        ? 'bg-primary/10 text-primary hover:bg-primary/15'
                        : 'text-muted-foreground'
                    )}
                    aria-label={t('helper:public.filtersTitle')}
                    aria-expanded={filterOpen}
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    {hasActiveFilters && !filterOpen && (
                      <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p>{t('helper:public.filtersTitle')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-muted-foreground">{t('helper:public.description')}</p>
        </div>

        {filterOpen && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>{t('helper:public.filtersTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-5">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => {
                      updateFilter('search', event.target.value)
                    }}
                    placeholder={t('helper:public.searchPlaceholder')}
                    className="pl-9"
                  />
                </div>
              </div>

              <Input
                value={city}
                onChange={(event) => {
                  updateFilter('city', event.target.value)
                }}
                placeholder={t('helper:public.cityPlaceholder')}
              />

              <Select
                value={requestType}
                onValueChange={(value) => {
                  updateFilter('request_type', value)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('helper:public.allRequestTypes')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('helper:public.allRequestTypes')}</SelectItem>
                  {REQUEST_TYPE_OPTIONS.map((type) => (
                    <SelectItem key={type} value={type}>
                      {t(`common:helperProfiles.requestTypes.${type}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button type="button" variant="outline" onClick={resetFilters}>
                <RotateCcw className="mr-2 h-4 w-4" />
                {t('common:requests.filters.reset')}
              </Button>

              <Select
                value={country}
                onValueChange={(value) => {
                  updateFilter('country', value)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('helper:public.allCountries')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('helper:public.allCountries')}</SelectItem>
                  {availableCountries.map((code) => (
                    <SelectItem key={code} value={code}>
                      {getCountryName(code)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={petTypeId}
                onValueChange={(value) => {
                  updateFilter('pet_type_id', value)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('helper:public.allPetTypes')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('helper:public.allPetTypes')}</SelectItem>
                  {petTypes
                    .filter((petType) => petType.placement_requests_allowed)
                    .map((petType) => (
                      <SelectItem key={petType.id} value={String(petType.id)}>
                        {petType.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {profiles.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              {t('helper:public.empty')}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {profiles.map((profile) => {
              const cityName = typeof profile.city === 'string' ? profile.city : profile.city?.name
              const location = [cityName, profile.state, profile.country].filter(Boolean).join(', ')

              return (
                <Link key={profile.id} to={`/helpers/${String(profile.id)}`} className="block">
                  <Card className="h-full transition-colors hover:bg-accent/40">
                    <CardContent className="space-y-4 p-5">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <h2 className="line-clamp-1 text-lg font-semibold">
                            {profile.user?.name ?? t('helper:public.helperFallback')}
                          </h2>
                          <Badge>{t('helper:public.publicBadge')}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{location}</p>
                      </div>

                      {profile.experience && (
                        <p className="line-clamp-3 text-sm text-muted-foreground">
                          {profile.experience}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {profile.request_types?.map((type) => (
                          <Badge key={type} variant="outline">
                            {t(`common:helperProfiles.requestTypes.${type}`)}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
