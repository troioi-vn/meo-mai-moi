export interface BrowserEnvironment {
  isIOS: boolean
  isSafari: boolean
  isInstagramInAppBrowser: boolean
  isFacebookInAppBrowser: boolean
  isTelegramMiniApp: boolean
  isLikelyInAppBrowser: boolean
  isAndroidWebView: boolean
  isIOSWebView: boolean
  /**
   * Any embedded webview, named or not — Telegram's in-app browser carries no vendor token,
   * so it is only ever caught by the generic platform rules.
   *
   * This is true inside the Telegram Mini App too, since that is also a webview. Callers who
   * mean "stranded somewhere the user did not choose" must exclude `isTelegramMiniApp`.
   */
  isInAppBrowser: boolean
}

interface BrowserEnvironmentInput {
  userAgent?: string
  referrer?: string
  maxTouchPoints?: number
  telegramInitData?: string
}

export function getBrowserEnvironment(input?: BrowserEnvironmentInput): BrowserEnvironment {
  const userAgent =
    (input?.userAgent ??
      (typeof navigator !== 'undefined' && typeof navigator.userAgent === 'string'
        ? navigator.userAgent
        : '')) ||
    ''
  const referrer =
    (input?.referrer ??
      (typeof document !== 'undefined' && typeof document.referrer === 'string'
        ? document.referrer
        : '')) ||
    ''

  const ua = userAgent.toLowerCase()
  const ref = referrer.toLowerCase()
  const maxTouchPoints =
    input?.maxTouchPoints ??
    (typeof navigator !== 'undefined' && typeof navigator.maxTouchPoints === 'number'
      ? navigator.maxTouchPoints
      : 0)

  const isIOS = /iphone|ipad|ipod/.test(ua) || (ua.includes('macintosh') && maxTouchPoints > 1)
  const isSafari =
    ua.includes('safari') &&
    !ua.includes('chrome') &&
    !ua.includes('crios') &&
    !ua.includes('fxios') &&
    !ua.includes('edgios') &&
    !ua.includes('android')
  const isInstagramInAppBrowser = ua.includes('instagram')
  const isFacebookInAppBrowser =
    ua.includes('fban') || ua.includes('fb_iab') || ua.includes('fbav') || ua.includes('fb4a')
  // `index.html` loads the Telegram SDK on every page, so `window.Telegram.WebApp` existing
  // proves nothing — it is defined in desktop Chrome too. Only a non-empty `initData` means
  // Telegram actually launched us as a Mini App, which is the signal
  // `use-telegram-miniapp-auth` already trusts.
  //
  // The user agent is no help either: Telegram's in-app browser reports a string byte-identical
  // to Chrome for Android, with no vendor token of any kind.
  const telegramInitData =
    input?.telegramInitData ??
    (typeof window !== 'undefined' && typeof window.Telegram?.WebApp?.initData === 'string'
      ? window.Telegram.WebApp.initData
      : '')
  const isTelegramMiniApp = telegramInitData.trim() !== ''

  const isLikelyInAppBrowser =
    isInstagramInAppBrowser ||
    isFacebookInAppBrowser ||
    ref.includes('l.instagram.com') ||
    ref.includes('lm.facebook.com')

  // Android System WebView appends a `wv` token, and pairs `Version/4.0` with `Chrome/…`.
  // Real Chrome for Android sends neither, so either token alone means we are embedded.
  const isAndroidWebView =
    ua.includes('android') &&
    (/;\s*wv[;)]/.test(ua) || (ua.includes('version/') && ua.includes('chrome/')))

  // WKWebView omits the trailing `Safari/…` token that every real iOS browser sends.
  // A standalone PWA omits it too, so this alone does not mean "embedded" — combine it with
  // an installed-app check before acting on it.
  const isIOSWebView = isIOS && !ua.includes('safari/')

  const isInAppBrowser = isLikelyInAppBrowser || isAndroidWebView || isIOSWebView

  return {
    isIOS,
    isSafari,
    isInstagramInAppBrowser,
    isFacebookInAppBrowser,
    isTelegramMiniApp,
    isLikelyInAppBrowser,
    isAndroidWebView,
    isIOSWebView,
    isInAppBrowser,
  }
}
