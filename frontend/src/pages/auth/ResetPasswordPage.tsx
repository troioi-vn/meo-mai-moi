import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eye, EyeOff, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { api } from '@/api/axios'
import { toast } from '@/lib/i18n-toast'

export default function ResetPasswordPage() {
  const { t } = useTranslation(['auth', 'common', 'validation'])
  const { token } = useParams<{ token: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false)

  const [isValidating, setIsValidating] = useState(true)
  const [isValid, setIsValid] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const redirectTimer = useRef<number | null>(null)

  useEffect(() => {
    const emailParam = searchParams.get('email')
    const errorParam = searchParams.get('error')

    if (errorParam === 'missing_email') {
      setError(t('auth:resetPassword.invalidTokenMessage'))
      setIsValidating(false)
      return
    }

    if (!token || !emailParam) {
      setError(t('auth:resetPassword.invalidLink'))
      setIsValidating(false)
      return
    }

    setEmail(emailParam)

    // Validate the token
    const validateToken = async () => {
      try {
        await api.get(`/password/reset/${token}?email=${encodeURIComponent(emailParam)}`)
        setIsValid(true)
      } catch (error: unknown) {
        if (error instanceof Error && 'response' in error) {
          const axiosError = error as { response?: { status?: number } }
          if (axiosError.response?.status === 422) {
            setError(t('auth:resetPassword.invalidOrExpiredToken'))
          } else {
            setError(t('auth:resetPassword.validationFailed'))
          }
        } else {
          setError(t('auth:resetPassword.validationFailed'))
        }
      } finally {
        setIsValidating(false)
      }
    }

    void validateToken()
  }, [token, searchParams, t])

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault()

    if (password !== passwordConfirmation) {
      setError(t('auth:register.passwordsMustMatch'))
      return
    }

    if (password.length < 8) {
      setError(t('validation:password.min', { min: 8 }))
      return
    }

    setIsLoading(true)
    setError('')

    try {
      await api.post('/password/reset', {
        token,
        email,
        password,
        password_confirmation: passwordConfirmation,
      })

      setSuccess(true)
      toast.success('auth:resetPassword.successToast')

      // Redirect to login after a short delay
      redirectTimer.current = window.setTimeout(() => {
        void navigate('/login')
      }, 2000)
    } catch (error: unknown) {
      if (error instanceof Error && 'response' in error) {
        const axiosError = error as { response?: { status?: number; data?: { message?: string } } }
        if (axiosError.response?.status === 422) {
          const message = axiosError.response.data?.message ?? ''
          if (message.includes('token')) {
            setError(t('auth:resetPassword.invalidOrExpiredToken'))
          } else if (message.includes('password')) {
            setError(t('validation:password.min', { min: 8 }))
          } else {
            setError(message)
          }
        } else {
          setError(t('auth:resetPassword.error'))
        }
      } else {
        setError(t('auth:resetPassword.error'))
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    return () => {
      if (redirectTimer.current) {
        clearTimeout(redirectTimer.current)
      }
    }
  }, [])

  if (isValidating) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
            </div>
            <h1 className="text-2xl font-semibold">{t('auth:resetPassword.validatingTitle')}</h1>
            <CardDescription>{t('auth:resetPassword.validatingDescription')}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (!isValid) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <XCircle className="h-12 w-12 text-destructive" />
            </div>
            <h1 className="text-2xl font-semibold">{t('auth:resetPassword.invalidLinkTitle')}</h1>
            <CardDescription>{t('auth:resetPassword.invalidToken')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Button asChild className="w-full">
                <a href="/forgot-password">{t('auth:resetPassword.requestNewLabel')}</a>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <a href="/login">{t('auth:forgotPassword.backToLogin')}</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h1 className="text-2xl font-semibold">{t('auth:resetPassword.successTitle')}</h1>
            <CardDescription>{t('auth:resetPassword.successDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="success">
              <AlertDescription>{t('auth:resetPassword.successAlert')}</AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Button asChild className="w-full">
                <a href="/login">{t('auth:resetPassword.goToLogin')}</a>
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                {t('auth:resetPassword.redirecting', { count: 2 })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <h1 className="text-2xl font-semibold">{t('auth:forgotPassword.resetPasswordTitle')}</h1>
          <CardDescription>{t('auth:forgotPassword.resetPasswordDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            noValidate
            onSubmit={(e) => {
              void handleSubmit(e)
            }}
            className="space-y-4"
          >
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">{t('auth:resetPassword.emailLabel')}</Label>
              <Input id="email" type="email" value={email} disabled className="bg-muted" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('auth:resetPassword.password')}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('auth:resetPassword.newPasswordPlaceholder')}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                  }}
                  required
                  minLength={8}
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => {
                    setShowPassword(!showPassword)
                  }}
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password_confirmation">
                {t('auth:resetPassword.confirmPassword')}
              </Label>
              <div className="relative">
                <Input
                  id="password_confirmation"
                  type={showPasswordConfirmation ? 'text' : 'password'}
                  placeholder={t('auth:resetPassword.confirmPasswordPlaceholder')}
                  value={passwordConfirmation}
                  onChange={(e) => {
                    setPasswordConfirmation(e.target.value)
                  }}
                  required
                  minLength={8}
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => {
                    setShowPasswordConfirmation(!showPasswordConfirmation)
                  }}
                  disabled={isLoading}
                >
                  {showPasswordConfirmation ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('auth:resetPassword.resetting')}
                </>
              ) : (
                t('auth:resetPassword.submit')
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
