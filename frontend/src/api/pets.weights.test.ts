import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { setupServer } from 'msw/node'
import { handlers } from '@/mocks/handlers'
import { createWeight, deleteWeight, getPetWeights, updateWeight } from './pets'

const server = setupServer(...handlers)

describe('weights api client', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  it('lists pet weights with pagination envelope', async () => {
    const res = await getPetWeights(1)
    expect(res).toHaveProperty('data')
    expect(Array.isArray(res.data)).toBe(true)
    expect(res).toHaveProperty('links')
    expect(res).toHaveProperty('meta')
  })

  it('creates a new weight', async () => {
    const weight = await createWeight(1, { weight_kg: 4.2, record_date: '2024-06-01' })
    expect(weight.weight_kg).toBe(4.2)
    expect(weight.record_date).toBe('2024-06-01')
  })

  it('updates a weight', async () => {
    const weight = await updateWeight(1, 123, { weight_kg: 4.5 })
    expect(weight.id).toBe(123)
    expect(weight.weight_kg).toBe(4.5)
  })

  it('deletes a weight', async () => {
    const ok = await deleteWeight(1, 123)
    expect(ok).toBe(true)
  })
})
