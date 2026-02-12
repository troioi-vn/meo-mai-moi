import { useState, useEffect, useCallback, useRef } from 'react'

interface UseCountdownResult {
  remainingSeconds: number
  isExpired: boolean
  formatted: string
}

export const useCountdown = (
  expiresAt: string,
  onExpired?: () => void
): UseCountdownResult => {
  const calcRemaining = useCallback(() => {
    const diff = new Date(expiresAt).getTime() - Date.now()
    return Math.max(0, Math.floor(diff / 1000))
  }, [expiresAt])

  const [remainingSeconds, setRemainingSeconds] = useState(() => calcRemaining())
  const onExpiredRef = useRef(onExpired)

  useEffect(() => {
    onExpiredRef.current = onExpired
  }, [onExpired])

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = calcRemaining()
      setRemainingSeconds(remaining)

      if (remaining <= 0) {
        clearInterval(interval)
        onExpiredRef.current?.()
      }
    }, 1000)

    return () => { clearInterval(interval) }
  }, [calcRemaining])

  const isExpired = remainingSeconds <= 0
  const minutes = Math.floor(remainingSeconds / 60)
  const seconds = remainingSeconds % 60
  const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  return { remainingSeconds, isExpired, formatted }
}
