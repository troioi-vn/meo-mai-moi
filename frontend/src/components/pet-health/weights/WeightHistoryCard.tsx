import { useMemo, useState, lazy, Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTranslation } from 'react-i18next'
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
import { useWeightHistoryRange, type WeightHistoryRange } from '@/hooks/useWeightHistoryRange'
import { WeightForm } from './WeightForm'
import { toast } from '@/lib/i18n-toast'
import { Pencil, Trash2, ChartLine, Plus } from 'lucide-react'
import { format, parseISO, subMonths, subYears } from 'date-fns'

const WeightChart = lazy(() => import('./WeightChart').then((m) => ({ default: m.WeightChart })))

const RANGE_OPTIONS: { value: WeightHistoryRange; label: string }[] = [
  { value: '1m', label: '1M' },
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: '1y', label: '1Y' },
  { value: 'all', label: 'ALL' },
]

interface WeightHistoryCardProps {
  petId: number
  canEdit: boolean
}

export function WeightHistoryCard({ petId, canEdit }: WeightHistoryCardProps) {
  const { t } = useTranslation(['pets', 'common'])
  const { items, loading, create, update, remove } = useWeights(petId)
  const { range, setRange } = useWeightHistoryRange()
  const [isEditing, setIsEditing] = useState(false)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  interface WeightItem {
    id: number
    weight_kg: number
    record_date: string
  }

  const typedItems = useMemo<WeightItem[]>(() => {
    return items
      .map((w) => {
        if (typeof w.id !== 'number') return null
        const weightNum = typeof w.weight_kg === 'string' ? parseFloat(w.weight_kg) : w.weight_kg
        if (typeof weightNum !== 'number' || !Number.isFinite(weightNum)) return null
        const rawDate = w.record_date ?? w.created_at
        if (typeof rawDate !== 'string' || !rawDate) return null
        const dateOnly = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate
        return { id: w.id, weight_kg: weightNum, record_date: dateOnly }
      })
      .filter((w): w is WeightItem => w !== null)
  }, [items])

  const chartItems = useMemo(() => {
    const today = new Date()

    const cutoff =
      range === '1m'
        ? subMonths(today, 1)
        : range === '3m'
          ? subMonths(today, 3)
          : range === '6m'
            ? subMonths(today, 6)
            : range === '1y'
              ? subYears(today, 1)
              : null

    if (!cutoff) {
      return typedItems
    }

    return typedItems.filter((item) => parseISO(item.record_date) >= cutoff)
  }, [range, typedItems])

  const handleCreate = async (values: { weight_kg: number; record_date: string }) => {
    setSubmitting(true)
    setServerError(null)
    try {
      await create(values)
      setAdding(false)
      toast.success('pets:weight.addSuccess')
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status
      const message = (err as { response?: { data?: { message?: string } } }).response?.data
        ?.message
      if (status === 422) {
        setServerError(message ?? t('common:errors.validation'))
      } else {
        toast.error('pets:weight.addError')
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
      toast.success('pets:weight.updateSuccess')
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status
      const message = (err as { response?: { data?: { message?: string } } }).response?.data
        ?.message
      if (status === 422) {
        setServerError(message ?? t('common:errors.validation'))
      } else {
        toast.error('pets:weight.updateError')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    setDeletingId(id)
    try {
      await remove(id)
      toast.success('pets:weight.deleteSuccess')
    } catch {
      toast.error('pets:weight.deleteError')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{t('weight.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('common:messages.loading')}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{t('weight.title')}</CardTitle>
          {canEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setIsEditing(!isEditing)
                setEditingId(null)
                setAdding(false)
                setServerError(null)
              }}
            >
              {isEditing ? <ChartLine className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
            </Button>
          )}
        </div>
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
            {/* Chart mode */}
            {!isEditing && (
              <>
                <div className="mb-4 flex items-center gap-2 overflow-x-auto">
                  <span className="shrink-0 text-sm text-muted-foreground">
                    {t('weight.rangeLabel')}
                  </span>
                  <div
                    className="inline-flex rounded-lg bg-muted p-1"
                    role="tablist"
                    aria-label={t('weight.rangeLabel')}
                  >
                    {RANGE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        role="tab"
                        aria-selected={range === option.value}
                        className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                          range === option.value
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-foreground/70 hover:text-foreground'
                        }`}
                        onClick={() => {
                          setRange(option.value)
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                <Suspense
                  fallback={<div className="h-62.5 w-full animate-pulse rounded bg-muted" />}
                >
                  <WeightChart
                    weights={chartItems}
                    canEdit={canEdit}
                    onUpdate={canEdit ? update : undefined}
                    onDelete={canEdit ? remove : undefined}
                  />
                </Suspense>
              </>
            )}

            {isEditing && typedItems.length > 0 && canEdit && (
              <div className="max-h-80 overflow-y-auto pr-4">
                <ul className="space-y-2">
                  {typedItems.map((w) => (
                    <li key={w.id} className="rounded-lg border p-3 bg-muted/50">
                      {editingId === w.id ? (
                        <WeightForm
                          initial={{
                            weight_kg: w.weight_kg,
                            record_date: w.record_date,
                          }}
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
                                  <AlertDialogTitle>{t('weight.deleteTitle')}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t('weight.deleteConfirm', {
                                      weight: w.weight_kg,
                                      date: format(parseISO(w.record_date), 'yyyy-MM-dd'),
                                    })}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>
                                    {t('common:actions.cancel')}
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => void handleDelete(w.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    {t('common:actions.delete')}
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

            {/* Edit mode: empty state */}
            {isEditing && typedItems.length === 0 && (
              <p className="text-sm text-muted-foreground py-2">{t('weight.noHistory')}</p>
            )}

            {/* Add button */}
            {canEdit && (
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => {
                  setAdding(true)
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                {t('weight.addWeight')}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
