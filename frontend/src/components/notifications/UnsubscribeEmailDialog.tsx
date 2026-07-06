import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { api } from '@/api/axios'
import { useAuth } from '@/hooks/use-auth'
import { toast } from '@/lib/i18n-toast'

interface UnsubscribeEmailDialogProps {
  onSuccess?: () => void
}

interface UnsubscribeParams {
  user: string
  type: string
  token: string
  channel: string
}

function parseUnsubscribeParams(searchParams: URLSearchParams): UnsubscribeParams | null {
  if (searchParams.get('unsubscribe') !== '1') {
    return null
  }

  const user = searchParams.get('user')
  const type = searchParams.get('type')
  const token = searchParams.get('token')

  if (!user || !type || !token) {
    return null
  }

  return {
    user,
    type,
    token,
    channel: searchParams.get('channel') ?? 'email',
  }
}

export function UnsubscribeEmailDialog({ onSuccess }: UnsubscribeEmailDialogProps) {
  const { t } = useTranslation('settings')
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [submitting, setSubmitting] = useState(false)

  const params = useMemo(() => parseUnsubscribeParams(searchParams), [searchParams])
  const open = params !== null

  const clearParams = useCallback(() => {
    void navigate('/settings/notifications', { replace: true })
  }, [navigate])

  const wrongAccount = params !== null && user !== null && String(user.id) !== params.user

  useEffect(() => {
    if (params !== null && user !== null && wrongAccount) {
      toast.error(t('notifications.unsubscribe.wrongAccount'))
      clearParams()
    }
  }, [clearParams, params, t, user, wrongAccount])

  const handleConfirm = async () => {
    if (!params || wrongAccount) {
      return
    }

    setSubmitting(true)
    try {
      await api.post('/unsubscribe', {
        user: Number(params.user),
        type: params.type,
        token: params.token,
        channel: params.channel,
        scope: 'all',
      })
      toast.success(t('notifications.unsubscribe.successMessage'))
      clearParams()
      onSuccess?.()
    } catch {
      toast.error(t('notifications.unsubscribe.invalidLink'))
    } finally {
      setSubmitting(false)
    }
  }

  if (!open || wrongAccount) {
    return null
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && !submitting) {
          clearParams()
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('notifications.unsubscribe.dialogTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('notifications.unsubscribe.dialogDescription')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {user === null && (
          <Alert>
            <AlertDescription>{t('notifications.unsubscribe.invalidLink')}</AlertDescription>
          </Alert>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>
            {t('notifications.unsubscribe.cancelAction')}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={submitting || user === null}
            onClick={(event) => {
              event.preventDefault()
              void handleConfirm()
            }}
          >
            {t('notifications.unsubscribe.confirmAction')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
