import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { VaccinationForm, type VaccinationFormValues } from './VaccinationForm'
import type { VaccinationRecordWithId } from './vaccinationPhoto'

interface VaccinationRenewDialogProps {
  record: VaccinationRecordWithId | null
  petBirthday?: string | null
  submitting: boolean
  serverError: string | null
  onSubmit: (values: VaccinationFormValues) => Promise<void>
  onClose: () => void
}

function getRenewInitialValues(record: VaccinationRecordWithId): Partial<VaccinationFormValues> {
  const today = new Date().toISOString().split('T')[0] ?? ''

  return {
    vaccine_name: record.vaccine_name ?? '',
    administered_at: today,
    notes: null,
  }
}

export function VaccinationRenewDialog({
  record,
  petBirthday,
  submitting,
  serverError,
  onSubmit,
  onClose,
}: VaccinationRenewDialogProps) {
  const { t } = useTranslation(['pets'])

  return (
    <Dialog
      open={record !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('vaccinations.renewTitle')}</DialogTitle>
          <DialogDescription>
            {t('vaccinations.renewDescription', { name: record?.vaccine_name })}
          </DialogDescription>
        </DialogHeader>
        {record && (
          <VaccinationForm
            allowFinanceExpense
            initial={getRenewInitialValues(record)}
            onSubmit={onSubmit}
            onCancel={onClose}
            submitting={submitting}
            serverError={serverError}
            petBirthday={petBirthday}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
