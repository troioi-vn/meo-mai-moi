import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'

export interface WeightFormValues {
  weight_kg: number | ''
  record_date: string
}

// Normalize date string to YYYY-MM-DD format for HTML date input
const normalizeDate = (dateStr: string | undefined | null): string => {
  if (!dateStr) return new Date().toISOString().split('T')[0] ?? ''
  // If already in YYYY-MM-DD format, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
  // Otherwise parse and convert
  const d = new Date(dateStr)
  return d.toISOString().split('T')[0] ?? ''
}

export const WeightForm: React.FC<{
  initial?: Partial<WeightFormValues>
  onSubmit: (values: { weight_kg: number; record_date: string }) => Promise<void>
  onCancel: () => void
  submitting?: boolean
  serverError?: string | null
}> = ({ initial, onSubmit, onCancel, submitting, serverError }) => {
  const [weight, setWeight] = useState<number | ''>(initial?.weight_kg ?? '')
  const [date, setDate] = useState<string>(() => normalizeDate(initial?.record_date))
  const [errors, setErrors] = useState<{ weight_kg?: string; record_date?: string }>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: typeof errors = {}
    const weightNum = typeof weight === 'string' ? Number(weight) : weight
    if (!weightNum || Number.isNaN(weightNum) || weightNum <= 0) {
      newErrors.weight_kg = 'Enter a valid weight (kg)'
    }
    if (!date) {
      newErrors.record_date = 'Date is required'
    }
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return
    await onSubmit({ weight_kg: weightNum, record_date: date })
  }

  return (
    <form
      onSubmit={(e) => {
        void handleSubmit(e)
      }}
      className="space-y-4"
      noValidate
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium">Weight (kg)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={weight}
            onChange={(e) => {
              setWeight(e.target.value === '' ? '' : Number(e.target.value))
            }}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            placeholder="e.g., 4.20"
          />
          {errors.weight_kg && <p className="text-xs text-destructive mt-1">{errors.weight_kg}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium">Date</label>
          <div className="mt-1">
            <DatePicker
              date={date ? new Date(date + 'T00:00:00') : undefined}
              setDate={(d) => {
                if (d) {
                  const yyyy = String(d.getFullYear())
                  const mm = String(d.getMonth() + 1).padStart(2, '0')
                  const dd = String(d.getDate()).padStart(2, '0')
                  setDate(`${yyyy}-${mm}-${dd}`)
                } else {
                  setDate('')
                }
              }}
              placeholder="Select date"
              className="w-full"
            />
          </div>
          {errors.record_date && (
            <p className="text-xs text-destructive mt-1">{errors.record_date}</p>
          )}
        </div>
      </div>
      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={Boolean(submitting)}>
          {submitting ? 'Saving…' : 'Save'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={Boolean(submitting)}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
