import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vite-plus/test'
import i18n, { supportedLocales } from './index'

const testDir = path.dirname(fileURLToPath(import.meta.url))

function backendSupportedLocales(): string[] {
  const source = fs.readFileSync(
    path.resolve(testDir, '../../../backend/config/locales.php'),
    'utf8'
  )
  const body = /'supported'\s*=>\s*\[(.*?)\]/s.exec(source)?.[1]
  const locales = body?.match(/'([^']+)'/g)?.map((quoted) => quoted.slice(1, -1)) ?? []

  expect(
    locales,
    'could not read the supported list from backend/config/locales.php'
  ).not.toHaveLength(0)

  return locales
}

describe('supported locales', () => {
  it('matches the backend supported list as a set', () => {
    const frontend = [...supportedLocales].sort()
    const backend = backendSupportedLocales().sort()

    expect(
      frontend,
      `supported locales drift: frontend [${frontend.join(', ')}] vs backend [${backend.join(', ')}]`
    ).toEqual(backend)
  })

  it('has a loaded resource bundle for every supported locale', () => {
    for (const locale of supportedLocales) {
      expect(
        i18n.hasResourceBundle(locale, 'common'),
        `no loaded 'common' bundle for supported locale '${locale}'`
      ).toBe(true)
    }
  })
})
