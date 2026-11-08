import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { useLocaleSync } from './useLocaleSync'

const changeLanguage = vi.hoisted(() => vi.fn())
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ i18n: { language: 'vi', changeLanguage } }),
}))
vi.mock('./use-auth', () => ({ useAuth: () => ({ user: { locale: 'ru' } }) }))

afterEach(() => {
  window.history.replaceState({}, '', '/')
  vi.clearAllMocks()
})

describe('useLocaleSync', () => {
  it('lets a shared URL outrank the account preference', () => {
    window.history.replaceState({}, '', '/vi/requests')
    renderHook(() => {
      useLocaleSync()
    })
    expect(changeLanguage).not.toHaveBeenCalled()
  })
  it('applies the account preference on unprefixed URLs', () => {
    window.history.replaceState({}, '', '/requests')
    renderHook(() => {
      useLocaleSync()
    })
    expect(changeLanguage).toHaveBeenCalledWith('ru')
  })
})
