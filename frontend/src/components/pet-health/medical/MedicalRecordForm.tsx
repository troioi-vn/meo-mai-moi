import React, { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { YearMonthDatePicker } from '@/components/ui/YearMonthDatePicker'
import { ImagePlus, X, Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

export interface MedicalRecordFormValues {
  record_type: string
  description: string
  record_date: string
  vet_name: string
  photo?: File | null
}

const RECORD_TYPE_OPTIONS = [
  { value: 'Deworming', i18nKey: 'deworming' },
  { value: 'Checkup', i18nKey: 'checkup' },
  { value: 'Neuter/Spay', i18nKey: 'neuter_spay' },
  { value: 'Symptom', i18nKey: 'symptom' },
  { value: 'Surgery', i18nKey: 'surgery' },
  { value: 'Vet Visit', i18nKey: 'vet_visit' },
  { value: 'Test Result', i18nKey: 'test_result' },
  { value: 'X-Ray', i18nKey: 'x_ray' },
  { value: 'Medication', i18nKey: 'medication' },
  { value: 'Treatment', i18nKey: 'treatment' },
  { value: '__other__', i18nKey: 'other' },
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
  /** Called to delete the entire medical record */
  onDelete?: () => Promise<void>
  /** Whether a delete operation is in progress */
  deleting?: boolean
}> = ({ initial, onSubmit, onCancel, submitting, serverError, onDelete, deleting }) => {
  const { t } = useTranslation(['pets', 'common'])
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
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [errors, setErrors] = useState<{
    record_type?: string
    record_date?: string
  }>({})

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault()
    const newErrors: typeof errors = {}
    const finalRecordType = selectedOption === '__other__' ? customType.trim() : selectedOption
    if (!finalRecordType || finalRecordType.length === 0) {
      newErrors.record_type = t('medical.validation.recordTypeRequired')
    }
    if (!date) {
      newErrors.record_date = t('medical.validation.dateRequired')
    }
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return
    await onSubmit({
      record_type: finalRecordType,
      description: description.trim(),
      record_date: date,
      vet_name: vetName.trim() || '',
      photo: photo ?? undefined,
    })
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return
    if (file.size > 10 * 1024 * 1024) return
    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const handleRemovePhoto = () => {
    setPhoto(null)
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoPreview(null)
    if (photoInputRef.current) photoInputRef.current.value = ''
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
          <label className="block text-sm font-medium">{t('medical.form.recordType')}</label>
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
                {t(`medical.types.${opt.i18nKey}`)}
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
              placeholder={t('medical.form.customTypePlaceholder')}
              maxLength={100}
            />
          )}
          {errors.record_type && (
            <p className="text-xs text-destructive mt-1">{errors.record_type}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium">{t('medical.form.date')}</label>
          <div className="mt-1">
            <YearMonthDatePicker
              value={date}
              onChange={setDate}
              placeholder={t('medical.form.selectDate')}
              className="w-full"
            />
          </div>
          {errors.record_date && (
            <p className="text-xs text-destructive mt-1">{errors.record_date}</p>
          )}
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium">
            {t('medical.form.description')} <span className="text-muted-foreground">({t('medical.form.optional')})</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value)
            }}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            placeholder={t('medical.form.descriptionPlaceholder')}
            rows={3}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">
            {t('medical.form.vetName')} <span className="text-muted-foreground">({t('medical.form.optional')})</span>
          </label>
          <input
            type="text"
            value={vetName}
            onChange={(e) => {
              setVetName(e.target.value)
            }}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            placeholder={t('medical.form.vetNamePlaceholder')}
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">
          {t('medical.form.photo')} <span className="text-muted-foreground">({t('medical.form.optional')})</span>
        </label>
        {photoPreview ? (
          <div className="relative inline-block">
            <img
              src={photoPreview}
              alt={t('medical.form.selectedPhotoAlt')}
              className="w-20 h-20 object-cover rounded border"
            />
            <button
              type="button"
              onClick={handleRemovePhoto}
              className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5 hover:bg-destructive/90"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => photoInputRef.current?.click()}
          >
            <ImagePlus className="h-3 w-3 mr-1" />
            {t('medical.form.attachPhoto')}
          </Button>
        )}
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoSelect}
          className="hidden"
        />
      </div>
      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={Boolean(submitting) || Boolean(deleting)}>
          {submitting ? t('medical.form.saving') : t('medical.form.save')}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={Boolean(submitting) || Boolean(deleting)}>
          {t('common:actions.cancel')}
        </Button>
        {onDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ml-auto text-destructive hover:text-destructive hover:bg-destructive/10"
                disabled={Boolean(submitting) || Boolean(deleting)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                {t('common:actions.delete')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('medical.deleteRecord.title')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('medical.deleteRecord.description')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('common:actions.cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    void onDelete()
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {t('common:actions.delete')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </form>
  )
}
