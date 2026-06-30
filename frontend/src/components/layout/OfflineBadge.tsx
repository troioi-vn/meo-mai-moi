import { RefreshCw, WifiOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { OfflineSyncIssues } from '@/components/layout/OfflineSyncIssues'
import { useNetworkStatus } from '@/hooks/use-network-status'
import { useOfflineOperationIssues } from '@/hooks/use-offline-operation-issues'
import { useUnifiedPendingCount } from '@/hooks/use-unified-pending-count'

export function OfflineBadge() {
  const { t } = useTranslation('common')
  const isOnline = useNetworkStatus()
  const pendingCount = useUnifiedPendingCount()
  const issues = useOfflineOperationIssues()
  const hasVisibleBadge = !isOnline || pendingCount > 0

  if (!hasVisibleBadge && issues.length === 0) return null

  return (
    <div className="flex items-center gap-1">
      {hasVisibleBadge && (
        <div
          data-testid="offline-badge"
          data-network-state={!isOnline ? 'offline' : 'syncing'}
          className="flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1
          text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200
          animate-in fade-in slide-in-from-top-1"
          aria-label={
            !isOnline
              ? pendingCount > 0
                ? `${String(pendingCount)} ${t('status.pending')}`
                : t('status.offline')
              : t('status.syncing')
          }
          title={!isOnline ? t('status.offline') : t('status.syncing')}
        >
          {!isOnline ? (
            <>
              <WifiOff className="size-3.5" />
              {pendingCount > 0 && (
                <span className="text-amber-700 dark:text-amber-300">
                  {pendingCount} {t('status.pending')}
                </span>
              )}
            </>
          ) : (
            <>
              <RefreshCw className="size-3.5 animate-spin" />
              <span>{t('status.syncing')}</span>
            </>
          )}
        </div>
      )}
      <OfflineSyncIssues issues={issues} />
    </div>
  )
}
