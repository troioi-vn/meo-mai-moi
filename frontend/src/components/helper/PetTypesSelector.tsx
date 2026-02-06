import React from 'react'
import type { PetType } from '@/types/pet'
import { CheckboxField } from '@/components/ui/CheckboxField'
import { useTranslation } from 'react-i18next'

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
  label,
  error,
}) => {
  const { t } = useTranslation(['helper', 'common'])
  const displayLabel = label ?? t('helper:form.petTypes')
  const placementAllowedPetTypes = petTypes.filter((t) => t.placement_requests_allowed)

  const toggle = (petTypeId: number, checked: boolean) => {
    const current = selectedPetTypeIds
    const next = checked ? [...current, petTypeId] : current.filter((id) => id !== petTypeId)
    onChangePetTypeIds(next)
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-card-foreground">{displayLabel}</label>
      {loading ? (
        <div className="text-sm text-muted-foreground mt-2 italic">
          {t('common:actions.loading')}
        </div>
      ) : placementAllowedPetTypes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
          {placementAllowedPetTypes.map((petType) => (
            <div
              key={petType.id}
              className="flex items-center space-x-2 border rounded-md p-3 hover:bg-accent transition-colors"
            >
              <CheckboxField
                id={`pet_type_${String(petType.id)}`}
                label={petType.name}
                checked={selectedPetTypeIds.includes(petType.id)}
                onChange={(checked: boolean) => {
                  toggle(petType.id, checked)
                }}
                error={error}
                className="space-y-0"
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground mt-2">{t('helper:form.noPetTypes')}</div>
      )}
    </div>
  )
}
