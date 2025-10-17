import { useState } from 'react'
import RegisterForm from '@/components/RegisterForm'
import WaitlistForm from '@/components/WaitlistForm'
import EmailVerificationPrompt from '@/components/EmailVerificationPrompt'
import { useInviteSystem } from '@/hooks/use-invite-system'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { Loader2, Lock, Globe } from 'lucide-react'
import type { RegisterResponse } from '@/types/auth'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { loadUser } = useAuth()
  const { mode, isLoading, invitationCode, invitationValidation, error, clearError } =
    useInviteSystem()
  const [registrationResponse, setRegistrationResponse] = useState<RegisterResponse | null>(null)
  const [registeredEmail, setRegisteredEmail] = useState<string>('')

  const handleRegistrationSuccess = (response: RegisterResponse, email: string) => {
    if (response.requires_verification) {
      // Stay on same page, show verification prompt
      setRegistrationResponse(response)
      setRegisteredEmail(email)
    } else {
      // User is already verified, can proceed
      toast.success('Registration successful! Welcome!')
      void navigate('/dashboard')
    }
  }

  const handleVerificationComplete = async () => {
    // Reload user data and redirect to dashboard
    await loadUser()
    toast.success('Email verified successfully! Welcome!')
    void navigate('/dashboard')
  }

  const handleWaitlistSuccess = () => {
    toast.success('Successfully joined the waitlist! Check your email for confirmation.')
  }

  // Show email verification prompt if registration requires verification
  if (registrationResponse?.requires_verification) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <EmailVerificationPrompt
          email={registeredEmail}
          message={registrationResponse.message}
          emailSent={registrationResponse.email_sent}
          onVerificationComplete={handleVerificationComplete}
        />
      </div>
    )
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
              type="button"
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
          <div className="flex justify-center">{getIcon()}</div>
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

        {mode === 'invite-only-no-code' && <WaitlistForm onSuccess={handleWaitlistSuccess} />}

        {(mode === 'invite-only-with-code' || mode === 'open-registration') && (
          <RegisterForm
            onSuccess={handleRegistrationSuccess}
            invitationCode={invitationCode}
            inviterName={invitationValidation?.inviter.name}
          />
        )}
      </div>
    </div>
  )
}
