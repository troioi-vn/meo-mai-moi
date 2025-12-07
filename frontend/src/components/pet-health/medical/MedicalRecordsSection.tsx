import React, { useMemo, useState } from 'react'
import type { MedicalRecord, MedicalRecordType } from '@/api/pets'
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
import { toast } from 'sonner'
import { ExternalLink, Pencil, Trash2 } from 'lucide-react'

const RECORD_TYPE_LABELS: Record<MedicalRecordType, string> = {
  vaccination: 'Vaccination',
  vet_visit: 'Vet Visit',
  medication: 'Medication',
  treatment: 'Treatment',
  other: 'Other',
}

const RECORD_TYPE_COLORS: Record<MedicalRecordType, string> = {
  vaccination: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  vet_visit: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  medication: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  treatment: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
}

export const MedicalRecordsSection: React.FC<{
  petId: number
  canEdit: boolean
  /** 'view' shows records without edit/delete buttons, 'edit' shows with icon buttons */
  mode?: 'view' | 'edit'
}> = ({ petId, canEdit, mode = 'view' }) => {
  const { items, loading, error, create, update, remove } = useMedicalRecords(petId)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<MedicalRecord | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => b.record_date.localeCompare(a.record_date))
  }, [items])

  const handleCreate = async (values: {
    record_type: MedicalRecordType
    description: string
    record_date: string
    vet_name: string
    attachment_url: string
  }) => {
    setSubmitting(true)
    setServerError(null)
    try {
      await create({
        ...values,
        vet_name: values.vet_name || null,
        attachment_url: values.attachment_url || null,
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
    record_type: MedicalRecordType
    description: string
    record_date: string
    vet_name: string
    attachment_url: string
  }) => {
    if (!editing) return
    setSubmitting(true)
    setServerError(null)
    try {
      await update(editing.id, {
        ...values,
        vet_name: values.vet_name || null,
        attachment_url: values.attachment_url || null,
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
                          attachment_url: r.attachment_url ?? '',
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
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${RECORD_TYPE_COLORS[r.record_type]}`}
                            >
                              {RECORD_TYPE_LABELS[r.record_type]}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(r.record_date).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="font-medium">{r.description}</p>
                          {r.vet_name && (
                            <p className="text-sm text-muted-foreground mt-1">Vet: {r.vet_name}</p>
                          )}
                          {r.attachment_url && (
                            <a
                              href={r.attachment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-1"
                            >
                              <ExternalLink className="h-3 w-3" />
                              View attachment
                            </a>
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
    </Card>
  )
}
