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
  description?: string
}

export const CheckboxField: React.FC<CheckboxFieldProps> = ({
  id,
  label,
  checked,
  onChange,
  error,
  className = '',
  description,
}) => {
  const labelId = `${id}-label`
  const errorId = `${id}-error`
  const descriptionId = `${id}-description`

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center space-x-2">
        <Checkbox
          id={id}
          name={id}
          checked={checked}
          onCheckedChange={onChange}
          aria-labelledby={labelId}
          aria-describedby={error ? errorId : description ? descriptionId : undefined}
          aria-invalid={!!error}
        />
        <Label htmlFor={id} id={labelId} className={error ? 'text-destructive' : ''}>
          {label}
        </Label>
      </div>
      {description && !error && (
        <p id={descriptionId} className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
