import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { YearMonthDatePicker } from '@/components/ui/YearMonthDatePicker'

export interface VaccinationFormValues {
  vaccine_name: string
  administered_at: string
  due_at?: string | null
  notes?: string | null
}

// Normalize date string to YYYY-MM-DD format for HTML date input
const normalizeDate = (dateStr: string | undefined | null, defaultDate?: string): string => {
  if (!dateStr) return defaultDate ?? ''
  // If already in YYYY-MM-DD format, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
  // Otherwise parse and convert
  const d = new Date(dateStr)
  return d.toISOString().split('T')[0] ?? ''
}

export const VaccinationForm: React.FC<{
  initial?: Partial<VaccinationFormValues>
  onSubmit: (values: VaccinationFormValues) => Promise<void>
  onCancel: () => void
  submitting?: boolean
  serverError?: string | null
}> = ({ initial, onSubmit, onCancel, submitting, serverError }) => {
  const [vaccineName, setVaccineName] = useState<string>(initial?.vaccine_name ?? '')
  const [administeredAt, setAdministeredAt] = useState<string>(() =>
    normalizeDate(initial?.administered_at, new Date().toISOString().split('T')[0])
  )
  const [dueAt, setDueAt] = useState<string>(() => {
    if (initial?.due_at) return normalizeDate(initial.due_at)
    const nextYear = new Date()
    nextYear.setFullYear(nextYear.getFullYear() + 1)
    return nextYear.toISOString().split('T')[0] ?? ''
  })
  const [notes, setNotes] = useState<string>(initial?.notes ?? '')
  const [errors, setErrors] = useState<{
    vaccine_name?: string
    administered_at?: string
    due_at?: string
  }>({})

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault()
    const newErrors: typeof errors = {}
    if (!vaccineName || vaccineName.trim().length === 0)
      newErrors.vaccine_name = 'Vaccine name is required'
    if (!administeredAt) newErrors.administered_at = 'Administered date is required'
    if (dueAt && administeredAt && new Date(dueAt) < new Date(administeredAt)) {
      newErrors.due_at = 'Due date must be on or after administered date'
    }
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return
    await onSubmit({
      vaccine_name: vaccineName.trim(),
      administered_at: administeredAt,
      due_at: dueAt || null,
      notes: notes.trim() || null,
    })
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
          <label className="block text-sm font-medium">Vaccine</label>
          <input
            type="text"
            value={vaccineName}
            onChange={(e) => {
              setVaccineName(e.target.value)
            }}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            placeholder="e.g., Rabies"
          />
          {errors.vaccine_name && (
            <p className="text-xs text-destructive mt-1">{errors.vaccine_name}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium">Administered on</label>
          <div className="mt-1">
            <YearMonthDatePicker
              value={administeredAt}
              onChange={setAdministeredAt}
              placeholder="Select date"
              className="w-full"
            />
          </div>
          {errors.administered_at && (
            <p className="text-xs text-destructive mt-1">{errors.administered_at}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium">Due at (optional)</label>
          <div className="mt-1">
            <YearMonthDatePicker
              value={dueAt}
              onChange={setDueAt}
              placeholder="Select date"
              className="w-full"
              allowFuture
            />
          </div>
          {errors.due_at && <p className="text-xs text-destructive mt-1">{errors.due_at}</p>}
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value)
            }}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            rows={3}
          />
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
