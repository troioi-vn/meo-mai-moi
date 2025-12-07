import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { useWeights } from '@/hooks/useWeights'
import { WeightChart } from './WeightChart'
import { WeightForm } from './WeightForm'
import { toast } from 'sonner'
import { Pencil, Trash2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'

interface WeightHistoryCardProps {
  petId: number
  canEdit: boolean
  /** 'view' shows chart only (last 15 records), 'edit' shows records list only */
  mode?: 'view' | 'edit'
}

export function WeightHistoryCard({ petId, canEdit, mode = 'view' }: WeightHistoryCardProps) {
  const { items, loading, create, update, remove } = useWeights(petId)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  // For view mode, limit to last 15 records for the chart
  const chartItems = mode === 'view' ? items.slice(0, 15) : items

  const handleCreate = async (values: { weight_kg: number; record_date: string }) => {
    setSubmitting(true)
    setServerError(null)
    try {
      await create(values)
      setAdding(false)
      toast.success('Weight added')
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status
      const message = (err as { response?: { data?: { message?: string } } }).response?.data
        ?.message
      if (status === 422) {
        setServerError(message ?? 'Validation error')
      } else {
        toast.error('Failed to add weight')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (id: number, values: { weight_kg: number; record_date: string }) => {
    setSubmitting(true)
    setServerError(null)
    try {
      await update(id, values)
      setEditingId(null)
      toast.success('Weight updated')
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status
      const message = (err as { response?: { data?: { message?: string } } }).response?.data
        ?.message
      if (status === 422) {
        setServerError(message ?? 'Validation error')
      } else {
        toast.error('Failed to update weight')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    setDeletingId(id)
    try {
      await remove(id)
      toast.success('Weight record deleted')
    } catch {
      toast.error('Failed to delete weight record')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Weight History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Weight History</CardTitle>
      </CardHeader>
      <CardContent>
        {adding ? (
          <div className="mb-4 rounded-md border p-3">
            <WeightForm
              onSubmit={(vals) => handleCreate(vals)}
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
            {/* View mode: show chart only */}
            {mode === 'view' && <WeightChart weights={chartItems} />}

            {/* Edit mode: show records list only */}
            {mode === 'edit' && items.length > 0 && canEdit && (
              <div className="space-y-2">
                <ul className="space-y-2">
                  {items.map((w) => (
                    <li key={w.id} className="rounded-lg border p-3 bg-muted/50">
                      {editingId === w.id ? (
                        <WeightForm
                          initial={{ weight_kg: w.weight_kg, record_date: w.record_date }}
                          onSubmit={(vals) => handleUpdate(w.id, vals)}
                          onCancel={() => {
                            setEditingId(null)
                            setServerError(null)
                          }}
                          submitting={submitting}
                          serverError={serverError}
                        />
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <span className="font-medium">{w.weight_kg} kg</span>
                            <span className="text-sm text-muted-foreground">
                              {format(parseISO(w.record_date), 'yyyy-MM-dd')}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                setEditingId(w.id)
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
                                  disabled={deletingId === w.id}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete weight record?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this weight record (
                                    {w.weight_kg} kg on{' '}
                                    {format(parseISO(w.record_date), 'yyyy-MM-dd')})? This action
                                    cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => void handleDelete(w.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Edit mode: show empty state if no records */}
            {mode === 'edit' && items.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">No weight records yet.</p>
            )}

            {/* Show add button for canEdit users */}
            {canEdit && (
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => {
                  setAdding(true)
                }}
              >
                + Add New Weight Entry
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
