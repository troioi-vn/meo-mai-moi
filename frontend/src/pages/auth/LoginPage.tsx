import { use, useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LoginForm } from '@/components/auth/LoginForm'
import { AuthContext } from '@/contexts/AuthContext'

export default function LoginPage() {
  const { t } = useTranslation(['auth'])
  const auth = use(AuthContext)
  const navigate = useNavigate()
  const location = useLocation()

  const errorMessage = useMemo(() => {
    const params = new URLSearchParams(location.search)
    const error = params.get('error')

    if (error === 'oauth_failed') {
      return t('auth:login.errors.oauth_failed')
    }

    if (error === 'missing_email') {
      return t('auth:login.errors.missing_email')
    }

    if (error === 'already_on_waitlist') {
      return t('auth:login.errors.already_on_waitlist')
    }

    if (error === 'waitlist_failed') {
      return t('auth:login.errors.waitlist_failed')
    }

    return null
  }, [location.search, t])

  const successMessage = useMemo(() => {
    const params = new URLSearchParams(location.search)
    const status = params.get('status')

    if (status === 'added_to_waitlist') {
      return t('auth:login.waitlist.success')
    }

    return null
  }, [location.search, t])

  useEffect(() => {
    if (auth && !auth.isLoading && auth.isAuthenticated) {
      interface MaybeVerifiedUser {
        email_verified_at?: string | null
      }
      const verifiedAt = (auth.user as MaybeVerifiedUser | null)?.email_verified_at
      if (verifiedAt !== null) {
        void navigate('/')
      }
    }
  }, [auth, navigate])

  if (!auth || auth.isLoading) {
    return null
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-lg space-y-4">
        {successMessage && (
          <div className="bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-green-800 dark:text-green-200 text-sm">{successMessage}</p>
          </div>
        )}
        <LoginForm initialErrorMessage={errorMessage} />
      </div>
    </div>
  )
}
