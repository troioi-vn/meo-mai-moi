import { AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover'
import type {
  OfflineEntityType,
  OfflineOperation,
  OfflineOperationType,
} from '@/offline/operations'

function formatIssueTimestamp(timestamp: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp))
}

function issueDomainKey(entityType: OfflineEntityType): string {
  return `status.syncIssues.domain.${entityType}`
}

function issueOperationKey(operation: OfflineOperationType): string {
  return `status.syncIssues.operation.${operation}`
}

function issueStatusKey(status: OfflineOperation['status']): string {
  return status === 'conflicted'
    ? 'status.syncIssues.status.conflicted'
    : 'status.syncIssues.status.failed'
}

interface OfflineSyncIssuesProps {
  issues: OfflineOperation[]
}

export function OfflineSyncIssues({ issues }: OfflineSyncIssuesProps) {
  const { i18n, t } = useTranslation('common')

  if (issues.length === 0) return null

  const detailsLabel = t('status.syncIssues.viewDetails', { count: issues.length })

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-testid="offline-sync-issues-trigger"
          className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs
            font-medium text-red-800 transition-colors hover:bg-red-200
            dark:bg-red-900/30 dark:text-red-200 dark:hover:bg-red-900/50"
          aria-label={detailsLabel}
          title={detailsLabel}
        >
          <AlertCircle className="size-3.5" />
          <span>{issues.length}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 gap-3 p-3"
        data-testid="offline-sync-issues-panel"
      >
        <PopoverHeader className="gap-0.5">
          <PopoverTitle className="text-sm">{t('status.syncIssues.title')}</PopoverTitle>
          <PopoverDescription className="text-xs">
            {t('status.syncIssues.description')}
          </PopoverDescription>
        </PopoverHeader>
        <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto">
          {issues.map((issue) => (
            <li
              key={issue.id}
              data-testid="offline-sync-issue-item"
              data-operation-id={issue.id}
              className="rounded-md border border-border/60 bg-muted/30 px-2.5 py-2 text-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-foreground">
                  {t(issueDomainKey(issue.entityType))} · {t(issueOperationKey(issue.operation))}
                </p>
                <span
                  className={
                    issue.status === 'conflicted'
                      ? 'shrink-0 text-amber-700 dark:text-amber-300'
                      : 'shrink-0 text-red-700 dark:text-red-300'
                  }
                >
                  {t(issueStatusKey(issue.status))}
                </span>
              </div>
              <p className="mt-1 break-words text-muted-foreground">
                {issue.lastError ?? t('status.syncIssues.unknownError')}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground/80">
                {t('status.syncIssues.updated', {
                  time: formatIssueTimestamp(issue.updatedAt, i18n.language),
                })}
              </p>
              {issue.createdAt !== issue.updatedAt && (
                <p className="text-[11px] text-muted-foreground/80">
                  {t('status.syncIssues.created', {
                    time: formatIssueTimestamp(issue.createdAt, i18n.language),
                  })}
                </p>
              )}
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
