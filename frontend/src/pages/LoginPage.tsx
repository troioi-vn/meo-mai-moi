import { use, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import LoginForm from '@/components/LoginForm'
import { AuthContext } from '@/contexts/AuthContext'

export default function LoginPage() {
  const auth = use(AuthContext)
  const navigate = useNavigate()

  useEffect(() => {
    if (auth && !auth.isLoading && auth.isAuthenticated) {
      void navigate('/account/cats')
    }
  }, [auth, navigate])

  if (!auth || auth.isLoading || auth.isAuthenticated) {
    return null
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md p-8 space-y-8 bg-card rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-center text-card-foreground">Login</h1>
        <LoginForm />
      </div>
    </div>
  )
}
