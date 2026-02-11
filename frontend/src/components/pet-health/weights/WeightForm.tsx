import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { YearMonthDatePicker } from '@/components/ui/YearMonthDatePicker'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export interface WeightFormValues {
  weight_kg: number | ''
  record_date: string
}

// Normalize date string to YYYY-MM-DD format for HTML date input
const normalizeDate = (dateStr: string | undefined | null): string => {
  if (!dateStr) return new Date().toISOString().split('T')[0] ?? ''
  // If already in YYYY-MM-DD format, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
  // Otherwise parse and convert
  const d = new Date(dateStr)
  return d.toISOString().split('T')[0] ?? ''
}

export const WeightForm: React.FC<{
  initial?: Partial<WeightFormValues>
  onSubmit: (values: { weight_kg: number; record_date: string }) => Promise<void>
  onCancel: () => void
  submitting?: boolean
  serverError?: string | null
}> = ({ initial, onSubmit, onCancel, submitting, serverError }) => {
  const { t } = useTranslation(['pets', 'common'])
  const [weight, setWeight] = useState<number | ''>(initial?.weight_kg ?? '')
  const [tare, setTare] = useState<number | ''>(0)
  const [date, setDate] = useState<string>(() => normalizeDate(initial?.record_date))
  const [errors, setErrors] = useState<{ weight_kg?: string; record_date?: string }>({})

  const weightNum = typeof weight === 'string' ? Number(weight) : weight
  const tareNum = typeof tare === 'string' ? Number(tare) : tare
  const netWeight = weightNum && tareNum > 0 ? weightNum - tareNum : null

  const tareExceedsWeight = netWeight !== null && netWeight <= 0

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault()
    const newErrors: typeof errors = {}
    if (!weightNum || Number.isNaN(weightNum) || weightNum <= 0) {
      newErrors.weight_kg = t('pets:weight.form.weightRequired')
    }
    if (!date) {
      newErrors.record_date = t('pets:weight.form.dateRequired')
    }
    if (tareExceedsWeight) {
      newErrors.weight_kg = t('pets:weight.form.tareExceedsWeight')
    }
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return
    // Submit net weight if tare is applied, otherwise raw weight
    const submitWeight = netWeight !== null && netWeight > 0 ? netWeight : weightNum
    await onSubmit({ weight_kg: submitWeight, record_date: date })
  }

  return (
    <form
      onSubmit={(e) => {
        void handleSubmit(e)
      }}
      className="space-y-4"
      noValidate
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium">
            {t('pets:weight.form.weightLabel')}
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={weight}
            onChange={(e) => {
              setWeight(e.target.value === '' ? '' : Number(e.target.value))
            }}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            placeholder={t('pets:weight.form.weightPlaceholder')}
          />
          {errors.weight_kg && (
            <p className="text-xs text-destructive mt-1">{errors.weight_kg}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium">
            {t('pets:weight.form.dateLabel')}
          </label>
          <div className="mt-1">
            <YearMonthDatePicker
              value={date}
              onChange={setDate}
              placeholder={t('pets:weight.form.datePlaceholder')}
              className="w-full"
            />
          </div>
          {errors.record_date && (
            <p className="text-xs text-destructive mt-1">{errors.record_date}</p>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-1.5">
          <label className="text-sm font-medium text-muted-foreground">
            {t('pets:weight.form.tareLabel')}
          </label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('pets:weight.form.tareTooltip')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <input
          type="number"
          step="0.01"
          min="0"
          value={tare}
          onChange={(e) => {
            setTare(e.target.value === '' ? '' : Number(e.target.value))
          }}
          className="mt-1 w-full rounded-md border px-3 py-2 text-sm sm:w-1/2"
          placeholder="0"
        />
        {netWeight !== null && !tareExceedsWeight && (
          <p className="mt-1.5 text-sm font-medium text-muted-foreground">
            {t('pets:weight.form.netWeight', { weight: netWeight.toFixed(2) })}
          </p>
        )}
        {tareExceedsWeight && (
          <p className="mt-1 text-sm text-destructive">
            {t('pets:weight.form.tareExceedsWeight')}
          </p>
        )}
      </div>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={Boolean(submitting)}>
          {submitting ? t('pets:weight.form.saving') : t('pets:weight.form.save')}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={Boolean(submitting)}
        >
          {t('common:actions.cancel')}
        </Button>
      </div>
    </form>
  )
}
