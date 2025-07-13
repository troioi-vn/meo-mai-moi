import { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { api } from '@/api/axios';

interface Notification {
  id: number;
  message: string;
  is_read: boolean;
  link: string;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data);
      setUnreadCount(response.data.filter((n: Notification) => !n.is_read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setError('Failed to fetch notifications');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = async (isOpen: boolean) => {
    if (isOpen && unreadCount > 0) {
      try {
        await api.post('/notifications/mark-as-read');
        setUnreadCount(0);
        fetchNotifications();
      } catch (error) {
        console.error('Error marking notifications as read:', error);
      }
    }
  };

  if (error) return <div role="alert">{error}</div>;
  
  if (isLoading) return (
    <div role="status" aria-label="Loading notifications">
      <span className="sr-only">Loading notifications...</span>
      <div className="h-8 w-8 animate-pulse bg-neutral-200 dark:bg-neutral-700 rounded-full" />
    </div>
  );

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative w-8 h-8 p-0">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              role="status"
              aria-label={`${unreadCount} unread notifications`}
              className="absolute -top-1 -right-1 min-w-[1.2rem] h-5 px-1"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {notifications.length === 0 ? (
          <DropdownMenuItem>No notifications</DropdownMenuItem>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem key={notification.id} asChild>
              <a href={notification.link} className="w-full">
                {notification.message}
              </a>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
