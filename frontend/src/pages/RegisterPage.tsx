import RegisterForm from '@/components/RegisterForm'
import WaitlistForm from '@/components/WaitlistForm'
import { useInviteSystem } from '@/hooks/use-invite-system'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { Loader2, Lock, Globe } from 'lucide-react'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { mode, isLoading, invitationCode, invitationValidation, error, clearError } = useInviteSystem()

  const handleRegistrationSuccess = () => {
    toast.success('You are registered, now login please.')
    void navigate('/login')
  }

  const handleWaitlistSuccess = () => {
    toast.success('Successfully joined the waitlist! Check your email for confirmation.')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading registration...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="w-full max-w-md p-8 space-y-8 bg-card rounded-lg shadow-lg border">
          <div className="text-center space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
            <button
              onClick={clearError}
              className="text-primary hover:underline text-sm"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    )
  }

  const getTitle = () => {
    switch (mode) {
      case 'invite-only-no-code':
        return 'Join the Waitlist'
      case 'invite-only-with-code':
        return 'Complete Your Registration'
      case 'open-registration':
        return 'Create an Account'
      default:
        return 'Create an Account'
    }
  }

  const getIcon = () => {
    switch (mode) {
      case 'invite-only-no-code':
      case 'invite-only-with-code':
        return <Lock className="h-6 w-6 text-primary" />
      case 'open-registration':
        return <Globe className="h-6 w-6 text-primary" />
      default:
        return <Globe className="h-6 w-6 text-primary" />
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md p-8 space-y-8 bg-card rounded-lg shadow-lg border">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            {getIcon()}
          </div>
          <h1 className="text-2xl font-bold text-card-foreground">{getTitle()}</h1>
          {mode === 'open-registration' && (
            <p className="text-sm text-muted-foreground">Anyone can join our community</p>
          )}
          {mode === 'invite-only-with-code' && (
            <p className="text-sm text-muted-foreground">You have a valid invitation</p>
          )}
          {mode === 'invite-only-no-code' && (
            <p className="text-sm text-muted-foreground">We're currently invite-only</p>
          )}
        </div>

        {mode === 'invite-only-no-code' && (
          <WaitlistForm onSuccess={handleWaitlistSuccess} />
        )}

        {(mode === 'invite-only-with-code' || mode === 'open-registration') && (
          <RegisterForm 
            onSuccess={handleRegistrationSuccess}
            invitationCode={invitationCode}
            inviterName={invitationValidation?.inviter?.name}
          />
        )}
      </div>
    </div>
  )
}
