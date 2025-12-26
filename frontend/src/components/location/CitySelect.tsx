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

interface BaseProps {
  country: string | null
  disabled?: boolean
  allowCreate?: boolean
  error?: string
  id?: string
  label?: string | null
}

interface SingleProps extends BaseProps {
  multiple?: false
  value: City | null
  onChange: (city: City | null) => void
}

interface MultiProps extends BaseProps {
  multiple: true
  value: City[]
  onChange: (cities: City[]) => void
  maxCities?: number
}

type Props = SingleProps | MultiProps

export const CitySelect: React.FC<Props> = (props) => {
  const {
    country,
    disabled = false,
    allowCreate = true,
    error,
    multiple = false,
    id,
    label = 'City',
  } = props

  const [cities, setCities] = useState<City[]>([])
  const [loading, setLoading] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [creating, setCreating] = useState(false)
  const generatedId = useId()
  const inputId = id ?? generatedId

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
    if (country) {
      if (multiple) {
        const value = (props as MultiProps).value
        const validCities = value.filter((c) => c.country === country)
        if (validCities.length !== value.length) {
          ;(props as MultiProps).onChange(validCities)
        }
      } else {
        const value = (props as SingleProps).value
        if (value && value.country !== country) {
          ;(props as SingleProps).onChange(null)
        }
      }
    }
  }, [country, multiple, props])

  const handleSelect = (cityId: string) => {
    const city = cities.find((c) => String(c.id) === cityId)
    if (!city) return

    if (multiple) {
      const multiProps = props as MultiProps
      const value = multiProps.value
      const maxCities = multiProps.maxCities ?? 10
      const isSelected = value.some((c) => c.id === city.id)
      if (isSelected) {
        multiProps.onChange(value.filter((c) => c.id !== city.id))
      } else if (value.length < maxCities) {
        multiProps.onChange([...value, city])
      } else {
        toast.error(`Maximum ${String(maxCities)} cities allowed`)
      }
    } else {
      const singleProps = props as SingleProps
      singleProps.onChange(city)
    }
  }

  const handleClear = () => {
    if (multiple) {
      ;(props as MultiProps).onChange([])
    } else {
      ;(props as SingleProps).onChange(null)
    }
  }

  const handleRemove = (cityId: number) => {
    if (multiple) {
      const multiProps = props as MultiProps
      const value = multiProps.value
      multiProps.onChange(value.filter((c) => c.id !== cityId))
    } else {
      ;(props as SingleProps).onChange(null)
    }
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

      if (multiple) {
        const multiProps = props as MultiProps
        const value = multiProps.value
        const maxCities = multiProps.maxCities ?? 10
        if (value.length < maxCities) {
          multiProps.onChange([...value, newCity])
        }
      } else {
        ;(props as SingleProps).onChange(newCity)
      }

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
        {label && (
          <label className={`text-sm font-medium ${error ? 'text-destructive' : ''}`}>
            {label}
          </label>
        )}
        <div className="text-sm text-muted-foreground">Select a country first to choose a city</div>
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {label && (
        <label
          className={`text-sm font-medium ${error ? 'text-destructive' : ''}`}
          htmlFor={inputId}
        >
          {label}
        </label>
      )}
      <input
        className="sr-only"
        readOnly
        value={
          multiple
            ? (props.value as City[]).map((c) => c.name).join(', ')
            : ((props.value as City | null)?.name ?? '')
        }
      />
      <Tags className="w-full">
        <TagsTrigger
          id={inputId}
          disabled={disabled}
          className={error ? 'border-destructive' : ''}
          placeholder={multiple ? 'Select cities' : 'Select city'}
        >
          {multiple
            ? (props.value as City[]).map((city) => {
                return (
                  <TagsValue
                    key={city.id}
                    onRemove={() => {
                      handleRemove(city.id)
                    }}
                  >
                    {city.name}
                    {!city.approved_at && (
                      <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0">
                        Pending
                      </Badge>
                    )}
                  </TagsValue>
                )
              })
            : props.value && (
                <TagsValue onRemove={handleClear}>
                  {(props.value as City).name}
                  {!(props.value as City).approved_at && (
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
                      onClick={() => {
                        void handleCreateCity()
                      }}
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
                    const isSelected = multiple
                      ? (props.value as City[]).some((c) => c.id === city.id)
                      : (props.value as City | null)?.id === city.id
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
