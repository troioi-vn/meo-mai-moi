import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/use-auth'
import { useCountdown } from '@/hooks/useCountdown'
import {
  getResourceInvitationsToken,
  postResourceInvitationsTokenAccept,
  postResourceInvitationsTokenDecline,
} from '@/api/generated/resource-invitations/resource-invitations'
import { getGroupsQueryKey, invalidateGroupQueries } from '@/api/groups'
import { toast } from '@/lib/i18n-toast'
import { invalidatePetCollectionQueries, invalidatePetProfileQueries } from '@/lib/pet-cache'
import {
  clearPendingResourceInvitationToken,
  invitePath,
  savePendingResourceInvitationToken,
} from '@/lib/resource-invitation-continuation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LoadingState } from '@/components/ui/LoadingState'
import { Clock, AlertCircle, Users, WalletCards } from 'lucide-react'

/** Temporary union until Orval regenerates group invitation schemas. */
interface InvitationPreview {
  type: string
  status: string
  expires_at: string
  is_valid: boolean
  is_authenticated: boolean
  is_self_invitation?: boolean | null
  already_has_access?: boolean | null
  already_has_invited_role?: boolean | null
  inviter: { name: string }
  target: {
    name: string
    thumbnail?: string | null
    pet_type?: { name?: string } | null
    role: string
    currency_code?: string
  }
}

type AcceptPayload =
  | {
      type: 'pet'
      pet_id: number
      relationship_type: string
      destination: string
    }
  | {
      type: 'group'
      group_id: number
      role: string
      destination: string
    }
  | {
      type: 'ledger'
      ledger_id: number
      destination: string
    }

const Countdown: React.FC<{ expiresAt: string; onExpired: () => void }> = ({
  expiresAt,
  onExpired,
}) => {
  const { formatted, isExpired } = useCountdown(expiresAt, onExpired)
  const { t } = useTranslation(['resourceInvitations'])

  if (isExpired) {
    return <span className="text-destructive font-medium">{t('resourceInvitations:expired')}</span>
  }

  return (
    <span className="font-mono flex items-center gap-1">
      <Clock className="h-4 w-4" />
      {formatted}
    </span>
  )
}

const PetInvitationTarget: React.FC<{ invitation: InvitationPreview }> = ({ invitation }) => {
  const { t } = useTranslation(['resourceInvitations', 'pets'])
  const target = invitation.target

  return (
    <>
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          {target.thumbnail && <AvatarImage src={target.thumbnail} alt={target.name} />}
          <AvatarFallback className="text-lg">{target.name.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-xl font-semibold">{target.name}</h2>
          {target.pet_type?.name && (
            <p className="text-sm text-muted-foreground">{target.pet_type.name}</p>
          )}
        </div>
      </div>

      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">{t('resourceInvitations:invitedAs')}</p>
        <Badge variant="secondary" className="capitalize text-sm px-3 py-1">
          {t(`pets:sharing.relationship.${target.role}`)}
        </Badge>
      </div>
    </>
  )
}

const GroupInvitationTarget: React.FC<{ invitation: InvitationPreview }> = ({ invitation }) => {
  const { t } = useTranslation(['resourceInvitations', 'groups'])
  const target = invitation.target
  const role = target.role === 'admin' || target.role === 'member' ? target.role : 'member'

  return (
    <>
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="text-lg">
            <Users className="h-7 w-7" />
          </AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-xl font-semibold">{target.name}</h2>
          <p className="text-sm text-muted-foreground">{t('groups:title')}</p>
        </div>
      </div>

      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">{t('groups:invitation.invitedAs')}</p>
        <Badge variant="secondary" className="capitalize text-sm px-3 py-1">
          {t(`groups:invitation.role.${role}`)}
        </Badge>
      </div>
    </>
  )
}

const LedgerInvitationTarget: React.FC<{ invitation: InvitationPreview }> = ({ invitation }) => {
  const { t } = useTranslation(['resourceInvitations', 'finance'])

  return (
    <>
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarFallback>
            <WalletCards className="h-7 w-7" />
          </AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-xl font-semibold">{invitation.target.name}</h2>
          <p className="text-sm text-muted-foreground">
            {t('finance:title')} · {invitation.target.currency_code}
          </p>
        </div>
      </div>
      <p className="text-center text-sm text-muted-foreground">
        {t('resourceInvitations:ledgerEqualAccess')}
      </p>
    </>
  )
}

const ResourceInvitationPage: React.FC = () => {
  const { t } = useTranslation(['resourceInvitations', 'pets', 'groups', 'common'])
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, isLoading: authLoading } = useAuth()

  const [invitation, setInvitation] = useState<InvitationPreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)
  const [declining, setDeclining] = useState(false)
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    if (!token) return
    void (async () => {
      try {
        setLoading(true)
        const data = (await getResourceInvitationsToken(token)) as InvitationPreview
        setInvitation(data)
        if (!data.is_valid) {
          setExpired(true)
          clearPendingResourceInvitationToken()
        }
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } }).response?.status
        if (status === 404 || status === 410) {
          clearPendingResourceInvitationToken()
        }
        if (status === 404) {
          setError(t('resourceInvitations:notFound'))
        } else {
          setError(t('resourceInvitations:noLongerValid'))
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [token, t])

  useEffect(() => {
    if (loading || authLoading || !invitation) return
    if (!user && invitation.is_valid) {
      if (token) {
        savePendingResourceInvitationToken(token)
      }
      const redirectUrl = invitePath(token ?? '')
      void navigate(`/login?redirect=${encodeURIComponent(redirectUrl)}`, { replace: true })
    }
  }, [loading, authLoading, user, invitation, token, navigate])

  const handleAccept = async () => {
    if (!token) return
    setAccepting(true)
    try {
      const result = (await postResourceInvitationsTokenAccept(token)) as AcceptPayload
      clearPendingResourceInvitationToken()
      toast.success(t('resourceInvitations:accepted'))

      if (result.type === 'group') {
        await Promise.all([
          invalidateGroupQueries(queryClient, result.group_id),
          queryClient.invalidateQueries({ queryKey: getGroupsQueryKey() }),
          invalidatePetCollectionQueries(queryClient),
        ])
      } else if (result.type === 'pet') {
        await Promise.all([
          invalidatePetProfileQueries(queryClient, result.pet_id),
          invalidatePetCollectionQueries(queryClient),
        ])
      } else await queryClient.invalidateQueries({ queryKey: ['finance', 'ledgers'] })

      void navigate(result.destination || '/', { replace: true })
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status
      if (status === 410) {
        setExpired(true)
        clearPendingResourceInvitationToken()
        toast.error(t('resourceInvitations:noLongerValid'))
      } else if (status === 422) {
        toast.error(t('resourceInvitations:cannotAcceptOwn'))
      } else {
        toast.error(t('resourceInvitations:acceptError'))
      }
    } finally {
      setAccepting(false)
    }
  }

  const handleDecline = async () => {
    if (!token) return
    setDeclining(true)
    try {
      await postResourceInvitationsTokenDecline(token)
      clearPendingResourceInvitationToken()
      toast.info(t('resourceInvitations:declined'))
      void navigate('/', { replace: true })
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status
      if (status === 410) {
        setExpired(true)
        clearPendingResourceInvitationToken()
        toast.error(t('resourceInvitations:noLongerValid'))
      } else {
        toast.error(t('resourceInvitations:declineError'))
      }
    } finally {
      setDeclining(false)
    }
  }

  if (loading || authLoading) {
    return <LoadingState />
  }

  if (error) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={() => void navigate('/')}>
              {t('common:nav.home', 'Home')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!invitation) return null

  if (invitation.type !== 'pet' && invitation.type !== 'group' && invitation.type !== 'ledger') {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">{t('resourceInvitations:unsupportedType')}</p>
            <Button variant="outline" onClick={() => void navigate('/')}>
              {t('common:nav.home', 'Home')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isInvalid = expired || !invitation.is_valid || invitation.status !== 'pending'
  const accessMessage = invitation.already_has_invited_role
    ? t('resourceInvitations:alreadyHasInvitedRole')
    : invitation.already_has_access
      ? t('resourceInvitations:alreadyHasAccess')
      : null

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-8">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 space-y-6">
          {invitation.type === 'group' ? (
            <GroupInvitationTarget invitation={invitation} />
          ) : invitation.type === 'ledger' ? (
            <LedgerInvitationTarget invitation={invitation} />
          ) : (
            <PetInvitationTarget invitation={invitation} />
          )}

          <p className="text-sm text-center text-muted-foreground">
            {t('resourceInvitations:invitedBy')} <strong>{invitation.inviter.name}</strong>
          </p>

          {isInvalid ? (
            <div className="text-center space-y-4">
              <p className="text-destructive font-medium">
                {invitation.status === 'accepted'
                  ? t('resourceInvitations:alreadyAccepted')
                  : t('resourceInvitations:noLongerValid')}
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  clearPendingResourceInvitationToken()
                  void navigate('/')
                }}
              >
                {t('common:nav.home', 'Home')}
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <span>{t('resourceInvitations:expiresIn')}</span>
                <Countdown
                  expiresAt={invitation.expires_at}
                  onExpired={() => {
                    setExpired(true)
                    clearPendingResourceInvitationToken()
                  }}
                />
              </div>

              {invitation.is_self_invitation && (
                <p className="text-sm text-center text-amber-600">
                  {t('resourceInvitations:cannotAcceptOwn')}
                </p>
              )}
              {accessMessage && !invitation.is_self_invitation && (
                <p className="text-sm text-center text-muted-foreground">{accessMessage}</p>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => void handleDecline()}
                  disabled={declining || accepting}
                >
                  {declining
                    ? t('resourceInvitations:declining')
                    : t('resourceInvitations:decline')}
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => void handleAccept()}
                  disabled={accepting || declining || !!invitation.is_self_invitation}
                >
                  {accepting ? t('resourceInvitations:accepting') : t('resourceInvitations:accept')}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ResourceInvitationPage
