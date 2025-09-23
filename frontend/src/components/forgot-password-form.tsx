import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { api, csrf } from '@/api/axios'
import { AxiosError } from 'axios'

export function ForgotPasswordForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsLoading(true)

    try {
      // Ensure CSRF token is set
      await csrf()
      
      // Make API call to request password reset
      await api.post('/forgot-password', { email })

      setIsSubmitted(true)
      toast.success('Password reset instructions have been sent to your email.')
    } catch (error) {
      console.error('Forgot password error:', error)
      
      let errorMessage = 'Failed to send reset instructions. Please try again.'
      
      if (error instanceof AxiosError) {
        if (error.response?.status === 422) {
          // Validation errors
          const errors = error.response.data.errors
          if (errors?.email) {
            errorMessage = errors.email[0]
          } else {
            errorMessage = error.response.data.message || errorMessage
          }
        } else if (error.response?.status === 429) {
          errorMessage = 'Too many password reset attempts. Please try again later.'
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message
        }
      }
      
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className={cn('flex flex-col gap-6', className)} {...props}>
        <Card>
          <CardHeader>
            <h1 className="text-2xl leading-none font-semibold">Check your email</h1>
            <CardDescription>We've sent password reset instructions to {email}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                Didn't receive the email? Check your spam folder or try again.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsSubmitted(false)
                  }}
                  className="flex-1"
                >
                  Try again
                </Button>
                <Button
                  onClick={() => {
                    void navigate('/login')
                  }}
                  className="flex-1"
                >
                  Back to login
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
          <h1 className="text-2xl leading-none font-semibold">Reset your password</h1>
          <CardDescription>
            Enter your email address and we'll send you a link to reset your password
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
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                  }}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Sending...' : 'Send reset instructions'}
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
