import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { NotificationList } from '@/components/notifications/NotificationList'
import { Button } from '@/components/ui/button'
import { useNotifications } from '@/contexts/NotificationProvider'

export default function NotificationsPage() {
  const { t } = useTranslation('common')
  const { unreadBellCount, markAllBellReadNow, refresh } = useNotifications()
  const hasMarkedRef = useRef(false)

  useEffect(() => {
    // Load the bell notifications list only when the user opens this page.
    void refresh({ includeBellNotifications: true })
  }, [refresh])

  useEffect(() => {
    // Only mark existing notifications as read once on initial page load
    if (!hasMarkedRef.current && unreadBellCount > 0) {
      void markAllBellReadNow()
      hasMarkedRef.current = true
    }
  }, [markAllBellReadNow, unreadBellCount])

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">{t('notifications.title')}</h2>
          </div>
          <Button
            variant="outline"
            onClick={() => void markAllBellReadNow()}
            disabled={unreadBellCount === 0}
          >
            {t('notifications.markAllRead')}
          </Button>
        </div>

        <NotificationList />
      </div>
    </div>
  )
}
