import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/lib/i18n-toast'
import {
  getInvitations as getUserInvitations,
  postInvitations as generateInvitation,
  deleteInvitationsId as revokeInvitation,
  getInvitationsStats as getInvitationStats,
} from '@/api/generated/invitations/invitations'
import type {
  GetInvitations200Item as Invitation,
  GetInvitationsStats200 as InvitationStats,
} from '@/api/generated/model'
import {
  Plus,
  Copy,
  Trash2,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Mail,
  Calendar,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { format } from 'date-fns'
import InvitationShare from '@/components/invitations/InvitationShare'

const InvitationQRCode = lazy(() => import('@/components/invitations/InvitationQRCode'))

const REFRESH_INTERVAL_MS = 30_000

export default function InvitationsPage() {
  const { t } = useTranslation('common')
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [stats, setStats] = useState<InvitationStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isRefreshingRef = useRef(false)
  const showRevoked = (stats?.revoked ?? 0) > 0

  const loadData = useCallback(
    async (params?: { showLoading?: boolean }) => {
      const { showLoading = true } = params ?? {}
      if (isRefreshingRef.current) {
        return
      }

      if (showLoading) {
        setIsLoading(true)
        setError(null)
      }

      isRefreshingRef.current = true

      try {
        const [invitationsData, statsData] = await Promise.all([
          getUserInvitations(),
          getInvitationStats(),
        ])
        setInvitations(invitationsData)
        setStats(statsData)
        setError(null)
      } catch (err: unknown) {
        console.error('Failed to load invitations:', err)
        if (showLoading) {
          setError(t('invitations.loadError'))
        }
      } finally {
        isRefreshingRef.current = false
        if (showLoading) {
          setIsLoading(false)
        }
      }
    },
    [t]
  )

  useEffect(() => {
    void loadData()

    const intervalId = window.setInterval(() => {
      void loadData({ showLoading: false })
    }, REFRESH_INTERVAL_MS)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [loadData])

  const handleGenerateInvitation = async () => {
    try {
      setIsGenerating(true)
      const newInvitation = await generateInvitation()
      setInvitations((prev) => [newInvitation, ...prev])
      setStats((prev) =>
        prev
          ? {
              ...prev,
              total: (prev.total ?? 0) + 1,
              pending: (prev.pending ?? 0) + 1,
            }
          : null
      )
      toast.success('common:messages.invitationGenerated')
    } catch (err: unknown) {
      console.error('Failed to generate invitation:', err)
      toast.error('common:messages.invitationLimitReached')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopyInvitation = async (invitation: Invitation) => {
    try {
      await navigator.clipboard.writeText(invitation.invitation_url ?? '')
      toast.success('common:messages.copied')
    } catch (err: unknown) {
      console.error('Failed to copy:', err)
      toast.error('common:messages.invitationCopyFailed')
    }
  }

  const handleRevokeInvitation = async (invitation: Invitation) => {
    try {
      if (!invitation.id) return
      await revokeInvitation(invitation.id)
      setInvitations((prev) =>
        prev.map((inv) => (inv.id === invitation.id ? { ...inv, status: 'revoked' as const } : inv))
      )
      setStats((prev) =>
        prev
          ? {
              ...prev,
              pending: (prev.pending ?? 0) - 1,
              revoked: (prev.revoked ?? 0) + 1,
            }
          : null
      )
      toast.success('common:messages.invitationRevoked')
    } catch (err: unknown) {
      console.error('Failed to revoke invitation:', err)
      toast.error('common:messages.invitationRevokeFailed')
    }
  }

  const getStatusBadge = (status: string | undefined) => {
    const currentStatus =
      status === 'accepted' || status === 'expired' || status === 'revoked' ? status : 'pending'
    const variants = {
      pending: { variant: 'outline' as const, icon: Clock, color: 'text-yellow-600 dark:text-yellow-400' },
      accepted: { variant: 'default' as const, icon: CheckCircle, color: 'text-white' },
      expired: { variant: 'secondary' as const, icon: XCircle, color: 'text-destructive' },
      revoked: { variant: 'secondary' as const, icon: XCircle, color: 'text-muted-foreground' },
    }

    const variantInfo = variants[currentStatus]
    const { variant, icon: Icon, color } = variantInfo

    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon className={`h-3 w-3 ${color}`} />
        {t(`invitations.status.${currentStatus}`)}
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p className="text-muted-foreground">{t('invitations.loading')}</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center space-y-4">
          <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
            <p className="text-destructive">{error}</p>
          </div>
          <Button onClick={() => void loadData()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('actions.tryAgain')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{t('invitations.title')}</h1>
        <Button onClick={() => void handleGenerateInvitation()} disabled={isGenerating}>
          {isGenerating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          {isGenerating ? t('invitations.generating') : t('invitations.generateButton')}
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div
          className={
            showRevoked
              ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3'
              : 'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3'
          }
        >
          <Card size="sm" className="py-3 gap-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0">
              <CardTitle className="text-sm font-medium">{t('invitations.stats.total')}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="pt-1">
              <div className="text-left text-xl font-semibold leading-none tabular-nums">
                {stats.total ?? 0}
              </div>
            </CardContent>
          </Card>

          <Card size="sm" className="py-3 gap-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0">
              <CardTitle className="text-sm font-medium">
                {t('invitations.stats.pending')}
              </CardTitle>
              <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            </CardHeader>
            <CardContent className="pt-1">
              <div className="text-left text-xl font-semibold leading-none tabular-nums">
                {stats.pending ?? 0}
              </div>
            </CardContent>
          </Card>

          <Card size="sm" className="py-3 gap-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0">
              <CardTitle className="text-sm font-medium">
                {t('invitations.stats.accepted')}
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </CardHeader>
            <CardContent className="pt-1">
              <div className="text-left text-xl font-semibold leading-none tabular-nums">
                {stats.accepted ?? 0}
              </div>
            </CardContent>
          </Card>

          <Card size="sm" className="py-3 gap-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0">
              <CardTitle className="text-sm font-medium">
                {t('invitations.stats.expired')}
              </CardTitle>
              <XCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent className="pt-1">
              <div className="text-left text-xl font-semibold leading-none tabular-nums">
                {stats.expired ?? 0}
              </div>
            </CardContent>
          </Card>

          {showRevoked && (
            <Card size="sm" className="py-3 gap-2 col-span-2 sm:col-span-1">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0">
                <CardTitle className="text-sm font-medium">
                  {t('invitations.stats.revoked')}
                </CardTitle>
                <XCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="pt-1">
                <div className="text-left text-xl font-semibold leading-none tabular-nums">
                  {stats.revoked ?? 0}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Invitations List */}
      <Card>
        <CardHeader>
          <CardTitle>{t('invitations.list.title')}</CardTitle>
          <CardDescription>
            {invitations.length === 0
              ? t('invitations.list.empty')
              : t('invitations.list.count', { count: invitations.length })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <div className="text-center py-8 space-y-4">
              <Mail className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <p className="text-lg font-medium">{t('invitations.list.noInvitations')}</p>
                <p className="text-muted-foreground">{t('invitations.list.noInvitationsHint')}</p>
              </div>
              <Button onClick={() => void handleGenerateInvitation()} disabled={isGenerating}>
                <Plus className="h-4 w-4 mr-2" />
                {t('invitations.list.generateFirst')}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        {getStatusBadge(invitation.status)}
                        <span className="text-sm text-muted-foreground font-mono">
                          {invitation.code?.slice(0, 8)}...
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {t('invitations.item.created', {
                            date: invitation.created_at
                              ? format(new Date(invitation.created_at), 'MMM d, yyyy')
                              : 'N/A',
                          })}
                        </div>

                        {invitation.recipient && (
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {t('invitations.item.acceptedBy', {
                              name:
                                (invitation.recipient as { name?: string }).name ??
                                t('messaging.unknownUser'),
                            })}
                          </div>
                        )}

                        {invitation.expires_at && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {t('invitations.item.expires', {
                              date: format(new Date(invitation.expires_at), 'MMM d, yyyy'),
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleCopyInvitation(invitation)}
                        disabled={invitation.status !== 'pending'}
                        title={t('invitations.item.copyLink')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>

                      {invitation.status === 'pending' && (
                        <>
                          <InvitationShare
                            invitationUrl={invitation.invitation_url ?? ''}
                            invitationCode={invitation.code ?? ''}
                          />
                          <Suspense
                            fallback={<div className="h-10 w-10 animate-pulse bg-muted rounded" />}
                          >
                            <InvitationQRCode
                              invitationUrl={invitation.invitation_url ?? ''}
                              invitationCode={invitation.code ?? ''}
                            />
                          </Suspense>
                        </>
                      )}

                      {invitation.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleRevokeInvitation(invitation)}
                          title={t('invitations.item.revoke')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
