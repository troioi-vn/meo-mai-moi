import { useState } from 'react'
import { Syringe, Pencil, Trash2, RefreshCw, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useVaccinations } from '@/hooks/useVaccinations'
import { VaccinationForm, type VaccinationFormValues } from './VaccinationForm'
import {
  getUpcomingVaccinations,
  getVaccinationIntervalDays,
  calculateNextDueDate,
} from '@/utils/vaccinationStatus'
import type { VaccinationRecord } from '@/api/pets'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'

/* eslint-disable @typescript-eslint/no-confusing-void-expression */

interface UpcomingVaccinationsSectionProps {
  petId: number
  canEdit: boolean
  onVaccinationChange?: () => void
  /** 'view' shows upcoming vaccinations with add button, 'edit' shows all vaccinations without add button */
  mode?: 'view' | 'edit'
}

export function UpcomingVaccinationsSection({
  petId,
  canEdit,
  onVaccinationChange,
  mode = 'view',
}: UpcomingVaccinationsSectionProps) {
  const { items, loading, create, update, remove, renew, setStatus } = useVaccinations(petId)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [renewingRecord, setRenewingRecord] = useState<VaccinationRecord | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const upcomingVaccinations = getUpcomingVaccinations(items)

  // Toggle between active and all (to show history)
  const handleShowHistoryToggle = (checked: boolean) => {
    setShowHistory(checked)
    setStatus(checked ? 'all' : 'active')
  }

  const handleCreate = async (values: VaccinationFormValues) => {
    setServerError(null)
    setSubmitting(true)
    try {
      await create(values)
      setAdding(false)
      onVaccinationChange?.()
    } catch {
      setServerError('Failed to save vaccination')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (id: number, values: VaccinationFormValues) => {
    setServerError(null)
    setSubmitting(true)
    try {
      await update(id, values)
      setEditingId(null)
      toast.success('Vaccination updated')
      onVaccinationChange?.()
    } catch {
      setServerError('Failed to update vaccination')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    setDeletingId(id)
    try {
      await remove(id)
      toast.success('Vaccination record deleted')
      onVaccinationChange?.()
    } catch {
      toast.error('Failed to delete vaccination record')
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
      toast.success('Vaccination renewed successfully')
      onVaccinationChange?.()
    } catch {
      setServerError('Failed to renew vaccination')
    } finally {
      setSubmitting(false)
    }
  }

  // Calculate initial values for renew form
  const getRenewInitialValues = (record: VaccinationRecord): Partial<VaccinationFormValues> => {
    const today = new Date().toISOString().split('T')[0] ?? ''
    const intervalDays = getVaccinationIntervalDays(record)
    const defaultInterval = 365 // Default to 1 year if no interval found

    return {
      vaccine_name: record.vaccine_name,
      administered_at: today,
      due_at: calculateNextDueDate(today, intervalDays ?? defaultInterval),
      notes: null,
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            {mode === 'edit' ? 'Vaccinations' : 'Upcoming Vaccinations'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    )
  }

  // In edit mode show all vaccinations, in view mode show only upcoming
  const displayedVaccinations = mode === 'edit' ? items : upcomingVaccinations

  const handleAddClick = () => {
    setAdding(true)
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">
              {mode === 'edit' ? 'Vaccinations' : 'Upcoming Vaccinations'}
            </CardTitle>
            {mode === 'edit' && (
              <div className="flex items-center gap-2">
                <Switch
                  id="show-history"
                  checked={showHistory}
                  onCheckedChange={handleShowHistoryToggle}
                />
                <Label
                  htmlFor="show-history"
                  className="text-sm text-muted-foreground flex items-center gap-1"
                >
                  <History className="h-4 w-4" />
                  Show History
                </Label>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {adding ? (
            <div className="rounded-md border p-4">
              <VaccinationForm
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
              {displayedVaccinations.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  {mode === 'edit'
                    ? showHistory
                      ? 'No vaccination history.'
                      : 'No active vaccinations recorded.'
                    : 'No upcoming vaccinations scheduled.'}
                </p>
              ) : (
                <ul className="space-y-2">
                  {displayedVaccinations.map((v) => {
                    const dueDate = v.due_at ? parseISO(v.due_at) : null
                    const isPast = dueDate && dueDate < new Date()
                    const isCompleted = v.completed_at !== null && v.completed_at !== undefined

                    return (
                      <li
                        key={v.id}
                        className={`rounded-lg border p-3 ${isCompleted ? 'bg-muted/30 opacity-75' : 'bg-muted/50'}`}
                      >
                        {editingId === v.id ? (
                          <VaccinationForm
                            initial={{
                              vaccine_name: v.vaccine_name,
                              administered_at: v.administered_at,
                              due_at: v.due_at,
                              notes: v.notes,
                            }}
                            onSubmit={(vals) => handleUpdate(v.id, vals)}
                            onCancel={() => {
                              setEditingId(null)
                              setServerError(null)
                            }}
                            submitting={submitting}
                            serverError={serverError}
                          />
                        ) : (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Syringe
                                className={`h-5 w-5 ${
                                  isCompleted
                                    ? 'text-muted-foreground'
                                    : isPast
                                      ? 'text-destructive'
                                      : 'text-blue-500'
                                }`}
                              />
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{v.vaccine_name}</span>
                                {dueDate && (
                                  <span
                                    className={`text-sm ${
                                      isCompleted
                                        ? 'text-muted-foreground line-through'
                                        : isPast
                                          ? 'text-destructive'
                                          : 'text-muted-foreground'
                                    }`}
                                  >
                                    {format(dueDate, 'yyyy-MM-dd')}
                                  </span>
                                )}
                                {isCompleted && (
                                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                    Renewed
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {/* View mode: show Renew button only */}
                              {mode === 'view' && canEdit && !isCompleted && dueDate && (
                                <Button
                                  variant={isPast ? 'default' : 'outline'}
                                  size="sm"
                                  className="h-8 gap-1"
                                  onClick={() => {
                                    setRenewingRecord(v)
                                  }}
                                >
                                  <RefreshCw className="h-3 w-3" />
                                  Renew
                                </Button>
                              )}
                              {/* Edit mode: show Pencil and Delete icons */}
                              {mode === 'edit' && canEdit && !isCompleted && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                    onClick={() => {
                                      setEditingId(v.id)
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
                                        disabled={deletingId === v.id}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>
                                          Delete vaccination record?
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete the vaccination record for{' '}
                                          <span className="font-medium">{v.vaccine_name}</span>?
                                          This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => {
                                            void handleDelete(v.id)
                                          }}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </>
                              )}
                              {/* Delete for completed records (in edit mode only) */}
                              {mode === 'edit' && canEdit && isCompleted && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                      disabled={deletingId === v.id}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        Delete vaccination history?
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete this historical vaccination
                                        record for{' '}
                                        <span className="font-medium">{v.vaccine_name}</span>? This
                                        action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => {
                                          void handleDelete(v.id)
                                        }}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}

              {canEdit && mode === 'view' && (
                <>
                  <Button variant="outline" className="w-full mt-3" onClick={handleAddClick}>
                    + Add New Vaccination Entry
                  </Button>
                </>
              )}

              {canEdit && mode === 'edit' && (
                <>
                  <Button variant="outline" className="w-full mt-3" onClick={handleAddClick}>
                    + Add Vaccination
                  </Button>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Renew Vaccination Modal */}
      <Dialog
        open={renewingRecord !== null}
        onOpenChange={(open) => !open && setRenewingRecord(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renew Vaccination</DialogTitle>
            <DialogDescription>
              Record a new vaccination for {renewingRecord?.vaccine_name}. The previous record will
              be marked as completed.
            </DialogDescription>
          </DialogHeader>
          {renewingRecord && (
            <VaccinationForm
              initial={getRenewInitialValues(renewingRecord)}
              onSubmit={handleRenew}
              onCancel={() => {
                setRenewingRecord(null)
                setServerError(null)
              }}
              submitting={submitting}
              serverError={serverError}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
/* eslint-enable @typescript-eslint/no-confusing-void-expression */
