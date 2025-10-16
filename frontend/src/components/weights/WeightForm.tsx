import React, { useState } from 'react'
import { Button } from '@/components/ui/button'

export interface WeightFormValues {
  weight_kg: number | ''
  record_date: string
}

export const WeightForm: React.FC<{
  initial?: Partial<WeightFormValues>
  onSubmit: (values: { weight_kg: number; record_date: string }) => Promise<void>
  onCancel: () => void
  submitting?: boolean
  serverError?: string | null
}> = ({ initial, onSubmit, onCancel, submitting, serverError }) => {
  const [weight, setWeight] = useState<number | ''>(initial?.weight_kg ?? '')
  const [date, setDate] = useState<string>(
    initial?.record_date ?? new Date().toISOString().split('T')[0]
  )
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
          {errors.weight_kg && <p className="text-xs text-red-600 mt-1">{errors.weight_kg}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value)
            }}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          />
          {errors.record_date && <p className="text-xs text-red-600 mt-1">{errors.record_date}</p>}
        </div>
      </div>
      {serverError && <p className="text-sm text-red-600">{serverError}</p>}
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
