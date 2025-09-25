import { use, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { api, csrf } from '@/api/axios'
import { AxiosError } from 'axios'
import { AuthContext } from '@/contexts/AuthContext'

interface ResetPasswordErrorResponse {
  message?: string
  errors?: {
    token?: string[]
    password?: string[]
  }
}

export default function ResetPasswordPage() {
  const auth = use(AuthContext)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const token = searchParams.get('token')
  const email = searchParams.get('email')

  // Handle authenticated users - allow password reset even if logged in
  useEffect(() => {
    if (auth && !auth.isLoading && auth.isAuthenticated) {
      // Log out the user so they can reset their password
      // or show a message asking if they want to reset password while logged in
      console.log('User is authenticated but accessing password reset. Allowing reset...')
    }
  }, [auth, navigate])

  // Validate URL parameters
  useEffect(() => {
    if (!token || !email) {
      toast.error('Invalid password reset link. Please request a new one.')
      void navigate('/forgot-password')
    }
  }, [token, email, navigate])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsLoading(true)

    // Basic validation
    if (password !== passwordConfirmation) {
      toast.error('Passwords do not match.')
      setIsLoading(false)
      return
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters long.')
      setIsLoading(false)
      return
    }

    try {
      // Ensure CSRF token is set
      await csrf()
      
      // Make API call to reset password
      await api.post('/reset-password', {
        token,
        email,
        password,
        password_confirmation: passwordConfirmation,
      })

      setIsSubmitted(true)
      toast.success('Password reset successfully! You can now log in with your new password.')
      
      // Redirect to login after a short delay
      setTimeout(() => {
        void navigate('/login')
      }, 2000)
    } catch (error) {
      console.error('Reset password error:', error)
      
      let errorMessage = 'Failed to reset password. Please try again.'
      
      if (error instanceof AxiosError) {
        const responseData = error.response?.data as ResetPasswordErrorResponse | undefined

        if (error.response?.status === 422) {
          // Validation errors or invalid token
          const errors = responseData?.errors
          if (errors?.token?.length) {
            errorMessage = 'This password reset link has expired or is invalid. Please request a new one.'
          } else if (errors?.password?.length) {
            errorMessage = errors.password[0] ?? errorMessage
          } else {
            errorMessage = responseData?.message ?? errorMessage
          }
        } else if (responseData?.message) {
          errorMessage = responseData.message
        }
      }
      
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // Don't render if still loading
  if (!auth || auth.isLoading) {
    return null
  }

  // Don't render if missing required parameters
  if (!token || !email) {
    return null
  }

  if (isSubmitted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card>
          <CardHeader>
            <h1 className="text-2xl leading-none font-semibold">Password Reset Complete</h1>
            <CardDescription>Your password has been successfully reset.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                You can now log in with your new password. Redirecting to login page...
              </p>
              <Button
                onClick={() => {
                  void navigate('/login')
                }}
                className="w-full"
              >
                Go to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card>
        <CardHeader>
          <h1 className="text-2xl leading-none font-semibold">Set New Password</h1>
          <CardDescription>
            Enter your new password for {email}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              void handleSubmit(e)
            }}
          >
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your new password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                  }}
                  required
                  minLength={8}
                />
                <p className="text-xs text-muted-foreground">
                  Password must be at least 8 characters long.
                </p>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="password_confirmation">Confirm New Password</Label>
                <Input
                  id="password_confirmation"
                  type="password"
                  placeholder="Confirm your new password"
                  value={passwordConfirmation}
                  onChange={(e) => {
                    setPasswordConfirmation(e.target.value)
                  }}
                  required
                  minLength={8}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Resetting Password...' : 'Reset Password'}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Remember your password?{' '}
              <a
                href="#"
                className="underline underline-offset-4"
                onClick={(e) => {
                  e.preventDefault()
                  void navigate('/login')
                }}
              >
                Back to login
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}