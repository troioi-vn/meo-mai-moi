import RegisterForm from '@/components/RegisterForm'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

export default function RegisterPage() {
  const navigate = useNavigate()

  const handleRegistrationSuccess = () => {
    toast.success('You are registered, now login please.')
    void navigate('/login')
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md p-8 space-y-8 bg-card rounded-lg shadow-lg border">
        <h1 className="text-2xl font-bold text-center text-card-foreground">Create an Account</h1>
        <RegisterForm onSuccess={handleRegistrationSuccess} />
      </div>
    </div>
  )
}
