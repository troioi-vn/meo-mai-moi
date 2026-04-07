import { Badge } from '@/components/ui/badge'
import { useTranslation } from 'react-i18next'

export function HelperProfileStatusBadge({ status }: { status?: string }) {
  const { t } = useTranslation('helper')

  switch (status) {
    case 'private':
      return <Badge variant="secondary">{t('view.status.private')}</Badge>
    case 'public':
      return <Badge className="bg-green-500">{t('view.status.public')}</Badge>
    case 'archived':
      return <Badge variant="secondary">{t('view.status.archived')}</Badge>
    case 'deleted':
      return <Badge variant="destructive">{t('view.status.deleted')}</Badge>
    default:
      return null
  }
}
