import React from 'react'
import type { PetType } from '@/types/pet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTranslation } from 'react-i18next'

interface Props {
  petTypes: PetType[]
  loading: boolean
  value: number | ''
  onChange: (petTypeId: number) => void
  error?: string
}

export const PetTypeSelect: React.FC<Props> = ({ petTypes, loading, value, onChange, error }) => {
  const stringValue = value === '' ? '' : String(value)
  const { t } = useTranslation('pets')

  return (
    <div className="space-y-2">
      <label htmlFor="pet_type_id" className="text-sm font-medium">
        {t('petType.label')}
      </label>
      {loading ? (
        <div className="text-sm text-muted-foreground">{t('petType.loading')}</div>
      ) : (
        <Select
          key={stringValue || 'empty'}
          value={stringValue}
          onValueChange={(v) => {
            onChange(Number(v))
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('petType.placeholder')} />
          </SelectTrigger>
          <SelectContent>
            {petTypes.map((petType) => (
              <SelectItem key={petType.id} value={String(petType.id)}>
                {petType.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
