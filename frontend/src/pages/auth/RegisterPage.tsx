import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import RegisterForm from '@/components/auth/RegisterForm'
import WaitlistForm from '@/components/layout/WaitlistForm'
import EmailVerificationPrompt from '@/components/auth/EmailVerificationPrompt'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useInviteSystem } from '@/hooks/use-invite-system'
import { useAuth } from '@/hooks/use-auth'
import { toast } from '@/lib/i18n-toast'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2, Lock, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { RegisterResponse } from '@/types/auth'

export default function RegisterPage() {
  const { t } = useTranslation(['auth', 'common'])
  const navigate = useNavigate()
  const { loadUser, user } = useAuth()
  const [searchParams] = useSearchParams()

  const { mode, isLoading, invitationCode, invitationValidation, invitedEmail, error, clearError } =
    useInviteSystem()
  const [registrationResponse, setRegistrationResponse] = useState<RegisterResponse | null>(null)
  const [registeredEmail, setRegisteredEmail] = useState<string>('')
  const [prevUser, setPrevUser] = useState(user)

  // Clear registration state when user logs out (e.g., via "Use another email" button)
  if (user === null && prevUser !== null) {
    setPrevUser(null)
    setRegistrationResponse(null)
    setRegisteredEmail('')
  } else if (user !== prevUser) {
    setPrevUser(user)
  }

  // Prioritize email from invitation, then from query parameters (e.g., from login redirect)
  const initialEmail = invitedEmail ?? searchParams.get('email') ?? undefined

  const getRedirectPath = (): string => {
    const redirect = searchParams.get('redirect') ?? ''
    if (redirect.startsWith('/') && !redirect.startsWith('//') && !/^https?:/i.test(redirect)) {
      return redirect
    }
    return '/'
  }

  const handleRegistrationSuccess = (response: RegisterResponse, email: string) => {
    if (response.requires_verification) {
      // Stay on same page, show verification prompt
      setRegistrationResponse(response)
      setRegisteredEmail(email)
    } else {
      // User is already verified, can proceed
      toast.success('auth:register.successToast')
      void navigate(getRedirectPath())
    }
  }

  const handleVerificationComplete = async () => {
    // Reload user data and redirect to dashboard
    await loadUser()
    toast.success('auth:verifyEmail.success')
    void navigate(getRedirectPath())
  }

  const handleWaitlistSuccess = () => {
    toast.success('auth:register.waitlistSuccessToast')
  }

  // Show email verification prompt if registration requires verification
  if (registrationResponse?.requires_verification) {
    const disableEmailChange = mode === 'invite-only-with-code'
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <EmailVerificationPrompt
          email={registeredEmail}
          message={registrationResponse.message}
          emailSent={registrationResponse.email_sent}
          onVerificationComplete={() => {
            void handleVerificationComplete()
          }}
          disableEmailChange={disableEmailChange}
          emailChangeDisabledReason={
            disableEmailChange ? t('auth:register.emailChangeDisabledReason') : undefined
          }
        />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">{t('auth:register.loading')}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="w-full max-w-md p-8 space-y-8 bg-card rounded-lg shadow-lg border">
          <div className="text-center space-y-4">
            <div className="border border-destructive/50 bg-destructive/5 rounded-lg p-4">
              <p className="text-destructive text-sm">{error}</p>
            </div>
            <button
              type="button"
              onClick={clearError}
              className="text-primary hover:underline text-sm"
            >
              {t('common:actions.tryAgain')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const getTitle = () => {
    switch (mode) {
      case 'invite-only-no-code':
        return t('auth:register.titles.waitlist')
      case 'invite-only-with-code':
        return t('auth:register.titles.complete')
      case 'open-registration':
        return t('auth:register.titles.create')
      default:
        return t('auth:register.titles.create')
    }
  }

  const getIcon = () => {
    switch (mode) {
      case 'invite-only-no-code':
      case 'invite-only-with-code':
        return <Lock className="h-6 w-6 text-primary" />
      case 'open-registration':
        return <Globe className="h-6 w-6 text-primary" />
      default:
        return <Globe className="h-6 w-6 text-primary" />
    }
  }

  const googleQueryParams = new URLSearchParams()
  if (invitationCode) googleQueryParams.set('invitation_code', invitationCode)
  const googleQueryString = googleQueryParams.toString()
  const googleLoginHref = `/auth/google/redirect${googleQueryString ? `?${googleQueryString}` : ''}`

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <div className="w-full max-w-md space-y-4">
        <div className="p-8 space-y-8 bg-card rounded-lg shadow-lg border">
          <div className="text-center space-y-2">
            <div className="flex justify-center">{getIcon()}</div>
            <h1 className="text-2xl font-bold text-card-foreground">{getTitle()}</h1>
            {mode === 'open-registration' && (
              <p className="text-sm text-muted-foreground">{t('auth:register.subtitles.open')}</p>
            )}
            {mode === 'invite-only-with-code' && (
              <p className="text-sm text-muted-foreground">{t('auth:register.subtitles.valid')}</p>
            )}
            {mode === 'invite-only-no-code' && (
              <p className="text-sm text-muted-foreground">
                {t('auth:register.subtitles.inviteOnly')}
              </p>
            )}
          </div>

          <div className="space-y-4">
            <Button asChild variant="outline" className="w-full">
              <a href={googleLoginHref}>{t('auth:login.googleSignIn')}</a>
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  {t('auth:register.orEmail')}
                </span>
              </div>
            </div>

            {mode === 'invite-only-no-code' && <WaitlistForm onSuccess={handleWaitlistSuccess} />}

            {(mode === 'invite-only-with-code' || mode === 'open-registration') && (
              <RegisterForm
                onSuccess={handleRegistrationSuccess}
                invitationCode={invitationCode}
                inviterName={invitationValidation?.inviter?.name}
                initialEmail={initialEmail}
              />
            )}
          </div>
        </div>
        <div className="flex justify-center">
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  )
}
