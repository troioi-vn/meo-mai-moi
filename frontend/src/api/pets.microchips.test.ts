import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { setupServer } from 'msw/node'
import { handlers } from '@/mocks/handlers'
import { createMicrochip, deleteMicrochip, getMicrochips, updateMicrochip } from './pets'

const server = setupServer(...handlers)

describe('microchips api client', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  it('lists pet microchips with pagination envelope', async () => {
    const res = await getMicrochips(1)
    expect(res).toHaveProperty('data')
    expect(Array.isArray(res.data)).toBe(true)
    expect(res).toHaveProperty('links')
    expect(res).toHaveProperty('meta')
  })

  it('creates a new microchip', async () => {
    const chip = await createMicrochip(1, { chip_number: '982000123456789' })
    expect(chip.chip_number).toBe('982000123456789')
  })

  it('updates a microchip', async () => {
    const chip = await updateMicrochip(1, 123, { issuer: 'HomeAgain' })
    expect(chip.id).toBe(123)
    expect(chip.issuer).toBe('HomeAgain')
  })

  it('deletes a microchip', async () => {
    const ok = await deleteMicrochip(1, 123)
    expect(ok).toBe(true)
  })
})
