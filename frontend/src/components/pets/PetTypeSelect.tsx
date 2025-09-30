import React from 'react'
import type { PetType } from '@/types/pet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Props {
  petTypes: PetType[]
  loading: boolean
  value: number | ''
  onChange: (petTypeId: number) => void
  error?: string
}

export const PetTypeSelect: React.FC<Props> = ({ petTypes, loading, value, onChange, error }) => {
  return (
    <div className="space-y-2">
      <label htmlFor="pet_type_id" className="text-sm font-medium">
        Pet Type
      </label>
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading pet types...</div>
      ) : (
        <Select value={value === '' ? '' : String(value)} onValueChange={(v) => {
          onChange(Number(v))
        }}>
          <SelectTrigger>
            <SelectValue placeholder="Select a pet type..." />
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
