import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import { api } from '@/api/axios'
import { AxiosError } from 'axios'

interface EmailVerificationPromptProps {
  email: string
  message: string
  emailSent: boolean
  onVerificationComplete?: () => void
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
}: EmailVerificationPromptProps) {
  const [isResending, setIsResending] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const [resendError, setResendError] = useState<string | null>(null)
  const [lastResendSuccess, setLastResendSuccess] = useState(emailSent)

  const handleResendEmail = async () => {
    setIsResending(true)
    setResendMessage(null)
    setResendError(null)

    try {
      const { data } = await api.post<{ data: ResendResponse }>('/email/verification-notification')
      setResendMessage(data.data.message)
      setLastResendSuccess(data.data.email_sent)
    } catch (error) {
      if (error instanceof AxiosError) {
        setResendError(error.response?.data?.message || 'Failed to resend verification email')
      } else {
        setResendError('An unexpected error occurred')
      }
      setLastResendSuccess(false)
    } finally {
      setIsResending(false)
    }
  }

  const handleCheckVerification = async () => {
    try {
      const { data } = await api.get<{ data: { verified: boolean } }>('/email/verification-status')
      if (data.data.verified && onVerificationComplete) {
        onVerificationComplete()
      }
    } catch (error) {
      console.error('Error checking verification status:', error)
    }
  }

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
        {/* Main message */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{message}</AlertDescription>
        </Alert>

        {/* Resend message */}
        {resendMessage && (
          <Alert className={lastResendSuccess ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
            <CheckCircle className={`h-4 w-4 ${lastResendSuccess ? 'text-green-600' : 'text-yellow-600'}`} />
            <AlertDescription className={lastResendSuccess ? 'text-green-800' : 'text-yellow-800'}>
              {resendMessage}
            </AlertDescription>
          </Alert>
        )}

        {/* Resend error */}
        {resendError && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{resendError}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <Button
            onClick={handleResendEmail}
            disabled={isResending}
            variant="outline"
            className="w-full"
          >
            {isResending ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Resend Verification Email
              </>
            )}
          </Button>

          <Button
            onClick={handleCheckVerification}
            variant="default"
            className="w-full"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            I've Verified My Email
          </Button>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>
            Can't find the email? Check your spam folder or{' '}
            <button
              onClick={handleResendEmail}
              className="text-primary hover:underline"
              disabled={isResending}
            >
              try resending it
            </button>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}