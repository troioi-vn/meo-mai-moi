export type Theme = 'dark' | 'light' | 'system'
export type ResolvedTheme = Exclude<Theme, 'system'>

export interface ThemeSnapshot {
  theme: Theme
  resolvedTheme: ResolvedTheme
}

interface ThemeRuntimeOptions {
  defaultTheme?: Theme
  storageKey?: string
}

const MEDIA_QUERY = '(prefers-color-scheme: dark)'
const DEFAULT_THEME: Theme = 'system'
const DEFAULT_STORAGE_KEY = 'vite-ui-theme'
const THEME_COLORS: Record<ResolvedTheme, string> = {
  dark: '#020817',
  light: '#ffffff',
}
const MANIFESTS: Record<ResolvedTheme, string> = {
  dark: '/site-dark.webmanifest',
  light: '/site-light.webmanifest',
}

let runtimeOptions: Required<ThemeRuntimeOptions> = {
  defaultTheme: DEFAULT_THEME,
  storageKey: DEFAULT_STORAGE_KEY,
}

let currentSnapshot: ThemeSnapshot = {
  theme: DEFAULT_THEME,
  resolvedTheme: 'light',
}

const listeners = new Set<(snapshot: ThemeSnapshot) => void>()

let isInitialized = false
let mediaQueryList: MediaQueryList | null = null
let removeMediaListener: (() => void) | null = null
let removeStorageListener: (() => void) | null = null

function isTheme(value: string | null): value is Theme {
  return value === 'light' || value === 'dark' || value === 'system'
}

function canUseDom() {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

function readSavedTheme({
  defaultTheme = runtimeOptions.defaultTheme,
  storageKey = runtimeOptions.storageKey,
}: ThemeRuntimeOptions = {}): Theme {
  if (!canUseDom()) {
    return defaultTheme
  }

  const storedTheme = window.localStorage.getItem(storageKey)
  return isTheme(storedTheme) ? storedTheme : defaultTheme
}

export function resolveTheme(theme: Theme): ResolvedTheme {
  if (!canUseDom()) {
    return theme === 'dark' ? 'dark' : 'light'
  }

  if (theme === 'system') {
    return window.matchMedia(MEDIA_QUERY).matches ? 'dark' : 'light'
  }

  return theme
}

export function getThemeSnapshot(options: ThemeRuntimeOptions = {}): ThemeSnapshot {
  const theme = readSavedTheme(options)

  return {
    theme,
    resolvedTheme: resolveTheme(theme),
  }
}

function notifyListeners() {
  listeners.forEach((listener) => {
    listener(currentSnapshot)
  })
}

function applyThemeSideEffects(snapshot: ThemeSnapshot) {
  if (!canUseDom()) {
    return
  }

  const { resolvedTheme, theme } = snapshot
  const root = document.documentElement

  root.classList.remove('light', 'dark')
  root.classList.add(resolvedTheme)
  root.dataset.theme = resolvedTheme
  root.dataset.themePreference = theme
  root.style.colorScheme = resolvedTheme

  if (document.body) {
    document.body.dataset.theme = resolvedTheme
    document.body.style.colorScheme = resolvedTheme
  }

  const themeColorMeta = document.querySelector('meta[name="theme-color"]')
  if (themeColorMeta) {
    themeColorMeta.setAttribute('content', THEME_COLORS[resolvedTheme])
  }

  const colorSchemeMeta = document.querySelector('meta[name="color-scheme"]')
  if (colorSchemeMeta) {
    colorSchemeMeta.setAttribute('content', resolvedTheme)
  }

  const manifestEl = document.getElementById('app-manifest')
  if (manifestEl instanceof HTMLLinkElement) {
    manifestEl.href = MANIFESTS[resolvedTheme]
  }
}

function syncSnapshot(nextSnapshot: ThemeSnapshot) {
  currentSnapshot = nextSnapshot
  applyThemeSideEffects(currentSnapshot)
  notifyListeners()
}

function refreshThemeSnapshot() {
  syncSnapshot(getThemeSnapshot(runtimeOptions))
}

export function initializeThemeRuntime(options: ThemeRuntimeOptions = {}) {
  runtimeOptions = {
    defaultTheme: options.defaultTheme ?? runtimeOptions.defaultTheme,
    storageKey: options.storageKey ?? runtimeOptions.storageKey,
  }

  if (!canUseDom()) {
    currentSnapshot = getThemeSnapshot(runtimeOptions)
    return currentSnapshot
  }

  syncSnapshot(getThemeSnapshot(runtimeOptions))

  if (isInitialized) {
    return currentSnapshot
  }

  mediaQueryList = window.matchMedia(MEDIA_QUERY)
  const handleSystemThemeChange = () => {
    if (currentSnapshot.theme === 'system') {
      refreshThemeSnapshot()
    }
  }
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== runtimeOptions.storageKey) {
      return
    }

    refreshThemeSnapshot()
  }

  if (typeof mediaQueryList.addEventListener === 'function') {
    mediaQueryList.addEventListener('change', handleSystemThemeChange)
    removeMediaListener = () => {
      mediaQueryList?.removeEventListener('change', handleSystemThemeChange)
    }
  } else {
    mediaQueryList.addListener(handleSystemThemeChange)
    removeMediaListener = () => {
      mediaQueryList?.removeListener(handleSystemThemeChange)
    }
  }

  window.addEventListener('storage', handleStorage)
  removeStorageListener = () => {
    window.removeEventListener('storage', handleStorage)
  }

  isInitialized = true

  return currentSnapshot
}

export function subscribeToTheme(listener: (snapshot: ThemeSnapshot) => void) {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

export function setTheme(theme: Theme) {
  if (canUseDom()) {
    window.localStorage.setItem(runtimeOptions.storageKey, theme)
  }

  syncSnapshot({
    theme,
    resolvedTheme: resolveTheme(theme),
  })
}

export function resetThemeRuntimeForTests() {
  removeMediaListener?.()
  removeStorageListener?.()
  removeMediaListener = null
  removeStorageListener = null
  mediaQueryList = null
  listeners.clear()
  isInitialized = false
  runtimeOptions = {
    defaultTheme: DEFAULT_THEME,
    storageKey: DEFAULT_STORAGE_KEY,
  }
  currentSnapshot = {
    theme: DEFAULT_THEME,
    resolvedTheme: 'light',
  }
}
