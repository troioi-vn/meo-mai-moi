import React, { useState } from 'react'
import { Button } from '@/components/ui/button'

export interface MedicalNoteFormValues {
  note: string
  record_date: string
}

export const MedicalNoteForm: React.FC<{
  initial?: Partial<MedicalNoteFormValues>
  onSubmit: (values: { note: string; record_date: string }) => Promise<void>
  onCancel: () => void
  submitting?: boolean
  serverError?: string | null
}> = ({ initial, onSubmit, onCancel, submitting, serverError }) => {
  const [note, setNote] = useState<string>(initial?.note ?? '')
  const [date, setDate] = useState<string>(
    () => initial?.record_date ?? new Date().toISOString().split('T')[0] ?? ''
  )
  const [errors, setErrors] = useState<{ note?: string; record_date?: string }>({})

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault()
    const newErrors: typeof errors = {}
    if (!note || note.trim().length === 0) {
      newErrors.note = 'Note is required'
    }
    if (!date) {
      newErrors.record_date = 'Date is required'
    }
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return
    await onSubmit({ note: note.trim(), record_date: date })
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
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium">Note</label>
          <textarea
            value={note}
            onChange={(e) => {
              setNote(e.target.value)
            }}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            placeholder="e.g., Vaccination: Rabies"
            rows={3}
          />
          {errors.note && <p className="text-xs text-destructive mt-1">{errors.note}</p>}
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
