import React, { useMemo, useState } from 'react'
import type { WeightHistory } from '@/api/pets'
import { useWeights } from '@/hooks/useWeights'
import { Button } from '@/components/ui/button'
import { WeightForm } from './WeightForm'
import { toast } from 'sonner'

export const WeightHistorySection: React.FC<{
  petId: number
  canEdit: boolean
}> = ({ petId, canEdit }) => {
  const { items, loading, error, create, update, remove } = useWeights(petId)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<WeightHistory | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => b.record_date.localeCompare(a.record_date))
  }, [items])

  const handleCreate = async (values: { weight_kg: number; record_date: string }) => {
    setSubmitting(true)
    setServerError(null)
    try {
      await create(values)
      setAdding(false)
      toast.success('Weight added')
    } catch (e: any) {
      const status = e?.response?.status
      if (status === 422) {
        setServerError(e?.response?.data?.message ?? 'Validation error')
      } else {
        toast.error('Failed to add weight')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (values: { weight_kg: number; record_date: string }) => {
    if (!editing) return
    setSubmitting(true)
    setServerError(null)
    try {
      await update(editing.id, values)
      setEditing(null)
      toast.success('Weight updated')
    } catch (e: any) {
      const status = e?.response?.status
      if (status === 422) {
        setServerError(e?.response?.data?.message ?? 'Validation error')
      } else {
        toast.error('Failed to update weight')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await remove(id)
      toast.info('Weight deleted')
    } catch {
      toast.error('Failed to delete weight')
    }
  }

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-2xl font-bold">Weight history</h2>
        {canEdit && !adding && !editing && (
          <Button size="sm" onClick={() => setAdding(true)}>
            Add
          </Button>
        )}
      </div>
      {loading && <p className="text-sm text-muted-foreground">Loading weight records…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Add/Edit forms */}
      {(adding || editing) && canEdit && (
        <div className="mb-4 rounded-md border p-3">
          <WeightForm
            initial={editing ? { weight_kg: editing.weight_kg, record_date: editing.record_date } : undefined}
            onSubmit={(vals) => (editing ? handleUpdate(vals) : handleCreate(vals))}
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

      {/* List */}
      <ul className="divide-y rounded-md border">
        {sorted.length === 0 && (
          <li className="p-3 text-sm text-muted-foreground">No weight records yet.</li>
        )}
        {sorted.map((w) => (
          <li key={String(w.id)} className="flex items-center justify-between p-3">
            <div className="flex flex-col">
              <span className="font-medium">{Number(w.weight_kg).toFixed(2)} kg</span>
              <span className="text-xs text-muted-foreground">
                {new Date(w.record_date).toLocaleDateString()}
              </span>
            </div>
            {canEdit && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(w)}>
                  Edit
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleDelete(w.id)}>
                  Delete
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
