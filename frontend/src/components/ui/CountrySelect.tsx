import * as React from 'react'
import countries from 'i18n-iso-countries'
import enLocale from 'i18n-iso-countries/langs/en.json'
import ruLocale from 'i18n-iso-countries/langs/ru.json'
import { Check, ChevronsUpDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

// Register locales
countries.registerLocale(enLocale)
countries.registerLocale(ruLocale)

interface CountrySelectProps {
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  'data-testid'?: string
}

/**
 * Searchable country dropdown select component using ISO 3166-1 alpha-2 codes.
 * Uses i18n-iso-countries for the country list and cmdk for search functionality.
 */
export function CountrySelect({
  value,
  onValueChange,
  placeholder,
  disabled = false,
  className,
  'data-testid': dataTestId,
}: CountrySelectProps) {
  const { t, i18n } = useTranslation(['common'])
  const [open, setOpen] = React.useState(false)

  const lang = i18n.language.startsWith('ru') ? 'ru' : 'en'

  // Get all countries as { code: name } object
  const countryNames = React.useMemo(() => countries.getNames(lang, { select: 'official' }), [lang])

  // Sort countries alphabetically by name, but put Vietnam first as default
  const sortedCountries = React.useMemo(() => {
    const entries = Object.entries(countryNames)
    return entries.sort((a, b) => {
      // Vietnam first
      if (a[0] === 'VN') return -1
      if (b[0] === 'VN') return 1
      // Then alphabetically
      return a[1].localeCompare(b[1])
    })
  }, [countryNames])

  // Get the display name for the current value
  const selectedCountryName = value ? countryNames[value] : undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between font-normal',
            !value && 'text-muted-foreground',
            className
          )}
          disabled={disabled}
          data-testid={dataTestId}
        >
          {selectedCountryName ?? (placeholder || t('common:location.selectCountry'))}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder={t('common:location.searchCountry')} />
          <CommandList>
            <CommandEmpty>{t('common:location.noCountryFound')}</CommandEmpty>
            <CommandGroup>
              {sortedCountries.map(([code, name]) => (
                <CommandItem
                  key={code}
                  value={name}
                  onSelect={() => {
                    onValueChange?.(code)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn('mr-2 h-4 w-4', value === code ? 'opacity-100' : 'opacity-0')}
                  />
                  {name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

/**
 * Get country name from ISO code
 */
export function getCountryName(code: string): string {
  return countries.getName(code, 'en', { select: 'official' }) ?? code
}

/**
 * Check if a string is a valid ISO 3166-1 alpha-2 country code
 */
export function isValidCountryCode(code: string): boolean {
  return countries.isValid(code)
}

export default CountrySelect
