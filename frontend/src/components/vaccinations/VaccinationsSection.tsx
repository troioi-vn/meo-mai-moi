import React, { useState } from 'react'
import { useVaccinations } from '@/hooks/useVaccinations'
import { VaccinationForm, type VaccinationFormValues } from './VaccinationForm'
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

export const VaccinationsSection: React.FC<{ petId: number; canEdit: boolean }> = ({
  petId,
  canEdit,
}) => {
  const { items, loading, error, create, update, remove } = useVaccinations(petId)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [adding, setAdding] = useState<boolean>(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const startAdd = () => {
    setAdding(true)
    setEditingId(null)
    setServerError(null)
  }
  const cancel = () => {
    setAdding(false)
    setEditingId(null)
    setServerError(null)
  }

  const onCreate = async (values: VaccinationFormValues) => {
    setServerError(null)
    try {
      await create(values)
      setAdding(false)
    } catch {
      setServerError('Failed to save vaccination')
    }
  }

  const onUpdate = async (id: number, values: Partial<VaccinationFormValues>) => {
    setServerError(null)
    try {
      await update(id, values)
      setEditingId(null)
    } catch {
      setServerError('Failed to update vaccination')
    }
  }

  if (loading) return <div>Loading vaccinations…</div>
  if (error) return <div className="text-red-600">{error}</div>

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Vaccinations</h2>
        {canEdit && !adding && (
          <Button
            onClick={() => {
              startAdd()
            }}
          >
            Add vaccination
          </Button>
        )}
      </div>

      {adding && canEdit && (
        <div className="mt-4 rounded-md border p-4">
          <VaccinationForm onSubmit={onCreate} onCancel={cancel} serverError={serverError} />
        </div>
      )}

      <ul className="mt-4 space-y-3">
        {items.length === 0 && (
          <li className="text-sm text-muted-foreground">No vaccinations recorded yet.</li>
        )}
        {items.map((r) => (
          <li key={r.id} className="rounded-md border p-4">
            {editingId === r.id ? (
              <VaccinationForm
                initial={{
                  vaccine_name: r.vaccine_name,
                  administered_at: r.administered_at,
                  due_at: r.due_at ?? undefined,
                  notes: r.notes ?? undefined,
                }}
                onSubmit={async (v) => {
                  await onUpdate(r.id, v)
                }}
                onCancel={() => {
                  setEditingId(null)
                }}
                serverError={serverError}
              />
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-medium">{r.vaccine_name}</div>
                  <div className="text-sm text-muted-foreground">
                    Administered: {new Date(r.administered_at).toLocaleDateString()}
                  </div>
                  {r.due_at && (
                    <div className="text-sm text-muted-foreground">
                      Due: {new Date(r.due_at).toLocaleDateString()}
                    </div>
                  )}
                  {r.notes && <div className="text-sm">{r.notes}</div>}
                </div>
                {canEdit && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingId(r.id)
                      }}
                    >
                      Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive">Delete</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete vaccination?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => {
                              void remove(r.id)
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
    </section>
  )
}
