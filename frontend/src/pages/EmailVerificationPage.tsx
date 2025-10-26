import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { api } from '@/api/axios'
import { useAuth } from '@/hooks/use-auth'

export default function EmailVerificationPage() {
  const { id, hash } = useParams<{ id: string; hash: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { loadUser } = useAuth()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

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
            void navigate('/account/pets')
          }, 2000)
        } else if (statusParam === 'already_verified') {
          setStatus('success')
          setMessage('Your email address is already verified.')
          
          // Redirect to dashboard after a short delay
          setTimeout(() => {
            void navigate('/account/pets')
          }, 2000)
        } else if (errorParam === 'invalid_link') {
          setStatus('error')
          setMessage('Invalid verification link.')
        } else if (errorParam === 'expired_link') {
          setStatus('error')
          setMessage('Invalid or expired verification link.')
        }
        return
      }

      // Fallback: Handle old-style API verification (for backward compatibility)
      if (!id || !hash) {
        setStatus('error')
        setMessage('Invalid verification link.')
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
        const response = await api.get<{ data: { message: string } }>(`/email/verify/${id}/${hash}?expires=${expires}&signature=${signature}`)
        
        setStatus('success')
        setMessage(response.data.data.message)
        
        // Reload user data
        void loadUser()
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          void navigate('/account/pets')
        }, 2000)
        
      } catch (error: unknown) {
        setStatus('error')
        if (error instanceof Error && 'response' in error) {
          const axiosError = error as { response?: { status?: number } }
          if (axiosError.response?.status === 400) {
            setMessage('Email address already verified.')
          } else if (axiosError.response?.status === 403) {
            setMessage('Invalid or expired verification link.')
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
    void navigate('/account/pets')
  }

  const handleGoToLogin = () => {
    void navigate('/login')
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
          <Alert className={
            status === 'success' ? 'border-green-200 bg-green-50' :
            status === 'error' ? 'border-red-200 bg-red-50' :
            'border-blue-200 bg-blue-50'
          }>
            <AlertDescription className={
              status === 'success' ? 'text-green-800' :
              status === 'error' ? 'text-red-800' :
              'text-blue-800'
            }>
              {message}
            </AlertDescription>
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
              <Button onClick={handleGoToLogin} className="w-full">
                Go to Login
              </Button>
              <Button onClick={() => { void navigate('/register'); }} variant="outline" className="w-full">
                Register Again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}