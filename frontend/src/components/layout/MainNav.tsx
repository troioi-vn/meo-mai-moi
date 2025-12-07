import React from 'react'
import { Cat, PawPrint } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { UserMenu } from '@/components/user/UserMenu'
import { Skeleton } from '@/components/ui/skeleton'
import { ImpersonationIndicator } from '@/components/layout/ImpersonationBanner'
import { AdminPanelLink } from '@/components/user/AdminPanelLink'

const MainNav: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth()
  const isVerified = Boolean(user?.email_verified_at)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 border-b p-2">
      <nav className="container flex h-16 items-center justify-between">
        {/* Left: Brand */}
        <div className="flex items-center">
          {isAuthenticated && (
            <Link
              to="/"
              className="text-foreground ml-6 hover:text-primary transition-colors"
              title="Cats"
            >
              <Cat className="h-6 w-6" />
              <span className="sr-only">Cats</span>
            </Link>
          )}
          <Link
            to="/requests"
            className="text-foreground ml-6 hover:text-primary transition-colors"
            title="Requests"
          >
            <PawPrint className="h-6 w-6" />
            <span className="sr-only">Requests</span>
          </Link>
        </div>

        {/* Right: Actions padding right 5 */}
        <div className="flex items-center space-x-4 pr-5">
          {isLoading ? (
            <Skeleton className="h-9 w-24" />
          ) : isAuthenticated ? (
            <>
              {isVerified && <ImpersonationIndicator />}
              {isVerified && <AdminPanelLink />}
              {isVerified && <NotificationBell />}
              <UserMenu />
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="outline">Login</Button>
              </Link>
              <Link to="/register">
                <Button>Register</Button>
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}

export default MainNav

// Reminder: Add 'pt-16' to your main content wrapper to offset the fixed nav height.
