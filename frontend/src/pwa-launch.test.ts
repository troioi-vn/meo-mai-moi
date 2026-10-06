import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

const shells = [
  resolve('index.html'),
  resolve('../backend/resources/views/welcome.blade.php.template'),
]

describe.each(shells)('theme before React boots in %s', (file) => {
  const html = readFileSync(file, 'utf8')
  const script = /<script>\s*([\s\S]*?)<\/script>/.exec(html)?.[1] ?? ''

  const boot = () =>
    runInNewContext(script, { document, localStorage, matchMedia, location, history, window })

  beforeEach(() => {
    document.documentElement.className = ''
    document.head.innerHTML = '<meta name="theme-color"><meta name="color-scheme">'
    localStorage.clear()
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true, addEventListener: vi.fn() }))
    )
  })

  it('paints the saved dark theme before loading the application', () => {
    localStorage.setItem('vite-ui-theme', 'dark')
    boot()
    expect(document.documentElement).toHaveClass('dark')
    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute('content', '#171717')
    expect(html).toContain('html.dark')
  })

  it('honors explicit light mode on a dark device', () => {
    localStorage.setItem('vite-ui-theme', 'light')
    boot()
    expect(document.documentElement).toHaveClass('light')
    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute('content', '#ffffff')
  })

  it('still resolves the theme when optional metadata is absent', () => {
    document.head.innerHTML = ''
    expect(() => boot()).not.toThrow()
    expect(document.documentElement).toHaveClass('dark')
  })

  it('uses the device theme when storage is denied', () => {
    const getter = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Access denied', 'SecurityError')
    })
    try {
      expect(() => boot()).not.toThrow()
      expect(document.documentElement).toHaveClass('dark')
    } finally {
      getter.mockRestore()
    }
  })
})

it('keeps all installed manifest paths on the icon background color', () => {
  for (const directory of ['../public', '../../backend/public']) {
    for (const name of ['site', 'site-light', 'site-dark']) {
      const manifest = JSON.parse(
        readFileSync(resolve('src', directory, `${name}.webmanifest`), 'utf8')
      )
      expect(manifest.background_color).toBe('#171717')
      expect(manifest.theme_color).toBe('#171717')
      expect(manifest.id).toBe('/')
      expect(manifest.start_url).toBe('/build/index.html')
    }
  }
})

it('uses the same native splash and theme colors in the Android wrapper', () => {
  const wrapper = JSON.parse(readFileSync(resolve('../android/twa-manifest.json'), 'utf8'))
  const embedded = JSON.parse(
    readFileSync(resolve('../android/app/src/main/res/raw/web_app_manifest.json'), 'utf8')
  )
  const gradle = readFileSync(resolve('../android/app/build.gradle'), 'utf8')
  expect(wrapper.backgroundColor).toBe('#171717')
  expect(wrapper.themeColor).toBe(wrapper.backgroundColor)
  expect(wrapper.themeColorDark).toBe(wrapper.backgroundColor)
  expect(embedded.background_color).toBe(wrapper.backgroundColor)
  expect(embedded.theme_color).toBe(wrapper.themeColor)
  for (const key of ['backgroundColor', 'themeColor', 'themeColorDark']) {
    expect(gradle).toContain(`${key}: '${wrapper[key]}'`)
  }
})
