import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AxiosError } from 'axios'
import { useNavigate } from 'react-router-dom'
import { UserCheck, Eye, EyeOff } from 'lucide-react'
import type { RegisterResponse } from '@/types/auth'

interface ApiError {
  message: string
  errors?: Record<string, string[]>
}

interface RegisterFormProps {
  onSuccess?: (response: RegisterResponse, email: string) => void
  invitationCode?: string | null
  inviterName?: string | null
  initialEmail?: string
}

const RegisterForm: React.FC<RegisterFormProps> = ({
  onSuccess,
  invitationCode,
  inviterName,
  initialEmail,
}) => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState(initialEmail ?? '')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    if (password !== passwordConfirmation) {
      setError('Passwords do not match.')
      return
    }

    try {
      const payload = {
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
        ...(invitationCode && { invitation_code: invitationCode }),
      }
      const response = await register(payload)
      if (onSuccess) {
        onSuccess(response, email)
      }
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        const axiosError = err as AxiosError<ApiError>
        console.error('Registration error:', axiosError.response?.data ?? axiosError)
        if (axiosError.response?.data.errors) {
          const errorMessages = Object.values(axiosError.response.data.errors).flat().join(' ')
          setError(errorMessages)
        } else {
          setError(axiosError.response?.data.message ?? axiosError.message)
        }
      } else {
        setError('An unexpected error occurred.')
      }
    }
  }

  return (
    <div className="space-y-6">
      {invitationCode && inviterName && (
        <div className="bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <UserCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
            <div>
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                You&apos;ve been invited by <strong>{inviterName}</strong>
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">
                Complete the form below to create your account
              </p>
            </div>
          </div>
        </div>
      )}

      <form
        onSubmit={(e) => {
          void handleSubmit(e)
        }}
      >
        {error && (
          <p data-testid="register-error-message" className="text-destructive text-sm mb-4">
            {error}
          </p>
        )}
        <div className="mb-4">
          <Label htmlFor="name">Name</Label>
          <Input
            type="text"
            id="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
            }}
            required
          />
        </div>
        <div className="mb-4">
          <Label htmlFor="email">Email</Label>
          <Input
            type="email"
            id="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
            }}
            required
          />
        </div>
        <div className="mb-4">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              id="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
              }}
              required
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => {
                setShowPassword(!showPassword)
              }}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <div className="mb-6">
          <Label htmlFor="passwordConfirmation">Confirm Password</Label>
          <div className="relative">
            <Input
              type={showPasswordConfirmation ? 'text' : 'password'}
              id="passwordConfirmation"
              value={passwordConfirmation}
              onChange={(e) => {
                setPasswordConfirmation(e.target.value)
              }}
              required
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => {
                setShowPasswordConfirmation(!showPasswordConfirmation)
              }}
            >
              {showPasswordConfirmation ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        <Button type="submit" className="w-full">
          Register
        </Button>
        <div className="mt-4 text-center text-sm">
          Already have an account?{' '}
          <a
            href="#"
            className="underline underline-offset-4"
            onClick={(e) => {
              e.preventDefault()
              void navigate('/login')
            }}
          >
            Sign in
          </a>
        </div>
      </form>
    </div>
  )
}

export default RegisterForm
