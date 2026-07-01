import { Link } from 'react-router-dom'
import { AlertCircle, AlertTriangle, RefreshCw, WifiOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNetworkStatus } from '@/hooks/use-network-status'
import { useSyncSnapshot } from '@/hooks/use-sync-snapshot'

export function OfflineBadge() {
  const { t } = useTranslation('common')
  const isOnline = useNetworkStatus()
  const snapshot = useSyncSnapshot()
  const hasVisibleBadge = !isOnline || snapshot.hasActiveWork || snapshot.hasIssues

  if (!hasVisibleBadge) return null

  return (
    <div className="flex items-center gap-1">
      {!isOnline && (
        <div
          data-testid="offline-badge"
          data-network-state="offline"
          className="flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1
          text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200
          animate-in fade-in slide-in-from-top-1"
          aria-label={
            snapshot.activeTotal > 0
              ? `${String(snapshot.activeTotal)} ${t('status.pending')}`
              : t('status.offline')
          }
          title={t('status.offline')}
        >
          <WifiOff className="size-3.5" />
          {snapshot.activeTotal > 0 && (
            <span className="text-amber-700 dark:text-amber-300">
              {snapshot.activeTotal} {t('status.pending')}
            </span>
          )}
        </div>
      )}

      {isOnline && snapshot.hasActiveWork && (
        <div
          data-testid="offline-badge"
          data-network-state="syncing"
          className="flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1
          text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200
          animate-in fade-in slide-in-from-top-1"
          aria-label={t('status.syncing')}
          title={t('status.syncing')}
        >
          <RefreshCw className="size-3.5 animate-spin" />
          <span>{t('status.syncing')}</span>
        </div>
      )}

      {snapshot.failedMutations + snapshot.failedOperations + snapshot.failedUploads > 0 && (
        <Link
          to="/settings/sync"
          data-testid="offline-badge-failed"
          className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs
            font-medium text-red-800 transition-colors hover:bg-red-200
            dark:bg-red-900/30 dark:text-red-200 dark:hover:bg-red-900/50"
          aria-label={t('status.syncFailedCount', {
            count: snapshot.failedMutations + snapshot.failedOperations + snapshot.failedUploads,
          })}
          title={t('status.syncFailedCount', {
            count: snapshot.failedMutations + snapshot.failedOperations + snapshot.failedUploads,
          })}
        >
          <AlertCircle className="size-3.5" />
          <span>
            {snapshot.failedMutations + snapshot.failedOperations + snapshot.failedUploads}
          </span>
        </Link>
      )}

      {snapshot.conflictedOperations > 0 && (
        <Link
          to="/settings/sync"
          data-testid="offline-badge-conflicted"
          className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs
            font-medium text-amber-900 transition-colors hover:bg-amber-200
            dark:bg-amber-900/40 dark:text-amber-100 dark:hover:bg-amber-900/60"
          aria-label={t('status.syncConflictedCount', { count: snapshot.conflictedOperations })}
          title={t('status.syncConflictedCount', { count: snapshot.conflictedOperations })}
        >
          <AlertTriangle className="size-3.5" />
          <span>{snapshot.conflictedOperations}</span>
        </Link>
      )}
    </div>
  )
}
