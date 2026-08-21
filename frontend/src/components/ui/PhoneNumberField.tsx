import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getCountries, type CountryOption } from '@/api/countries'

interface PhoneNumberFieldProps {
  id?: string
  label: string
  /** Full number including the dialling prefix, e.g. "+84901234567". */
  value: string
  onChange: (value: string) => void
  /** Preselects the dialling prefix for this ISO country code when the value is empty. */
  defaultCountry?: string | null
  error?: string
  describedBy?: string
  required?: boolean
}

/**
 * Dialling-prefix picker plus a digits-only input, kept in sync as one E.164-ish
 * string.
 *
 * HelperProfileFormFields has its own copy of this, deliberately left in place:
 * there the prefix is driven by the profile's country selector, and pulling that
 * coupling apart is a bigger change than sharing the markup is worth.
 */
export function PhoneNumberField({
  id = 'phone_number',
  label,
  value,
  onChange,
  defaultCountry,
  error,
  describedBy,
  required = false,
}: PhoneNumberFieldProps) {
  const { t } = useTranslation(['helper', 'common'])
  const [countries, setCountries] = React.useState<CountryOption[]>([])
  const [prefix, setPrefix] = React.useState('')
  const [digits, setDigits] = React.useState('')

  React.useEffect(() => {
    let active = true

    void (async () => {
      try {
        const result = await getCountries()
        if (active) setCountries(result)
      } catch {
        if (active) setCountries([])
      }
    })()

    return () => {
      active = false
    }
  }, [])

  const prefixOptions = React.useMemo(() => {
    const unique = Array.from(
      new Set(
        countries
          .map((country) => country.phone_prefix)
          .filter((p): p is string => typeof p === 'string' && p.length > 0)
      )
    )

    return unique.sort((a, b) => {
      const numA = Number.parseInt(a.replace('+', ''), 10)
      const numB = Number.parseInt(b.replace('+', ''), 10)
      if (Number.isNaN(numA) || Number.isNaN(numB)) return a.localeCompare(b)
      return numA - numB
    })
  }, [countries])

  // Split an incoming value once the prefix list is known. Longest prefix first,
  // so +1 does not win over +1242.
  React.useEffect(() => {
    const normalized = value.trim().replace(/[\s()-]/g, '')

    if (normalized.startsWith('+')) {
      const matched = [...prefixOptions]
        .sort((a, b) => b.length - a.length)
        .find((option) => normalized.startsWith(option))

      if (matched) {
        setPrefix(matched)
        setDigits(normalized.slice(matched.length).replace(/\D/g, ''))
        return
      }
    }

    setDigits(normalized.replace(/\D/g, ''))
  }, [value, prefixOptions])

  // Seed the prefix from the pet's country so the common case needs no picking.
  React.useEffect(() => {
    if (prefix || value || !defaultCountry) return

    const match = countries.find((country) => country.code === defaultCountry)
    if (match?.phone_prefix) setPrefix(match.phone_prefix)
  }, [countries, defaultCountry, prefix, value])

  const emit = (nextPrefix: string, nextDigits: string) => {
    onChange(nextDigits ? `${nextPrefix}${nextDigits}` : '')
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className={error ? 'text-destructive' : ''}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </Label>
      <div className="flex">
        <Select
          value={prefix}
          onValueChange={(next) => {
            setPrefix(next)
            emit(next, digits)
          }}
        >
          <SelectTrigger
            id={`${id}_prefix`}
            aria-label={t('helper:form.phoneCountryCode')}
            className="w-32 rounded-r-none border-r-0"
          >
            <SelectValue placeholder={t('helper:form.selectPhoneCountryCode')} />
          </SelectTrigger>
          <SelectContent>
            {prefixOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          id={id}
          name={id}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          className="rounded-l-none"
          value={digits}
          onChange={(event) => {
            const onlyDigits = event.target.value.replace(/\D/g, '')
            setDigits(onlyDigits)
            emit(prefix, onlyDigits)
          }}
          placeholder={t('helper:form.phoneDigitsPlaceholder')}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          required={required}
        />
      </div>
      {error && <p className="text-sm font-medium text-destructive">{error}</p>}
    </div>
  )
}
