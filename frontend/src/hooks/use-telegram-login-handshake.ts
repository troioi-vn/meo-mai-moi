import { useCallback, useEffect, useRef, useState } from 'react'
import { isAxiosError } from 'axios'
import { useNavigate } from 'react-router-dom'
import {
  usePostAuthTelegramHandshake,
  usePostAuthTelegramHandshakeNonce,
} from '@/api/generated/authentication/authentication'
import type { PostAuthTelegramHandshakeBodyLocale } from '@/api/generated/model'
import { useAuth } from '@/hooks/use-auth'

const POLL_INTERVAL_MS = 3_000

export type TelegramLoginHandshakeStatus =
  | 'idle'
  | 'starting'
  | 'waiting'
  | 'approved'
  | 'cancelled'
  | 'expired'
  | 'error'
  | 'unavailable'

interface UseTelegramLoginHandshakeOptions {
  locale: PostAuthTelegramHandshakeBodyLocale
  redirectPath: string
}

interface TelegramLoginHandshakeState {
  status: TelegramLoginHandshakeStatus
  userCode: string | null
}

const initialState: TelegramLoginHandshakeState = {
  status: 'idle',
  userCode: null,
}

export function useTelegramLoginHandshake({
  locale,
  redirectPath,
}: UseTelegramLoginHandshakeOptions) {
  const [state, setState] = useState<TelegramLoginHandshakeState>(initialState)
  const createHandshake = usePostAuthTelegramHandshake()
  const claimHandshake = usePostAuthTelegramHandshakeNonce()
  const { loadUser } = useAuth()
  const navigate = useNavigate()

  const activeNonceRef = useRef<string | null>(null)
  const claimInFlightNonceRef = useRef<string | null>(null)
  const expiresAtRef = useRef<number | null>(null)
  const expiryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const checkStatusRef = useRef<() => Promise<void>>(() => Promise.resolve())

  const stop = useCallback(() => {
    activeNonceRef.current = null
    expiresAtRef.current = null
    if (expiryTimerRef.current) {
      clearTimeout(expiryTimerRef.current)
      expiryTimerRef.current = null
    }
  }, [])

  const checkStatus = useCallback(async () => {
    const nonce = activeNonceRef.current
    if (
      !nonce ||
      claimInFlightNonceRef.current === nonce ||
      document.visibilityState !== 'visible'
    ) {
      return
    }

    if (expiresAtRef.current !== null && Date.now() >= expiresAtRef.current) {
      stop()
      setState((current) => ({ ...current, status: 'expired' }))
      return
    }

    claimInFlightNonceRef.current = nonce
    try {
      const result = await claimHandshake.mutateAsync({ nonce })

      // A retry, timeout, or unmount may have retired this nonce while the request was running.
      if (activeNonceRef.current !== nonce) return

      if (result.status === 'approved') {
        stop()
        setState((current) => ({ ...current, status: 'approved' }))
        try {
          await loadUser()
          void navigate(result.redirect_path ?? redirectPath)
        } catch (error) {
          console.error('Failed to load the Telegram-authenticated user:', error)
          setState((current) => ({ ...current, status: 'error' }))
        }
      } else if (result.status === 'cancelled' || result.status === 'expired') {
        const terminalStatus = result.status
        stop()
        setState((current) => ({ ...current, status: terminalStatus }))
      }
    } catch (error) {
      // A transient polling failure should not consume the handshake. The next interval,
      // focus, or visibility event retries until the local expiry deadline.
      console.warn('Telegram login handshake poll failed:', error)
    } finally {
      if (claimInFlightNonceRef.current === nonce) {
        claimInFlightNonceRef.current = null
      }
    }
  }, [claimHandshake, loadUser, navigate, redirectPath, stop])

  useEffect(() => {
    checkStatusRef.current = checkStatus
  }, [checkStatus])

  useEffect(() => {
    const checkWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        void checkStatusRef.current()
      }
    }

    const interval = window.setInterval(checkWhenVisible, POLL_INTERVAL_MS)
    document.addEventListener('visibilitychange', checkWhenVisible)
    window.addEventListener('focus', checkWhenVisible)
    window.addEventListener('pageshow', checkWhenVisible)

    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', checkWhenVisible)
      window.removeEventListener('focus', checkWhenVisible)
      window.removeEventListener('pageshow', checkWhenVisible)
      stop()
    }
  }, [stop])

  const start = useCallback(async () => {
    // Open synchronously while the click still carries a user gesture. Safari and many
    // mobile browsers block windows opened after the handshake request resolves.
    const telegramWindow = window.open('about:blank', '_blank')
    if (telegramWindow) telegramWindow.opener = null

    stop()
    setState({ status: 'starting', userCode: null })

    try {
      const handshake = await createHandshake.mutateAsync({
        data: { locale, redirect_path: redirectPath },
      })
      const { nonce, user_code: userCode, expires_in: expiresIn, deep_link: deepLink } = handshake

      if (!nonce || !userCode || !expiresIn || !deepLink) {
        throw new Error('Telegram login handshake response is incomplete')
      }

      activeNonceRef.current = nonce
      expiresAtRef.current = Date.now() + expiresIn * 1_000
      expiryTimerRef.current = setTimeout(() => {
        if (activeNonceRef.current !== nonce) return
        stop()
        setState({ status: 'expired', userCode })
      }, expiresIn * 1_000)
      setState({ status: 'waiting', userCode })

      if (telegramWindow && !telegramWindow.closed) {
        telegramWindow.location.href = deepLink
      } else {
        window.location.assign(deepLink)
      }
    } catch (error) {
      telegramWindow?.close()
      stop()
      setState({
        status: isAxiosError(error) && error.response?.status === 503 ? 'unavailable' : 'error',
        userCode: null,
      })
    }
  }, [createHandshake, locale, redirectPath, stop])

  return {
    ...state,
    start,
  }
}
