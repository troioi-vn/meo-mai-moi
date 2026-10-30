import { describe, it, expect } from 'vite-plus/test'
import { cityName } from './city-name'

// Records as they arrive from the API, carrying more than cityName reads. Held
// in variables rather than written inline, so they assign structurally the way
// a real API object does instead of tripping an excess-property check.
const fullRecord = { id: 7, name: 'Nha Trang', slug: 'nha-trang' }
const nullNameRecord = { id: 7, name: null }

describe('cityName', () => {
  it('returns a plain string city unchanged', () => {
    expect(cityName('Nha Trang')).toBe('Nha Trang')
  })

  it('reads the name off a city record', () => {
    expect(cityName(fullRecord)).toBe('Nha Trang')
  })

  it('returns null when there is no city', () => {
    expect(cityName(null)).toBeNull()
    expect(cityName(undefined)).toBeNull()
  })

  it('returns null for a record whose name is null', () => {
    // A record with no `name` key at all is not representable: TypeScript's
    // weak-type check rejects it, so only an explicit null needs handling.
    expect(cityName(nullNameRecord)).toBeNull()
  })

  it('leaves an empty string alone rather than folding it to null', () => {
    // Callers filter falsy values themselves. Folding here would change what
    // the call sites render, and this swap is meant to change nothing.
    expect(cityName('')).toBe('')
  })
})
