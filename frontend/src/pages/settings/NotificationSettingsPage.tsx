import { NotificationPreferences } from '@/components/notifications/NotificationPreferences'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AppBreadcrumbs, PageContainer, PageHeader } from '@/components/layout/PageLayout'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function NotificationSettingsPage() {
  const { t } = useTranslation('settings')

  return (
    <PageContainer width="narrow">
      <AppBreadcrumbs
        items={[{ label: t('title'), to: '/settings/account' }, { label: t('tabs.notifications') }]}
      />

      <PageHeader
        className="mb-6"
        title={t('notifications.pageTitle')}
        description={t('notifications.pageDescription')}
        actions={
          <Button variant="ghost" size="sm" asChild>
            <Link to="/settings/account" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t('notifications.backToSettings')}
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent>
          <NotificationPreferences />
        </CardContent>
      </Card>
    </PageContainer>
  )
}
