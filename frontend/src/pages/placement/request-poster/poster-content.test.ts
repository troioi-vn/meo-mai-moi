import { describe, it, expect } from 'vite-plus/test'
import { petLocation, posterNotes, requestUrl, posterHeadline } from './poster-content'
import type { TFunction } from 'i18next'

// Returns the key plus its interpolation so a test can assert which key the
// code chose without pulling in i18next.
const t = ((key: string, options?: { name?: string }) =>
  `${key}|${options?.name ?? ''}`) as unknown as TFunction

describe('poster-content', () => {
  describe('requestUrl', () => {
    it('points at the listing rather than the poster', () => {
      // Someone scanning a sheet on a lamppost wants the page they can act on.
      expect(requestUrl(27)).toBe(`${window.location.origin}/requests/27`)
    })
  })

  describe('posterHeadline', () => {
    it('asks for a home for a permanent request', () => {
      const headline = posterHeadline(
        { request_type: 'permanent', pet: { id: 1, name: 'Minnie' } },
        t
      )

      expect(headline).toBe('placement:poster.headline.permanent|Minnie')
    })

    it('asks for a sitter for pet sitting', () => {
      const headline = posterHeadline(
        { request_type: 'pet_sitting', pet: { id: 1, name: 'Minnie' } },
        t
      )

      expect(headline).toBe('placement:poster.headline.pet_sitting|Minnie')
    })

    it.each(['foster_free', 'foster_paid'])('asks for a foster home for %s', (requestType) => {
      const headline = posterHeadline({ request_type: requestType, pet: { id: 1, name: 'Len' } }, t)

      expect(headline).toBe('placement:poster.headline.foster|Len')
    })
  })

  describe('petLocation', () => {
    it('joins a string city with its country', () => {
      expect(petLocation({ city: 'Nha Trang', country: 'VN' })).toBe('Nha Trang, VN')
    })

    it('reads a city that arrived as the related record', () => {
      expect(petLocation({ city: { id: 137, name: 'Nha Trang' }, country: 'VN' })).toBe(
        'Nha Trang, VN'
      )
    })

    it('keeps whichever half exists', () => {
      expect(petLocation({ city: null, country: 'VN' })).toBe('VN')
      expect(petLocation({ city: 'Hanoi', country: null })).toBe('Hanoi')
    })

    it('returns null when there is no location at all', () => {
      expect(petLocation({ city: null, country: null })).toBeNull()
      expect(petLocation({ city: '  ', country: '' })).toBeNull()
    })
  })

  describe('posterNotes', () => {
    it('flattens newlines, which would otherwise break the layout', () => {
      expect(posterNotes({ notes: 'Sweet cat.\n\nGets on with males.' })).toBe(
        'Sweet cat. Gets on with males.'
      )
    })

    it('clips notes that would not fit beside a photo and a QR', () => {
      const notes = posterNotes({ notes: 'a'.repeat(400) })

      expect(notes).not.toBeNull()
      expect(notes?.length).toBe(320)
      expect(notes?.endsWith('…')).toBe(true)
    })

    it('prefers a finished translation over the original', () => {
      const notes = posterNotes({
        notes: 'Sweet cat.',
        notes_translation: { is_translated: true, translated: 'Mèo ngoan.' },
      })

      expect(notes).toBe('Mèo ngoan.')
    })

    it('keeps the original while a translation is still pending', () => {
      const notes = posterNotes({
        notes: 'Sweet cat.',
        notes_translation: { is_translated: false, translated: null },
      })

      expect(notes).toBe('Sweet cat.')
    })

    it('returns null for empty or absent notes', () => {
      expect(posterNotes({ notes: null })).toBeNull()
      expect(posterNotes({ notes: '   ' })).toBeNull()
    })
  })
})
