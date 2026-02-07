import React, { useMemo, useState } from 'react'
import type { MedicalRecord } from '@/api/generated/model'
import { useMedicalRecords } from '@/hooks/useMedicalRecords'
import { Button } from '@/components/ui/button'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MedicalRecordForm } from './MedicalRecordForm'
import { HealthRecordPhotoModal, type HealthRecordPhoto } from '../HealthRecordPhotoModal'
import { toast } from '@/lib/i18n-toast'
import { Pencil } from 'lucide-react'

const RECORD_TYPE_COLORS: Record<string, string> = {
  Deworming: 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200',
  Checkup: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'Neuter/Spay': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  Symptom: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  Surgery: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'Vet Visit': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  'Test Result': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  'X-Ray': 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200',
  Medication: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  Treatment: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
}

const DEFAULT_COLOR = 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'

const getRecordTypeColor = (type: string | null | undefined): string => {
  if (!type) return DEFAULT_COLOR
  return RECORD_TYPE_COLORS[type] ?? DEFAULT_COLOR
}

export const MedicalRecordsSection: React.FC<{
  petId: number
  canEdit: boolean
  /** 'view' shows records without edit/delete buttons, 'edit' shows with icon buttons */
  mode?: 'view' | 'edit'
}> = ({ petId, canEdit }) => {
  const { t } = useTranslation(['pets', 'common'])
  const { items, loading, error, create, update, remove, uploadPhoto, deletePhoto } =
    useMedicalRecords(petId)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<MedicalRecord | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  // Photo modal state
  const [photoModalOpen, setPhotoModalOpen] = useState(false)
  const [photoModalRecord, setPhotoModalRecord] = useState<MedicalRecord | null>(null)
  const [photoModalIndex, setPhotoModalIndex] = useState(0)

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => b.record_date.localeCompare(a.record_date))
  }, [items])

  const handleCreate = async (values: {
    record_type: string
    description: string
    record_date: string
    vet_name: string
    photo?: File | null
  }) => {
    setSubmitting(true)
    setServerError(null)
    try {
      const record = await create({
        ...values,
        vet_name: values.vet_name || null,
      })
      if (values.photo && record.id) {
        try {
          await uploadPhoto(record.id, values.photo)
        } catch {
          // Record created, photo upload failed - show partial success
          toast.error('pets:medical.uploadError')
        }
      }
      setAdding(false)
      toast.success('pets:medical.addSuccess')
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status
      const message = (err as { response?: { data?: { message?: string } } }).response?.data
        ?.message
      if (status === 422) {
        setServerError(message ?? t('common:errors.validation'))
      } else {
        toast.error('pets:medical.addError')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (values: {
    record_type: string
    description: string
    record_date: string
    vet_name: string
    photo?: File | null
  }) => {
    if (!editing) return
    setSubmitting(true)
    setServerError(null)
    try {
      await update(editing.id, {
        ...values,
        vet_name: values.vet_name || null,
      })
      if (values.photo) {
        try {
          await uploadPhoto(editing.id, values.photo)
        } catch {
          toast.error('pets:medical.uploadError')
        }
      }
      setEditing(null)
      toast.success('pets:medical.updateSuccess')
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status
      const message = (err as { response?: { data?: { message?: string } } }).response?.data
        ?.message
      if (status === 422) {
        setServerError(message ?? t('common:errors.validation'))
      } else {
        toast.error('pets:medical.updateError')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeletePhoto = async (recordId: number, photoId: number) => {
    try {
      await deletePhoto(recordId, photoId)
      toast.success('pets:medical.photoDeleteSuccess')
    } catch {
      toast.error('pets:medical.photoDeleteError')
    }
  }

  const openPhotoModal = (record: MedicalRecord, photoIndex: number) => {
    setPhotoModalRecord(record)
    setPhotoModalIndex(photoIndex)
    setPhotoModalOpen(true)
  }

  const handleDelete = async (id: number) => {
    setDeletingId(id)
    try {
      await remove(id)
      toast.info('pets:medical.deleteSuccess')
    } catch {
      toast.error('pets:medical.deleteError')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{t('medical.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('common:messages.loading')}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">{t('medical.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && <p className="text-sm text-destructive">{error}</p>}

        {adding ? (
          <div className="rounded-md border p-4">
            <MedicalRecordForm
              onSubmit={handleCreate}
              onCancel={() => {
                setAdding(false)
                setServerError(null)
              }}
              submitting={submitting}
              serverError={serverError}
            />
          </div>
        ) : (
          <>
            {sorted.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">{t('medical.noRecords')}</p>
            ) : (
              <ul className="space-y-2">
                {sorted.map((r) => (
                  <li key={String(r.id)} className="rounded-lg border p-3 bg-muted/50">
                    {editing?.id === r.id ? (
                      <MedicalRecordForm
                        initial={{
                          record_type: r.record_type,
                          description: r.description,
                          record_date: r.record_date,
                          vet_name: r.vet_name ?? '',
                        }}
                        onSubmit={handleUpdate}
                        onCancel={() => {
                          setEditing(null)
                          setServerError(null)
                        }}
                        onDelete={async () => {
                          await handleDelete(r.id)
                          setEditing(null)
                        }}
                        deleting={deletingId === r.id}
                        submitting={submitting}
                        serverError={serverError}
                      />
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getRecordTypeColor(r.record_type)}`}
                            >
                              {r.record_type
                                ? t(
                                    `medical.types.${r.record_type.toLowerCase().replace('/', '_').replace(' ', '_').replace('-', '_')}`
                                  )
                                : t('medical.types.other')}
                            </span>
                          </div>
                          <p className="font-medium">{r.description}</p>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {new Date(r.record_date).toLocaleDateString()}
                          </p>
                          {r.vet_name && (
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {t('medical.vetLabel', { name: r.vet_name })}
                            </p>
                          )}
                          {/* Photos section */}
                          {r.photos && r.photos.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {r.photos.map((photo, index) => (
                                <button
                                  key={photo.id}
                                  type="button"
                                  onClick={() => {
                                    openPhotoModal(r, index)
                                  }}
                                  className="w-16 h-16 overflow-hidden rounded border cursor-pointer hover:opacity-90 transition-opacity"
                                >
                                  <img
                                    src={photo.thumb_url}
                                    alt="Medical record attachment"
                                    className="w-full h-full object-cover"
                                  />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {/* Show edit button when canEdit */}
                        {canEdit && (
                          <div className="shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                setEditing(r)
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {canEdit && (
              <Button
                variant="outline"
                className="w-full mt-3"
                onClick={() => {
                  setAdding(true)
                }}
              >
                + {t('medical.addRecord')}
              </Button>
            )}
          </>
        )}
      </CardContent>
      {/* Photo carousel modal */}
      {photoModalRecord && (
        <HealthRecordPhotoModal
          photos={(photoModalRecord.photos ?? []) as HealthRecordPhoto[]}
          open={photoModalOpen}
          onOpenChange={setPhotoModalOpen}
          initialIndex={photoModalIndex}
          canDelete={canEdit}
          onDelete={async (photoId) => {
            await handleDeletePhoto(photoModalRecord.id, photoId)
          }}
        />
      )}
    </Card>
  )
}
