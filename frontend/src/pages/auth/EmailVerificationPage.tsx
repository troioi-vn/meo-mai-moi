import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { api } from '@/api/axios'
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

export default function EmailVerificationPage() {
  const { id, hash } = useParams<{ id: string; hash: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { loadUser } = useAuth()
  const { logout } = useAuth()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [isResending, setIsResending] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const [resendError, setResendError] = useState<string | null>(null)
  const RESEND_COOLDOWN_SEC = 60
  const RESEND_MAX_ATTEMPTS = 3
  const storageKey = 'emailResend:global'
  const [resendAttempts, setResendAttempts] = useState(0)
  const [cooldownRemaining, setCooldownRemaining] = useState(0)

  useEffect(() => {
    const handleVerificationResult = async () => {
      // Check if we have query parameters from the backend redirect
      const statusParam = searchParams.get('status')
      const errorParam = searchParams.get('error')

      if (statusParam || errorParam) {
        // Handle backend redirect with status/error parameters
        if (statusParam === 'success') {
          setStatus('success')
          setMessage('Your email has been successfully verified!')

          // Reload user data
          void loadUser()

          // Redirect to dashboard after a short delay
          setTimeout(() => {
            void navigate('/')
          }, 2000)
        } else if (statusParam === 'already_verified') {
          setStatus('success')
          setMessage('Your email address is already verified.')

          // Redirect to dashboard after a short delay
          setTimeout(() => {
            void navigate('/')
          }, 2000)
        } else if (errorParam === 'invalid_link') {
          setStatus('error')
          setMessage('Your verification link is invalid. You can request a new email below.')
        } else if (errorParam === 'expired_link') {
          setStatus('error')
          setMessage('Your verification link has expired. You can request a new email below.')
        }
        return
      }

      // Fallback: Handle old-style API verification (for backward compatibility)
      if (!id || !hash) {
        setStatus('error')
        setMessage('Your verification link is invalid. You can request a new email below.')
        return
      }

      try {
        // Get the expires and signature from URL params
        const expires = searchParams.get('expires')
        const signature = searchParams.get('signature')

        if (!expires || !signature) {
          setStatus('error')
          setMessage('Invalid verification link.')
          return
        }

        // Call the verification endpoint
        const response = await api.get<{ message: string }>(
          `/email/verify/${id}/${hash}?expires=${expires}&signature=${signature}`
        )

        setStatus('success')
        setMessage(response.message)

        // Reload user data
        void loadUser()

        // Redirect to dashboard after a short delay
        setTimeout(() => {
          void navigate('/')
        }, 2000)
      } catch (error: unknown) {
        setStatus('error')
        if (error instanceof Error && 'response' in error) {
          const axiosError = error as { response?: { status?: number } }
          if (axiosError.response?.status === 400) {
            setMessage('Email address already verified.')
          } else if (axiosError.response?.status === 403) {
            setMessage('Invalid or expired verification link. You can request a new email below.')
          } else {
            setMessage('Failed to verify email. Please try again.')
          }
        } else {
          setMessage('Failed to verify email. Please try again.')
        }
      }
    }

    void handleVerificationResult()
  }, [id, hash, searchParams, loadUser, navigate])

  const handleGoToDashboard = () => {
    void navigate('/')
  }

  const handleResendEmail = async () => {
    if (resendAttempts >= RESEND_MAX_ATTEMPTS) {
      setResendError('You have reached the maximum number of resend attempts.')
      return
    }
    if (cooldownRemaining > 0) {
      setResendError(`Please wait ${String(cooldownRemaining)}s before resending.`)
      return
    }
    setIsResending(true)
    setResendMessage(null)
    setResendError(null)
    try {
      const data = await api.post<{ message: string; email_sent: boolean }>(
        '/email/verification-notification'
      )
      setResendMessage(data.message)
    } catch (error) {
      console.error('Failed to resend email:', error)
      setResendError('Failed to resend verification email')
    } finally {
      setIsResending(false)
      const nextAttempts = resendAttempts + 1
      setResendAttempts(nextAttempts)
      const until = Date.now() + RESEND_COOLDOWN_SEC * 1000
      setCooldownRemaining(RESEND_COOLDOWN_SEC)
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({ attempts: nextAttempts, cooldownUntil: until })
        )
      } catch (error) {
        console.error('Failed to save resend state to localStorage:', error)
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
    } catch (error) {
      console.error('Failed to initialize resend state from localStorage:', error)
    }
  }, [])

  useEffect(() => {
    if (cooldownRemaining <= 0) return
    const id = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          try {
            const raw = localStorage.getItem(storageKey)
            const parsed = raw
              ? (JSON.parse(raw) as { attempts?: number; cooldownUntil?: number })
              : {}
            localStorage.setItem(
              storageKey,
              JSON.stringify({ attempts: parsed.attempts ?? resendAttempts, cooldownUntil: null })
            )
          } catch (error) {
            console.error('Failed to update resend state in localStorage:', error)
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      clearInterval(id)
    }
  }, [cooldownRemaining, resendAttempts])

  const handleLoginClick = () => {
    void navigate('/login')
  }

  const handleRegisterClick = () => {
    void navigate('/register')
  }

  // Wrapper functions for onClick handlers
  const onResendClick = () => {
    const promise = (async () => {
      try {
        await handleResendEmail()
      } catch (error: unknown) {
        console.error('Resend failed:', error)
      }
    })()
    void promise
  }

  const onUseAnotherEmailClick = () => {
    const promise = (async () => {
      try {
        await handleUseAnotherEmail()
      } catch (error: unknown) {
        console.error('Logout/redirect failed:', error)
      }
    })()
    void promise
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {status === 'loading' && <Loader2 className="h-12 w-12 text-primary animate-spin" />}
            {status === 'success' && <CheckCircle className="h-12 w-12 text-green-600" />}
            {status === 'error' && <XCircle className="h-12 w-12 text-red-600" />}
          </div>
          <h1 className="text-2xl font-bold">
            {status === 'loading' && 'Verifying Email...'}
            {status === 'success' && 'Email Verified!'}
            {status === 'error' && 'Verification Failed'}
          </h1>
          <CardDescription>
            {status === 'loading' && 'Please wait while we verify your email address.'}
            {status === 'success' && 'Your email has been successfully verified.'}
            {status === 'error' && 'There was a problem verifying your email.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert
            variant={status === 'success' ? 'success' : status === 'error' ? 'destructive' : 'info'}
          >
            <AlertDescription>{message}</AlertDescription>
          </Alert>

          {status === 'success' && (
            <div className="space-y-2">
              <Button onClick={handleGoToDashboard} className="w-full">
                Go to Dashboard
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Redirecting automatically in 2 seconds...
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-2">
              <div className="flex flex-col gap-2">
                <Button variant="outline" className="w-full" onClick={handleLoginClick}>
                  Go to Login
                </Button>
                <Button className="w-full" onClick={handleRegisterClick}>
                  Register Again
                </Button>
              </div>
              {resendMessage && (
                <Alert variant="info">
                  <AlertDescription>{resendMessage}</AlertDescription>
                </Alert>
              )}
              {resendError && (
                <Alert variant="destructive">
                  <AlertDescription>{resendError}</AlertDescription>
                </Alert>
              )}
              <Button
                onClick={onResendClick}
                disabled={
                  isResending || cooldownRemaining > 0 || resendAttempts >= RESEND_MAX_ATTEMPTS
                }
                className="w-full"
              >
                {resendAttempts >= RESEND_MAX_ATTEMPTS
                  ? 'Resend limit reached'
                  : isResending
                    ? 'Sending…'
                    : cooldownRemaining > 0
                      ? `Send again in ${String(cooldownRemaining)}s`
                      : 'Send Verification Email Again'}
              </Button>
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
                      Are you sure you want to use another email address? This will create a new
                      user account and you will need to verify it again.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onUseAnotherEmailClick}>
                      Use another email
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
