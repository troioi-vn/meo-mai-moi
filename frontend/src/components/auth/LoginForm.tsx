import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import EmailVerificationPrompt from './EmailVerificationPrompt'
import type { LoginResponse } from '@/types/auth'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface LoginFormProps extends React.ComponentPropsWithoutRef<'div'> {
  initialErrorMessage?: string | null
}

export function LoginForm({ className, initialErrorMessage = null, ...props }: LoginFormProps) {
  const { t } = useTranslation(['auth', 'common'])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(initialErrorMessage)
  const [isLoading, setIsLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loginResponse, setLoginResponse] = useState<LoginResponse | null>(null)
  const [step, setStep] = useState<'email' | 'password'>('email')
  const { login, loadUser, checkEmail } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    setError(initialErrorMessage)
  }, [initialErrorMessage])

  const getRedirectPath = (): string => {
    const params = new URLSearchParams(location.search)
    const redirect = params.get('redirect') ?? ''
    // Basic open-redirect protection: allow only relative paths starting with a single '/'
    if (redirect.startsWith('/') && !redirect.startsWith('//') && !/^https?:/i.test(redirect)) {
      return redirect
    }
    return '/'
  }

  const redirectPath = getRedirectPath()
  const params = new URLSearchParams(location.search)
  const invitationCode = params.get('invitation_code')

  const googleQueryParams = new URLSearchParams()
  if (redirectPath !== '/') googleQueryParams.set('redirect', redirectPath)
  if (invitationCode) googleQueryParams.set('invitation_code', invitationCode)
  const googleQueryString = googleQueryParams.toString()
  const googleLoginHref = `/auth/google/redirect${googleQueryString ? `?${googleQueryString}` : ''}`

  const handleEmailSubmit = async (event: React.SyntheticEvent) => {
    event.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const emailExists = await checkEmail(email)

      if (emailExists) {
        setStep('password')
      } else {
        // Email doesn't exist, redirect to register with email pre-filled
        void navigate(`/register?email=${encodeURIComponent(email)}`)
      }
    } catch (err: unknown) {
      setError(t('auth:login.checkEmailError'))
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordSubmit = async (event: React.SyntheticEvent) => {
    event.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const response = await login({ email, password, remember: rememberMe })

      if (response.user.email_verified_at) {
        // User is verified, proceed to dashboard
        void navigate(getRedirectPath())
      } else {
        // User needs to verify email
        setLoginResponse(response)
      }
    } catch (err: unknown) {
      setError(t('auth:login.error'))
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackToEmail = () => {
    setStep('email')
    setPassword('')
    setError(null)
  }

  const handleVerificationComplete = async () => {
    // Reload user data and redirect to dashboard
    await loadUser()
    void navigate(getRedirectPath())
  }

  // Show email verification prompt if user needs to verify
  if (loginResponse && !loginResponse.user.email_verified_at) {
    return (
      <div className={cn('flex flex-col gap-6', className)} {...props}>
        <EmailVerificationPrompt
          email={email}
          message={t('auth:verifyEmail.subtitle')}
          emailSent={false}
          onVerificationComplete={() => {
            void handleVerificationComplete()
          }}
        />
        <Card>
          <CardContent className="pt-6">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setLoginResponse(null)
                setEmail('')
                setPassword('')
              }}
            >
              {t('auth:forgotPassword.backToLogin')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-6 w-full max-w-md', className)} {...props}>
      <Card>
        <CardHeader>
          <h1 className="text-2xl leading-none font-semibold">{t('auth:login.title')}</h1>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <Button
              asChild
              variant="outline"
              className="w-full"
              data-testid="google-login-button"
              aria-label={t('auth:login.googleSignIn')}
            >
              <a href={googleLoginHref}>{t('auth:login.googleSignIn')}</a>
            </Button>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              <span>{t('common:actions.or', { defaultValue: 'OR' })}</span>
              <span className="h-px flex-1 bg-border" />
            </div>
          </div>
          {step === 'email' ? (
            <form
              onSubmit={(e) => {
                void handleEmailSubmit(e)
              }}
            >
              <div className="flex flex-col gap-6">
                {error && (
                  <p data-testid="login-error-message" className="text-destructive text-sm">
                    {error}
                  </p>
                )}
                <div className="grid gap-2">
                  <Label htmlFor="email">{t('auth:login.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="mail@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                    }}
                    required
                    autoFocus
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? t('common:actions.loading') : t('common:actions.next')}
                </Button>
              </div>
              <div className="mt-4 text-center text-sm">
                {t('auth:login.noAccount')}{' '}
                <a
                  href="#"
                  className="underline underline-offset-4"
                  onClick={(e) => {
                    e.preventDefault()
                    void navigate('/register')
                  }}
                >
                  {t('auth:login.signUp')}
                </a>
              </div>
            </form>
          ) : (
            <form
              onSubmit={(e) => {
                void handlePasswordSubmit(e)
              }}
            >
              <div className="flex flex-col gap-6">
                {error && (
                  <p data-testid="login-error-message" className="text-destructive text-sm">
                    {error}
                  </p>
                )}
                <div className="grid gap-2">
                  <Label htmlFor="email">{t('auth:login.email')}</Label>
                  <Input id="email" type="email" value={email} disabled className="bg-muted" />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">{t('auth:login.password')}</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 text-sm"
                      onClick={handleBackToEmail}
                    >
                      <ArrowLeft className="mr-1 h-3 w-3" />
                      {t('common:actions.back')}
                    </Button>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                      }}
                      required
                      autoFocus
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
                  <a
                    href="#"
                    className="text-sm underline-offset-4 hover:underline text-right"
                    onClick={(e) => {
                      e.preventDefault()
                      void navigate(`/forgot-password?email=${encodeURIComponent(email)}`)
                    }}
                  >
                    {t('auth:login.forgotPasswordAlt')}
                  </a>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => {
                      setRememberMe(checked as boolean)
                    }}
                  />
                  <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                    {t('auth:login.rememberMe')}
                  </Label>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? t('common:actions.loading') : t('auth:login.submit')}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
