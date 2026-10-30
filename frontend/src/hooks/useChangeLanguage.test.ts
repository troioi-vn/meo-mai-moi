import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { useChangeLanguage } from './useChangeLanguage'

const { changeLanguage, put } = vi.hoisted(() => ({
  changeLanguage: vi.fn().mockResolvedValue(undefined),
  put: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('react-i18next', () => ({ useTranslation: () => ({ i18n: { changeLanguage } }) }))
vi.mock('./use-auth', () => ({ useAuth: () => ({ user: { id: 1 } }) }))
vi.mock('@/api/axios', () => ({ api: { put } }))

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
  localStorage.clear()
})

describe('useChangeLanguage', () => {
  it.each(['/vi/requests/3', '/vi/settings'])(
    'navigates from %s to English with filters and fragment intact',
    async (pathname) => {
      const { result } = renderHook(() => useChangeLanguage())
      const assign = vi.fn()
      vi.stubGlobal('window', {
        location: { pathname, search: '?city=3', hash: '#details', assign },
      })
      await act(async () => result.current('en'))
      expect(assign).toHaveBeenCalledWith(pathname.slice(3) + '?city=3#details')
      expect(localStorage.getItem('i18nextLng')).toBe('en')
      expect(put).toHaveBeenCalledWith('/user/locale', { locale: 'en' })
      expect(changeLanguage).not.toHaveBeenCalled()
    }
  )

  it('adds a prefix when choosing a language on an unprefixed public page', async () => {
    const { result } = renderHook(() => useChangeLanguage())
    const assign = vi.fn()
    vi.stubGlobal('window', { location: { pathname: '/requests', search: '', hash: '', assign } })
    await act(async () => result.current('vi'))
    expect(assign).toHaveBeenCalledWith('/vi/requests')
  })

  it('keeps unprefixed private sessions at their existing URL', async () => {
    const { result } = renderHook(() => useChangeLanguage())
    const assign = vi.fn()
    vi.stubGlobal('window', { location: { pathname: '/settings', search: '', hash: '', assign } })
    await act(async () => result.current('ru'))
    expect(assign).not.toHaveBeenCalled()
    expect(changeLanguage).toHaveBeenCalledWith('ru')
    expect(localStorage.getItem('i18nextLng')).toBe('ru')
  })
})
