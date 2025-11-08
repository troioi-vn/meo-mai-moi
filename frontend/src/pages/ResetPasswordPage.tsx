import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eye, EyeOff, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { api } from '@/api/axios'
import { toast } from 'sonner'

export default function ResetPasswordPage() {
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
      setError('Invalid reset link. Email parameter is missing.')
      setIsValidating(false)
      return
    }

    if (!token || !emailParam) {
      setError('Invalid reset link.')
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
            setError('Invalid or expired reset token.')
          } else {
            setError('Failed to validate reset token. Please try again.')
          }
        } else {
          setError('Failed to validate reset token. Please try again.')
        }
      } finally {
        setIsValidating(false)
      }
    }

    void validateToken()
  }, [token, searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== passwordConfirmation) {
      setError('Passwords do not match.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.')
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
      toast.success('Password reset successfully!')

      // Redirect to login after a short delay
      redirectTimer.current = window.setTimeout(() => {
        navigate('/login')
      }, 2000)
    } catch (error: unknown) {
      if (error instanceof Error && 'response' in error) {
        const axiosError = error as { response?: { status?: number; data?: { message?: string } } }
        if (axiosError.response?.status === 422) {
          const message = axiosError.response.data?.message ?? ''
          if (message.includes('token')) {
            setError('Invalid or expired reset token.')
          } else if (message.includes('password')) {
            setError('Password must be at least 8 characters long.')
          } else {
            setError(message)
          }
        } else {
          setError('Failed to reset password. Please try again.')
        }
      } else {
        setError('Failed to reset password. Please try again.')
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
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
            </div>
            <h1 className="text-2xl font-semibold">Validating Reset Link</h1>
            <CardDescription>
              Please wait while we validate your password reset link.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (!isValid) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <XCircle className="h-12 w-12 text-red-600" />
            </div>
            <h1 className="text-2xl font-semibold">Invalid Reset Link</h1>
            <CardDescription>This password reset link is invalid or has expired.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Button asChild className="w-full">
                <a href="/forgot-password">Request New Reset Link</a>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <a href="/login">Back to Login</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <h1 className="text-2xl font-semibold">Password Reset Successfully</h1>
            <CardDescription>
              Your password has been reset. You can now login with your new password.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-green-200 bg-green-50">
              <AlertDescription className="text-green-800">
                Password reset successfully. Please log in with your new password.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Button asChild className="w-full">
                <a href="/login">Go to Login</a>
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Redirecting automatically in 2 seconds...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <h1 className="text-2xl font-semibold">Reset Password</h1>
          <CardDescription>Enter your new password below.</CardDescription>
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
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-800">{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" value={email} disabled className="bg-muted" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter new password"
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
              <Label htmlFor="password_confirmation">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="password_confirmation"
                  type={showPasswordConfirmation ? 'text' : 'password'}
                  placeholder="Confirm password"
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
                  Resetting Password...
                </>
              ) : (
                'Reset Password'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
