import * as React from 'react'
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

interface BirthdayDatePickerProps {
  value?: string // YYYY-MM-DD format
  onChange: (value: string) => void
  error?: string
  placeholder?: string
  className?: string
  id?: string
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

// Generate years from current year going back (for pets, 30 years should be plenty)
const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: 40 }, (_, i) => currentYear - i)

export function BirthdayDatePicker({
  value,
  onChange,
  error,
  placeholder = 'Select birthday',
  className,
  id,
}: BirthdayDatePickerProps) {
  const [open, setOpen] = React.useState(false)

  // Parse value to Date object
  const date = value ? new Date(value + 'T00:00:00') : undefined

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
          {date ? format(date, 'MMMM d, yyyy') : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex items-center justify-center gap-2 border-b p-3">
          <Select value={String(getMonth(displayMonth))} onValueChange={handleMonthChange}>
            <SelectTrigger className="h-8 w-[120px]">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((month, index) => (
                <SelectItem key={month} value={String(index)}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={String(getYear(displayMonth))} onValueChange={handleYearChange}>
            <SelectTrigger className="h-8 w-[90px]">
              <SelectValue placeholder="Year" />
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
          mode="single"
          selected={date}
          onSelect={handleSelect}
          month={displayMonth}
          onMonthChange={setDisplayMonth}
          disabled={(date) => date > new Date()}
        />
      </PopoverContent>
    </Popover>
  )
}
