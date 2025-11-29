import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { setupServer } from 'msw/node'
import { handlers } from '@/testing/mocks/handlers'
import { createMedicalNote, deleteMedicalNote, getMedicalNotes, updateMedicalNote } from './pets'

const server = setupServer(...handlers)

describe('medical notes api client', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' })
  })
  afterEach(() => {
    server.resetHandlers()
  })
  afterAll(() => {
    server.close()
  })

  it('lists medical notes with pagination envelope', async () => {
    const res = await getMedicalNotes(1)
    expect(res).toHaveProperty('data')
    expect(Array.isArray(res.data)).toBe(true)
    expect(res).toHaveProperty('links')
    expect(res).toHaveProperty('meta')
  })

  it('creates a new medical note', async () => {
    const note = await createMedicalNote(1, { note: 'Rabies shot', record_date: '2024-06-01' })
    expect(note.note).toBe('Rabies shot')
    expect(note.record_date).toBe('2024-06-01')
  })

  it('updates a medical note', async () => {
    const note = await updateMedicalNote(1, 123, { note: 'Booster' })
    expect(note.id).toBe(123)
    expect(note.note).toBe('Booster')
  })

  it('deletes a medical note', async () => {
    const ok = await deleteMedicalNote(1, 123)
    expect(ok).toBe(true)
  })
})
