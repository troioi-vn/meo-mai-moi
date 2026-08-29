import { describe, it, expect } from 'vite-plus/test'
import { resolveDetailLayout } from './utils'

describe('resolveDetailLayout', () => {
  it('gives owners their responses first', () => {
    expect(resolveDetailLayout('owner', false, 'open')).toBe('owner')
    // Owning wins even if they somehow also hold a response.
    expect(resolveDetailLayout('owner', true, 'open')).toBe('owner')
  })

  it('gives someone mid-handover their own status first', () => {
    expect(resolveDetailLayout('helper', true, 'open')).toBe('engaged')
    expect(resolveDetailLayout('public', true, 'open')).toBe('engaged')
  })

  it('gives everyone else the pet first', () => {
    // Covers both a logged-out visitor and a signed-in user who has not
    // responded. Both are strangers to this pet and want to meet it.
    expect(resolveDetailLayout('public', false, 'open')).toBe('discovery')
    expect(resolveDetailLayout('helper', false, 'open')).toBe('discovery')
  })

  it('drops discovery once the request is closed', () => {
    // A permanent handover moves the owner role to the adopter, so the person
    // who created the request arrives here as a stranger with no response. An
    // "adopt this pet now" hero for a pet they just handed over is wrong, and
    // it hides the status heading they came to check.
    expect(resolveDetailLayout('public', false, 'finalized')).toBe('engaged')
    expect(resolveDetailLayout('helper', false, 'cancelled')).toBe('engaged')
    expect(resolveDetailLayout('public', false, 'expired')).toBe('engaged')
  })
})
