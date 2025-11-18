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

const DEFAULT_SELECT_OPTIONS: SelectOption[] = []

interface FormFieldProps {
  id: string
  label: string
  type?: 'text' | 'date' | 'email' | 'number' | 'textarea' | 'select'
  value: string
  onChange: (value: string) => void
  error?: string
  placeholder?: string
  className?: string
  required?: boolean
  options?: SelectOption[]
  description?: string
  disabled?: boolean
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
  options = DEFAULT_SELECT_OPTIONS,
  description,
  disabled = false,
}) => {
  const labelId = `${id}-label`
  const errorId = `${id}-error`
  const descriptionId = `${id}-description`

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange(e.target.value)
  }

  const renderInput = () => {
    const commonProps = {
      'aria-labelledby': labelId,
      'aria-describedby': error ? errorId : description ? descriptionId : undefined,
      'aria-invalid': !!error,
      required,
      disabled,
    }

    if (type === 'textarea') {
      return (
        <Textarea
          id={id}
          name={id}
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          {...commonProps}
        />
      )
    }

    if (type === 'select') {
      return (
        <Select value={value} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger id={id} {...commonProps}>
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
        placeholder={placeholder}
        {...commonProps}
      />
    )
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor={id} id={labelId} className={error ? 'text-destructive' : ''}>
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {renderInput()}
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
