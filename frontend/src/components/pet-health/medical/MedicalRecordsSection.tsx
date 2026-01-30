import React, { useMemo, useRef, useState } from 'react'
import type { MedicalRecord } from '@/api/generated/model'
import { useMedicalRecords } from '@/hooks/useMedicalRecords'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { MedicalRecordForm } from './MedicalRecordForm'
import { HealthRecordPhotoModal, type HealthRecordPhoto } from '../HealthRecordPhotoModal'
import { toast } from 'sonner'
import { ImagePlus, Pencil, Trash2 } from 'lucide-react'

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
}> = ({ petId, canEdit, mode = 'view' }) => {
  const { items, loading, error, create, update, remove, uploadPhoto, deletePhoto } =
    useMedicalRecords(petId)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<MedicalRecord | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [uploadingPhotoForId, setUploadingPhotoForId] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null)
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
  }) => {
    setSubmitting(true)
    setServerError(null)
    try {
      await create({
        ...values,
        vet_name: values.vet_name || null,
      })
      setAdding(false)
      toast.success('Medical record added')
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status
      const message = (err as { response?: { data?: { message?: string } } }).response?.data
        ?.message
      if (status === 422) {
        setServerError(message ?? 'Validation error')
      } else {
        toast.error('Failed to add record')
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
  }) => {
    if (!editing) return
    setSubmitting(true)
    setServerError(null)
    try {
      await update(editing.id, {
        ...values,
        vet_name: values.vet_name || null,
      })
      setEditing(null)
      toast.success('Medical record updated')
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status
      const message = (err as { response?: { data?: { message?: string } } }).response?.data
        ?.message
      if (status === 422) {
        setServerError(message ?? 'Validation error')
      } else {
        toast.error('Failed to update record')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleUploadClick = (recordId: number) => {
    setSelectedRecordId(recordId)
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !selectedRecordId) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB')
      return
    }

    setUploadingPhotoForId(selectedRecordId)
    try {
      await uploadPhoto(selectedRecordId, file)
      toast.success('Photo uploaded')
    } catch {
      toast.error('Failed to upload photo')
    } finally {
      setUploadingPhotoForId(null)
      setSelectedRecordId(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDeletePhoto = async (recordId: number, photoId: number) => {
    try {
      await deletePhoto(recordId, photoId)
      toast.success('Photo deleted')
    } catch {
      toast.error('Failed to delete photo')
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
      toast.info('Record deleted')
    } catch {
      toast.error('Failed to delete record')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Medical Records</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Medical Records</CardTitle>
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
              <p className="text-sm text-muted-foreground py-2">No medical records yet.</p>
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
                              {r.record_type ?? 'Other'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(r.record_date).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="font-medium">{r.description}</p>
                          {r.vet_name && (
                            <p className="text-sm text-muted-foreground mt-1">Vet: {r.vet_name}</p>
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
                          {/* Add photo button */}
                          {mode === 'edit' && canEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-2 h-7 text-xs"
                              onClick={() => {
                                handleUploadClick(r.id)
                              }}
                              disabled={uploadingPhotoForId === r.id}
                            >
                              <ImagePlus className="h-3 w-3 mr-1" />
                              {uploadingPhotoForId === r.id ? 'Uploading...' : 'Add Photo'}
                            </Button>
                          )}
                        </div>
                        {/* Edit mode: show icon buttons */}
                        {mode === 'edit' && canEdit && (
                          <div className="flex items-center gap-1 shrink-0">
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
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  disabled={deletingId === r.id}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete medical record?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this medical record? This action
                                    cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => {
                                      void handleDelete(r.id)
                                    }}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
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
                + Add Medical Record
              </Button>
            )}
          </>
        )}
      </CardContent>
      {/* Hidden file input for photo uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(event) => {
          void handleFileChange(event)
        }}
        className="hidden"
      />

      {/* Photo carousel modal */}
      {photoModalRecord && (
        <HealthRecordPhotoModal
          photos={(photoModalRecord.photos ?? []) as HealthRecordPhoto[]}
          open={photoModalOpen}
          onOpenChange={setPhotoModalOpen}
          initialIndex={photoModalIndex}
          canDelete={mode === 'edit' && canEdit}
          onDelete={async (photoId) => {
            await handleDeletePhoto(photoModalRecord.id, photoId)
          }}
        />
      )}
    </Card>
  )
}
