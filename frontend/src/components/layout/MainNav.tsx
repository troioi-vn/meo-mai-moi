import React from 'react'
import { Cat, PawPrint, MessageCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { UserMenu } from '@/components/user/UserMenu'
import { Skeleton } from '@/components/ui/skeleton'
import { ImpersonationIndicator } from '@/components/layout/ImpersonationBanner'
import { AdminPanelLink } from '@/components/user/AdminPanelLink'
import { useNotifications } from '@/contexts/NotificationProvider'

interface NavIconLinkProps {
  to: string
  label: string
  icon: React.ReactNode
  badgeCount?: number
}

function NavIconLink({ to, label, icon, badgeCount = 0 }: NavIconLinkProps) {
  const hasBadge = badgeCount > 0
  const badgeText = badgeCount > 9 ? '9+' : String(badgeCount)
  const ariaLabel = hasBadge ? `${label} (${badgeText} unread)` : label

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={ariaLabel}
      title={label}
      className="relative"
      asChild
    >
      <Link to={to}>
        {icon}
        <span className="sr-only">{label}</span>
        {hasBadge && (
          <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] leading-none text-white">
            {badgeText}
          </span>
        )}
      </Link>
    </Button>
  )
}

const MainNav: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth()
  const isVerified = Boolean(user?.email_verified_at)
  const { unreadMessageCount } = useNotifications()

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 border-b py-2">
      <nav className="container flex h-16 items-center justify-between px-3 sm:px-4">
        {/* Left: Brand */}
        <div className="flex items-center gap-1 sm:gap-2">
          {isAuthenticated && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Pets"
              title="Pets"
              className="ml-0 sm:ml-6"
              asChild
            >
              <Link to="/">
                <Cat className="size-6" />
                <span className="sr-only">Pets</span>
              </Link>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Requests"
            title="Requests"
            className="ml-0 sm:ml-6"
            asChild
          >
            <Link to="/requests">
              <PawPrint className="size-6" />
              <span className="sr-only">Requests</span>
            </Link>
          </Button>
        </div>

        {/* Right: Actions padding right 5 */}
        <div className="flex items-center gap-1 sm:gap-2">
          {isLoading ? (
            <Skeleton className="h-9 w-24" />
          ) : isAuthenticated ? (
            <>
              <ImpersonationIndicator />
              <AdminPanelLink />
              {isVerified && (
                <NavIconLink
                  to="/messages"
                  label="Messages"
                  icon={<MessageCircle className="size-6" />}
                  badgeCount={unreadMessageCount}
                />
              )}
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
