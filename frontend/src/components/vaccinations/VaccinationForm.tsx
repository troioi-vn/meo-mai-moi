import React, { useState } from 'react'
import { Button } from '@/components/ui/button'

export type VaccinationFormValues = {
  vaccine_name: string
  administered_at: string
  due_at?: string | null
  notes?: string | null
}

export const VaccinationForm: React.FC<{
  initial?: Partial<VaccinationFormValues>
  onSubmit: (values: VaccinationFormValues) => Promise<void>
  onCancel: () => void
  submitting?: boolean
  serverError?: string | null
}> = ({ initial, onSubmit, onCancel, submitting, serverError }) => {
  const [vaccineName, setVaccineName] = useState<string>(initial?.vaccine_name ?? '')
  const [administeredAt, setAdministeredAt] = useState<string>(initial?.administered_at ?? new Date().toISOString().split('T')[0])
  const [dueAt, setDueAt] = useState<string>(initial?.due_at ?? (() => {
    const nextYear = new Date()
    nextYear.setFullYear(nextYear.getFullYear() + 1)
    return nextYear.toISOString().split('T')[0]
  })())
  const [notes, setNotes] = useState<string>(initial?.notes ?? '')
  const [errors, setErrors] = useState<{ vaccine_name?: string; administered_at?: string; due_at?: string }>(
    {}
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: typeof errors = {}
    if (!vaccineName || vaccineName.trim().length === 0) newErrors.vaccine_name = 'Vaccine name is required'
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
      notes: notes?.trim() || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium">Vaccine</label>
          <input
            type="text"
            value={vaccineName}
            onChange={(e) => setVaccineName(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            placeholder="e.g., Rabies"
          />
          {errors.vaccine_name && <p className="text-xs text-red-600 mt-1">{errors.vaccine_name}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium">Administered on</label>
          <input
            type="date"
            value={administeredAt}
            onChange={(e) => setAdministeredAt(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          />
          {errors.administered_at && (
            <p className="text-xs text-red-600 mt-1">{errors.administered_at}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium">Due at (optional)</label>
          <input
            type="date"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          />
          {errors.due_at && <p className="text-xs text-red-600 mt-1">{errors.due_at}</p>}
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            rows={3}
          />
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
