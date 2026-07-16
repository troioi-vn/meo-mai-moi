import { CalendarPlus, Pencil, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { format, parseISO } from 'date-fns'
import { Button } from '@/components/ui/button'
import { MediaImage } from '@/components/ui/MediaImage'
import { OfflineSyncMarker } from '@/components/offline/OfflineSyncMarker'
import { useOfflineRecordMarker } from '@/hooks/use-offline-operation-markers'
import { VaccinationForm, type VaccinationFormValues } from './VaccinationForm'
import { getVaccinationRecordPhoto, type VaccinationRecordWithId } from './vaccinationPhoto'

function VaccinationRecordMarker({ petId, recordId }: { petId: number; recordId: number }) {
  const marker = useOfflineRecordMarker('vaccination', petId, recordId)
  return <OfflineSyncMarker marker={marker} />
}

interface VaccinationRecordItemProps {
  record: VaccinationRecordWithId
  petId: number
  petBirthday?: string | null
  canEdit: boolean
  isEditing: boolean
  submitting: boolean
  deleting: boolean
  serverError: string | null
  onEdit: () => void
  onCancelEdit: () => void
  onUpdate: (values: VaccinationFormValues) => Promise<void>
  onDelete: () => Promise<void>
  onDeletePhoto: () => Promise<void>
  onRenew: () => void
  onExportCalendar: () => void
  onOpenPhoto: () => void
}

export function VaccinationRecordItem({
  record,
  petId,
  petBirthday,
  canEdit,
  isEditing,
  submitting,
  deleting,
  serverError,
  onEdit,
  onCancelEdit,
  onUpdate,
  onDelete,
  onDeletePhoto,
  onRenew,
  onExportCalendar,
  onOpenPhoto,
}: VaccinationRecordItemProps) {
  const { t } = useTranslation(['pets', 'common'])
  const dueDate = record.due_at ? parseISO(record.due_at) : null
  const isPast = Boolean(dueDate && dueDate < new Date())
  const isCompleted = record.completed_at !== null && record.completed_at !== undefined
  const photo = getVaccinationRecordPhoto(record)
  const vaccineLabel = record.vaccine_name ?? t('common:status.unknown')

  return (
    <li
      className={`rounded-lg border p-3 ${isCompleted ? 'bg-muted/30 opacity-75' : 'bg-muted/50'}`}
    >
      {isEditing ? (
        <VaccinationForm
          initial={{
            vaccine_name: record.vaccine_name ?? '',
            administered_at: record.administered_at ?? '',
            due_at: record.due_at ?? '',
            notes: record.notes ?? '',
          }}
          onSubmit={onUpdate}
          onCancel={onCancelEdit}
          onDelete={onDelete}
          deleting={deleting}
          submitting={submitting}
          serverError={serverError}
          petBirthday={petBirthday}
          existingPhotoUrl={record.photo_url}
          onDeleteExistingPhoto={onDeletePhoto}
        />
      ) : (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">{vaccineLabel}</span>
              <VaccinationRecordMarker petId={petId} recordId={record.id} />
              {isCompleted && (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                  {t('vaccinations.renewed')}
                </span>
              )}
            </div>
            {dueDate && (
              <p
                className={`text-sm mt-0.5 ${
                  isCompleted
                    ? 'text-muted-foreground line-through'
                    : isPast
                      ? 'text-destructive'
                      : 'text-muted-foreground'
                }`}
              >
                {format(dueDate, 'yyyy-MM-dd')}
              </p>
            )}
            {photo && (
              <button
                type="button"
                onClick={onOpenPhoto}
                className="mt-2 h-16 w-16 overflow-hidden rounded border cursor-pointer hover:opacity-90 transition-opacity"
                aria-label={t('vaccinations.form.photoAlt')}
              >
                <MediaImage
                  src={photo.url}
                  thumbSrc={photo.thumb_url}
                  media={photo}
                  sizes="64px"
                  alt={t('vaccinations.form.photoAlt')}
                  className="h-full w-full object-cover"
                />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {canEdit && !isCompleted && dueDate && (
              <Button
                variant={isPast ? 'default' : 'outline'}
                size="sm"
                className="h-8 gap-1"
                onClick={onRenew}
              >
                <RefreshCw className="h-3 w-3" />
                {t('vaccinations.renew')}
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={onExportCalendar}
              disabled={!record.due_at}
              aria-label={t('vaccinations.calendarExport.actionFor', {
                vaccine: vaccineLabel,
              })}
              title={
                record.due_at
                  ? t('vaccinations.calendarExport.action')
                  : t('vaccinations.calendarExport.missingDueDate')
              }
            >
              <CalendarPlus className="h-4 w-4" />
            </Button>
            {canEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={onEdit}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </li>
  )
}
