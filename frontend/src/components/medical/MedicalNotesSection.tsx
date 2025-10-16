import React, { useMemo, useState } from 'react'
import type { MedicalNote } from '@/api/pets'
import { useMedicalNotes } from '@/hooks/useMedicalNotes'
import { Button } from '@/components/ui/button'
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
import { MedicalNoteForm } from './MedicalNoteForm'
import { toast } from 'sonner'

export const MedicalNotesSection: React.FC<{
  petId: number
  canEdit: boolean
}> = ({ petId, canEdit }) => {
  const { items, loading, error, create, update, remove } = useMedicalNotes(petId)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<MedicalNote | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => b.record_date.localeCompare(a.record_date))
  }, [items])

  const handleCreate = async (values: { note: string; record_date: string }) => {
    setSubmitting(true)
    setServerError(null)
    try {
      await create(values)
      setAdding(false)
      toast.success('Medical note added')
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status
      const message = (err as { response?: { data?: { message?: string } } }).response?.data
        ?.message
      if (status === 422) {
        setServerError(message ?? 'Validation error')
      } else {
        toast.error('Failed to add note')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (values: { note: string; record_date: string }) => {
    if (!editing) return
    setSubmitting(true)
    setServerError(null)
    try {
      await update(editing.id, values)
      setEditing(null)
      toast.success('Medical note updated')
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status
      const message = (err as { response?: { data?: { message?: string } } }).response?.data
        ?.message
      if (status === 422) {
        setServerError(message ?? 'Validation error')
      } else {
        toast.error('Failed to update note')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await remove(id)
      toast.info('Note deleted')
    } catch {
      toast.error('Failed to delete note')
    }
  }

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-2xl font-bold">Medical notes</h2>
        {canEdit && !adding && !editing && (
          <Button
            size="sm"
            onClick={() => {
              setAdding(true)
            }}
          >
            Add
          </Button>
        )}
      </div>
      {loading && <p className="text-sm text-muted-foreground">Loading notes…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {(adding || editing) && canEdit && (
        <div className="mb-4 rounded-md border p-3">
          <MedicalNoteForm
            initial={editing ? { note: editing.note, record_date: editing.record_date } : undefined}
            onSubmit={(vals) => {
              if (editing) {
                return handleUpdate(vals)
              }
              return handleCreate(vals)
            }}
            onCancel={() => {
              setAdding(false)
              setEditing(null)
              setServerError(null)
            }}
            submitting={submitting}
            serverError={serverError}
          />
        </div>
      )}

      <ul className="divide-y rounded-md border">
        {sorted.length === 0 && (
          <li className="p-3 text-sm text-muted-foreground">No medical notes yet.</li>
        )}
        {sorted.map((n) => (
          <li key={String(n.id)} className="flex items-center justify-between p-3">
            <div className="flex flex-col">
              <span className="font-medium">{n.note}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(n.record_date).toLocaleDateString()}
              </span>
            </div>
            {canEdit && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditing(n)
                  }}
                >
                  Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="destructive">
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete medical note?</AlertDialogTitle>
                      <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          void handleDelete(n.id)
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
          </li>
        ))}
      </ul>
    </section>
  )
}
