import { describe, expect, it } from 'vite-plus/test'
import { getBrowserEnvironment } from './browser-environment'

describe('getBrowserEnvironment', () => {
  it('detects Instagram in-app browser by user agent', () => {
    const environment = getBrowserEnvironment({
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Instagram 320.0.0.0.8',
    })

    expect(environment.isInstagramInAppBrowser).toBe(true)
    expect(environment.isLikelyInAppBrowser).toBe(true)
  })

  it('detects Facebook in-app browser by user agent markers', () => {
    const environment = getBrowserEnvironment({
      userAgent:
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Mobile Safari/537.36 [FBAN/EMA;FBLC/en_US;FBAV/451.0.0.0.77;]',
    })

    expect(environment.isFacebookInAppBrowser).toBe(true)
    expect(environment.isLikelyInAppBrowser).toBe(true)
  })

  it('detects likely in-app browser from Instagram redirect referrer', () => {
    const environment = getBrowserEnvironment({
      userAgent:
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
      referrer: 'https://l.instagram.com/?u=https%3A%2F%2Fexample.com',
    })

    expect(environment.isInstagramInAppBrowser).toBe(false)
    expect(environment.isLikelyInAppBrowser).toBe(true)
  })

  it('does not flag normal mobile Chrome as in-app browser', () => {
    const environment = getBrowserEnvironment({
      userAgent:
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
      referrer: 'https://google.com',
    })

    expect(environment.isLikelyInAppBrowser).toBe(false)
  })

  it('does not flag Telegram Mini App user agent as Instagram/Facebook in-app browser', () => {
    const environment = getBrowserEnvironment({
      userAgent:
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36 Telegram-Android/11.8.3 (Pixel 8; Android 14; SDK 34)',
      referrer: 'https://t.me',
    })

    expect(environment.isInstagramInAppBrowser).toBe(false)
    expect(environment.isFacebookInAppBrowser).toBe(false)
    expect(environment.isTelegramMiniApp).toBe(true)
    expect(environment.isLikelyInAppBrowser).toBe(false)
  })
})
