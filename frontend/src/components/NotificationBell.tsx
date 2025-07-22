import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
// ...existing code...
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { api } from '@/api/axios'

interface Notification {
  id: string
  type: string
  notifiable_type: string
  notifiable_id: number
  data: {
    message: string
    link?: string
  }
  read_at: string | null
  created_at: string
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchNotifications = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await api.get<{
        data: { notifications: Notification[]; unread_count: number }
      }>('/notifications')
      const responseData = response.data.data
      const fetchedNotifications = responseData.notifications || []
      setNotifications(fetchedNotifications)
      setUnreadCount(responseData.unread_count)
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error fetching notifications:', error.message)
      } else {
        console.error('Error fetching notifications:', error)
      }
      setError('Failed to fetch notifications')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchNotifications()
  }, [])

  const handleOpenChange = async (isOpen: boolean) => {
    if (isOpen && unreadCount > 0) {
      try {
        await api.post('/notifications/mark-as-read')
        setUnreadCount(0)
        void fetchNotifications()
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'message' in error) {
          console.error('Error marking notifications as read:', (error as Error).message)
        } else {
          console.error('Error marking notifications as read:', error)
        }
      }
    }
  }

  if (error) return <div role="alert">{error}</div>

  if (isLoading)
    return (
      <div role="status" aria-label="Loading notifications">
        <span className="sr-only">Loading notifications...</span>
        <div className="h-8 w-8 animate-pulse bg-gray-200 rounded-full" />
      </div>
    )

  return (
    <DropdownMenu
      onOpenChange={(isOpen) => {
        void handleOpenChange(isOpen)
      }}
      data-testid="notification-bell"
    >
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Open notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full"
              data-testid="notification-badge"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {notifications.length === 0 ? (
          <DropdownMenuItem>No new notifications</DropdownMenuItem>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem key={notification.id} asChild>
              <a href={notification.data.link ?? '#'} className="w-full">
                {notification.data.message}
              </a>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
