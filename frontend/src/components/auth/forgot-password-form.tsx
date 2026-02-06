import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from '@/lib/i18n-toast'
import { api, csrf } from '@/api/axios'
import { AxiosError } from 'axios'
import { useTranslation, Trans } from 'react-i18next'

interface ForgotPasswordErrorResponse {
  message?: string
  errors?: {
    email?: string[]
  }
}

export function ForgotPasswordForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const { t } = useTranslation('auth')
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (event: React.SyntheticEvent) => {
    event.preventDefault()
    setIsLoading(true)

    try {
      // Ensure CSRF token is set
      await csrf()

      // Make API call to request password reset
      await api.post('/forgot-password', { email })

      setIsSubmitted(true)
      toast.success('auth:forgotPassword.successToast')
    } catch (error) {
      console.error('Forgot password error:', error)

      let errorMessage = 'auth:forgotPassword.errorGeneric'

      if (error instanceof AxiosError) {
        const responseData = error.response?.data as ForgotPasswordErrorResponse | undefined

        if (error.response?.status === 422) {
          // Validation errors
          const errors = responseData?.errors
          if (errors?.email?.length) {
            errorMessage = errors.email[0] ?? errorMessage
          } else {
            errorMessage = responseData?.message ?? errorMessage
          }
        } else if (error.response?.status === 429) {
          errorMessage = 'auth:forgotPassword.tooManyAttempts'
        } else if (responseData?.message) {
          errorMessage = responseData.message
        }
      }

      if (errorMessage.startsWith('auth:')) {
        toast.error(errorMessage)
      } else {
        // If it's a dynamic server error, we can't easily use i18n-toast with a key
        // unless we have specific logic for it. For now, just pass the message.
        toast.raw.error(errorMessage)
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className={cn('flex flex-col gap-6', className)} {...props}>
        <Card>
          <CardHeader>
            <h1 className="text-2xl leading-none font-semibold">
              {t('forgotPassword.checkEmailTitle')}
            </h1>
            <CardDescription>
              <Trans i18nKey="auth:forgotPassword.checkEmailDescription" values={{ email }} />
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">{t('forgotPassword.noEmailReceived')}</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsSubmitted(false)
                  }}
                  className="flex-1"
                >
                  {t('forgotPassword.tryAgain')}
                </Button>
                <Button
                  onClick={() => {
                    void navigate('/login')
                  }}
                  className="flex-1"
                >
                  {t('forgotPassword.backToLogin')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader>
          <h1 className="text-2xl leading-none font-semibold">
            {t('forgotPassword.resetPasswordTitle')}
          </h1>
          <CardDescription>{t('forgotPassword.resetPasswordDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              void handleSubmit(e)
            }}
          >
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">{t('forgotPassword.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="mail@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                  }}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? t('forgotPassword.sending') : t('forgotPassword.submit')}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              {t('forgotPassword.rememberPassword')}{' '}
              <a
                href="#"
                className="underline underline-offset-4"
                onClick={(e) => {
                  e.preventDefault()
                  void navigate('/login')
                }}
              >
                {t('forgotPassword.backToLogin')}
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
