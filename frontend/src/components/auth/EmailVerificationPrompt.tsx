import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, CheckCircle, AlertCircle } from 'lucide-react'
import { api } from '@/api/axios'
import { AxiosError } from 'axios'
import { useAuth } from '@/hooks/use-auth'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface EmailVerificationPromptProps {
  email: string
  message: string
  emailSent: boolean
  onVerificationComplete?: () => void
  disableEmailChange?: boolean
  emailChangeDisabledReason?: string
}

interface ResendResponse {
  message: string
  email_sent: boolean
}

export default function EmailVerificationPrompt({
  email,
  message,
  emailSent,
  onVerificationComplete,
  disableEmailChange = false,
  emailChangeDisabledReason,
}: EmailVerificationPromptProps) {
  const [isResending, setIsResending] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const [resendError, setResendError] = useState<string | null>(null)
  const [lastResendSuccess, setLastResendSuccess] = useState(emailSent)
  const navigate = useNavigate()
  const { logout } = useAuth()

  const RESEND_COOLDOWN_SEC = 60
  const RESEND_MAX_ATTEMPTS = 3
  const storageKey = `emailResend:${email}`
  const [resendAttempts, setResendAttempts] = useState(0)
  const [cooldownRemaining, setCooldownRemaining] = useState(0)

  // Reference onVerificationComplete to avoid unused var warnings after removing the manual check button
  useEffect(() => {
    // noop: the backend redirect flow will invoke parent handlers as needed
  }, [onVerificationComplete])

  const handleResendEmail = async () => {
    if (resendAttempts >= RESEND_MAX_ATTEMPTS) {
      setResendError('You have reached the maximum number of resend attempts.')
      setLastResendSuccess(false)
      return
    }
    if (cooldownRemaining > 0) {
      setResendError('Please wait ' + String(cooldownRemaining) + 's before resending.')
      setLastResendSuccess(false)
      return
    }
    setIsResending(true)
    setResendMessage(null)
    setResendError(null)

    try {
      const { data } = await api.post<{ data: ResendResponse }>('/email/verification-notification')
      setResendMessage(data.data.message)
      setLastResendSuccess(data.data.email_sent)
    } catch (error) {
      if (error instanceof AxiosError) {
        const maybeMessage = (error.response?.data as unknown as { message?: unknown } | undefined)
          ?.message
        const messageString =
          typeof maybeMessage === 'string' ? maybeMessage : 'Failed to resend verification email'
        setResendError(messageString)
      } else {
        setResendError('Failed to resend verification email')
      }
      setLastResendSuccess(false)
    } finally {
      setIsResending(false)
      // Start cooldown and increment attempts regardless of success to prevent spamming
      const nextAttempts = resendAttempts + 1
      setResendAttempts(nextAttempts)
      const until = Date.now() + RESEND_COOLDOWN_SEC * 1000
      setCooldownRemaining(RESEND_COOLDOWN_SEC)
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({ attempts: nextAttempts, cooldownUntil: until })
        )
      } catch {
        /* ignore */
      }
    }
  }

  const handleUseAnotherEmail = async () => {
    try {
      await logout()
    } finally {
      void navigate('/register')
    }
  }

  // Initialize resend state from storage and tick down cooldown
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const parsed = JSON.parse(raw) as { attempts?: number; cooldownUntil?: number }
        if (typeof parsed.attempts === 'number') setResendAttempts(parsed.attempts)
        if (typeof parsed.cooldownUntil === 'number') {
          const remaining = Math.max(0, Math.ceil((parsed.cooldownUntil - Date.now()) / 1000))
          setCooldownRemaining(remaining)
        }
      }
    } catch {
      /* ignore */
    }
  }, [storageKey])

  useEffect(() => {
    if (cooldownRemaining <= 0) return
    const id = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          // Clear cooldown in storage when timer ends
          try {
            const raw = localStorage.getItem(storageKey)
            const parsed = raw
              ? (JSON.parse(raw) as { attempts?: number; cooldownUntil?: number })
              : {}
            localStorage.setItem(
              storageKey,
              JSON.stringify({ attempts: parsed.attempts ?? resendAttempts, cooldownUntil: null })
            )
          } catch {
            /* ignore */
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      clearInterval(id)
    }
  }, [cooldownRemaining, resendAttempts, storageKey])

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <Mail className="h-12 w-12 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Verify Your Email</h2>
        <CardDescription>
          You entered <strong>{email}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main message - hide when a resend message is shown to avoid duplication */}
        {!resendMessage && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        {/* Resend message */}
        {resendMessage && (
          <Alert variant={lastResendSuccess ? 'success' : 'warning'}>
            <CheckCircle
              className={`h-4 w-4 ${lastResendSuccess ? 'text-green-600' : 'text-yellow-600'}`}
            />
            <AlertDescription>{resendMessage}</AlertDescription>
          </Alert>
        )}

        {/* Resend error */}
        {resendError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{resendError}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          {disableEmailChange ? (
            <div className="space-y-2">
              <Button variant="outline" className="w-full" disabled aria-disabled>
                Use another email
              </Button>
              {emailChangeDisabledReason && (
                <p className="text-xs text-muted-foreground text-center">
                  {emailChangeDisabledReason}
                </p>
              )}
            </div>
          ) : (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  Use another email
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Use another email address?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to use another email address? This will create a new user
                    account and you will need to verify it again.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => void handleUseAnotherEmail()}>
                    Use another email
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>
            Can&apos;t find the email? Check your spam folder or{' '}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  className="text-primary hover:underline"
                  disabled={isResending}
                >
                  try resending it
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Resend verification email?</AlertDialogTitle>
                  <AlertDialogDescription>
                    We&apos;ll resend the verification email to <strong>{email}</strong>.
                    {resendAttempts >= RESEND_MAX_ATTEMPTS && (
                      <> You have reached the resend limit ({RESEND_MAX_ATTEMPTS}).</>
                    )}
                    {resendAttempts < RESEND_MAX_ATTEMPTS && cooldownRemaining > 0 && (
                      <> Please wait {cooldownRemaining}s before trying again.</>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => void handleResendEmail()}
                    disabled={cooldownRemaining > 0 || resendAttempts >= RESEND_MAX_ATTEMPTS}
                  >
                    {resendAttempts >= RESEND_MAX_ATTEMPTS ? (
                      'Limit reached'
                    ) : cooldownRemaining > 0 ? (
                      <>Resend in {cooldownRemaining}s</>
                    ) : (
                      'Resend email'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
