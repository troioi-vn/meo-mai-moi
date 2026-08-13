import { useCallback, useMemo, useState } from 'react'
import { createSessionHandoff } from '@/api/telegram-handoff'
import { getBrowserEnvironment, type BrowserEnvironment } from '@/lib/browser-environment'

export type HandoffStatus = 'idle' | 'pending' | 'copied' | 'error'

/**
 * Rewrites an https URL into a scheme the host webview may hand to a real browser.
 *
 * Neither platform guarantees this: it depends on the embedding app forwarding the
 * navigation, which is not something we can feature-detect or get a result from. Callers must
 * always keep a manual fallback visible rather than treating this as the way out.
 */
export function buildEscapeUrl(url: string, environment: BrowserEnvironment): string | null {
  if (environment.isIOS) {
    return url.replace(/^https:\/\//, 'x-safari-https://')
  }

  if (environment.isAndroidWebView) {
    const authorityAndPath = url.replace(/^https:\/\//, '')
    const fallback = encodeURIComponent(url)

    return `intent://${authorityAndPath}#Intent;scheme=https;S.browser_fallback_url=${fallback};end`
  }

  return null
}

/**
 * Moves the current session out of an in-app webview.
 *
 * Every action mints its own token rather than sharing one: handoff tokens are single-use and
 * expire in a minute, so a token minted when the banner rendered would usually be dead by the
 * time it was tapped, and a failed escape would silently spend the one the copy button needs.
 */
export function useBrowserHandoff(redirectPath?: string) {
  const [status, setStatus] = useState<HandoffStatus>('idle')
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null)
  const environment = useMemo(() => getBrowserEnvironment(), [])

  const mint = useCallback(async () => {
    const target = redirectPath ?? window.location.pathname + window.location.search
    const { url } = await createSessionHandoff(target)

    return url
  }, [redirectPath])

  const openInSystemBrowser = useCallback(async () => {
    setStatus('pending')
    try {
      const url = await mint()
      // Revealed either way: we cannot observe whether the webview honoured the scheme.
      setFallbackUrl(url)
      window.location.href = buildEscapeUrl(url, environment) ?? url
      setStatus('idle')
    } catch {
      setStatus('error')
    }
  }, [environment, mint])

  const copyLink = useCallback(async () => {
    setStatus('pending')
    try {
      const url = await mint()
      await navigator.clipboard.writeText(url)
      setStatus('copied')
    } catch {
      // Clipboard access can be refused even on https; showing the URL still lets them out.
      setStatus('error')
      try {
        setFallbackUrl(await mint())
      } catch {
        setFallbackUrl(null)
      }
    }
  }, [mint])

  return { status, fallbackUrl, openInSystemBrowser, copyLink }
}
