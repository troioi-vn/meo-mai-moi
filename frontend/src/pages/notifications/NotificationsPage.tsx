import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { NotificationList } from '@/components/notifications/NotificationList'
import { Button } from '@/components/ui/button'
import { PageContainer, PageHeader } from '@/components/layout/PageLayout'
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
    <PageContainer width="narrow" className="space-y-6">
      <PageHeader
        title={t('notifications.title')}
        actions={
          <Button
            variant="outline"
            onClick={() => void markAllBellReadNow()}
            disabled={unreadBellCount === 0}
          >
            {t('notifications.markAllRead')}
          </Button>
        }
      />

      <NotificationList />
    </PageContainer>
  )
}
