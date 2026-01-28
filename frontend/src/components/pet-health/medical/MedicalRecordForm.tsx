import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { YearMonthDatePicker } from '@/components/ui/YearMonthDatePicker'
import type { MedicalRecordType } from '@/api/pets'

export interface MedicalRecordFormValues {
  record_type: MedicalRecordType
  description: string
  record_date: string
  vet_name: string
  attachment_url: string
}

const RECORD_TYPE_OPTIONS: { value: MedicalRecordType; label: string }[] = [
  { value: 'vet_visit', label: 'Vet Visit' },
  { value: 'medication', label: 'Medication' },
  { value: 'treatment', label: 'Treatment' },
  { value: 'vaccination', label: 'Vaccination' },
  { value: 'other', label: 'Other' },
]

export const MedicalRecordForm: React.FC<{
  initial?: Partial<MedicalRecordFormValues>
  onSubmit: (values: MedicalRecordFormValues) => Promise<void>
  onCancel: () => void
  submitting?: boolean
  serverError?: string | null
}> = ({ initial, onSubmit, onCancel, submitting, serverError }) => {
  const [recordType, setRecordType] = useState<MedicalRecordType>(
    initial?.record_type ?? 'vet_visit'
  )
  const [description, setDescription] = useState<string>(initial?.description ?? '')
  const [date, setDate] = useState<string>(
    () => initial?.record_date ?? new Date().toISOString().split('T')[0] ?? ''
  )
  const [vetName, setVetName] = useState<string>(initial?.vet_name ?? '')
  const [attachmentUrl, setAttachmentUrl] = useState<string>(initial?.attachment_url ?? '')
  const [errors, setErrors] = useState<{
    record_type?: string
    description?: string
    record_date?: string
    attachment_url?: string
  }>({})

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault()
    const newErrors: typeof errors = {}
    if (!description || description.trim().length === 0) {
      newErrors.description = 'Description is required'
    }
    if (!date) {
      newErrors.record_date = 'Date is required'
    }
    if (attachmentUrl && !/^https?:\/\/.+/.test(attachmentUrl)) {
      newErrors.attachment_url = 'Must be a valid URL'
    }
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return
    await onSubmit({
      record_type: recordType,
      description: description.trim(),
      record_date: date,
      vet_name: vetName.trim() || '',
      attachment_url: attachmentUrl.trim() || '',
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
            value={recordType}
            onChange={(e) => {
              setRecordType(e.target.value as MedicalRecordType)
            }}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          >
            {RECORD_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
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
        <div>
          <label className="block text-sm font-medium">
            Attachment URL <span className="text-muted-foreground">(optional)</span>
          </label>
          <input
            type="url"
            value={attachmentUrl}
            onChange={(e) => {
              setAttachmentUrl(e.target.value)
            }}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            placeholder="https://..."
          />
          {errors.attachment_url && (
            <p className="text-xs text-destructive mt-1">{errors.attachment_url}</p>
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
