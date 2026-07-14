const GOOGLE_PLAY_TWA_QUERY_PARAM = 'app_context'
const GOOGLE_PLAY_TWA_QUERY_VALUE = 'google_play_twa'
const GOOGLE_PLAY_TWA_SESSION_KEY = 'meo-mai-moi:google-play-twa'

function getSessionStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

/**
 * Captures the explicit context supplied by the Google Play wrapper.
 *
 * Session storage is deliberate: Chrome-backed TWAs share cookies and local
 * storage with normal browser tabs, while session storage remains scoped to the
 * current tab. A persistent local marker would incorrectly hide support links
 * when the same user later opens the normal website.
 */
export function initializeGooglePlayTwaContext(): void {
  if (typeof window === 'undefined') {
    return
  }

  const params = new URLSearchParams(window.location.search)
  if (params.get(GOOGLE_PLAY_TWA_QUERY_PARAM) !== GOOGLE_PLAY_TWA_QUERY_VALUE) {
    return
  }

  const sessionStorage = getSessionStorage()
  if (!sessionStorage) {
    return
  }

  try {
    sessionStorage.setItem(GOOGLE_PLAY_TWA_SESSION_KEY, 'true')
  } catch {
    // Keep the query marker in place so detection remains fail-closed below.
    return
  }

  params.delete(GOOGLE_PLAY_TWA_QUERY_PARAM)
  const query = params.toString()
  const cleanUrl = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
  window.history.replaceState(window.history.state, '', cleanUrl)
}

export function isGooglePlayTwa(): boolean {
  if (
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get(GOOGLE_PLAY_TWA_QUERY_PARAM) ===
      GOOGLE_PLAY_TWA_QUERY_VALUE
  ) {
    return true
  }

  try {
    return getSessionStorage()?.getItem(GOOGLE_PLAY_TWA_SESSION_KEY) === 'true'
  } catch {
    return false
  }
}

export const googlePlayTwaLaunchContext = {
  queryParam: GOOGLE_PLAY_TWA_QUERY_PARAM,
  queryValue: GOOGLE_PLAY_TWA_QUERY_VALUE,
} as const
