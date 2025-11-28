import { use, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LoginForm } from '@/components/LoginForm'
import { AuthContext } from '@/contexts/AuthContext'

export default function LoginPage() {
  const auth = use(AuthContext)
  const navigate = useNavigate()

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
        <LoginForm />
      </div>
    </div>
  )
}
