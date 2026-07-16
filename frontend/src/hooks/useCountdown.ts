import { useState, useEffect, useCallback, useRef } from 'react'

interface UseCountdownResult {
  remainingSeconds: number
  isExpired: boolean
  formatted: string
}

export const formatCountdown = (remainingSeconds: number): string => {
  const days = Math.floor(remainingSeconds / 86_400)
  const hours = Math.floor((remainingSeconds % 86_400) / 3_600)
  const minutes = Math.floor((remainingSeconds % 3_600) / 60)
  const seconds = remainingSeconds % 60
  const paddedMinutes = String(minutes).padStart(2, '0')
  const paddedSeconds = String(seconds).padStart(2, '0')

  if (days > 0) {
    return `${days}d ${String(hours).padStart(2, '0')}:${paddedMinutes}:${paddedSeconds}`
  }

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${paddedMinutes}:${paddedSeconds}`
  }

  return `${paddedMinutes}:${paddedSeconds}`
}

export const useCountdown = (expiresAt: string, onExpired?: () => void): UseCountdownResult => {
  const calcRemaining = useCallback(() => {
    const expiresAtMs = new Date(expiresAt).getTime()
    if (Number.isNaN(expiresAtMs)) {
      return 0
    }

    const diff = expiresAtMs - Date.now()
    return Math.max(0, Math.floor(diff / 1000))
  }, [expiresAt])

  const [remainingSeconds, setRemainingSeconds] = useState(() => calcRemaining())
  const onExpiredRef = useRef(onExpired)
  const expiredAtRef = useRef<string | null>(null)

  useEffect(() => {
    onExpiredRef.current = onExpired
  }, [onExpired])

  useEffect(() => {
    const notifyExpired = (remaining: number) => {
      if (remaining > 0) {
        expiredAtRef.current = null
        return false
      }

      if (expiredAtRef.current === expiresAt) {
        return true
      }

      expiredAtRef.current = expiresAt
      onExpiredRef.current?.()

      return true
    }

    const initialRemaining = calcRemaining()
    setRemainingSeconds(initialRemaining)

    if (notifyExpired(initialRemaining)) {
      return
    }

    const interval = setInterval(() => {
      const remaining = calcRemaining()
      setRemainingSeconds(remaining)

      if (notifyExpired(remaining)) {
        clearInterval(interval)
      }
    }, 1000)

    return () => {
      clearInterval(interval)
    }
  }, [calcRemaining, expiresAt])

  const isExpired = remainingSeconds <= 0
  const formatted = formatCountdown(remainingSeconds)

  return { remainingSeconds, isExpired, formatted }
}
