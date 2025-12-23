import React, { useCallback, useEffect, useMemo, useState, useId } from 'react'
import { CheckIcon, Loader2, PlusIcon } from 'lucide-react'
import {
  Tags,
  TagsContent,
  TagsEmpty,
  TagsGroup,
  TagsInput,
  TagsItem,
  TagsList,
  TagsTrigger,
  TagsValue,
} from '@/components/ui/shadcn-io/tags'
import { Badge } from '@/components/ui/badge'
import { getCities, createCity } from '@/api/cities'
import type { City } from '@/types/pet'
import { toast } from 'sonner'

interface Props {
  country: string | null
  value: City | null
  onChange: (city: City | null) => void
  disabled?: boolean
  allowCreate?: boolean
  error?: string
}

export const CitySelect: React.FC<Props> = ({
  country,
  value,
  onChange,
  disabled = false,
  allowCreate = true,
  error,
}) => {
  const [cities, setCities] = useState<City[]>([])
  const [loading, setLoading] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [creating, setCreating] = useState(false)
  const inputId = useId()

  const loadCities = useCallback(async () => {
    if (!country) {
      setCities([])
      return
    }
    setLoading(true)
    try {
      const result = await getCities({ country })
      setCities(result)
    } catch (err: unknown) {
      console.error('Failed to load cities:', err)
      toast.error('Failed to load cities')
    } finally {
      setLoading(false)
    }
  }, [country])

  useEffect(() => {
    void loadCities()
  }, [loadCities])

  // Clear selected city if country changes
  useEffect(() => {
    if (country && value && value.country !== country) {
      onChange(null)
    }
  }, [country, value, onChange])

  const handleSelect = (cityId: string) => {
    const city = cities.find((c) => String(c.id) === cityId)
    if (!city) return
    onChange(city)
  }

  const handleClear = () => {
    onChange(null)
  }

  const handleCreateCity = async () => {
    if (!country || !searchValue.trim() || creating) return
    setCreating(true)
    try {
      const newCity = await createCity({
        name: searchValue.trim(),
        country,
      })
      setCities((prev) => [...prev, newCity])
      onChange(newCity)
      setSearchValue('')
      toast.success('City created (pending approval)')
    } catch (err: unknown) {
      console.error('Failed to create city:', err)
      toast.error('Failed to create city')
    } finally {
      setCreating(false)
    }
  }

  const exactMatch = useMemo(
    () => cities.some((c) => c.name.toLowerCase() === searchValue.toLowerCase().trim()),
    [cities, searchValue]
  )
  const canCreate = allowCreate
    ? Boolean(searchValue.trim().length > 0 && !exactMatch && country && !creating && !disabled)
    : false

  if (!country) {
    return (
      <div className="space-y-2">
        <label className={`text-sm font-medium ${error ? 'text-destructive' : ''}`}>City</label>
        <div className="text-sm text-muted-foreground">Select a country first to choose a city</div>
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <label className={`text-sm font-medium ${error ? 'text-destructive' : ''}`} htmlFor={inputId}>
        City
      </label>
      <input id={inputId} className="sr-only" readOnly value={value?.name ?? ''} />
      <Tags className="w-full">
        <TagsTrigger
          disabled={disabled}
          className={error ? 'border-destructive' : ''}
          placeholder="Select city"
        >
          {value && (
            <TagsValue onRemove={handleClear}>
              {value.name}
              {!value.approved_at && (
                <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0">
                  Pending
                </Badge>
              )}
            </TagsValue>
          )}
        </TagsTrigger>
        <TagsContent>
          <TagsInput
            placeholder={loading ? 'Loading...' : 'Search cities...'}
            onValueChange={setSearchValue}
            disabled={loading}
          />
          <TagsList>
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : (
              <>
                <TagsEmpty>
                  {canCreate ? (
                    <button
                      className="mx-auto flex cursor-pointer items-center gap-2 text-sm"
                      onClick={() => void handleCreateCity()}
                      type="button"
                      disabled={creating}
                    >
                      {creating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <PlusIcon className="text-muted-foreground" size={14} />
                      )}
                      Create: &quot;{searchValue.trim()}&quot;
                    </button>
                  ) : (
                    'No cities found.'
                  )}
                </TagsEmpty>
                <TagsGroup>
                  {cities.map((city) => {
                    const isSelected = value?.id === city.id
                    return (
                      <TagsItem key={city.id} value={String(city.id)} onSelect={handleSelect}>
                        <div className="flex flex-col">
                          <span>{city.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {!city.approved_at && (
                            <Badge variant="outline" className="text-xs">
                              Pending
                            </Badge>
                          )}
                          {isSelected && <CheckIcon className="text-muted-foreground" size={14} />}
                        </div>
                      </TagsItem>
                    )
                  })}
                </TagsGroup>
              </>
            )}
          </TagsList>
        </TagsContent>
      </Tags>
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  )
}
