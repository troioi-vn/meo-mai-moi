import { use, useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LoginForm } from '@/components/auth/LoginForm'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
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
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-4">
      <div className="w-full max-w-lg space-y-4">
        {successMessage && (
          <div className="rounded-lg border border-emerald-500/50 bg-emerald-500/5 p-4">
            <p className="text-emerald-700 dark:text-emerald-400 text-sm">{successMessage}</p>
          </div>
        )}
        <LoginForm initialErrorMessage={errorMessage} />
        <div className="flex justify-center">
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  )
}
