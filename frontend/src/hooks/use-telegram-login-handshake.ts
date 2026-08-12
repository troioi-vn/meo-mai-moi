import { useCallback, useEffect, useRef, useState } from 'react'
import { isAxiosError } from 'axios'
import { useNavigate } from 'react-router-dom'
import { usePostAuthTelegramHandshake } from '@/api/generated/authentication/authentication'
import type { PostAuthTelegramHandshakeBodyLocale } from '@/api/generated/model'
import { useAuth } from '@/hooks/use-auth'

export type TelegramLoginHandshakeStatus =
  | 'idle'
  | 'starting'
  | 'waiting'
  | 'approved'
  | 'error'
  | 'unavailable'

interface UseTelegramLoginHandshakeOptions {
  locale: PostAuthTelegramHandshakeBodyLocale
  redirectPath: string
  invitationCode?: string | null
}

interface TelegramLoginHandshakeState {
  status: TelegramLoginHandshakeStatus
  deepLink: string | null
}

const initialState: TelegramLoginHandshakeState = {
  status: 'idle',
  deepLink: null,
}

export function useTelegramLoginHandshake({
  locale,
  redirectPath,
  invitationCode = null,
}: UseTelegramLoginHandshakeOptions) {
  const [state, setState] = useState<TelegramLoginHandshakeState>(initialState)
  const createHandshake = usePostAuthTelegramHandshake()
  const { loadUser, user } = useAuth()
  const navigate = useNavigate()
  const activeRef = useRef(false)
  const checkSessionRef = useRef<() => Promise<void>>(() => Promise.resolve())

  const stop = useCallback(() => {
    activeRef.current = false
  }, [])

  // `loadUser` resolves whether or not the session is authenticated, so the arrival of a
  // user — not the promise settling — is what tells us the return link reached this browser.
  const checkSession = useCallback(async () => {
    if (!activeRef.current || document.visibilityState !== 'visible') return
    await loadUser()
  }, [loadUser])

  useEffect(() => {
    checkSessionRef.current = checkSession
  }, [checkSession])

  useEffect(() => {
    if (!activeRef.current || !user) return

    stop()
    setState((current) => ({ ...current, status: 'approved' }))
    void navigate(redirectPath)
  }, [navigate, redirectPath, stop, user])

  useEffect(() => {
    const checkWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        void checkSessionRef.current()
      }
    }

    document.addEventListener('visibilitychange', checkWhenVisible)
    window.addEventListener('focus', checkWhenVisible)
    window.addEventListener('pageshow', checkWhenVisible)

    return () => {
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
    setState({ status: 'starting', deepLink: null })

    try {
      const handshake = await createHandshake.mutateAsync({
        data: {
          locale,
          redirect_path: redirectPath,
          ...(invitationCode ? { invitation_code: invitationCode } : {}),
        },
      })
      const { nonce, expires_in: expiresIn, deep_link: deepLink } = handshake

      if (!nonce || !expiresIn || !deepLink) {
        throw new Error('Telegram login handshake response is incomplete')
      }

      activeRef.current = true
      setState({ status: 'waiting', deepLink })

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
        deepLink: null,
      })
    }
  }, [createHandshake, invitationCode, locale, redirectPath, stop])

  return { ...state, start }
}
