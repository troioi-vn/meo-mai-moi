import { use, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ForgotPasswordForm } from '@/components/forgot-password-form'
import { AuthContext } from '@/contexts/AuthContext'

export default function ForgotPasswordPage() {
  const auth = use(AuthContext)
  const navigate = useNavigate()

  useEffect(() => {
    if (auth && !auth.isLoading && auth.isAuthenticated) {
      void navigate('/account/pets')
    }
  }, [auth, navigate])

  if (!auth || auth.isLoading || auth.isAuthenticated) {
    return null
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <ForgotPasswordForm />
    </div>
  )
}
