import { useEffect, useRef } from 'react'
import 'altcha'

/**
 * Thin wrapper over the <altcha-widget> custom element.
 *
 * Altcha is proof of work, so it is friction rather than a wall - a determined
 * script solves it. What actually keeps this endpoint honest is the per-IP
 * throttle, the fact that nothing publishes until a human answers, and the
 * server burning each solution after one use. This just makes casual spam
 * uneconomical.
 */
/** Registered by the Laravel package at the application root, not under /api. */
const CHALLENGE_URL = '/altcha-challenge'

interface AltchaWidgetProps {
  onVerified: (payload: string) => void
  onReset: () => void
}

interface AltchaStateDetail {
  state: string
  payload?: string
}

export function AltchaWidget({ onVerified, onReset }: AltchaWidgetProps) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const handleStateChange = (event: Event) => {
      const detail = (event as CustomEvent<AltchaStateDetail>).detail

      if (detail.state === 'verified' && detail.payload) {
        onVerified(detail.payload)
        return
      }

      // Any other state - expired, error, or back to unverified - means the
      // token we were holding is no longer good for a submission.
      onReset()
    }

    element.addEventListener('statechange', handleStateChange)

    return () => {
      element.removeEventListener('statechange', handleStateChange)
    }
  }, [onVerified, onReset])

  // The widget renders its own status line - including a floating "Verification
  // failed" box - inside its own box, and the host page gets no say in how tall
  // that grows. Without a block wrapper reserving room underneath, the error
  // state lands on top of whatever follows the widget in the form.
  return (
    <div className="altcha-host relative block w-full pb-1">
      {/* v3 calls this `challenge`. `challengeurl` is the v1/v2 name that the
          Laravel package's README still documents, and v3 ignores it silently:
          the widget then has no endpoint, fetches a page, and reports
          "invalid content-type ... received text/html". */}
      <altcha-widget ref={ref} challenge={CHALLENGE_URL} />
    </div>
  )
}
