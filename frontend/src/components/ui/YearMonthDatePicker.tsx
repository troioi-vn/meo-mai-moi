import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { formatDate, getDateLocale } from '@/lib/format-date'
import { format, setMonth, setYear, getYear, getMonth } from 'date-fns'
import { Calendar as CalendarIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface YearMonthDatePickerProps {
  value?: string // YYYY-MM-DD format
  onChange: (value: string) => void
  error?: string
  placeholder?: string
  className?: string
  id?: string
  allowFuture?: boolean
  startYear?: number
  endYear?: number
}

const parseDateValue = (value?: string): Date | undefined => {
  if (!value) return undefined

  const trimmed = value.trim()
  if (!trimmed) return undefined

  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
    ? new Date(`${trimmed}T00:00:00`)
    : new Date(trimmed)

  if (Number.isNaN(parsed.getTime())) return undefined

  return parsed
}

export function YearMonthDatePicker({
  value,
  onChange,
  error,
  placeholder,
  className,
  id,
  allowFuture = false,
  startYear,
  endYear,
}: YearMonthDatePickerProps) {
  const { t, i18n } = useTranslation('pets')
  const calendarLocale = getDateLocale(i18n.language)
  const months = Array.from({ length: 12 }, (_, index) =>
    new Intl.DateTimeFormat(i18n.language, { month: 'long' }).format(new Date(2020, index, 1))
  )
  const [open, setOpen] = React.useState(false)

  // Parse value to Date object
  const date = parseDateValue(value)

  // Track displayed month for navigation
  const [displayMonth, setDisplayMonth] = React.useState<Date>(date ?? new Date())

  const handleSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      onChange(format(selectedDate, 'yyyy-MM-dd'))
      setOpen(false)
    }
  }

  const handleYearChange = (year: string) => {
    const newDate = setYear(displayMonth, parseInt(year))
    setDisplayMonth(newDate)
  }

  const handleMonthChange = (month: string) => {
    const newDate = setMonth(displayMonth, parseInt(month))
    setDisplayMonth(newDate)
  }

  // Generate years
  const currentYear = new Date().getFullYear()
  const defaultStartYear = currentYear - 40
  const defaultEndYear = allowFuture ? currentYear + 10 : currentYear

  const finalStartYear = startYear ?? defaultStartYear
  const finalEndYear = endYear ?? defaultEndYear

  const YEARS = Array.from(
    { length: Math.max(0, finalEndYear - finalStartYear + 1) },
    (_, i) => finalEndYear - i
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          data-empty={!date}
          className={cn(
            'w-full justify-start text-left font-normal data-[empty=true]:text-muted-foreground',
            error && 'border-destructive',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? (
            formatDate(date, i18n.language)
          ) : (
            <span>{placeholder ?? t('profile.selectDate')}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex items-center justify-center gap-2 border-b p-3">
          <Select value={String(getMonth(displayMonth))} onValueChange={handleMonthChange}>
            <SelectTrigger className="h-8 w-[120px]">
              <SelectValue placeholder={t('profile.month')} />
            </SelectTrigger>
            <SelectContent>
              {months.map((month, index) => (
                <SelectItem key={month} value={String(index)}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={String(getYear(displayMonth))} onValueChange={handleYearChange}>
            <SelectTrigger className="h-8 w-[90px]">
              <SelectValue placeholder={t('profile.year')} />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Calendar
          locale={calendarLocale}
          mode="single"
          selected={date}
          onSelect={handleSelect}
          month={displayMonth}
          onMonthChange={setDisplayMonth}
          disabled={(date) => !allowFuture && date > new Date()}
        />
      </PopoverContent>
    </Popover>
  )
}
