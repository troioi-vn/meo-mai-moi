import React, { useMemo, useState } from 'react'
import type { PetType } from '@/types/pet'
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxSeparator,
} from '@/components/ui/combobox'
import { useTranslation } from 'react-i18next'

interface Props {
  petTypes: PetType[]
  loading: boolean
  value: number | ''
  onChange: (petTypeId: number) => void
  error?: string
}

export const PetTypeSelect: React.FC<Props> = ({ petTypes, loading, value, onChange, error }) => {
  const { t } = useTranslation('pets')
  const [searchValue, setSearchValue] = useState('')
  const sortedPetTypes = [...petTypes].sort((a, b) => a.id - b.id)
  const filteredPetTypes = useMemo(() => {
    const query = searchValue.trim().toLowerCase()

    if (query === '') {
      return sortedPetTypes
    }

    return sortedPetTypes.filter((petType) => petType.name.toLowerCase().includes(query))
  }, [searchValue, sortedPetTypes])
  const suggestedPetTypes = filteredPetTypes.slice(0, 5)
  const remainingPetTypes = filteredPetTypes.slice(5)
  const selectedPetType =
    value === '' ? null : (sortedPetTypes.find((petType) => petType.id === value) ?? null)

  return (
    <div className="space-y-2">
      <label htmlFor="pet_type_id" className="text-sm font-medium">
        {t('petType.label')}
      </label>
      {loading ? (
        <div className="text-sm text-muted-foreground">{t('petType.loading')}</div>
      ) : (
        <Combobox
          items={sortedPetTypes}
          filteredItems={filteredPetTypes}
          value={selectedPetType}
          onValueChange={(petType) => {
            if (petType) {
              onChange(petType.id)
            }
          }}
          onInputValueChange={setSearchValue}
          itemToStringLabel={(petType: PetType) => petType.name}
          itemToStringValue={(petType: PetType) => String(petType.id)}
          isItemEqualToValue={(item: PetType, selected: PetType) => item.id === selected.id}
        >
          <ComboboxInput
            id="pet_type_id"
            placeholder={t('petType.searchPlaceholder')}
            aria-invalid={error ? 'true' : undefined}
          />
          <ComboboxContent>
            <ComboboxEmpty>{t('petType.noResults')}</ComboboxEmpty>
            <ComboboxList>
              <ComboboxGroup items={suggestedPetTypes}>
                <ComboboxLabel>{t('petType.suggested')}</ComboboxLabel>
                <ComboboxCollection>
                  {(petType: PetType) => (
                    <ComboboxItem key={petType.id} value={petType}>
                      {petType.name}
                    </ComboboxItem>
                  )}
                </ComboboxCollection>
              </ComboboxGroup>

              {remainingPetTypes.length > 0 && (
                <>
                  <ComboboxSeparator />
                  <ComboboxGroup items={remainingPetTypes}>
                    <ComboboxLabel>{t('petType.more')}</ComboboxLabel>
                    <ComboboxCollection>
                      {(petType: PetType) => (
                        <ComboboxItem key={petType.id} value={petType}>
                          {petType.name}
                        </ComboboxItem>
                      )}
                    </ComboboxCollection>
                  </ComboboxGroup>
                </>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
