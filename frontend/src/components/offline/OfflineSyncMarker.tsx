import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { OfflineEntityMarker } from '@/offline/projections'

interface OfflineSyncMarkerProps {
  marker: OfflineEntityMarker | null | undefined
  className?: string
}

const MARKER_STYLES: Record<OfflineEntityMarker, string> = {
  pending: 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
  conflicted: 'bg-orange-100 text-orange-900 dark:bg-orange-900/30 dark:text-orange-200',
}

function markerLabelKey(marker: OfflineEntityMarker): string {
  switch (marker) {
    case 'pending':
      return 'status.pending'
    case 'failed':
      return 'status.syncIssues.status.failed'
    case 'conflicted':
      return 'status.syncIssues.status.conflicted'
  }
}

export function OfflineSyncMarker({ marker, className }: OfflineSyncMarkerProps) {
  const { t } = useTranslation('common')

  if (!marker) {
    return null
  }

  return (
    <span
      data-testid={`offline-sync-marker-${marker}`}
      className={cn(
        'inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide',
        MARKER_STYLES[marker],
        className
      )}
      aria-label={t(markerLabelKey(marker))}
      title={t(markerLabelKey(marker))}
    >
      {t(markerLabelKey(marker))}
    </span>
  )
}
