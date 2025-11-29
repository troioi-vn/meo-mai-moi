import React from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface FileInputProps {
  id: string
  label: string
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  error?: string
  className?: string
  multiple?: boolean
  accept?: string
  description?: string
  required?: boolean
}

export const FileInput: React.FC<FileInputProps> = ({
  id,
  label,
  onChange,
  error,
  className = '',
  multiple = false,
  accept,
  description,
  required = false,
}) => {
  const labelId = `${id}-label`
  const errorId = `${id}-error`
  const descriptionId = `${id}-description`

  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor={id} id={labelId} className={error ? 'text-destructive' : ''}>
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      <Input
        id={id}
        name={id}
        type="file"
        onChange={onChange}
        aria-labelledby={labelId}
        aria-describedby={error ? errorId : description ? descriptionId : undefined}
        aria-invalid={!!error}
        multiple={multiple}
        accept={accept}
        required={required}
      />
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
