import React from 'react'
import { Cat, PawPrint, MessageCircle } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { UserMenu } from '@/components/user/UserMenu'
import { Skeleton } from '@/components/ui/skeleton'
import { ImpersonationIndicator } from '@/components/layout/ImpersonationBanner'
import { AdminPanelLink } from '@/components/user/AdminPanelLink'
import { useNotifications } from '@/contexts/NotificationProvider'
import { cn } from '@/lib/utils'

interface NavIconLinkProps {
  to: string
  label: string
  icon: React.ReactNode
  badgeCount?: number
  active?: boolean
}

function NavIconLink({ to, label, icon, badgeCount = 0, active }: NavIconLinkProps) {
  const hasBadge = badgeCount > 0
  const badgeText = badgeCount > 9 ? '9+' : String(badgeCount)
  const ariaLabel = hasBadge ? `${label} (${badgeText} unread)` : label

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={ariaLabel}
      title={label}
      className={cn('relative min-h-11 min-w-11', active && 'text-primary')}
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
  const { t } = useTranslation('common')
  const { isAuthenticated, isLoading, user } = useAuth()
  const isVerified = Boolean(user?.email_verified_at)
  const { unreadMessageCount } = useNotifications()
  const location = useLocation()

  const isOnPets = location.pathname === '/' || location.pathname.startsWith('/pets')
  const isOnRequests = location.pathname.startsWith('/requests')
  const isOnMessages = location.pathname.startsWith('/messages')

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 border-b">
      <nav className="container flex h-16 items-center justify-between px-3 sm:px-4">
        {/* Left: Main navigation */}
        <div className="flex items-center gap-1 sm:gap-2">
          {isAuthenticated && (
            <NavIconLink
              to="/"
              label={t('nav.pets')}
              icon={<Cat className="size-6" />}
              active={isOnPets}
            />
          )}
          <NavIconLink
            to="/requests"
            label={t('nav.requests')}
            icon={<PawPrint className="size-6" />}
            active={isOnRequests}
          />
        </div>

        {/* Right: Actions */}
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
                  label={t('nav.messages')}
                  icon={<MessageCircle className="size-6" />}
                  badgeCount={unreadMessageCount}
                  active={isOnMessages}
                />
              )}
              {isVerified && <NotificationBell />}
              <UserMenu />
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="outline">{t('nav.login')}</Button>
              </Link>
              <Link to="/register">
                <Button>{t('nav.register')}</Button>
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}

export default MainNav
