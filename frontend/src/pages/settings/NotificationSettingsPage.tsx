import { NotificationPreferences } from '@/components/notifications/NotificationPreferences'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

export default function NotificationSettingsPage() {
  const { t } = useTranslation('settings')

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Breadcrumbs */}
        <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
          <Link to="/settings/account" className="hover:text-foreground transition-colors">
            {t('title')}
          </Link>
          <span>/</span>
          <span className="text-foreground">{t('tabs.notifications')}</span>
        </nav>

        {/* Page Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/settings/account" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              {t('notifications.backToSettings')}
            </Link>
          </Button>
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t('notifications.pageTitle')}</h1>
            <p className="text-muted-foreground mt-2">{t('notifications.pageDescription')}</p>
          </div>

          {/* Notification Preferences Component */}
          <div className="bg-card rounded-lg border p-6">
            <NotificationPreferences />
          </div>
        </div>
      </div>
    </div>
  )
}
