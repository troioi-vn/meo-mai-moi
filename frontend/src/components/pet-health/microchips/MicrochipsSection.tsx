import React, { useMemo, useState } from 'react'
import { useMicrochips } from '@/hooks/useMicrochips'
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

interface FormValues {
  chip_number: string
  issuer?: string | null
  implanted_at?: string | null
}

const MicrochipForm: React.FC<{
  initial?: Partial<FormValues>
  onSubmit: (values: FormValues) => Promise<void>
  onCancel: () => void
  submitting?: boolean
  serverError?: string | null
}> = ({ initial, onSubmit, onCancel, submitting, serverError }) => {
  const [chipNumber, setChipNumber] = useState<string>(initial?.chip_number ?? '')
  const [issuer, setIssuer] = useState<string>(initial?.issuer ?? '')
  const [implantedAt, setImplantedAt] = useState<string>(initial?.implanted_at ?? '')
  const [errors, setErrors] = useState<{ chip_number?: string }>({})

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs: typeof errors = {}
    if (!chipNumber || chipNumber.trim().length < 10)
      errs.chip_number = 'Microchip number is required (min 10)'
    setErrors(errs)
    if (Object.keys(errs).length) return
    await onSubmit({
      chip_number: chipNumber.trim(),
      issuer: issuer.trim() ? issuer.trim() : null,
      implanted_at: implantedAt || null,
    })
  }

  return (
    <form
      onSubmit={(e) => {
        void submit(e)
      }}
      className="space-y-4"
      noValidate
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium">Chip number</label>
          <input
            type="text"
            value={chipNumber}
            onChange={(e) => {
              setChipNumber(e.target.value)
            }}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            placeholder="e.g., 982000123456789"
          />
          {errors.chip_number && (
            <p className="text-xs text-destructive mt-1">{errors.chip_number}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium">Issuer (optional)</label>
          <input
            type="text"
            value={issuer}
            onChange={(e) => {
              setIssuer(e.target.value)
            }}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            placeholder="HomeAgain, AVID, ..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Implanted at (optional)</label>
          <input
            type="date"
            value={implantedAt}
            onChange={(e) => {
              setImplantedAt(e.target.value)
            }}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          />
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

export const MicrochipsSection: React.FC<{ petId: number; canEdit: boolean }> = ({
  petId,
  canEdit,
}) => {
  const { items, loading, error, create, update, remove } = useMicrochips(petId)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const aDate = a.implanted_at ?? a.created_at
      const bDate = b.implanted_at ?? b.created_at
      return bDate.localeCompare(aDate)
    })
  }, [items])

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

  const handleCreate = async (values: FormValues) => {
    setSubmitting(true)
    setServerError(null)
    try {
      await create(values)
      setAdding(false)
    } catch (err: unknown) {
      // Prefer AxiosError typing to avoid any/unsafe accesses
      const status = (err as { response?: { status?: number } }).response?.status
      const message = (err as { response?: { data?: { message?: string } } }).response?.data
        ?.message
      if (status === 422) setServerError(message ?? 'Validation error')
      else setServerError('Failed to add microchip')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (id: number, values: Partial<FormValues>) => {
    setSubmitting(true)
    setServerError(null)
    try {
      await update(id, values)
      setEditingId(null)
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status
      const message = (err as { response?: { data?: { message?: string } } }).response?.data
        ?.message
      if (status === 422) setServerError(message ?? 'Validation error')
      else setServerError('Failed to update microchip')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div>Loading microchips…</div>
  if (error) return <div className="text-destructive">{error}</div>

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-2xl font-bold">Microchips</h2>
        {canEdit && !adding && editingId == null && (
          <Button
            size="sm"
            onClick={() => {
              startAdd()
            }}
          >
            Add
          </Button>
        )}
      </div>

      {adding && canEdit && (
        <div className="mb-4 rounded-md border p-3">
          <MicrochipForm
            onSubmit={handleCreate}
            onCancel={cancel}
            submitting={submitting}
            serverError={serverError}
          />
        </div>
      )}

      <ul className="divide-y rounded-md border">
        {sorted.length === 0 && (
          <li className="p-3 text-sm text-muted-foreground">No microchips recorded.</li>
        )}
        {sorted.map((m) => (
          <li key={String(m.id)} className="flex items-center justify-between p-3">
            {editingId === m.id ? (
              <MicrochipForm
                initial={{
                  chip_number: m.chip_number,
                  issuer: m.issuer ?? undefined,
                  implanted_at: m.implanted_at ?? undefined,
                }}
                onSubmit={async (v) => {
                  await handleUpdate(m.id, v)
                }}
                onCancel={() => {
                  setEditingId(null)
                }}
                submitting={submitting}
                serverError={serverError}
              />
            ) : (
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between w-full">
                <div className="flex-1">
                  <div className="font-medium">{m.chip_number}</div>
                  <div className="text-sm text-muted-foreground">
                    {m.issuer ? `Issuer: ${m.issuer}` : 'Issuer: —'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Implanted:{' '}
                    {m.implanted_at ? new Date(m.implanted_at).toLocaleDateString() : '—'}
                  </div>
                </div>
                {canEdit && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingId(m.id)
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
                          <AlertDialogTitle>Delete microchip?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => {
                              void remove(m.id)
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
