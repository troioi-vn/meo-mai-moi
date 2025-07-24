import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    void (async () => {
      try {
        await login({ email, password })
        void navigate('/account/cats')
      } catch (err: unknown) {
        setError('Failed to login. Please check your credentials.')
        console.error(err)
      }
    })()
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <p data-testid="login-error-message" className="text-destructive text-sm mb-4">
          {error}
        </p>
      )}
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
      <div className="mb-6">
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
      <Button type="submit" className="w-full">
        Login
      </Button>
    </form>
  )
}

export default LoginForm
