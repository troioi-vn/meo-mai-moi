import { describe, it, expect } from 'vite-plus/test'
import { resolveDetailLayout } from './utils'

describe('resolveDetailLayout', () => {
  it('gives owners their responses first', () => {
    expect(resolveDetailLayout('owner', false)).toBe('owner')
    // Owning wins even if they somehow also hold a response.
    expect(resolveDetailLayout('owner', true)).toBe('owner')
  })

  it('gives someone mid-handover their own status first', () => {
    expect(resolveDetailLayout('helper', true)).toBe('engaged')
    expect(resolveDetailLayout('public', true)).toBe('engaged')
  })

  it('gives everyone else the pet first', () => {
    // Covers both a logged-out visitor and a signed-in user who has not
    // responded. Both are strangers to this pet and want to meet it.
    expect(resolveDetailLayout('public', false)).toBe('discovery')
    expect(resolveDetailLayout('helper', false)).toBe('discovery')
  })
})
