import { Plus, Settings2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { HealthRecordPhotoModal } from '@/components/pet-health/HealthRecordPhotoModal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { VaccinationForm } from './VaccinationForm'
import { VaccinationRecordItem } from './VaccinationRecordItem'
import { VaccinationRenewDialog } from './VaccinationRenewDialog'
import { getVaccinationRecordPhoto } from './vaccinationPhoto'
import { useVaccinationSection } from './useVaccinationSection'

interface UpcomingVaccinationsSectionProps {
  petId: number
  petName: string
  canEdit: boolean
  onVaccinationChange?: () => void
  /** Pet's birthday for calculating default booster interval */
  petBirthday?: string | null
}

export function UpcomingVaccinationsSection({
  petId,
  petName,
  canEdit,
  onVaccinationChange,
  petBirthday,
}: UpcomingVaccinationsSectionProps) {
  const { t } = useTranslation(['pets', 'common'])
  const section = useVaccinationSection({ petId, petName, onVaccinationChange })
  const photoModalPhoto = section.photoModalRecord
    ? getVaccinationRecordPhoto(section.photoModalRecord)
    : null

  if (section.loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{t('vaccinations.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('common:messages.loading')}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="isolate overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">{t('vaccinations.title')}</CardTitle>
            {canEdit && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  >
                    <Settings2 className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" align="end">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="show-history"
                      checked={section.showHistory}
                      onCheckedChange={section.handleShowHistoryToggle}
                    />
                    <Label
                      htmlFor="show-history"
                      className="text-sm text-muted-foreground cursor-pointer"
                    >
                      {t('vaccinations.showHistory')}
                    </Label>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {section.adding ? (
            <div className="rounded-md border p-4">
              <VaccinationForm
                onSubmit={section.handleCreate}
                onCancel={() => {
                  section.setAdding(false)
                  section.setServerError(null)
                }}
                submitting={section.submitting}
                serverError={section.serverError}
                petBirthday={petBirthday}
              />
            </div>
          ) : (
            <>
              {section.displayedVaccinations.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  {section.showHistory ? t('vaccinations.noHistory') : t('vaccinations.noUpcoming')}
                </p>
              ) : (
                <div className="max-h-96 overflow-y-auto pr-4">
                  <ul className="space-y-2">
                    {section.displayedVaccinations.map((record) => (
                      <VaccinationRecordItem
                        key={record.id}
                        record={record}
                        petId={petId}
                        petBirthday={petBirthday}
                        canEdit={canEdit}
                        isEditing={section.editingId === record.id}
                        submitting={section.submitting}
                        deleting={section.deletingId === record.id}
                        serverError={section.serverError}
                        onEdit={() => {
                          section.setEditingId(record.id)
                        }}
                        onCancelEdit={() => {
                          section.setEditingId(null)
                          section.setServerError(null)
                        }}
                        onUpdate={async (values) => {
                          await section.handleUpdate(record.id, values)
                        }}
                        onDelete={async () => {
                          await section.handleDelete(record.id)
                          section.setEditingId(null)
                        }}
                        onDeletePhoto={async () => {
                          await section.handleDeletePhoto(record.id)
                        }}
                        onRenew={() => {
                          section.setRenewingRecord(record)
                        }}
                        onExportCalendar={() => {
                          void section.handleExportCalendar(record)
                        }}
                        onOpenPhoto={() => {
                          section.openPhotoModal(record)
                        }}
                      />
                    ))}
                  </ul>
                </div>
              )}

              {canEdit && (
                <Button
                  variant="outline"
                  className="w-full mt-3"
                  onClick={() => {
                    section.setAdding(true)
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t('vaccinations.addVaccinationEntry')}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <VaccinationRenewDialog
        record={section.renewingRecord}
        petBirthday={petBirthday}
        submitting={section.submitting}
        serverError={section.serverError}
        onSubmit={section.handleRenew}
        onClose={section.closeRenewDialog}
      />

      {section.photoModalRecord && photoModalPhoto && (
        <HealthRecordPhotoModal
          photos={[photoModalPhoto]}
          open={section.photoModalOpen}
          onOpenChange={section.setPhotoModalOpen}
          initialIndex={0}
          canDelete={canEdit && !section.photoModalRecord.completed_at}
          onDelete={async () => {
            const recordId = section.photoModalRecord?.id
            if (recordId == null) return
            await section.handleDeletePhoto(recordId)
          }}
        />
      )}
    </>
  )
}
