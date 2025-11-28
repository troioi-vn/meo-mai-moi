import { useState } from 'react'
import { Calendar, Pencil, Trash2 } from 'lucide-react'
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
import { useVaccinations } from '@/hooks/useVaccinations'
import { VaccinationForm, type VaccinationFormValues } from './VaccinationForm'
import { getUpcomingVaccinations } from '@/utils/vaccinationStatus'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'

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
  const { items, loading, create, update, remove } = useVaccinations(petId)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const upcomingVaccinations = getUpcomingVaccinations(items)

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

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">
          {mode === 'edit' ? 'Vaccinations' : 'Upcoming Vaccinations'}
        </CardTitle>
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
                  ? 'No vaccinations recorded.'
                  : 'No upcoming vaccinations scheduled.'}
              </p>
            ) : (
              <ul className="space-y-2">
                {displayedVaccinations.map((v) => {
                  const dueDate = v.due_at ? parseISO(v.due_at) : null
                  const isPast = dueDate && dueDate < new Date()

                  return (
                    <li key={v.id} className="rounded-lg border p-3 bg-muted/50">
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
                            <Calendar className="h-5 w-5 text-muted-foreground" />
                            <span className="font-medium">{v.vaccine_name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {dueDate && (
                              <span
                                className={`text-sm ${isPast ? 'text-destructive font-medium' : 'text-muted-foreground'}`}
                              >
                                {isPast ? 'Overdue: ' : 'Due: '}
                                {format(dueDate, 'yyyy-MM-dd')}
                              </span>
                            )}
                            {canEdit && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                  onClick={() => setEditingId(v.id)}
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
                                        <span className="font-medium">{v.vaccine_name}</span>? This
                                        action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => void handleDelete(v.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
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
              <Button variant="outline" className="w-full mt-3" onClick={() => setAdding(true)}>
                + Add New Vaccination Entry
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
