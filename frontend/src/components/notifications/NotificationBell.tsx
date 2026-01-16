import React from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NotificationContext } from '@/contexts/NotificationProvider'
import { Link } from 'react-router-dom'

export function NotificationBell() {
  // Allow rendering without provider in isolated tests
  const ctx = React.use(NotificationContext)
  const { unreadCount } = ctx ?? {
    unreadCount: 0,
    loading: false,
    // Provide no-op implementations that satisfy the linter (not empty functions)
    refresh: async () => Promise.resolve(),
    markRead: async () => Promise.resolve(),
    markAllReadNow: async () => Promise.resolve(),
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={
        unreadCount > 0
          ? `Open notifications (${String(unreadCount)} unread)`
          : 'Open notifications'
      }
      className="relative"
      asChild
    >
      <Link to="/notifications">
        <Bell className="size-6" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] h-4 min-w-4 px-1 leading-none">
            {unreadCount > 9 ? '9+' : String(unreadCount)}
          </span>
        )}
      </Link>
    </Button>
  )
}
