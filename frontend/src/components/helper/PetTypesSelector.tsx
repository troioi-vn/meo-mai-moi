import React from 'react'
import type { PetType } from '@/types/pet'
import { CheckboxField } from '@/components/ui/CheckboxField'

interface Props {
  petTypes: PetType[]
  selectedPetTypeIds: number[]
  onChangePetTypeIds: (ids: number[]) => void
  loading?: boolean
  label?: string
  error?: string
}

export const PetTypesSelector: React.FC<Props> = ({
  petTypes,
  selectedPetTypeIds,
  onChangePetTypeIds,
  loading = false,
  label = 'Pet Types',
  error,
}) => {
  const placementAllowedPetTypes = petTypes.filter((t) => t.placement_requests_allowed)

  const toggle = (petTypeId: number, checked: boolean) => {
    const current = selectedPetTypeIds
    const next = checked ? [...current, petTypeId] : current.filter((id) => id !== petTypeId)
    onChangePetTypeIds(next)
  }

  return (
    <div>
      <label className="block text-sm font-medium text-card-foreground">{label}</label>
      {loading ? (
        <div className="text-sm text-muted-foreground mt-2">Loading pet types...</div>
      ) : placementAllowedPetTypes.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 mt-2">
          {placementAllowedPetTypes.map((petType) => (
            <CheckboxField
              key={petType.id}
              id={`pet_type_${String(petType.id)}`}
              label={petType.name}
              checked={selectedPetTypeIds.includes(petType.id)}
              onChange={(checked: boolean) => {
                toggle(petType.id, checked)
              }}
              error={error}
            />
          ))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground mt-2">
          No pet types available for placement requests.
        </div>
      )}
    </div>
  )
}
