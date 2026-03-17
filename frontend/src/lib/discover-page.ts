export type DiscoverPage = 'requests' | 'helpers'

export const DISCOVER_PAGE_STORAGE_KEY = 'discover-page-preference'

export const getStoredDiscoverPage = (): DiscoverPage => {
  if (typeof window === 'undefined') {
    return 'requests'
  }

  return window.localStorage.getItem(DISCOVER_PAGE_STORAGE_KEY) === 'helpers'
    ? 'helpers'
    : 'requests'
}

export const setStoredDiscoverPage = (page: DiscoverPage) => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(DISCOVER_PAGE_STORAGE_KEY, page)
}

export const getDiscoverPagePath = (page: DiscoverPage) =>
  page === 'helpers' ? '/helpers' : '/requests'
