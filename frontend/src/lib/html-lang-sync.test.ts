import { afterEach, describe, expect, it } from 'vite-plus/test'
import i18n from '@/i18n'
import { setupHtmlLangSync } from './html-lang-sync'

const teardowns: (() => void)[] = []

afterEach(async () => {
  while (teardowns.length > 0) {
    teardowns.pop()?.()
  }
  await i18n.changeLanguage('en')
})

describe('setupHtmlLangSync', () => {
  it('sets <html lang> on setup and follows language changes', async () => {
    teardowns.push(setupHtmlLangSync())

    expect(document.documentElement.lang).toBe('en')

    await i18n.changeLanguage('uk')

    expect(document.documentElement.lang).toBe('uk')
  })

  it('stops syncing once torn down', async () => {
    const teardown = setupHtmlLangSync()
    teardown()

    await i18n.changeLanguage('ru')

    expect(document.documentElement.lang).toBe('en')
  })
})
