import React from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

interface CheckboxFieldProps {
  id: string
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  error?: string
  className?: string
}

export const CheckboxField: React.FC<CheckboxFieldProps> = ({
  id,
  label,
  checked,
  onChange,
  error,
  className = '',
}) => {
  const labelId = `${id}-label`

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Checkbox
        id={id}
        name={id}
        checked={checked}
        onCheckedChange={onChange}
        aria-labelledby={labelId}
      />
      <Label htmlFor={id} id={labelId}>
        {label}
      </Label>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  )
}
