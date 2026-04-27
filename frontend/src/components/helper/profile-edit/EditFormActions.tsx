import { Button } from '@/components/ui/button'
import { useTranslation } from 'react-i18next'

export function EditFormActions({
  isSubmitting,
  onCancel,
}: {
  isSubmitting: boolean
  onCancel: () => void
}) {
  const { t } = useTranslation(['settings', 'common'])

  return (
    <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t">
      <Button type="submit" aria-label={t('settings:profile.saveChanges')} disabled={isSubmitting}>
        {isSubmitting ? t('settings:profile.saving') : t('settings:profile.saveChanges')}
      </Button>
      <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
        {t('common:actions.cancel')}
      </Button>
    </div>
  )
}
