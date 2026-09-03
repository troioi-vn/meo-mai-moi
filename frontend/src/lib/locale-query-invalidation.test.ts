import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { QueryClient } from '@tanstack/react-query'
import i18n from '@/i18n'
import { setupLocaleQueryInvalidation } from './locale-query-invalidation'

const teardowns: (() => void)[] = []

afterEach(async () => {
  while (teardowns.length > 0) {
    teardowns.pop()?.()
  }
  await i18n.changeLanguage('en')
})

function setup() {
  const client = new QueryClient()
  const invalidateQueries = vi.spyOn(client, 'invalidateQueries').mockResolvedValue()
  teardowns.push(setupLocaleQueryInvalidation(client))
  return { invalidateQueries }
}

describe('setupLocaleQueryInvalidation', () => {
  it('invalidates cached server data when the UI language changes', async () => {
    const { invalidateQueries } = setup()

    await i18n.changeLanguage('ru')

    expect(invalidateQueries).toHaveBeenCalledTimes(1)
  })

  it('ignores a language change to the language already in use', async () => {
    const { invalidateQueries } = setup()

    await i18n.changeLanguage('en')

    expect(invalidateQueries).not.toHaveBeenCalled()
  })

  it('stops invalidating once torn down', async () => {
    const { invalidateQueries } = setup()

    teardowns.pop()?.()
    await i18n.changeLanguage('uk')

    expect(invalidateQueries).not.toHaveBeenCalled()
  })
})
