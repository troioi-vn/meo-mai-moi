export interface BrowserEnvironment {
  isIOS: boolean
  isSafari: boolean
  isInstagramInAppBrowser: boolean
  isFacebookInAppBrowser: boolean
  isTelegramMiniApp: boolean
  isLikelyInAppBrowser: boolean
}

interface BrowserEnvironmentInput {
  userAgent?: string
  referrer?: string
  maxTouchPoints?: number
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
  const isTelegramMiniApp =
    ua.includes('telegram') ||
    (typeof window !== 'undefined' && typeof window.Telegram?.WebApp !== 'undefined')

  const isLikelyInAppBrowser =
    isInstagramInAppBrowser ||
    isFacebookInAppBrowser ||
    ref.includes('l.instagram.com') ||
    ref.includes('lm.facebook.com')

  return {
    isIOS,
    isSafari,
    isInstagramInAppBrowser,
    isFacebookInAppBrowser,
    isTelegramMiniApp,
    isLikelyInAppBrowser,
  }
}
