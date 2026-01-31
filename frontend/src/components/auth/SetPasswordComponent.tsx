import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { api } from '@/api/axios'
import { useAuth } from '@/hooks/use-auth'

const RESEND_COOLDOWN_SECONDS = 60

/**
 * SetPasswordComponent
 * Shown to users who don't have a password set (e.g., OAuth/SSO users).
 * Guides them to use the password reset flow to set their initial password.
 */
export function SetPasswordComponent() {
  const { t } = useTranslation(['auth', 'common'])
  const { user } = useAuth()

  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [error, setError] = useState('')
  const [cooldownSeconds, setCooldownSeconds] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  const startCooldown = () => {
    setCooldownSeconds(RESEND_COOLDOWN_SECONDS)
    intervalRef.current = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleSetPassword = async () => {
    setIsLoading(true)
    setError('')

    try {
      const email = user?.email
      if (!email) {
        setError(t('auth:setPassword.noEmailError'))
        return
      }

      await api.post('/password/email', { email })
      setEmailSent(true)
      startCooldown()
    } catch (error: unknown) {
      if (error instanceof Error && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } }
        setError(axiosError.response?.data?.message ?? t('auth:setPassword.genericError'))
      } else {
        setError(t('auth:setPassword.genericError'))
      }
    } finally {
      setIsLoading(false)
    }
  }

  const isButtonDisabled = isLoading || cooldownSeconds > 0

  return (
    <div className="space-y-4">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{t('auth:setPassword.infoMessage')}</AlertDescription>
      </Alert>

      {emailSent && (
        <Alert className="border-emerald-500/50 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertDescription>{t('auth:setPassword.successMessage')}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button
        onClick={() => {
          void handleSetPassword()
        }}
        variant="secondary"
        disabled={isButtonDisabled}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t('auth:setPassword.sending')}
          </>
        ) : cooldownSeconds > 0 ? (
          t('auth:setPassword.resendIn', { count: cooldownSeconds })
        ) : emailSent ? (
          t('auth:setPassword.resendEmail')
        ) : (
          t('auth:setPassword.submit')
        )}
      </Button>
    </div>
  )
}
