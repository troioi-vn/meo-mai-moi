import React from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface SelectOption {
  value: string
  label: string
}

interface FormFieldProps {
  id: string
  label: string
  type?: 'text' | 'date' | 'textarea' | 'select'
  value: string
  onChange: (value: string) => void
  error?: string
  placeholder?: string
  className?: string
  required?: boolean
  options?: SelectOption[]
}

export const FormField: React.FC<FormFieldProps> = ({
  id,
  label,
  type = 'text',
  value,
  onChange,
  error,
  placeholder,
  className = '',
  required = false,
  options = [],
}) => {
  const labelId = `${id}-label`

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange(e.target.value)
  }

  const renderInput = () => {
    if (type === 'textarea') {
      return (
        <Textarea
          id={id}
          name={id}
          value={value}
          onChange={handleInputChange}
          aria-labelledby={labelId}
          placeholder={placeholder}
          required={required}
        />
      )
    }

    if (type === 'select') {
      return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }

    return (
      <Input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={handleInputChange}
        aria-labelledby={labelId}
        placeholder={placeholder}
        required={required}
      />
    )
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor={id} id={labelId} className="block">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {renderInput()}
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  )
}
