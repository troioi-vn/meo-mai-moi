import React, { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useMicrochips } from '@/hooks/useMicrochips'
import { Button } from '@/components/ui/button'
import { YearMonthDatePicker } from '@/components/ui/YearMonthDatePicker'
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

interface FormValues {
  chip_number: string
  issuer?: string | null
  implanted_at?: string | null
}

const MicrochipForm: React.FC<{
  initial?: Partial<FormValues>
  onSubmit: (values: FormValues) => Promise<void>
  onCancel: () => void
  submitting?: boolean
  serverError?: string | null
}> = ({ initial, onSubmit, onCancel, submitting, serverError }) => {
  const [chipNumber, setChipNumber] = useState<string>(initial?.chip_number ?? '')
  const [issuer, setIssuer] = useState<string>(initial?.issuer ?? '')
  const [implantedAt, setImplantedAt] = useState<string>(
    initial ? (initial.implanted_at ?? '') : (new Date().toISOString().split('T')[0] ?? '')
  )
  const [errors, setErrors] = useState<{ chip_number?: string }>({})

  const { t } = useTranslation(['common', 'pets'])

  const submit = async (e: React.SubmitEvent) => {
    e.preventDefault()
    const errs: typeof errors = {}
    if (!chipNumber || chipNumber.trim().length < 10)
      errs.chip_number = t('pets:microchip.form.validation.chipNumberRequired')
    setErrors(errs)
    if (Object.keys(errs).length) return
    await onSubmit({
      chip_number: chipNumber.trim(),
      issuer: issuer.trim() ? issuer.trim() : null,
      implanted_at: implantedAt || null,
    })
  }

  return (
    <form
      onSubmit={(e) => {
        void submit(e)
      }}
      className="space-y-4"
      noValidate
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="chip_number" className="block text-sm font-medium">
            {t('pets:microchip.form.chipNumber')}
          </Label>
          <input
            id="chip_number"
            type="text"
            value={chipNumber}
            onChange={(e) => {
              setChipNumber(e.target.value)
            }}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            placeholder={t('pets:microchip.form.chipNumberPlaceholder')}
          />
          {errors.chip_number && (
            <p className="text-xs text-destructive mt-1">{errors.chip_number}</p>
          )}
        </div>
        <div>
          <Label htmlFor="issuer" className="block text-sm font-medium">
            {t('pets:microchip.form.issuer')}
          </Label>
          <input
            id="issuer"
            type="text"
            value={issuer}
            onChange={(e) => {
              setIssuer(e.target.value)
            }}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            placeholder={t('pets:microchip.form.issuerPlaceholder')}
          />
        </div>
        <div className="space-y-1">
          <Label>{t('pets:microchip.form.implantedAt')}</Label>
          <YearMonthDatePicker
            value={implantedAt}
            onChange={(val) => {
              setImplantedAt(val)
            }}
            placeholder={t('pets:microchip.form.selectDate')}
          />
        </div>
      </div>
      {serverError && <p className="text-sm text-destructive">{serverError}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={Boolean(submitting)}>
          {submitting ? t('pets:microchip.form.saving') : t('pets:microchip.form.save')}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={Boolean(submitting)}>
          {t('common:actions.cancel')}
        </Button>
      </div>
    </form>
  )
}

export const MicrochipsSection: React.FC<{ petId: number; canEdit: boolean }> = ({
  petId,
  canEdit,
}) => {
  const { items, loading, error, create, update, remove } = useMicrochips(petId)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const { t } = useTranslation(['common', 'pets'])

  interface MicrochipItem {
    id: number
    chip_number: string
    issuer?: string | null
    implanted_at?: string | null
    created_at?: string
  }

  const sorted = useMemo<MicrochipItem[]>(() => {
    const typedItems: MicrochipItem[] = items
      .filter(
        (m): m is MicrochipItem => typeof m.id === 'number' && typeof m.chip_number === 'string'
      )
      .map((m) => ({
        id: m.id,
        chip_number: m.chip_number,
        issuer: m.issuer ?? null,
        implanted_at: m.implanted_at ?? null,
        created_at: m.created_at,
      }))

    return [...typedItems].sort((a, b) => {
      const aDate = a.implanted_at ?? a.created_at ?? ''
      const bDate = b.implanted_at ?? b.created_at ?? ''
      return bDate.localeCompare(aDate)
    })
  }, [items])

  const startAdd = () => {
    setAdding(true)
    setEditingId(null)
    setServerError(null)
  }
  const cancel = () => {
    setAdding(false)
    setEditingId(null)
    setServerError(null)
  }

  const handleCreate = async (values: FormValues) => {
    setSubmitting(true)
    setServerError(null)
    try {
      await create(values)
      setAdding(false)
    } catch (err: unknown) {
      // Prefer AxiosError typing to avoid any/unsafe accesses
      const status = (err as { response?: { status?: number } }).response?.status
      const message = (err as { response?: { data?: { message?: string } } }).response?.data
        ?.message
      if (status === 422) setServerError(message ?? t('pets:microchip.errors.validationError'))
      else setServerError(t('pets:microchip.errors.addFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (id: number, values: Partial<FormValues>) => {
    setSubmitting(true)
    setServerError(null)
    try {
      await update(id, values)
      setEditingId(null)
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status
      const message = (err as { response?: { data?: { message?: string } } }).response?.data
        ?.message
      if (status === 422) setServerError(message ?? t('pets:microchip.errors.validationError'))
      else setServerError(t('pets:microchip.errors.updateFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div>{t('pets:microchip.sections.loading')}</div>
  if (error) return <div className="text-destructive">{error}</div>

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">
          {t('pets:microchip.sections.title')}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {adding && canEdit ? (
          <div className="rounded-md border p-3">
            <MicrochipForm
              onSubmit={handleCreate}
              onCancel={cancel}
              submitting={submitting}
              serverError={serverError}
            />
          </div>
        ) : (
          <>
            {sorted.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                {t('pets:microchip.sections.empty')}
              </p>
            ) : (
              <ul className="divide-y rounded-md border">
                {sorted.map((m) => (
                  <li key={String(m.id)} className="flex items-center justify-between p-3">
                    {editingId === m.id ? (
                      <MicrochipForm
                        initial={{
                          chip_number: m.chip_number,
                          issuer: m.issuer ?? undefined,
                          implanted_at: m.implanted_at ?? undefined,
                        }}
                        onSubmit={async (v) => {
                          await handleUpdate(m.id, v)
                        }}
                        onCancel={() => {
                          setEditingId(null)
                        }}
                        submitting={submitting}
                        serverError={serverError}
                      />
                    ) : (
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between w-full">
                        <div className="flex-1">
                          <div className="font-medium">{m.chip_number}</div>
                          <div className="text-sm text-muted-foreground">
                            {m.issuer
                              ? `${t('pets:microchip.display.issuerLabel')}: ${m.issuer}`
                              : `${t('pets:microchip.display.issuerLabel')}: —`}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {t('pets:microchip.display.implantedLabel')}:{' '}
                            {m.implanted_at ? new Date(m.implanted_at).toLocaleDateString() : '—'}
                          </div>
                        </div>
                        {canEdit && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingId(m.id)
                              }}
                            >
                              {t('pets:microchip.actions.edit')}
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive">
                                  {t('pets:microchip.actions.delete')}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    {t('pets:microchip.actions.deleteConfirmTitle')}
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t('pets:microchip.actions.deleteConfirmDescription')}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>
                                    {t('common:actions.cancel')}
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => {
                                      void remove(m.id)
                                    }}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {canEdit && (
              <Button
                variant="outline"
                className="w-full mt-3"
                onClick={() => {
                  startAdd()
                }}
              >
                {t('pets:microchip.sections.add')}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
