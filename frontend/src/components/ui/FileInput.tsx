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
}

export const FileInput: React.FC<FileInputProps> = ({
  id,
  label,
  onChange,
  error,
  className = '',
  multiple = false,
}) => {
  const labelId = `${id}-label`

  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor={id} id={labelId} className="block">
        {label}
      </Label>
      <Input
        id={id}
        name={id}
        type="file"
        onChange={onChange}
        aria-labelledby={labelId}
        multiple={multiple}
      />
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  )
}
