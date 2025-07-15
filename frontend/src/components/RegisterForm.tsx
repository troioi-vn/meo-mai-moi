import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AxiosError } from 'axios'

interface ApiError {
  message: string
  errors?: Record<string, string[]>
}

interface RegisterFormProps {
  onSuccess?: () => void
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess }) => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { register } = useAuth()

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    if (password !== passwordConfirmation) {
      setError('Passwords do not match.')
      return
    }

    try {
      await register({ name, email, password, password_confirmation: passwordConfirmation })
      if (onSuccess) {
        onSuccess()
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
        <Input
          type="password"
          id="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
          }}
          required
        />
      </div>
      <div className="mb-6">
        <Label htmlFor="passwordConfirmation">Confirm Password</Label>
        <Input
          type="password"
          id="passwordConfirmation"
          value={passwordConfirmation}
          onChange={(e) => {
            setPasswordConfirmation(e.target.value)
          }}
          required
        />
      </div>
      <Button type="submit" className="w-full">
        Register
      </Button>
    </form>
  )
}

export default RegisterForm
