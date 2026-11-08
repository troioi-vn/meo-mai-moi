import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import i18n from '@/i18n'
import type { Pet } from '@/types/pet'
import { posterFacts } from './poster-content'

const pet = { id: 1, name: 'Minnie', pet_type: { name: 'Cat' }, sex: 'female' } as Pet

afterEach(() => {
  vi.useRealTimers()
})

describe('poster facts', () => {
  it('reuses sex and age wording in all four languages and respects birthday precision', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 15))
    for (const locale of ['en', 'ru', 'uk', 'vi']) {
      const t = i18n.getFixedT(locale)
      const facts = posterFacts(
        { ...pet, birthday_precision: 'year', birthday_year: 2023 },
        null,
        t
      )
      expect(facts).toContain(t('pets:sexLabels.female'))
      expect(facts).toContain(
        t('pets:age.approxSymbol', { text: t('pets:age.year', { count: 3 }) })
      )
      const month = posterFacts(
        { ...pet, birthday_precision: 'month', birthday_year: 2026, birthday_month: 4 },
        null,
        t
      )
      expect(month).toContain(t('pets:age.approx', { text: t('pets:age.month', { count: 2 }) }))
      const day = posterFacts(
        { ...pet, birthday_precision: 'day', birthday: '2026-06-10' },
        null,
        t
      )
      expect(day).toContain(t('pets:age.day', { count: 5 }))
    }
  })
  it('omits absent facts and uses existing contextual vaccination wording verbatim', () => {
    const t = i18n.getFixedT('en')
    expect(posterFacts({ id: 1, name: 'Minnie' } as Pet, null, t)).toBe('')
    expect(
      posterFacts({ ...pet, birthday_precision: 'unknown', sex: 'not_specified' }, undefined, t)
    ).toBe('Cat')
    for (const status of ['unknown', 'overdue', 'due_soon', 'up_to_date'] as const) {
      expect(posterFacts(pet, { vaccination_status: status }, t)).toBe(
        `Cat · ${t('pets:sexLabels.female')} · ${t(`pets:profile.status.${status}`)}`
      )
    }
  })
})
