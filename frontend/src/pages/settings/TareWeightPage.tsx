import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { YearMonthDatePicker } from '@/components/ui/YearMonthDatePicker'
import { WeightChart } from '@/components/pet-health/weights/WeightChart'
import { useOwnerWeights } from '@/hooks/useOwnerWeights'
import { useDirtyFormState } from '@/hooks/use-app-update'
import { toast } from '@/lib/i18n-toast'

type FormSubmitEvent = Parameters<NonNullable<React.ComponentProps<'form'>['onSubmit']>>[0]

function OwnerWeightForm({
  onSubmit,
  onCancel,
  submitting,
  serverError,
}: {
  onSubmit: (values: { weight_kg: number; record_date: string }) => Promise<void>
  onCancel: () => void
  submitting?: boolean
  serverError?: string | null
}) {
  const { t } = useTranslation(['settings', 'pets', 'common'])
  const [weight, setWeight] = useState<number | ''>('')
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0] ?? '')
  const [errors, setErrors] = useState<{
    weight_kg?: string
    record_date?: string
  }>({})
  const initialDate = useMemo(() => new Date().toISOString().split('T')[0] ?? '', [])

  useDirtyFormState(weight !== '' || date !== initialDate)

  const handleSubmit = async (event: FormSubmitEvent) => {
    event.preventDefault()

    const weightNum = typeof weight === 'string' ? Number(weight) : weight
    const nextErrors: typeof errors = {}

    if (!weightNum || Number.isNaN(weightNum) || weightNum <= 0) {
      nextErrors.weight_kg = t('pets:weight.form.weightRequired')
    }

    if (!date) {
      nextErrors.record_date = t('pets:weight.form.dateRequired')
    }

    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    await onSubmit({ weight_kg: weightNum, record_date: date })
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4" noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium">{t('pets:weight.form.weightLabel')}</label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={weight}
            onChange={(event) => {
              setWeight(event.target.value === '' ? '' : Number(event.target.value))
            }}
            className="mt-1"
            placeholder={t('pets:weight.form.weightPlaceholder')}
          />
          {errors.weight_kg && <p className="mt-1 text-xs text-destructive">{errors.weight_kg}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium">{t('pets:weight.form.dateLabel')}</label>
          <div className="mt-1">
            <YearMonthDatePicker
              value={date}
              onChange={setDate}
              placeholder={t('pets:weight.form.datePlaceholder')}
              className="w-full"
            />
          </div>
          {errors.record_date && (
            <p className="mt-1 text-xs text-destructive">{errors.record_date}</p>
          )}
        </div>
      </div>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={Boolean(submitting)}>
          {submitting ? t('pets:weight.form.saving') : t('pets:weight.form.save')}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={Boolean(submitting)}>
          {t('common:actions.cancel')}
        </Button>
      </div>
    </form>
  )
}

export default function TareWeightPage() {
  const { t } = useTranslation(['settings', 'pets', 'common'])
  const { items, loading, create, update, remove } = useOwnerWeights()
  const [adding, setAdding] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const chartItems = useMemo(() => items.slice(0, 15), [items])

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

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/settings/account">{t('title')}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{t('tareWeight.title')}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Card>
          <CardHeader>
            <CardTitle>{t('tareWeight.title')}</CardTitle>
            <CardDescription>{t('tareWeight.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            {adding ? (
              <div className="mb-4 rounded-md border p-3">
                <OwnerWeightForm
                  onSubmit={handleCreate}
                  onCancel={() => {
                    setAdding(false)
                    setServerError(null)
                  }}
                  submitting={submitting}
                  serverError={serverError}
                />
              </div>
            ) : null}

            {loading ? (
              <p className="text-sm text-muted-foreground">{t('common:messages.loading')}</p>
            ) : (
              <>
                <WeightChart
                  weights={chartItems}
                  canEdit={true}
                  onUpdate={update}
                  onDelete={remove}
                />

                {!adding && (
                  <Button
                    variant="outline"
                    className="mt-4 w-full"
                    onClick={() => {
                      setAdding(true)
                    }}
                  >
                    {t('tareWeight.addAction')}
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
