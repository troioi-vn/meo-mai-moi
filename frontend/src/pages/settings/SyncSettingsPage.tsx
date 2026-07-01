import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useTranslation } from 'react-i18next'
import { RotateCcw, Trash2 } from 'lucide-react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useNetworkStatus } from '@/hooks/use-network-status'
import { useSyncSnapshot, useSyncTableRows } from '@/hooks/use-sync-snapshot'
import { removeUpload, retryUpload } from '@/lib/media-upload-queue'
import { discardOperation, retryFailedOperation } from '@/offline/operations'
import { acceptServerConflictVersion, rebaseConflictedOperation } from '@/offline/conflicts'
import { replayPendingOfflineOperations } from '@/offline/sync'
import type { SyncItemStatus, SyncTableRow } from '@/lib/sync-snapshot'

function formatTimestamp(timestamp: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp))
}

function statusVariant(
  status: SyncItemStatus
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'failed' || status === 'error') return 'destructive'
  if (status === 'conflicted') return 'outline'
  if (status === 'syncing' || status === 'uploading') return 'default'
  return 'secondary'
}

const columnHelper = createColumnHelper<SyncTableRow>()

export default function SyncSettingsPage() {
  const { i18n, t } = useTranslation(['settings', 'common'])
  const queryClient = useQueryClient()
  const isOnline = useNetworkStatus()
  const snapshot = useSyncSnapshot()
  const rows = useSyncTableRows()
  const [actingId, setActingId] = useState<string | null>(null)

  const handleRetry = useCallback(
    async (row: SyncTableRow) => {
      setActingId(row.id)
      try {
        if (row.kind === 'upload') {
          await retryUpload(row.actionTargetId)
          return
        }

        const updated = await retryFailedOperation(row.actionTargetId)
        if (updated && isOnline) {
          await replayPendingOfflineOperations(queryClient)
        }
      } finally {
        setActingId(null)
      }
    },
    [isOnline, queryClient]
  )

  const handleDiscard = useCallback(async (row: SyncTableRow) => {
    setActingId(row.id)
    try {
      if (row.kind === 'upload') {
        await removeUpload(row.actionTargetId)
        return
      }

      await discardOperation(row.actionTargetId)
    } finally {
      setActingId(null)
    }
  }, [])

  const handleUseServer = useCallback(
    async (row: SyncTableRow) => {
      if (row.kind !== 'operation') return

      setActingId(row.id)
      try {
        await acceptServerConflictVersion(queryClient, row.actionTargetId)
      } finally {
        setActingId(null)
      }
    },
    [queryClient]
  )

  const handleKeepMine = useCallback(
    async (row: SyncTableRow) => {
      if (row.kind !== 'operation') return

      setActingId(row.id)
      try {
        const updated = await rebaseConflictedOperation(row.actionTargetId)
        if (updated && isOnline) {
          await replayPendingOfflineOperations(queryClient)
        }
      } finally {
        setActingId(null)
      }
    },
    [isOnline, queryClient]
  )

  const columns = useMemo(
    () => [
      columnHelper.accessor('kind', {
        header: () => t('settings:sync.columns.type'),
        cell: ({ getValue }) => t(`settings:sync.kind.${getValue()}`),
      }),
      columnHelper.accessor('domain', {
        header: () => t('settings:sync.columns.domain'),
        cell: ({ getValue }) => {
          const domain = getValue()
          const key = `common:status.syncIssues.domain.${domain}`
          return i18n.exists(key) ? t(key) : domain
        },
      }),
      columnHelper.accessor('operation', {
        header: () => t('settings:sync.columns.operation'),
        cell: ({ getValue }) => {
          const operation = getValue()
          const key = `common:status.syncIssues.operation.${operation}`
          return i18n.exists(key) ? t(key) : operation
        },
      }),
      columnHelper.accessor('status', {
        header: () => t('settings:sync.columns.status'),
        cell: ({ getValue }) => {
          const status = getValue()
          return (
            <Badge variant={statusVariant(status)}>{t(`settings:sync.status.${status}`)}</Badge>
          )
        },
      }),
      columnHelper.accessor('attempts', {
        header: () => t('settings:sync.columns.attempts'),
      }),
      columnHelper.accessor('lastError', {
        header: () => t('settings:sync.columns.lastError'),
        cell: ({ row, getValue }) => {
          const item = row.original
          const error = getValue()

          return (
            <div className="space-y-2">
              <span className="max-w-[12rem] truncate whitespace-normal break-words sm:max-w-xs">
                {error ?? t('common:status.syncIssues.unknownError')}
              </span>
              {item.status === 'conflicted' &&
                (item.conflictLocalPreview ?? item.conflictServerPreview) && (
                  <div className="space-y-1 text-[11px] text-muted-foreground">
                    {item.conflictLocalPreview && (
                      <div>
                        <span className="font-medium text-amber-800 dark:text-amber-200">
                          {t('settings:sync.conflict.local')}:
                        </span>
                        <pre className="mt-0.5 max-h-24 overflow-auto whitespace-pre-wrap break-words rounded border border-border/60 bg-muted/30 p-1.5 font-mono text-[10px]">
                          {item.conflictLocalPreview}
                        </pre>
                      </div>
                    )}
                    {item.conflictServerPreview && (
                      <div>
                        <span className="font-medium text-amber-800 dark:text-amber-200">
                          {t('settings:sync.conflict.server')}:
                        </span>
                        <pre className="mt-0.5 max-h-24 overflow-auto whitespace-pre-wrap break-words rounded border border-border/60 bg-muted/30 p-1.5 font-mono text-[10px]">
                          {item.conflictServerPreview}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
            </div>
          )
        },
      }),
      columnHelper.accessor('updatedAt', {
        header: () => t('settings:sync.columns.updated'),
        cell: ({ getValue }) => formatTimestamp(getValue(), i18n.language),
      }),
      columnHelper.accessor('referenceId', {
        header: () => t('settings:sync.columns.reference'),
        cell: ({ getValue }) => (
          <span className="font-mono text-[11px] text-muted-foreground">{getValue()}</span>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: () => t('settings:sync.columns.actions'),
        cell: ({ row }) => {
          const item = row.original
          const isActing = actingId === item.id

          if (!item.canRetry && !item.canDiscard && !item.canKeepMine && !item.canUseServer) {
            return <span className="text-muted-foreground">—</span>
          }

          return (
            <div className="flex flex-wrap items-center gap-1">
              {item.canUseServer && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  data-testid={`sync-row-use-server-${item.id}`}
                  disabled={isActing}
                  onClick={() => {
                    void handleUseServer(item)
                  }}
                >
                  {t('settings:sync.actions.useServer')}
                </Button>
              )}
              {item.canKeepMine && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  data-testid={`sync-row-keep-mine-${item.id}`}
                  disabled={isActing}
                  onClick={() => {
                    void handleKeepMine(item)
                  }}
                >
                  {t('settings:sync.actions.keepMine')}
                </Button>
              )}
              {item.canRetry && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  data-testid={`sync-row-retry-${item.id}`}
                  disabled={isActing}
                  onClick={() => {
                    void handleRetry(item)
                  }}
                >
                  <RotateCcw className="size-3" />
                  <span className="sr-only">{t('common:status.syncIssues.retry')}</span>
                </Button>
              )}
              {item.canDiscard && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-destructive hover:text-destructive"
                  data-testid={`sync-row-discard-${item.id}`}
                  disabled={isActing}
                  onClick={() => {
                    void handleDiscard(item)
                  }}
                >
                  <Trash2 className="size-3" />
                  <span className="sr-only">{t('common:status.syncIssues.discard')}</span>
                </Button>
              )}
            </div>
          )
        },
      }),
    ],
    [actingId, handleDiscard, handleKeepMine, handleRetry, handleUseServer, i18n, t]
  )

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6 md:py-10">
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/settings/account">{t('settings:title')}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{t('settings:sync.title')}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings:sync.title')}</CardTitle>
          <CardDescription>{t('settings:sync.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">{t('settings:sync.summary.pending')}</p>
              <p className="text-2xl font-semibold">{snapshot.activeTotal}</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">{t('settings:sync.summary.failed')}</p>
              <p className="text-2xl font-semibold text-destructive">
                {snapshot.failedOperations + snapshot.failedUploads}
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">
                {t('settings:sync.summary.conflicted')}
              </p>
              <p className="text-2xl font-semibold text-amber-700 dark:text-amber-300">
                {snapshot.conflictedOperations}
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">{t('settings:sync.summary.uploads')}</p>
              <p className="text-2xl font-semibold">
                {snapshot.queuedUploads + snapshot.uploadingUploads + snapshot.failedUploads}
              </p>
            </div>
          </div>

          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('settings:sync.empty')}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[56rem]">
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} data-testid="sync-table-row">
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
