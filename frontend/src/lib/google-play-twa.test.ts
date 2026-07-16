import { beforeEach, describe, expect, it } from 'vite-plus/test'
import {
  googlePlayTwaLaunchContext,
  initializeGooglePlayTwaContext,
  isGooglePlayTwa,
} from './google-play-twa'

describe('Google Play TWA context', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
    window.history.replaceState({}, '', '/')
  })

  it('does not infer Play distribution from a normal page load', () => {
    expect(isGooglePlayTwa()).toBe(false)
  })

  it('captures the wrapper marker and removes it from the visible URL', () => {
    window.history.replaceState(
      {},
      '',
      `/build/index.html?${googlePlayTwaLaunchContext.queryParam}=${googlePlayTwaLaunchContext.queryValue}&invite=cat#details`
    )

    initializeGooglePlayTwaContext()

    expect(isGooglePlayTwa()).toBe(true)
    expect(window.location.pathname).toBe('/build/index.html')
    expect(window.location.search).toBe('?invite=cat')
    expect(window.location.hash).toBe('#details')
  })

  it('keeps the context across navigation in the same browser session', () => {
    window.history.replaceState(
      {},
      '',
      `/?${googlePlayTwaLaunchContext.queryParam}=${googlePlayTwaLaunchContext.queryValue}`
    )
    initializeGooglePlayTwaContext()

    window.history.pushState({}, '', '/pets')

    expect(isGooglePlayTwa()).toBe(true)
  })
})
