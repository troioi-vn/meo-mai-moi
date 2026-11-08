import { describe, expect, it, vi } from 'vite-plus/test'
import { formatBirthDate } from './pet'

describe('formatBirthDate', () => {
  it('keeps the calendar day west of UTC', () => {
    vi.stubEnv('TZ', 'America/New_York')
    try {
      expect(
        formatBirthDate(
          { birthday: '2020-01-15T00:00:00.000000Z', birthday_precision: 'day' },
          'en'
        )
      ).toBe('Jan 15, 2020')
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('uses the given locale rather than the browser one', () => {
    expect(formatBirthDate({ birthday: '2020-01-15', birthday_precision: 'day' }, 'ru')).toBe(
      new Date(2020, 0, 15).toLocaleDateString('ru', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    )
  })

  it('shows only the year for year precision', () => {
    expect(formatBirthDate({ birthday_precision: 'year', birthday_year: 2020 }, 'en')).toBe('2020')
  })
})
