import { ChangePasswordForm } from '@/components/ChangePasswordForm'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function PasswordPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Breadcrumbs */}
        <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
          <Link to="/account" className="hover:text-foreground transition-colors">
            Account
          </Link>
          <span>/</span>
          <span className="text-foreground">Password</span>
        </nav>

        {/* Page Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/account" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Account
            </Link>
          </Button>
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Change Password</h1>
            <p className="text-muted-foreground mt-2">
              Update your account password. Choose a strong password you don't use elsewhere.
            </p>
          </div>

          <div className="bg-card rounded-lg border p-6">
            <ChangePasswordForm />
          </div>
        </div>
      </div>
    </div>
  )
}
