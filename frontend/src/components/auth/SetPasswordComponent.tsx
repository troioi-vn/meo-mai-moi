import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { api } from '@/api/axios'
import { useAuth } from '@/hooks/use-auth'

/**
 * SetPasswordComponent
 * Shown to users who don't have a password set (e.g., OAuth/SSO users).
 * Guides them to use the password reset flow to set their initial password.
 */
export function SetPasswordComponent() {
  const { user } = useAuth()

  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [error, setError] = useState('')

  const handleSetPassword = async () => {
    setIsLoading(true)
    setError('')

    try {
      const email = user?.email
      if (!email) {
        setError('Unable to determine your email address for this session.')
        return
      }

      await api.post('/password/email', { email })
      setEmailSent(true)
    } catch (error: unknown) {
      if (error instanceof Error && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } }
        setError(
          axiosError.response?.data?.message ?? 'Failed to send reset email. Please try again.'
        )
      } else {
        setError('Failed to send reset email. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set password</CardTitle>
        <CardDescription>Secure your account with a password</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your account doesn&apos;t have a password set yet. To add one, we&apos;ll send a secure
            link to your email.
          </AlertDescription>
        </Alert>

        {emailSent && (
          <Alert variant="success">
            <AlertDescription>
              We have sent you an email with password reset instructions
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <p className="text-sm text-muted-foreground">
          Setting a password allows you to sign in directly without relying on third-party
          authentication.
        </p>
        <Button
          onClick={() => {
            void handleSetPassword()
          }}
          className="w-full sm:w-auto"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            'Set password via email'
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
