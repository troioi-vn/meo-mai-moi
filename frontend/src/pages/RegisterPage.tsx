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
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md p-8 space-y-8 bg-neutral-50 rounded-lg">
        <h1 className="text-2xl font-bold text-center">
          Create an Account
        </h1>
        <RegisterForm onSuccess={handleRegistrationSuccess} />
      </div>
    </div>
  )
}
