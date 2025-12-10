import { NotificationPreferences } from '@/components/notifications/NotificationPreferences'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function NotificationSettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Breadcrumbs */}
        <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
          <Link to="/settings/account" className="hover:text-foreground transition-colors">
            Settings
          </Link>
          <span>/</span>
          <span className="text-foreground">Notifications</span>
        </nav>

        {/* Page Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/settings/account" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Settings
            </Link>
          </Button>
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Notification Settings</h1>
            <p className="text-muted-foreground mt-2">
              Manage how you receive notifications about important events and updates.
            </p>
          </div>

          {/* Notification Preferences Component */}
          <div className="bg-card rounded-lg border p-6">
            <NotificationPreferences />
          </div>
        </div>
      </div>
    </div>
  )
}
