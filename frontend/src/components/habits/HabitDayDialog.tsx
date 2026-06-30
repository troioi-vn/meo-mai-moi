import { useEffect, useMemo, useState } from 'react'
import type { Habit, HabitDayEntry } from '@/api/generated/model'
import { getHabitDayEntries, putHabitDayEntries } from '@/api/habits-day'
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
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { LoadingState } from '@/components/ui/LoadingState'
import { useDirtyFormState } from '@/hooks/use-app-update'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/i18n-toast'
import { format, parseISO } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { useNetworkStatus } from '@/hooks/use-network-status'
import {
  enqueueOperation,
  isPendingHabitDayEntriesOperationForDate,
  listOperations,
  updateOperation,
} from '@/offline/operations'
import { generateQueueId } from '@/offline/queue-core'

interface HabitDayDialogProps {
  habit: Habit
  date: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export function HabitDayDialog(props: HabitDayDialogProps) {
  const { habit, date, open, onOpenChange, onSaved } = props
  const { t } = useTranslation(['habits', 'common'])
  const isOnline = useNetworkStatus()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [entries, setEntries] = useState<HabitDayEntry[]>([])
  const [initialEntries, setInitialEntries] = useState<HabitDayEntry[]>([])
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false)

  useEffect(() => {
    if (!open || !habit.id) return

    if (!isOnline) {
      setLoading(true)
      void entriesFromHabitPetsWithPending(habit, date).then((offlineEntries) => {
        setEntries(offlineEntries)
        setInitialEntries(offlineEntries)
        setLoading(false)
      })
      return
    }

    setLoading(true)
    void getHabitDayEntries(habit.id, date)
      .then((data) => {
        setEntries(data.entries)
        setInitialEntries(data.entries)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [date, habit, habit.id, isOnline, open])

  useEffect(() => {
    if (!open) {
      setConfirmCloseOpen(false)
    }
  }, [open])

  const comparableEntries = useMemo(
    () =>
      JSON.stringify(
        entries
          .filter((entry) => entry.is_current_pet)
          .map((entry) => ({
            pet_id: entry.pet_id ?? 0,
            value_int: entry.value_int ?? null,
          }))
          .sort((left, right) => left.pet_id - right.pet_id)
      ),
    [entries]
  )

  const comparableInitialEntries = useMemo(
    () =>
      JSON.stringify(
        initialEntries
          .filter((entry) => entry.is_current_pet)
          .map((entry) => ({
            pet_id: entry.pet_id ?? 0,
            value_int: entry.value_int ?? null,
          }))
          .sort((left, right) => left.pet_id - right.pet_id)
      ),
    [initialEntries]
  )
  const hasUnsavedChanges = !loading && comparableEntries !== comparableInitialEntries

  useDirtyFormState(open && hasUnsavedChanges)

  const updateEntry = (petId: number, value: number | null) => {
    setEntries((prev) =>
      prev.map((entry) => (entry.pet_id === petId ? { ...entry, value_int: value } : entry))
    )
  }

  const handleSave = async () => {
    if (!habit.id) return
    setSaving(true)
    try {
      const payloadEntries = entries
        .filter((entry) => entry.is_current_pet)
        .map((entry) => ({
          pet_id: entry.pet_id ?? 0,
          value_int:
            habit.value_type === 'yes_no'
              ? entry.value_int === 1
                ? 1
                : null
              : (entry.value_int ?? null),
        }))

      if (isOnline) {
        await putHabitDayEntries(habit.id, date, {
          entries: payloadEntries,
        })
      } else {
        await enqueueOrReplaceHabitDayOperation(habit.id, date, payloadEntries)
      }

      setInitialEntries(entries)
      setConfirmCloseOpen(false)
      toast.success('habits:messages.saved')
      onSaved()
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  const handleAttemptClose = () => {
    if (saving) {
      return
    }

    if (hasUnsavedChanges) {
      setConfirmCloseOpen(true)
      return
    }

    onOpenChange(false)
  }

  const handlePreventedClose = (event: { preventDefault: () => void }) => {
    if (!hasUnsavedChanges || saving) {
      return
    }

    event.preventDefault()
    setConfirmCloseOpen(true)
  }

  const formattedTitleDate = `${format(parseISO(date), 'EEE')}, ${format(parseISO(date), 'dd/MM/yyyy')}`
  const hasCurrentEntries = entries.some((entry) => entry.is_current_pet)
  const scaleOptions = Array.from(
    {
      length: Math.max(0, (habit.scale_max ?? 10) - (habit.scale_min ?? 1) + 1),
    },
    (_, index) => (habit.scale_min ?? 1) + index
  )

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (nextOpen) {
            return
          }

          handleAttemptClose()
        }}
      >
        <DialogContent
          className="sm:max-w-xl"
          onInteractOutside={handlePreventedClose}
          onPointerDownOutside={handlePreventedClose}
          onEscapeKeyDown={handlePreventedClose}
        >
          <DialogHeader>
            <DialogTitle>{t('dayDialog.title', { date: formattedTitleDate })}</DialogTitle>
            <DialogDescription>{t('dayDialog.description')}</DialogDescription>
          </DialogHeader>

          {loading ? (
            <LoadingState message={t('loadingDay')} />
          ) : (
            <div className="max-h-[60vh] overflow-y-auto pr-2 -mr-2">
              <div className="space-y-1">
                {entries.map((entry) => (
                  <div
                    key={entry.pet_id}
                    className="flex items-center justify-between gap-4 py-3 border-b border-border/50 last:border-0"
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <Label className="truncate text-base">{entry.pet_name}</Label>
                      {!entry.is_current_pet && (
                        <span className="text-xs text-muted-foreground leading-none">
                          {t('dayDialog.historicalPet')}
                        </span>
                      )}
                    </div>
                    <div className="w-40 shrink-0">
                      {habit.value_type === 'yes_no' ? (
                        <div className="flex items-center justify-end gap-2">
                          <span
                            className={cn(
                              'text-sm',
                              entry.value_int === 1 ? 'text-muted-foreground' : 'font-medium'
                            )}
                          >
                            {t('dayDialog.no')}
                          </span>
                          <Switch
                            checked={entry.value_int === 1}
                            disabled={!entry.is_current_pet}
                            aria-label={`${entry.pet_name ?? ''}: ${t('dayDialog.yes')}`}
                            onCheckedChange={(checked) => {
                              updateEntry(entry.pet_id ?? 0, checked ? 1 : null)
                            }}
                          />
                          <span
                            className={cn(
                              'text-sm',
                              entry.value_int === 1 ? 'font-medium' : 'text-muted-foreground'
                            )}
                          >
                            {t('dayDialog.yes')}
                          </span>
                        </div>
                      ) : (
                        <Select
                          value={entry.value_int === null ? 'unset' : String(entry.value_int)}
                          disabled={!entry.is_current_pet}
                          onValueChange={(value) => {
                            updateEntry(entry.pet_id ?? 0, value === 'unset' ? null : Number(value))
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={`${String(habit.scale_min ?? 1)}-${String(habit.scale_max ?? 10)}`}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unset">{t('dayDialog.unset')}</SelectItem>
                            {scaleOptions.map((value) => (
                              <SelectItem key={value} value={String(value)}>
                                {String(value)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              onClick={() => {
                void handleSave()
              }}
              disabled={loading || saving || !hasCurrentEntries}
            >
              {saving ? t('dayDialog.saving') : t('dayDialog.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmCloseOpen} onOpenChange={setConfirmCloseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dayDialog.unsavedChangesTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dayDialog.unsavedChangesDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>{t('common:actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={saving}
              onClick={() => {
                setConfirmCloseOpen(false)
                onOpenChange(false)
              }}
            >
              {t('dayDialog.closeWithoutSaving')}
            </AlertDialogAction>
            <AlertDialogAction
              disabled={saving || !hasCurrentEntries}
              onClick={() => {
                void handleSave()
              }}
            >
              {t('dayDialog.saveBeforeClosing')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function entriesFromHabitPets(habit: Habit): HabitDayEntry[] {
  return (habit.pets ?? [])
    .filter((pet) => pet.id != null)
    .map((pet) => ({
      pet_id: pet.id,
      pet_name: pet.name,
      pet_photo_url: pet.photo_url,
      value_int: null,
      is_current_pet: true,
      has_entry: false,
    }))
}

async function entriesFromHabitPetsWithPending(
  habit: Habit,
  date: string
): Promise<HabitDayEntry[]> {
  const habitId = habit.id
  const offlineEntries = entriesFromHabitPets(habit)
  if (!habitId) {
    return offlineEntries
  }

  const operations = await listOperations()
  const pendingOperation = operations.find((operation) =>
    isPendingHabitDayEntriesOperationForDate(operation, habitId, date)
  )
  const payload = pendingOperation?.payload

  if (!payload || typeof payload !== 'object' || !('entries' in payload)) {
    return offlineEntries
  }

  const pendingEntries = (payload as { entries?: unknown }).entries
  if (!Array.isArray(pendingEntries)) {
    return offlineEntries
  }

  const valueByPetId = new Map<number, number | null>()
  for (const entry of pendingEntries) {
    if (!entry || typeof entry !== 'object') {
      continue
    }

    const candidate = entry as { pet_id?: unknown; value_int?: unknown }
    if (
      typeof candidate.pet_id === 'number' &&
      (candidate.value_int === null || typeof candidate.value_int === 'number')
    ) {
      valueByPetId.set(candidate.pet_id, candidate.value_int)
    }
  }

  return offlineEntries.map((entry) => ({
    ...entry,
    value_int: entry.pet_id == null ? entry.value_int : (valueByPetId.get(entry.pet_id) ?? null),
    has_entry: entry.pet_id == null ? entry.has_entry : valueByPetId.has(entry.pet_id),
  }))
}

async function enqueueOrReplaceHabitDayOperation(
  habitId: number,
  date: string,
  entries: { pet_id: number; value_int: number | null }[]
) {
  const operations = await listOperations()
  const existingOperation = operations.find((operation) =>
    isPendingHabitDayEntriesOperationForDate(operation, habitId, date)
  )

  const payload = {
    habitId,
    date,
    entries,
  }

  if (existingOperation) {
    await updateOperation(existingOperation.id, {
      status: 'pending',
      payload,
      lastError: undefined,
    })
    return existingOperation.id
  }

  const idempotencyKey = generateQueueId()

  return enqueueOperation({
    idempotencyKey,
    entityType: 'habit',
    entityId: habitId,
    operation: 'update',
    payload,
  })
}
