import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AxiosError } from 'axios'
import { useNavigate } from 'react-router-dom'
import { UserCheck, Eye, EyeOff } from 'lucide-react'
import type { RegisterResponse } from '@/types/auth'
import { useTranslation, Trans } from 'react-i18next'

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
  const { t } = useTranslation(['auth', 'common', 'validation'])
  const [name, setName] = useState('')
  const [email, setEmail] = useState(initialEmail ?? '')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { register } = useAuth()
  const navigate = useNavigate()

  const generatePassword = () => {
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const lower = 'abcdefghijklmnopqrstuvwxyz'
    const digits = '0123456789'
    const symbols = '!@#$%^&*()-_=+'
    const allChars = upper + lower + digits + symbols
    const pick = (pool: string) => {
      if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
        const array = new Uint32Array(1)
        crypto.getRandomValues(array)
        return pool[(array[0] ?? 0) % pool.length]
      }
      return pool[Math.floor(Math.random() * pool.length)]
    }

    const seed = [pick(upper), pick(lower), pick(digits), pick(symbols)]
    const rest = Array.from({ length: 12 - seed.length }, () => pick(allChars))
    const combined = [...seed, ...rest]

    for (let i = combined.length - 1; i > 0; i -= 1) {
      const j =
        typeof crypto !== 'undefined' && 'getRandomValues' in crypto
          ? (crypto.getRandomValues(new Uint32Array(1))[0] ?? 0) % (i + 1)
          : Math.floor(Math.random() * (i + 1))
      ;[combined[i], combined[j]] = [combined[j], combined[i]]
    }

    const newPassword = combined.join('')
    setPassword(newPassword)
    setPasswordConfirmation(newPassword)
  }

  const handleSubmit = async (event: React.SyntheticEvent) => {
    event.preventDefault()
    setError(null)

    if (password !== passwordConfirmation) {
      setError(t('auth:register.passwordsMustMatch'))
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
        setError(t('auth:register.unexpectedError'))
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
                <Trans
                  i18nKey="auth:register.invitedBy"
                  values={{ name: inviterName }}
                  components={{ 1: <strong /> }}
                />
              </p>
              <p className="text-xs text-green-600 dark:text-green-400">
                {t('auth:register.completeForm')}
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
          <Label htmlFor="name">{t('auth:register.name')}</Label>
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
          <Label htmlFor="email">{t('auth:register.email')}</Label>
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
          <Label htmlFor="password">{t('auth:register.password')}</Label>
          <div className="flex items-center gap-2">
            <div className="relative w-full">
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
            <Button type="button" variant="secondary" size="sm" onClick={generatePassword}>
              {t('auth:register.generatePassword')}
            </Button>
          </div>
        </div>
        <div className="mb-6">
          <Label htmlFor="passwordConfirmation">{t('auth:register.confirmPassword')}</Label>
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
          {t('auth:register.register')}
        </Button>
        <div className="mt-4 text-center text-sm">
          {t('auth:register.haveAccount')}{' '}
          <a
            href="#"
            className="underline underline-offset-4"
            onClick={(e) => {
              e.preventDefault()
              void navigate('/login')
            }}
          >
            {t('auth:register.signIn')}
          </a>
        </div>
      </form>
    </div>
  )
}

export default RegisterForm
