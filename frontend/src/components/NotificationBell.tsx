import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function NotificationBell() {
  return (
    <Button variant="ghost" size="icon" aria-label="Open notifications">
      <Bell className="h-5 w-5" />
    </Button>
  )
}
