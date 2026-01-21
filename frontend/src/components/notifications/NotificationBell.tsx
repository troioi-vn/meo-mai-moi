import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNotifications } from '@/contexts/NotificationProvider'
import { Link } from 'react-router-dom'

export function NotificationBell() {
  const { unreadBellCount } = useNotifications()

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={
        unreadBellCount > 0
          ? `Open notifications (${String(unreadBellCount)} unread)`
          : 'Open notifications'
      }
      className="relative"
      asChild
    >
      <Link to="/notifications">
        <Bell className="size-6" />
        {unreadBellCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] h-4 min-w-4 px-1 leading-none">
            {unreadBellCount > 9 ? '9+' : String(unreadBellCount)}
          </span>
        )}
      </Link>
    </Button>
  )
}
