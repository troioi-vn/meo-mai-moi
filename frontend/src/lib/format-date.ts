import { parseISO } from 'date-fns'
import { enUS, ru, uk, vi } from 'date-fns/locale'

export function getDateLocale(language: string) {
  switch (language.split('-')[0]) {
    case 'ru':
      return ru
    case 'uk':
      return uk
    case 'vi':
      return vi
    default:
      return enUS
  }
}

/** Date-only values stay on their calendar day, including west of UTC. */
export function formatDate(value: string | Date | null | undefined, locale: string): string {
  if (!value) return '—'
  const date = typeof value === 'string' ? parseISO(value) : value
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}
