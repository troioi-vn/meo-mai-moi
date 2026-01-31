import { useRef, useState } from 'react'
import { Syringe, Pencil, Trash2, RefreshCw, History, ImagePlus } from 'lucide-react'
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
import {
  getUpcomingVaccinations,
  getVaccinationIntervalDays,
  calculateNextDueDate,
} from '@/utils/vaccinationStatus'
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
}

export function UpcomingVaccinationsSection({
  petId,
  canEdit,
  onVaccinationChange,
  mode = 'view',
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
  const [uploadingPhotoForId, setUploadingPhotoForId] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null)
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
      await create(values)
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

  const handleUploadClick = (recordId: number) => {
    setSelectedRecordId(recordId)
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !selectedRecordId) return

    if (!file.type.startsWith('image/')) {
      toast.error('pets:medical.selectImageError')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('pets:medical.fileSizeError')
      return
    }

    setUploadingPhotoForId(selectedRecordId)
    try {
      await uploadPhoto(selectedRecordId, file)
      toast.success('pets:medical.uploadSuccess')
      onVaccinationChange?.()
    } catch {
      toast.error('pets:medical.uploadError')
    } finally {
      setUploadingPhotoForId(null)
      setSelectedRecordId(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
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

  // Calculate initial values for renew form
  const getRenewInitialValues = (
    record: VaccinationRecord & { id: number }
  ): Partial<VaccinationFormValues> => {
    const today = new Date().toISOString().split('T')[0] ?? ''
    const intervalDays = getVaccinationIntervalDays(record)
    const defaultInterval = 365 // Default to 1 year if no interval found

    return {
      vaccine_name: record.vaccine_name ?? '',
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
                                    {t('vaccinations.renew')}
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
                            {(Boolean(v.photo_url) ||
                              (mode === 'edit' && canEdit && !isCompleted)) && (
                              <div className="flex items-center gap-2 mt-1 ml-8">
                                {v.photo_url && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      openPhotoModal(v)
                                    }}
                                    className="w-12 h-12 overflow-hidden rounded border cursor-pointer hover:opacity-90 transition-opacity"
                                  >
                                    <img
                                      src={v.photo_url || ''}
                                      alt="Vaccination record"
                                      className="w-full h-full object-cover"
                                    />
                                  </button>
                                )}
                                {mode === 'edit' && canEdit && !isCompleted && !v.photo_url && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => {
                                      handleUploadClick(v.id)
                                    }}
                                    disabled={uploadingPhotoForId === v.id}
                                  >
                                    <ImagePlus className="h-3 w-3 mr-1" />
                                    {uploadingPhotoForId === v.id
                                      ? t('medical.uploading')
                                      : t('medical.addPhoto')}
                                  </Button>
                                )}
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
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Hidden file input for photo uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(event) => {
          void handleFileChange(event)
        }}
        className="hidden"
      />

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
          canDelete={mode === 'edit' && canEdit && !photoModalRecord.completed_at}
          onDelete={async () => {
            await handleDeletePhoto(photoModalRecord.id)
          }}
        />
      )}
    </>
  )
}
/* eslint-enable @typescript-eslint/no-confusing-void-expression */
