import { useEffect, useState } from 'react'
import type { Habit, HabitDayEntry } from '@/api/generated/model'
import { getHabitDayEntries, putHabitDayEntries } from '@/api/habits-day'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoadingState } from '@/components/ui/LoadingState'
import { toast } from '@/lib/i18n-toast'
import { useTranslation } from 'react-i18next'

interface HabitDayDialogProps {
  habit: Habit
  date: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

export function HabitDayDialog(props: HabitDayDialogProps) {
  const { habit, date, open, onOpenChange, onSaved } = props
  const { t } = useTranslation('habits')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [entries, setEntries] = useState<HabitDayEntry[]>([])

  useEffect(() => {
    if (!open || !habit.id) return

    setLoading(true)
    void getHabitDayEntries(habit.id, date)
      .then((data) => {
        setEntries(data.entries)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [date, habit.id, open])

  const updateEntry = (petId: number, value: number | null) => {
    setEntries((prev) =>
      prev.map((entry) => (entry.pet_id === petId ? { ...entry, value_int: value } : entry))
    )
  }

  const handleSave = async () => {
    if (!habit.id) return
    setSaving(true)
    try {
      await putHabitDayEntries(habit.id, date, {
        entries: entries.map((entry) => ({
          pet_id: entry.pet_id ?? 0,
          value_int: entry.value_int ?? null,
        })),
      })
      toast.success('habits:messages.saved')
      onSaved()
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('dayDialog.title', { date })}</DialogTitle>
          <DialogDescription>{t('dayDialog.description')}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <LoadingState message={t('loadingDay')} />
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => (
              <div key={entry.pet_id} className="space-y-2 rounded-lg border p-3">
                <Label>{entry.pet_name}</Label>
                {habit.value_type === 'yes_no' ? (
                  <Select
                    value={entry.value_int === null ? 'unset' : String(entry.value_int)}
                    onValueChange={(value) => {
                      updateEntry(entry.pet_id ?? 0, value === 'unset' ? null : Number(value))
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unset">{t('dayDialog.unset')}</SelectItem>
                      <SelectItem value="0">{t('dayDialog.no')}</SelectItem>
                      <SelectItem value="1">{t('dayDialog.yes')}</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type="number"
                    min={habit.scale_min ?? undefined}
                    max={habit.scale_max ?? undefined}
                    value={entry.value_int ?? ''}
                    placeholder={`${String(habit.scale_min ?? 1)}-${String(habit.scale_max ?? 10)}`}
                    onChange={(event) => {
                      const value = event.target.value
                      updateEntry(entry.pet_id ?? 0, value === '' ? null : Number(value))
                    }}
                  />
                )}
                {!entry.is_current_pet && (
                  <p className="text-xs text-muted-foreground">{t('dayDialog.historicalPet')}</p>
                )}
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            onClick={() => {
              void handleSave()
            }}
            disabled={loading || saving}
          >
            {saving ? t('dayDialog.saving') : t('dayDialog.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
