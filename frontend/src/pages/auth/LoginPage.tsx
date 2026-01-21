import { use, useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { LoginForm } from '@/components/auth/LoginForm'
import { AuthContext } from '@/contexts/AuthContext'

export default function LoginPage() {
  const auth = use(AuthContext)
  const navigate = useNavigate()
  const location = useLocation()

  const errorMessage = useMemo(() => {
    const params = new URLSearchParams(location.search)
    const error = params.get('error')

    if (error === 'oauth_failed') {
      return 'Google sign in failed. Please try again.'
    }

    if (error === 'missing_email') {
      return 'Unable to retrieve your email from Google. Please try another login method.'
    }

    if (error === 'already_on_waitlist') {
      return 'You are already in the waiting list. We will notify you when an invitation is available.'
    }

    if (error === 'waitlist_failed') {
      return 'Failed to add you to the waiting list. Please try again later.'
    }

    return null
  }, [location.search])

  const successMessage = useMemo(() => {
    const params = new URLSearchParams(location.search)
    const status = params.get('status')

    if (status === 'added_to_waitlist') {
      return "We're currently invite-only. You've been added to our waiting list and we'll notify you as soon as we have space!"
    }

    return null
  }, [location.search])

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
