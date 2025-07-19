import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { NotificationBell } from '@/components/NotificationBell'
import { UserMenu } from './UserMenu'

const MainNav: React.FC = () => {
  const { isAuthenticated } = useAuth()

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b p-2">
      <nav className="container flex h-16 items-center justify-between">
        {/* Left: Brand */}
        <div className="flex items-center">
          <Link to="/" className="text-2xl font-bold text-foreground">
            Meo!
          </Link>
        </div>

        {/* Right: Actions padding right 5 */}
        <div className="flex items-center space-x-4 pr-5">
          <Link to="/cats" className="text-foreground hover:text-primary">
            Available Cats
          </Link>
          {isAuthenticated ? (
            <>
              <NotificationBell />
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
