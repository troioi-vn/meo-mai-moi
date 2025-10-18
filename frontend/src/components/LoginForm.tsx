import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import EmailVerificationPrompt from './EmailVerificationPrompt'
import type { LoginResponse } from '@/types/auth'

export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loginResponse, setLoginResponse] = useState<LoginResponse | null>(null)
  const { login, loadUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const getRedirectPath = (): string => {
    const params = new URLSearchParams(location.search)
    const redirect = params.get('redirect') ?? ''
    // Basic open-redirect protection: allow only relative paths starting with a single '/'
    if (redirect.startsWith('/') && !redirect.startsWith('//') && !/^https?:/i.test(redirect)) {
      return redirect
    }
    return '/account/pets'
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const response = await login({ email, password, remember: rememberMe })
      
      if (response.email_verified) {
        // User is verified, proceed to dashboard
        void navigate(getRedirectPath())
      } else {
        // User needs to verify email
        setLoginResponse(response)
      }
    } catch (err: unknown) {
      setError('Failed to login. Please check your credentials.')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerificationComplete = async () => {
    // Reload user data and redirect to dashboard
    await loadUser()
    void navigate(getRedirectPath())
  }

  // Show email verification prompt if user needs to verify
  if (loginResponse && !loginResponse.email_verified) {
    return (
      <div className={cn('flex flex-col gap-6', className)} {...props}>
        <EmailVerificationPrompt
          email={email}
          message={loginResponse.message || "Please verify your email address before accessing your account."}
          emailSent={false}
          onVerificationComplete={handleVerificationComplete}
        />
        <Card>
          <CardContent className="pt-6">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setLoginResponse(null)
                setEmail('')
                setPassword('')
              }}
            >
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader>
          <h1 className="text-2xl leading-none font-semibold">Login</h1>
          <CardDescription>Enter your email below to login to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              void handleSubmit(e)
            }}
          >
            <div className="flex flex-col gap-6">
              {error && (
                <p data-testid="login-error-message" className="text-destructive text-sm">
                  {error}
                </p>
              )}
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
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
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                  }}
                  required
                />
                <a
                  href="#"
                  className="text-sm underline-offset-4 hover:underline text-right"
                  onClick={(e) => {
                    e.preventDefault()
                    void navigate('/forgot-password')
                  }}
                >
                  Forgot your password?
                </a>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => {
                    setRememberMe(checked as boolean)
                  }}
                />
                <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                  Remember me
                </Label>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Logging in...' : 'Login'}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Don&apos;t have an account?{' '}
              <a
                href="#"
                className="underline underline-offset-4"
                onClick={(e) => {
                  e.preventDefault()
                  void navigate('/register')
                }}
              >
                Sign up
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
