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
      <div className="w-full max-w-lg">
        <LoginForm initialErrorMessage={errorMessage} />
      </div>
    </div>
  )
}
