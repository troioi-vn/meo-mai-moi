import { describe, it, expect } from 'vite-plus/test'
import { getInitials } from './initials'

describe('getInitials', () => {
  it('returns up to two initials for regular names', () => {
    expect(getInitials('Tom User')).toBe('TU')
    expect(getInitials('tom user')).toBe('TU')
  })

  it('handles extra whitespace', () => {
    expect(getInitials('   Tom    User  ')).toBe('TU')
  })

  it('treats a single emoji as a single initial', () => {
    expect(getInitials('👩‍💻')).toBe('👩‍💻')
  })

  it('treats multi-codepoint emojis as a single initial', () => {
    expect(getInitials('🇺🇸 United')).toBe('🇺🇸U')
    expect(getInitials('👨‍👩‍👧‍👦 Family')).toBe('👨‍👩‍👧‍👦F')
  })

  it('works when name starts with emoji', () => {
    expect(getInitials('🐱 Cat')).toBe('🐱C')
  })
})
