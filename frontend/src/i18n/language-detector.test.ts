import { createInstance } from 'i18next'
import { afterEach, describe, expect, it } from 'vite-plus/test'
import { createLanguageDetector, languageDetectionOptions } from './language-detector'
import { supportedLocales } from '@/lib/locale-url'

afterEach(() => {
  window.history.replaceState({}, '', '/')
  localStorage.clear()
})
async function detect() {
  const instance = createInstance()
  await instance.use(createLanguageDetector()).init({
    supportedLngs: supportedLocales,
    fallbackLng: 'en',
    resources: {},
    detection: languageDetectionOptions,
  })
  return instance.language
}
describe('language detection', () => {
  it('honours shared links without overwriting a saved preference', async () => {
    localStorage.setItem('i18nextLng', 'ru')
    window.history.replaceState({}, '', '/vi/requests/3')
    expect(await detect()).toBe('vi')
    expect(localStorage.getItem('i18nextLng')).toBe('ru')
    window.history.replaceState({}, '', '/requests/3')
    expect(await detect()).toBe('ru')
  })
  it('does not create a saved preference from a shared link', async () => {
    window.history.replaceState({}, '', '/uk/helpers')
    expect(await detect()).toBe('uk')
    expect(localStorage.getItem('i18nextLng')).toBeNull()
  })
})
