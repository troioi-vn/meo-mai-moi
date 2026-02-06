import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { YearMonthDatePicker } from '@/components/ui/YearMonthDatePicker'

export interface MedicalRecordFormValues {
  record_type: string
  description: string
  record_date: string
  vet_name: string
}

const RECORD_TYPE_OPTIONS = [
  { value: 'Deworming', label: 'Deworming' },
  { value: 'Checkup', label: 'Checkup' },
  { value: 'Neuter/Spay', label: 'Neuter/Spay' },
  { value: 'Symptom', label: 'Symptom' },
  { value: 'Surgery', label: 'Surgery' },
  { value: 'Vet Visit', label: 'Vet Visit' },
  { value: 'Test Result', label: 'Test Result' },
  { value: 'X-Ray', label: 'X-Ray' },
  { value: 'Medication', label: 'Medication' },
  { value: 'Treatment', label: 'Treatment' },
  { value: '__other__', label: 'Other' },
] as const

const isKnownType = (value: string) =>
  RECORD_TYPE_OPTIONS.some((opt) => opt.value === value && opt.value !== '__other__')

// Normalize date string to YYYY-MM-DD format for HTML date input
const normalizeDate = (dateStr: string | undefined | null): string => {
  if (!dateStr) return new Date().toISOString().split('T')[0] ?? ''
  // If already in YYYY-MM-DD format, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
  // Otherwise parse and convert
  const d = new Date(dateStr)
  return d.toISOString().split('T')[0] ?? ''
}

export const MedicalRecordForm: React.FC<{
  initial?: Partial<MedicalRecordFormValues>
  onSubmit: (values: MedicalRecordFormValues) => Promise<void>
  onCancel: () => void
  submitting?: boolean
  serverError?: string | null
}> = ({ initial, onSubmit, onCancel, submitting, serverError }) => {
  const initialIsKnown = initial?.record_type ? isKnownType(initial.record_type) : true
  const [selectedOption, setSelectedOption] = useState<string>(
    initialIsKnown ? (initial?.record_type ?? 'Vet Visit') : '__other__'
  )
  const [customType, setCustomType] = useState<string>(
    initialIsKnown ? '' : (initial?.record_type ?? '')
  )
  const [description, setDescription] = useState<string>(initial?.description ?? '')
  const [date, setDate] = useState<string>(() => normalizeDate(initial?.record_date))
  const [vetName, setVetName] = useState<string>(initial?.vet_name ?? '')
  const [errors, setErrors] = useState<{
    record_type?: string
    description?: string
    record_date?: string
  }>({})

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault()
    const newErrors: typeof errors = {}
    const finalRecordType = selectedOption === '__other__' ? customType.trim() : selectedOption
    if (!finalRecordType || finalRecordType.length === 0) {
      newErrors.record_type = 'Record type is required'
    }
    if (!description || description.trim().length === 0) {
      newErrors.description = 'Description is required'
    }
    if (!date) {
      newErrors.record_date = 'Date is required'
    }
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return
    await onSubmit({
      record_type: finalRecordType,
      description: description.trim(),
      record_date: date,
      vet_name: vetName.trim() || '',
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
          <label className="block text-sm font-medium">Record Type</label>
          <select
            value={selectedOption}
            onChange={(e) => {
              setSelectedOption(e.target.value)
              if (e.target.value !== '__other__') {
                setCustomType('')
              }
            }}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          >
            {RECORD_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {selectedOption === '__other__' && (
            <input
              type="text"
              value={customType}
              onChange={(e) => {
                setCustomType(e.target.value)
              }}
              className="mt-2 w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Enter record type"
              maxLength={100}
            />
          )}
          {errors.record_type && (
            <p className="text-xs text-destructive mt-1">{errors.record_type}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium">Date</label>
          <div className="mt-1">
            <YearMonthDatePicker
              value={date}
              onChange={setDate}
              placeholder="Select date"
              className="w-full"
            />
          </div>
          {errors.record_date && (
            <p className="text-xs text-destructive mt-1">{errors.record_date}</p>
          )}
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium">Description</label>
          <textarea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value)
            }}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            placeholder="e.g., Annual checkup - all clear"
            rows={3}
          />
          {errors.description && (
            <p className="text-xs text-destructive mt-1">{errors.description}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium">
            Vet Name <span className="text-muted-foreground">(optional)</span>
          </label>
          <input
            type="text"
            value={vetName}
            onChange={(e) => {
              setVetName(e.target.value)
            }}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            placeholder="e.g., Dr. Smith"
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Photos can be added after saving the record.</p>
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
