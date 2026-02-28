const SCROLL_RESTORE_PATHS = new Set(['/', '/requests'])
const KEY_PREFIX = 'scroll-restore:'

const getKey = (pathname: string) => `${KEY_PREFIX}${pathname}`

export const saveListScrollPosition = (pathname: string) => {
  if (!SCROLL_RESTORE_PATHS.has(pathname)) return
  try {
    sessionStorage.setItem(getKey(pathname), String(window.scrollY))
  } catch {
    // ignore storage errors
  }
}

export const consumeListScrollPosition = (pathname: string): number | null => {
  if (!SCROLL_RESTORE_PATHS.has(pathname)) return null
  try {
    const raw = sessionStorage.getItem(getKey(pathname))
    if (raw === null) return null
    sessionStorage.removeItem(getKey(pathname))
    const parsed = Number(raw)
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
  } catch {
    return null
  }
}
