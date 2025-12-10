import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { joinWaitlist } from '@/api/invite-system'
import { AxiosError } from 'axios'
import { CheckCircle, Mail } from 'lucide-react'

interface ApiError {
  message: string
  errors?: Record<string, string[]>
}

interface WaitlistFormProps {
  onSuccess?: () => void
}

const WaitlistForm: React.FC<WaitlistFormProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      await joinWaitlist(email)
      setIsSuccess(true)
      if (onSuccess) {
        onSuccess()
      }
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        const axiosError = err as AxiosError<ApiError>
        console.error('Waitlist error:', axiosError.response?.data ?? axiosError)

        // Handle specific API error responses
        if (axiosError.response?.data) {
          const responseData = axiosError.response.data

          // Check for error field first (our API format)
          if ('error' in responseData && typeof responseData.error === 'string') {
            setError(responseData.error)
          }
          // Check for errors field (validation errors)
          else if (responseData.errors) {
            const errorMessages = Object.values(responseData.errors).flat().join(' ')
            setError(errorMessages)
          }
          // Check for message field
          else if (responseData.message) {
            setError(responseData.message)
          }
          // Fallback to generic error
          else {
            setError('Something went wrong. Please try again.')
          }
        } else {
          setError('Something went wrong. Please try again.')
        }
      } else {
        setError('An unexpected error occurred.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <CheckCircle className="h-16 w-16 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-green-700 dark:text-green-400">
          You&apos;re on the waitlist! 🎉
        </h2>
        <p className="text-muted-foreground">
          We&apos;ve sent a confirmation email to <strong>{email}</strong>. You&apos;ll be among the first to
          know when we have space available!
        </p>
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-sm text-green-800 dark:text-green-200">
          <p className="font-medium">What happens next?</p>
          <ul className="mt-2 space-y-1 text-left">
            <li>• We&apos;ll send you an invitation as soon as possible</li>
            <li>• Keep an eye on your inbox for updates</li>
            <li>• Ask a friend who&apos;s already a member to send you an invitation</li>
          </ul>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={(e) => {
          void handleSubmit(e)
        }}
        className="space-y-4"
      >
        {error && (
          <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="waitlist-email">Email Address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="email"
              id="waitlist-email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (error) {
                  setError(null)
                }
              }}
              className="pl-10"
              required
              disabled={isLoading}
            />
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Joining Waitlist...' : 'Join Waitlist'}
        </Button>
      </form>
    </div>
  )
}

export default WaitlistForm
