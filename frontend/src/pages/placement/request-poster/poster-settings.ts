import { supportedLocales, type SupportedLocale } from '@/lib/locale-url'

export interface PosterSettings {
  photo: number | null
  focus: [number, number]
  lang: SupportedLocale
  paper: 'a4' | 'letter'
  tabs: boolean
}

export function positiveId(value: string | null | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null
  const id = Number(value)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

export function posterSettings(params: URLSearchParams, language: string): PosterSettings {
  const candidate = params.get('lang') ?? language.split('-')[0]
  const lang = supportedLocales.find((locale) => locale === candidate) ?? 'en'
  const parts = params.get('focus')?.split(',').map(Number)
  const focus: [number, number] =
    parts?.length === 2 && parts.every(Number.isFinite)
      ? [clamp(parts[0] ?? 50), clamp(parts[1] ?? 50)]
      : [50, 50]
  return {
    photo: positiveId(params.get('photo')),
    focus,
    lang,
    paper: params.get('paper') === 'letter' ? 'letter' : 'a4',
    tabs: params.get('tabs') === '1',
  }
}

const clamp = (value: number) => Math.round(Math.min(100, Math.max(0, value)) * 100) / 100

export function writePosterSettings(
  params: URLSearchParams,
  settings: PosterSettings
): URLSearchParams {
  const next = new URLSearchParams(params)
  next.set('lang', settings.lang)
  next.set('paper', settings.paper)
  next.set('tabs', settings.tabs ? '1' : '0')
  next.set('focus', settings.focus.map(clamp).join(','))
  if (settings.photo === null) next.delete('photo')
  else next.set('photo', String(settings.photo))
  return next
}

/** object-position is a percentage of the overflow, not of the frame. */
export function dragFocus(
  start: [number, number],
  delta: [number, number],
  frame: [number, number],
  image: [number, number]
): [number, number] {
  const scale = Math.max(frame[0] / image[0], frame[1] / image[1])
  const overflow: [number, number] = [image[0] * scale - frame[0], image[1] * scale - frame[1]]
  return [
    clamp(start[0] - (overflow[0] > 0.5 ? (delta[0] / overflow[0]) * 100 : 0)),
    clamp(start[1] - (overflow[1] > 0.5 ? (delta[1] / overflow[1]) * 100 : 0)),
  ]
}
