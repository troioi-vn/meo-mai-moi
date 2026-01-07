import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

/**
 * SetPasswordComponent
 * Shown to users who don't have a password set (e.g., OAuth/SSO users).
 * Guides them to use the password reset flow to set their initial password.
 */
export function SetPasswordComponent() {
  const navigate = useNavigate()

  const handleSetPassword = () => {
    void navigate('/forgot-password')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set password</CardTitle>
        <CardDescription>Secure your account with a password</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your account doesn&apos;t have a password set yet. To add one, we&apos;ll send a secure
            link to your email.
          </AlertDescription>
        </Alert>
        <p className="text-sm text-muted-foreground">
          Setting a password allows you to sign in directly without relying on third-party
          authentication.
        </p>
        <Button onClick={handleSetPassword} className="w-full sm:w-auto">
          Set password via email
        </Button>
      </CardContent>
    </Card>
  )
}
