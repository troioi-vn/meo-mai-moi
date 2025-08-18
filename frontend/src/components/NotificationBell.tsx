import React from 'react'
import { Bell, CheckCircle2, Info, AlertTriangle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NotificationContext } from '@/contexts/NotificationProvider'
import { Link } from 'react-router-dom'

function LevelIcon({ level }: { level: 'info' | 'success' | 'warning' | 'error' }) {
  const base = 'size-4'
  switch (level) {
    case 'success':
      return <CheckCircle2 className={`${base} text-emerald-500`} />
    case 'warning':
      return <AlertTriangle className={`${base} text-amber-500`} />
    case 'error':
      return <XCircle className={`${base} text-red-500`} />
    default:
      return <Info className={`${base} text-blue-500`} />
  }
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${String(s)}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${String(m)}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${String(h)}h`
  const d = Math.floor(h / 24)
  return `${String(d)}d`
}

export function NotificationBell() {
  // Allow rendering without provider in isolated tests
  const ctx = React.use(NotificationContext)
  const { notifications, unreadCount, setDropdownOpen, markRead } = ctx ?? {
    notifications: [],
    unreadCount: 0,
    loading: false,
    // Provide no-op implementations that satisfy the linter (not empty functions)
  refresh: async () => Promise.resolve(),
  markRead: async () => Promise.resolve(),
  setDropdownOpen: () => undefined,
  }
  const handleOpenChange = (open: boolean) => { setDropdownOpen(open); }

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open notifications" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 inline-flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] h-4 min-w-4 px-1 leading-none">
              {unreadCount > 9 ? '9+' : String(unreadCount)}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <DropdownMenuLabel className="px-3 py-2">Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="px-3 py-8 text-sm text-muted-foreground text-center">No notifications</div>
        ) : (
          <div className="max-h-96 overflow-auto py-1">
            {notifications.slice(0, 20).map((n) => {
              const inner = (
                <>
                  <LevelIcon level={n.level} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">{n.title}</p>
                      <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(n.created_at)}</span>
                    </div>
                    {n.body && <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>}
                  </div>
                </>
              )

              // If URL present, render item as a Link so navigation works inside the menu
              if (n.url) {
                return (
                  <DropdownMenuItem
                    key={n.id}
                    asChild
                    className={`px-3 py-2 items-start gap-3 ${n.read_at ? '' : 'bg-accent/40'}`}
                    onSelect={() => void markRead(n.id)}
                  >
                    <Link to={n.url} className="flex items-start gap-3">
                      {inner}
                    </Link>
                  </DropdownMenuItem>
                )
              }

              // Otherwise, simple selectable row that marks as read
              return (
                <DropdownMenuItem
                  key={n.id}
                  className={`px-3 py-2 items-start gap-3 ${n.read_at ? '' : 'bg-accent/40'}`}
                  onSelect={() => void markRead(n.id)}
                >
                  {inner}
                </DropdownMenuItem>
              )
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
