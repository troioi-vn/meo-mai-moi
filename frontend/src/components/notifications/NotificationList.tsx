import { Link } from 'react-router-dom'
import { CheckCircle2, Info, AlertTriangle, XCircle } from 'lucide-react'
import { useNotifications } from '@/contexts/NotificationProvider'

function LevelIcon({ level }: { level: 'info' | 'success' | 'warning' | 'error' }) {
  const base = 'size-4'
  switch (level) {
    case 'success':
      return (
        <>
          <CheckCircle2 className={`${base} text-emerald-500`} aria-hidden="true" />
          <span className="sr-only">Success:</span>
        </>
      )
    case 'warning':
      return (
        <>
          <AlertTriangle className={`${base} text-amber-500`} aria-hidden="true" />
          <span className="sr-only">Warning:</span>
        </>
      )
    case 'error':
      return (
        <>
          <XCircle className={`${base} text-red-500`} aria-hidden="true" />
          <span className="sr-only">Error:</span>
        </>
      )
    default:
      return (
        <>
          <Info className={`${base} text-blue-500`} aria-hidden="true" />
          <span className="sr-only">Info:</span>
        </>
      )
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

export function NotificationList() {
  const { bellNotifications, loading, markBellRead } = useNotifications()

  if (loading && bellNotifications.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
        Loading notifications...
      </div>
    )
  }

  if (bellNotifications.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
        No notifications
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card divide-y">
      {bellNotifications.map((n) => {
        const baseClass = `flex items-start gap-3 px-4 py-3 transition-colors ${
          n.read_at ? '' : 'bg-accent/40'
        }`
        const content = (
          <>
            <LevelIcon level={n.level} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium truncate">{n.title}</p>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {timeAgo(n.created_at)}
                </span>
              </div>
              {n.body && <p className="text-xs text-muted-foreground mt-1">{n.body}</p>}
            </div>
          </>
        )

        if (n.url) {
          return (
            <Link
              key={n.id}
              to={n.url}
              className={`${baseClass} hover:bg-accent/60`}
              onClick={() => void markBellRead(n.id)}
            >
              {content}
            </Link>
          )
        }

        return (
          <button
            key={n.id}
            type="button"
            className={`${baseClass} w-full text-left hover:bg-accent/60`}
            onClick={() => void markBellRead(n.id)}
          >
            {content}
          </button>
        )
      })}
    </div>
  )
}
