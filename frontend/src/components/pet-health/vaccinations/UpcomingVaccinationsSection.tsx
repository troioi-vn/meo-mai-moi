import { useState } from 'react'
import { Syringe, Pencil, Trash2, RefreshCw, History } from 'lucide-react'
import { HealthRecordPhotoModal } from '@/components/pet-health/HealthRecordPhotoModal'
import { useTranslation } from 'react-i18next'
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
import { getUpcomingVaccinations } from '@/utils/vaccinationStatus'
import { type VaccinationRecord } from '@/api/generated/model/vaccinationRecord'
import { format, parseISO } from 'date-fns'
import { toast } from '@/lib/i18n-toast'

/* eslint-disable @typescript-eslint/no-confusing-void-expression */

interface UpcomingVaccinationsSectionProps {
  petId: number
  canEdit: boolean
  onVaccinationChange?: () => void
  /** 'view' shows upcoming vaccinations with add button, 'edit' shows all vaccinations without add button */
  mode?: 'view' | 'edit'
  /** Pet's birthday for calculating default booster interval */
  petBirthday?: string | null
}

export function UpcomingVaccinationsSection({
  petId,
  canEdit,
  onVaccinationChange,
  mode = 'view',
  petBirthday,
}: UpcomingVaccinationsSectionProps) {
  const { t } = useTranslation(['pets', 'common'])
  const vState = useVaccinations(petId)
  const { items, loading, create, update, remove, renew, setStatus } = vState
  const uploadPhoto = vState.uploadPhoto as (recordId: number, file: File) => Promise<unknown>
  const deletePhoto = vState.deletePhoto as (recordId: number) => Promise<void>

  const typedItems = items as (VaccinationRecord & { id: number })[]

  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [renewingRecord, setRenewingRecord] = useState<(VaccinationRecord & { id: number }) | null>(
    null
  )
  const [serverError, setServerError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  // Photo modal state
  const [photoModalOpen, setPhotoModalOpen] = useState(false)
  const [photoModalRecord, setPhotoModalRecord] = useState<
    (VaccinationRecord & { id: number }) | null
  >(null)

  const upcomingVaccinations = getUpcomingVaccinations(typedItems)

  // Toggle between active and all (to show history)
  const handleShowHistoryToggle = (checked: boolean) => {
    setShowHistory(checked)
    setStatus(checked ? 'all' : 'active')
  }

  const handleCreate = async (values: VaccinationFormValues) => {
    setServerError(null)
    setSubmitting(true)
    try {
      const record = await create(values)
      if (values.photo && record.id) {
        try {
          await uploadPhoto(record.id, values.photo)
        } catch {
          toast.error('pets:medical.uploadError')
        }
      }
      setAdding(false)
      onVaccinationChange?.()
    } catch {
      setServerError(t('vaccinations.saveError'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (id: number, values: VaccinationFormValues) => {
    setServerError(null)
    setSubmitting(true)
    try {
      await update(id, values)
      if (values.photo) {
        try {
          await uploadPhoto(id, values.photo)
        } catch {
          toast.error('pets:medical.uploadError')
        }
      }
      setEditingId(null)
      toast.success('pets:vaccinations.updateSuccess')
      onVaccinationChange?.()
    } catch {
      setServerError(t('vaccinations.updateError'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    setDeletingId(id)
    try {
      await remove(id)
      toast.success('pets:vaccinations.deleteSuccess')
      onVaccinationChange?.()
    } catch {
      toast.error('pets:vaccinations.deleteError')
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
      toast.success('pets:vaccinations.renewSuccess')
      onVaccinationChange?.()
    } catch {
      setServerError(t('vaccinations.renewError'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeletePhoto = async (recordId: number) => {
    try {
      await deletePhoto(recordId)
      toast.success('pets:medical.photoDeleteSuccess')
      onVaccinationChange?.()
    } catch {
      toast.error('pets:medical.photoDeleteError')
    }
  }

  const openPhotoModal = (record: VaccinationRecord & { id: number }) => {
    setPhotoModalRecord(record)
    setPhotoModalOpen(true)
  }

  // Calculate initial values for renew form (due_at omitted so the form auto-calculates it)
  const getRenewInitialValues = (
    record: VaccinationRecord & { id: number }
  ): Partial<VaccinationFormValues> => {
    const today = new Date().toISOString().split('T')[0] ?? ''

    return {
      vaccine_name: record.vaccine_name ?? '',
      administered_at: today,
      notes: null,
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            {mode === 'edit' ? t('vaccinations.title') : t('vaccinations.upcomingTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('common:messages.loading')}</p>
        </CardContent>
      </Card>
    )
  }

  // In edit mode show all vaccinations, in view mode show only upcoming
  const displayedVaccinations = (
    mode === 'edit' ? typedItems : upcomingVaccinations
  ) as (VaccinationRecord & { id: number })[]

  const handleAddClick = () => {
    setAdding(true)
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">
              {mode === 'edit' ? t('vaccinations.title') : t('vaccinations.upcomingTitle')}
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
                  {t('vaccinations.showHistory')}
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
                petBirthday={petBirthday}
              />
            </div>
          ) : (
            <>
              {displayedVaccinations.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  {mode === 'edit'
                    ? showHistory
                      ? t('vaccinations.noHistory')
                      : t('vaccinations.noActive')
                    : t('vaccinations.noUpcoming')}
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
                              vaccine_name: v.vaccine_name ?? '',
                              administered_at: v.administered_at ?? '',
                              due_at: v.due_at ?? '',
                              notes: v.notes ?? '',
                            }}
                            onSubmit={(vals) => handleUpdate(v.id, vals)}
                            onCancel={() => {
                              setEditingId(null)
                              setServerError(null)
                            }}
                            submitting={submitting}
                            serverError={serverError}
                            petBirthday={petBirthday}
                            existingPhotoUrl={v.photo_url}
                            onDeleteExistingPhoto={async () => {
                              await handleDeletePhoto(v.id)
                            }}
                          />
                        ) : (
                          <div className="flex flex-col gap-2">
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
                                  <span className="font-medium">
                                    {v.vaccine_name ?? t('common:status.unknown')}
                                  </span>
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
                                      {t('vaccinations.renewed')}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                {/* View mode: show Renew button */}
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
                                    {t('vaccinations.renew')}
                                  </Button>
                                )}
                                {/* Show Pencil and Delete icons when canEdit */}
                                {canEdit && !isCompleted && (
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
                                            {t('vaccinations.deleteTitle')}
                                          </AlertDialogTitle>
                                          <AlertDialogDescription>
                                            {t('vaccinations.deleteConfirm', {
                                              name: v.vaccine_name ?? t('common:status.unknown'),
                                            })}
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>
                                            {t('common:actions.cancel')}
                                          </AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => {
                                              void handleDelete(v.id)
                                            }}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                          >
                                            {t('common:actions.delete')}
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </>
                                )}
                                {/* Delete for completed records */}
                                {canEdit && isCompleted && (
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
                                          {t('vaccinations.deleteHistoryTitle')}
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                          {t('vaccinations.deleteHistoryConfirm', {
                                            name: v.vaccine_name ?? t('common:status.unknown'),
                                          })}
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>
                                          {t('common:actions.cancel')}
                                        </AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => {
                                            void handleDelete(v.id)
                                          }}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                          {t('common:actions.delete')}
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                              </div>
                            </div>
                            {/* Photo section */}
                            {Boolean(v.photo_url) && (
                              <div className="flex items-center gap-2 mt-1 ml-8">
                                <button
                                  type="button"
                                  onClick={() => {
                                    openPhotoModal(v)
                                  }}
                                  className="w-12 h-12 overflow-hidden rounded border cursor-pointer hover:opacity-90 transition-opacity"
                                >
                                  <img
                                    src={v.photo_url ?? ''}
                                    alt="Vaccination record"
                                    className="w-full h-full object-cover"
                                  />
                                </button>
                              </div>
                            )}
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
                    + {t('vaccinations.addVaccinationEntry')}
                  </Button>
                </>
              )}

              {canEdit && mode === 'edit' && (
                <>
                  <Button variant="outline" className="w-full mt-3" onClick={handleAddClick}>
                    + {t('vaccinations.addVaccination')}
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
            <DialogTitle>{t('vaccinations.renewTitle')}</DialogTitle>
            <DialogDescription>
              {t('vaccinations.renewDescription', { name: renewingRecord?.vaccine_name })}
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
              petBirthday={petBirthday}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Photo modal */}
      {photoModalRecord?.photo_url && (
        <HealthRecordPhotoModal
          photos={[
            {
              id: photoModalRecord.id,
              url: photoModalRecord.photo_url || '',
              thumb_url: photoModalRecord.photo_url || '',
            },
          ]}
          open={photoModalOpen}
          onOpenChange={setPhotoModalOpen}
          initialIndex={0}
          canDelete={canEdit && !photoModalRecord.completed_at}
          onDelete={async () => {
            await handleDeletePhoto(photoModalRecord.id)
          }}
        />
      )}
    </>
  )
}
/* eslint-enable @typescript-eslint/no-confusing-void-expression */
