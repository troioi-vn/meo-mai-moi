import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Mail, Loader2 } from 'lucide-react'
import { api } from '@/api/axios'
import { toast } from '@/lib/i18n-toast'

export default function ForgotPasswordPage() {
  const { t } = useTranslation(['auth', 'common', 'validation'])
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [error, setError] = useState('')

  // Prefill email from URL parameter if available
  useEffect(() => {
    const emailParam = searchParams.get('email')
    if (emailParam) {
      setEmail(emailParam)
    }
  }, [searchParams])

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      // Basic client-side email validation to provide immediate feedback
      const emailPattern = /[^@\s]+@[^@\s]+\.[^@\s]+/
      if (!emailPattern.test(email)) {
        setError(t('validation:email.invalid'))
        return
      }

      await api.post('/password/email', { email })

      setEmailSent(true)
      toast.success('auth:forgotPassword.successToast')
    } catch (error: unknown) {
      if (error instanceof Error && 'response' in error) {
        const axiosError = error as { response?: { status?: number; data?: { message?: string } } }
        if (axiosError.response?.status === 422) {
          setError(t('validation:email.invalid'))
        } else if (axiosError.response?.status === 429) {
          setError(t('auth:forgotPassword.tooManyRequests'))
        } else {
          setError(axiosError.response?.data?.message ?? t('auth:forgotPassword.errorGeneric'))
        }
      } else {
        setError(t('auth:forgotPassword.errorGeneric'))
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (emailSent) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Mail className="h-12 w-12 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h1 className="text-2xl font-semibold">{t('auth:forgotPassword.checkEmailTitle')}</h1>
            <CardDescription>
              {t('auth:forgotPassword.checkEmailDescription', { email })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="success">
              <AlertDescription>{t('auth:forgotPassword.successToast')}</AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Button asChild className="w-full">
                <Link to="/login">{t('auth:forgotPassword.backToLogin')}</Link>
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setEmailSent(false)
                  setEmail('')
                }}
              >
                {t('auth:forgotPassword.sendAnotherEmail')}
              </Button>
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
              <Label htmlFor="email">{t('auth:forgotPassword.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('auth:forgotPassword.email')}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                }}
                required
                disabled={isLoading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('auth:forgotPassword.sending')}
                </>
              ) : (
                t('auth:forgotPassword.submit')
              )}
            </Button>

            <div className="text-center">
              <Button asChild variant="ghost" className="text-sm">
                <Link to="/login">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t('auth:forgotPassword.backToLogin')}
                </Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
