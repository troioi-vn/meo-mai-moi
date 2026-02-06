import React, { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { YearMonthDatePicker } from '@/components/ui/YearMonthDatePicker'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
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
import { ImagePlus, Trash2, X } from 'lucide-react'

const VACCINATION_TYPES = [
  'Rabies',
  'FVRCP',
  'FeLV (Feline Leukemia Virus)',
  'Chlamydia felis',
  'Bordetella',
  'DHPP (DAPP)',
  'Leptospirosis',
  'Canine Influenza',
  'Lyme disease vaccine',
]

export interface VaccinationFormValues {
  vaccine_name: string
  administered_at: string
  due_at?: string | null
  notes?: string | null
  photo?: File | null
}

// Photo is handled separately after record creation

// Normalize date string to YYYY-MM-DD format for HTML date input
const normalizeDate = (dateStr: string | undefined | null, defaultDate?: string): string => {
  if (!dateStr) return defaultDate ?? ''
  // If already in YYYY-MM-DD format, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
  // Otherwise parse and convert
  const d = new Date(dateStr)
  return d.toISOString().split('T')[0] ?? ''
}

/** Calculate pet age in months at the given reference date */
const getPetAgeMonths = (
  petBirthday: string | null | undefined,
  referenceDate: string
): number | null => {
  if (!petBirthday) return null
  const birth = new Date(petBirthday)
  const ref = new Date(referenceDate)
  if (Number.isNaN(birth.getTime()) || Number.isNaN(ref.getTime())) return null
  return (ref.getFullYear() - birth.getFullYear()) * 12 + (ref.getMonth() - birth.getMonth())
}

/** Default booster interval: pet age < 6 months => 1 month, otherwise 12 months */
const getDefaultBoosterInterval = (
  petBirthday: string | null | undefined,
  administeredAt: string
): number => {
  const ageMonths = getPetAgeMonths(petBirthday, administeredAt)
  if (ageMonths !== null && ageMonths < 6) return 1
  return 12
}

/** Calculate due date: administered_at + booster months - early days */
const computeDueDate = (
  administeredAt: string,
  boosterMonths: number,
  earlyDays: number
): string => {
  if (!administeredAt) return ''
  const date = new Date(administeredAt)
  if (Number.isNaN(date.getTime())) return ''
  date.setMonth(date.getMonth() + boosterMonths)
  date.setDate(date.getDate() - earlyDays)
  return date.toISOString().split('T')[0] ?? ''
}

const DEFAULT_SCHEDULE_EARLY_DAYS = 7

export const VaccinationForm: React.FC<{
  initial?: Partial<VaccinationFormValues>
  onSubmit: (values: VaccinationFormValues) => Promise<void>
  onCancel: () => void
  submitting?: boolean
  serverError?: string | null
  petBirthday?: string | null
  /** Existing photo URL for the record being edited */
  existingPhotoUrl?: string | null
  /** Called to delete the existing photo from the server */
  onDeleteExistingPhoto?: () => Promise<void>
}> = ({
  initial,
  onSubmit,
  onCancel,
  submitting,
  serverError,
  petBirthday,
  existingPhotoUrl,
  onDeleteExistingPhoto,
}) => {
  const [vaccineName, setVaccineName] = useState<string>(initial?.vaccine_name ?? '')
  const [administeredAt, setAdministeredAt] = useState<string>(() =>
    normalizeDate(initial?.administered_at, new Date().toISOString().split('T')[0])
  )

  const initialAdministeredAt = normalizeDate(
    initial?.administered_at,
    new Date().toISOString().split('T')[0]
  )
  const defaultBooster = getDefaultBoosterInterval(petBirthday, initialAdministeredAt)

  const [boosterInterval, setBoosterInterval] = useState<number>(defaultBooster)
  const [scheduleEarly, setScheduleEarly] = useState<number>(DEFAULT_SCHEDULE_EARLY_DAYS)

  const [dueAt, setDueAt] = useState<string>(() => {
    if (initial?.due_at) return normalizeDate(initial.due_at)
    return computeDueDate(initialAdministeredAt, defaultBooster, DEFAULT_SCHEDULE_EARLY_DAYS)
  })
  const [notes, setNotes] = useState<string>(initial?.notes ?? '')
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [existingPhotoVisible, setExistingPhotoVisible] = useState(Boolean(existingPhotoUrl))
  const [viewingPhoto, setViewingPhoto] = useState(false)
  const [deletingExistingPhoto, setDeletingExistingPhoto] = useState(false)
  const [errors, setErrors] = useState<{
    vaccine_name?: string
    administered_at?: string
    due_at?: string
  }>({})

  const recalculateDueAt = (adminAt: string, months: number, days: number) => {
    setDueAt(computeDueDate(adminAt, months, days))
  }

  const handleAdministeredAtChange = (value: string) => {
    setAdministeredAt(value)
    recalculateDueAt(value, boosterInterval, scheduleEarly)
  }

  const handleBoosterIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value === '' ? 0 : parseInt(e.target.value, 10)
    const value = Number.isNaN(raw) ? 0 : Math.max(0, Math.min(120, raw))
    setBoosterInterval(value)
    recalculateDueAt(administeredAt, value, scheduleEarly)
  }

  const handleScheduleEarlyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value === '' ? 0 : parseInt(e.target.value, 10)
    const value = Number.isNaN(raw) ? 0 : Math.max(0, Math.min(365, raw))
    setScheduleEarly(value)
    recalculateDueAt(administeredAt, boosterInterval, value)
  }

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

  const handleDeleteExistingPhoto = async () => {
    if (!onDeleteExistingPhoto) return
    setDeletingExistingPhoto(true)
    try {
      await onDeleteExistingPhoto()
      setExistingPhotoVisible(false)
    } finally {
      setDeletingExistingPhoto(false)
    }
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
            list="vaccination-types"
            value={vaccineName}
            onChange={(e) => {
              setVaccineName(e.target.value)
            }}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            placeholder="e.g. Rabies"
          />
          <datalist id="vaccination-types">
            {VACCINATION_TYPES.map((vaccine) => (
              <option key={vaccine} value={vaccine} />
            ))}
          </datalist>
          {errors.vaccine_name && (
            <p className="text-xs text-destructive mt-1">{errors.vaccine_name}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium">Administered on</label>
          <div className="mt-1">
            <YearMonthDatePicker
              value={administeredAt}
              onChange={handleAdministeredAtChange}
              placeholder="Select date"
              className="w-full"
            />
          </div>
          {errors.administered_at && (
            <p className="text-xs text-destructive mt-1">{errors.administered_at}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium">Booster interval</label>
          <div className="relative mt-1">
            <input
              type="number"
              min={0}
              max={120}
              value={boosterInterval}
              onChange={handleBoosterIntervalChange}
              className="w-full rounded-md border px-3 py-2 pr-20 text-sm"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              months
            </span>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium">Schedule early</label>
          <div className="relative mt-1">
            <input
              type="number"
              min={0}
              max={365}
              value={scheduleEarly}
              onChange={handleScheduleEarlyChange}
              className="w-full rounded-md border px-3 py-2 pr-14 text-sm"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              days
            </span>
          </div>
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
      <div>
        <label className="block text-sm font-medium mb-1">
          Photo <span className="text-muted-foreground">(optional)</span>
        </label>
        <div className="flex items-center gap-3">
          {/* Existing photo (when editing a record that has one) */}
          {existingPhotoVisible && existingPhotoUrl && (
            <div className="relative inline-block">
              <button
                type="button"
                onClick={() => { setViewingPhoto(true) }}
                className="w-20 h-20 overflow-hidden rounded border cursor-pointer hover:opacity-90 transition-opacity"
              >
                <img
                  src={existingPhotoUrl}
                  alt="Vaccination record"
                  className="w-full h-full object-cover"
                />
              </button>
              {onDeleteExistingPhoto && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      type="button"
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5 hover:bg-destructive/90"
                      disabled={deletingExistingPhoto}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Photo</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this photo? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          void handleDeleteExistingPhoto()
                        }}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          )}
          {/* New photo preview (just selected) */}
          {photoPreview && (
            <div className="relative inline-block">
              <img
                src={photoPreview}
                alt="Selected photo"
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
          )}
          {/* Attach button (show when no new photo selected) */}
          {!photoPreview && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => photoInputRef.current?.click()}
            >
              <ImagePlus className="h-3 w-3 mr-1" />
              {existingPhotoVisible && existingPhotoUrl ? 'Replace photo' : 'Attach photo'}
            </Button>
          )}
        </div>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoSelect}
          className="hidden"
        />
      </div>

      {/* Full-size photo viewer */}
      {existingPhotoUrl && (
        <Dialog open={viewingPhoto} onOpenChange={setViewingPhoto}>
          <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black border-none">
            <DialogHeader className="sr-only">
              <DialogTitle>Vaccination photo</DialogTitle>
              <DialogDescription>View vaccination record photo</DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-center min-h-[50vh] bg-black">
              <img
                src={existingPhotoUrl}
                alt="Vaccination record"
                className="w-full h-auto max-h-[85vh] object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
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
