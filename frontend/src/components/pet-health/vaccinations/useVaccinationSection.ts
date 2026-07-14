import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useVaccinations } from '@/hooks/useVaccinations'
import { toast } from '@/lib/i18n-toast'
import { getUpcomingVaccinations } from '@/utils/vaccinationStatus'
import {
  buildVaccinationReminderIcs,
  createVaccinationReminderFilename,
  isLikelyMobileDevice,
  presentIcsFile,
} from '@/utils/vaccinationCalendar'
import type { VaccinationFormValues } from './VaccinationForm'
import type { VaccinationRecordWithId } from './vaccinationPhoto'

interface UseVaccinationSectionOptions {
  petId: number
  petName: string
  onVaccinationChange?: () => void
}

export function useVaccinationSection({
  petId,
  petName,
  onVaccinationChange,
}: UseVaccinationSectionOptions) {
  const { t } = useTranslation(['pets', 'common'])
  const { items, loading, create, update, remove, renew, setStatus, uploadPhoto, deletePhoto } =
    useVaccinations(petId)

  const typedItems = items.filter(
    (item): item is VaccinationRecordWithId => typeof item.id === 'number'
  )

  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [renewingRecord, setRenewingRecord] = useState<VaccinationRecordWithId | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [photoModalOpen, setPhotoModalOpen] = useState(false)
  const [photoModalRecord, setPhotoModalRecord] = useState<VaccinationRecordWithId | null>(null)

  const upcomingVaccinations = getUpcomingVaccinations(typedItems)
  const displayedVaccinations = showHistory ? typedItems : upcomingVaccinations

  const notifyChange = () => {
    onVaccinationChange?.()
  }

  const clearFormState = () => {
    setServerError(null)
  }

  const handleShowHistoryToggle = (checked: boolean) => {
    setShowHistory(checked)
    setStatus(checked ? 'all' : 'active')
  }

  const handleCreate = async (values: VaccinationFormValues) => {
    setServerError(null)
    setSubmitting(true)
    try {
      const record = await create(values)
      if (values.photo && record.id) {
        try {
          await uploadPhoto(record.id, values.photo)
        } catch {
          toast.error('pets:medical.uploadError')
        }
      }
      setAdding(false)
      notifyChange()
    } catch {
      setServerError(t('vaccinations.saveError'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (id: number, values: VaccinationFormValues) => {
    setServerError(null)
    setSubmitting(true)
    try {
      await update(id, values)
      if (values.photo) {
        try {
          await uploadPhoto(id, values.photo)
        } catch {
          toast.error('pets:medical.uploadError')
        }
      }
      setEditingId(null)
      toast.success('pets:vaccinations.updateSuccess')
      notifyChange()
    } catch {
      setServerError(t('vaccinations.updateError'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    setDeletingId(id)
    try {
      await remove(id)
      toast.success('pets:vaccinations.deleteSuccess')
      notifyChange()
    } catch {
      toast.error('pets:vaccinations.deleteError')
    } finally {
      setDeletingId(null)
    }
  }

  const handleRenew = async (values: VaccinationFormValues) => {
    if (!renewingRecord) return
    setServerError(null)
    setSubmitting(true)
    try {
      await renew(renewingRecord.id, values)
      setRenewingRecord(null)
      toast.success('pets:vaccinations.renewSuccess')
      notifyChange()
    } catch {
      setServerError(t('vaccinations.renewError'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeletePhoto = async (recordId: number) => {
    try {
      await deletePhoto(recordId)
      toast.success('pets:medical.photoDeleteSuccess')
      notifyChange()
    } catch {
      toast.error('pets:medical.photoDeleteError')
    }
  }

  const handleExportCalendar = async (record: VaccinationRecordWithId) => {
    if (!record.due_at) {
      toast.error('pets:vaccinations.calendarExport.missingDueDate', { duration: 4000 })
      return
    }

    try {
      const vaccineName = record.vaccine_name ?? t('common:status.unknown')
      const icsContent = buildVaccinationReminderIcs({
        petId,
        petName,
        vaccinationId: record.id,
        vaccineName,
        dueAt: record.due_at,
        notes: record.notes,
      })
      const filename = createVaccinationReminderFilename({
        petName,
        vaccineName,
        dueAt: record.due_at,
      })

      const result = await presentIcsFile(icsContent, filename, {
        preferOpen: isLikelyMobileDevice(),
      })

      if (result !== 'cancelled') {
        toast.success('pets:vaccinations.calendarExport.success', { duration: 3000 })
      }
    } catch {
      toast.error('pets:vaccinations.calendarExport.error', { duration: 4000 })
    }
  }

  const openPhotoModal = (record: VaccinationRecordWithId) => {
    setPhotoModalRecord(record)
    setPhotoModalOpen(true)
  }

  const closeRenewDialog = () => {
    setRenewingRecord(null)
    clearFormState()
  }

  return {
    loading,
    adding,
    setAdding,
    editingId,
    setEditingId,
    renewingRecord,
    setRenewingRecord,
    serverError,
    setServerError,
    deletingId,
    submitting,
    showHistory,
    photoModalOpen,
    setPhotoModalOpen,
    photoModalRecord,
    displayedVaccinations,
    handleShowHistoryToggle,
    handleCreate,
    handleUpdate,
    handleDelete,
    handleRenew,
    handleDeletePhoto,
    handleExportCalendar,
    openPhotoModal,
    closeRenewDialog,
  }
}
