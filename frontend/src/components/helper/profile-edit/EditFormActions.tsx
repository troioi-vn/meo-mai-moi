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
      <Button
        type="submit"
        aria-label={t('settings:profile.saveChanges')}
        disabled={isSubmitting}
        className="flex-1 h-12 text-lg font-semibold"
      >
        {isSubmitting ? t('settings:profile.saving') : t('settings:profile.saveChanges')}
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        disabled={isSubmitting}
        className="h-12 px-8"
      >
        {t('common:actions.cancel')}
      </Button>
    </div>
  )
}
