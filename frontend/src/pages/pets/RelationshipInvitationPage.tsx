import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/use-auth'
import { useCountdown } from '@/hooks/useCountdown'
import { api } from '@/api/axios'
import { toast } from '@/lib/i18n-toast'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LoadingState } from '@/components/ui/LoadingState'
import { Clock, AlertCircle } from 'lucide-react'

interface InvitationData {
  id: number
  token: string
  relationship_type: string
  status: string
  expires_at: string
  is_valid: boolean
  is_authenticated: boolean
  is_self_invitation?: boolean
  already_has_access?: boolean
  pet: {
    id: number
    name: string
    photo_url?: string
    pet_type?: { name: string }
  }
  inviter: {
    id: number
    name: string
  }
}

const Countdown: React.FC<{ expiresAt: string; onExpired: () => void }> = ({
  expiresAt,
  onExpired,
}) => {
  const { formatted, isExpired } = useCountdown(expiresAt, onExpired)
  const { t } = useTranslation(['pets'])

  if (isExpired) {
    return (
      <span className="text-destructive font-medium">{t('pets:invitation.expired')}</span>
    )
  }

  return (
    <span className="font-mono flex items-center gap-1">
      <Clock className="h-4 w-4" />
      {formatted}
    </span>
  )
}

const RelationshipInvitationPage: React.FC = () => {
  const { t } = useTranslation(['pets', 'common'])
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { user, isLoading: authLoading } = useAuth()

  const [invitation, setInvitation] = useState<InvitationData | null>(null)
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
        const data = await api.get<InvitationData>(`/relationship-invitations/${token}`)
        setInvitation(data)
        if (!data.is_valid) {
          setExpired(true)
        }
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } }).response?.status
        if (status === 404) {
          setError(t('pets:invitation.notFound'))
        } else {
          setError(t('pets:invitation.noLongerValid'))
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [token, t])

  // Redirect to login if not authenticated after data loads
  useEffect(() => {
    if (loading || authLoading || !invitation) return
    if (!user && invitation.is_valid) {
      const redirectUrl = `/pets/invite/${token ?? ''}`
      void navigate(`/login?redirect=${encodeURIComponent(redirectUrl)}`, { replace: true })
    }
  }, [loading, authLoading, user, invitation, token, navigate])

  const handleAccept = async () => {
    if (!token) return
    setAccepting(true)
    try {
      await api.post(`/relationship-invitations/${token}/accept`)
      toast.success(t('pets:invitation.accepted'))
      if (invitation?.pet) {
        void navigate(`/pets/${String(invitation.pet.id)}`, { replace: true })
      } else {
        void navigate('/', { replace: true })
      }
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status
      if (status === 410) {
        setExpired(true)
        toast.error(t('pets:invitation.noLongerValid'))
      } else if (status === 422) {
        toast.error(t('pets:invitation.cannotAcceptOwn'))
      } else {
        toast.error(t('pets:invitation.acceptError'))
      }
    } finally {
      setAccepting(false)
    }
  }

  const handleDecline = async () => {
    if (!token) return
    setDeclining(true)
    try {
      await api.post(`/relationship-invitations/${token}/decline`)
      toast.info(t('pets:invitation.declined'))
      void navigate('/', { replace: true })
    } catch {
      toast.error(t('pets:invitation.declineError'))
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

  const isInvalid = expired || !invitation.is_valid || invitation.status !== 'pending'

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-8">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 space-y-6">
          {/* Pet info */}
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              {invitation.pet.photo_url && (
                <AvatarImage src={invitation.pet.photo_url} alt={invitation.pet.name} />
              )}
              <AvatarFallback className="text-lg">
                {invitation.pet.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-semibold">{invitation.pet.name}</h2>
              {invitation.pet.pet_type && (
                <p className="text-sm text-muted-foreground">{invitation.pet.pet_type.name}</p>
              )}
            </div>
          </div>

          {/* Role badge */}
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">{t('pets:invitation.invitedAs')}</p>
            <Badge variant="secondary" className="capitalize text-sm px-3 py-1">
              {t(`pets:sharing.relationship.${invitation.relationship_type}`)}
            </Badge>
          </div>

          {/* Inviter */}
          <p className="text-sm text-center text-muted-foreground">
            {t('pets:invitation.invitedBy')} <strong>{invitation.inviter.name}</strong>
          </p>

          {isInvalid ? (
            <div className="text-center space-y-4">
              <p className="text-destructive font-medium">
                {invitation.status === 'accepted'
                  ? t('pets:invitation.alreadyAccepted')
                  : t('pets:invitation.noLongerValid')}
              </p>
              <Button variant="outline" onClick={() => void navigate('/')}>
                {t('common:nav.home', 'Home')}
              </Button>
            </div>
          ) : (
            <>
              {/* Countdown */}
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <span>{t('pets:invitation.expiresIn')}</span>
                <Countdown expiresAt={invitation.expires_at} onExpired={() => { setExpired(true) }} />
              </div>

              {/* Edge case messages */}
              {invitation.is_self_invitation && (
                <p className="text-sm text-center text-amber-600">
                  {t('pets:invitation.cannotAcceptOwn')}
                </p>
              )}
              {invitation.already_has_access && !invitation.is_self_invitation && (
                <p className="text-sm text-center text-muted-foreground">
                  {t('pets:invitation.alreadyHasAccess')}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => void handleDecline()}
                  disabled={declining || accepting}
                >
                  {declining ? t('pets:invitation.declining') : t('pets:invitation.decline')}
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => void handleAccept()}
                  disabled={accepting || declining || !!invitation.is_self_invitation}
                >
                  {accepting ? t('pets:invitation.accepting') : t('pets:invitation.accept')}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default RelationshipInvitationPage
