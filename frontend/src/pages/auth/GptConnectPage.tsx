import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AxiosError } from 'axios'
import { useAuth } from '@/hooks/use-auth'
import { confirmGptConnect, registerViaGptConnect } from '@/api/gpt-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ApiErrorResponse {
  message?: string
  errors?: Record<string, string[]>
}

export default function GptConnectPage() {
  const { t } = useTranslation(['auth', 'common'])
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isAuthenticated, isLoading, login, loadUser } = useAuth()

  const sessionId = searchParams.get('session_id') ?? ''
  const sessionSig = searchParams.get('session_sig') ?? ''

  const hasValidSessionParams = useMemo(
    () => sessionId !== '' && sessionSig !== '',
    [sessionId, sessionSig]
  )

  const [isRegisterMode, setIsRegisterMode] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  const [registerName, setRegisterName] = useState('')
  const [registerEmail, setRegisterEmail] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [registerPasswordConfirmation, setRegisterPasswordConfirmation] = useState('')

  const extractErrorMessage = (error: unknown, fallbackKey: string): string => {
    if (error instanceof AxiosError) {
      const payload = error.response?.data as ApiErrorResponse | undefined
      if (payload?.errors) {
        const messages = Object.values(payload.errors).flat()
        if (messages.length > 0) {
          return messages.join(' ')
        }
      }
      if (payload?.message) {
        return payload.message
      }
    }

    return t(fallbackKey)
  }

  const handleLogin = (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)
    setIsSubmitting(true)

    void (async () => {
      try {
        await login({ email: loginEmail, password: loginPassword, remember: true })
      } catch (error: unknown) {
        setErrorMessage(extractErrorMessage(error, 'auth:gptConnect.loginError'))
      } finally {
        setIsSubmitting(false)
      }
    })()
  }

  const handleRegister = (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)

    if (registerPassword !== registerPasswordConfirmation) {
      setErrorMessage(t('auth:gptConnect.passwordsMustMatch'))
      return
    }

    setIsSubmitting(true)

    void (async () => {
      try {
        await registerViaGptConnect({
          session_id: sessionId,
          session_sig: sessionSig,
          name: registerName,
          email: registerEmail,
          password: registerPassword,
          password_confirmation: registerPasswordConfirmation,
        })

        await loadUser()
      } catch (error: unknown) {
        setErrorMessage(extractErrorMessage(error, 'auth:gptConnect.registerError'))
      } finally {
        setIsSubmitting(false)
      }
    })()
  }

  const handleConnect = () => {
    setErrorMessage(null)
    setIsSubmitting(true)

    void (async () => {
      try {
        const response = await confirmGptConnect({
          session_id: sessionId,
          session_sig: sessionSig,
        })

        window.location.assign(response.redirect_url)
      } catch (error: unknown) {
        setErrorMessage(extractErrorMessage(error, 'auth:gptConnect.confirmError'))
        setIsSubmitting(false)
      }
    })()
  }

  const handleCancel = () => {
    void navigate('/')
  }

  if (!hasValidSessionParams) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>{t('auth:gptConnect.invalidSessionTitle')}</CardTitle>
            <CardDescription>{t('auth:gptConnect.invalidSessionDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleCancel}>{t('common:actions.close')}</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-xl items-center justify-center px-4 py-12">
        <p className="text-sm text-muted-foreground">{t('common:actions.loading')}</p>
      </div>
    )
  }

  if (isAuthenticated) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-12">
        <Card>
          <CardHeader className="space-y-2">
            <CardTitle>{t('auth:gptConnect.brandTitle')}</CardTitle>
            <CardDescription>{t('auth:gptConnect.consentTitle')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm text-muted-foreground">
              {t('auth:gptConnect.consentDescription')}
            </p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>{t('auth:gptConnect.permissions.managePets')}</li>
              <li>{t('auth:gptConnect.permissions.manageHealth')}</li>
            </ul>

            {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

            <div className="flex gap-3">
              <Button onClick={handleConnect} disabled={isSubmitting}>
                {t('auth:gptConnect.connect')}
              </Button>
              <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
                {t('common:actions.cancel')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>
            {isRegisterMode ? t('auth:gptConnect.registerTitle') : t('auth:gptConnect.loginTitle')}
          </CardTitle>
          <CardDescription>
            {isRegisterMode
              ? t('auth:gptConnect.registerDescription')
              : t('auth:gptConnect.loginDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

          {!isRegisterMode ? (
            <form className="space-y-4" onSubmit={handleLogin}>
              <div className="space-y-2">
                <Label htmlFor="gpt-login-email">{t('auth:login.email')}</Label>
                <Input
                  id="gpt-login-email"
                  type="email"
                  value={loginEmail}
                  onChange={(event) => {
                    setLoginEmail(event.target.value)
                  }}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gpt-login-password">{t('auth:login.password')}</Label>
                <Input
                  id="gpt-login-password"
                  type="password"
                  value={loginPassword}
                  onChange={(event) => {
                    setLoginPassword(event.target.value)
                  }}
                  required
                />
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {t('auth:login.submit')}
              </Button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleRegister}>
              <div className="space-y-2">
                <Label htmlFor="gpt-register-name">{t('auth:register.name')}</Label>
                <Input
                  id="gpt-register-name"
                  type="text"
                  value={registerName}
                  onChange={(event) => {
                    setRegisterName(event.target.value)
                  }}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gpt-register-email">{t('auth:register.email')}</Label>
                <Input
                  id="gpt-register-email"
                  type="email"
                  value={registerEmail}
                  onChange={(event) => {
                    setRegisterEmail(event.target.value)
                  }}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gpt-register-password">{t('auth:register.password')}</Label>
                <Input
                  id="gpt-register-password"
                  type="password"
                  value={registerPassword}
                  onChange={(event) => {
                    setRegisterPassword(event.target.value)
                  }}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gpt-register-password-confirm">
                  {t('auth:register.confirmPassword')}
                </Label>
                <Input
                  id="gpt-register-password-confirm"
                  type="password"
                  value={registerPasswordConfirmation}
                  onChange={(event) => {
                    setRegisterPasswordConfirmation(event.target.value)
                  }}
                  required
                />
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {t('auth:register.register')}
              </Button>
            </form>
          )}

          <Button
            variant="link"
            className="px-0"
            onClick={() => {
              setErrorMessage(null)
              setIsRegisterMode((value) => !value)
            }}
            disabled={isSubmitting}
          >
            {isRegisterMode ? t('auth:gptConnect.haveAccount') : t('auth:gptConnect.createAccount')}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
