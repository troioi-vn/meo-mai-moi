import { describe, expect, it } from 'vite-plus/test'
import { formatDate } from './format-date'

describe('profile date display', () => {
  it('formats a date-only value in the selected language', () => {
    const date = new Date()
    const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    for (const locale of ['en', 'ru', 'uk', 'vi']) {
      expect(formatDate(iso, locale)).toBe(
        new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric' }).format(
          date
        )
      )
    }
  })

  it('keeps date-only values at local midnight instead of shifting them from UTC', () => {
    const year = new Date().getFullYear()
    const date = `${year}-01-01`
    expect(formatDate(date, 'en')).toBe(`January 1, ${year}`)
  })

  it('handles absent and invalid dates without crashing the profile', () => {
    expect(formatDate(null, 'en')).toBe('—')
    expect(formatDate('invalid', 'en')).toBe('—')
  })
})
