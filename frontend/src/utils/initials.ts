import GraphemeSplitter from 'grapheme-splitter'

const fallbackSplitter = new GraphemeSplitter()

const graphemeSegmenter: Intl.Segmenter | null =
  typeof Intl !== 'undefined' && typeof Intl.Segmenter !== 'undefined'
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null

function splitGraphemes(text: string): string[] {
  if (!text) return []

  if (graphemeSegmenter) {
    return Array.from(graphemeSegmenter.segment(text), (part) => part.segment)
  }

  return fallbackSplitter.splitGraphemes(text)
}

export function getInitials(name: string, maxGraphemes = 2): string {
  const trimmed = name.trim()
  if (!trimmed) return ''

  const parts = trimmed.split(/\s+/).filter(Boolean)

  const rawInitials = parts
    .map((part) => splitGraphemes(part)[0])
    .filter(Boolean)
    .join('')

  if (!rawInitials) return ''

  const upper = rawInitials.toLocaleUpperCase()
  return splitGraphemes(upper).slice(0, maxGraphemes).join('')
}
