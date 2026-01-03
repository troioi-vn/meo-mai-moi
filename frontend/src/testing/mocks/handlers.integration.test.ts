import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { setupServer } from 'msw/node'
import { petHandlers, testScenarios } from './data/pets'

const server = setupServer(...petHandlers)

describe('MSW Pet Handlers Integration', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' })
  })

  afterEach(() => {
    server.resetHandlers()
  })

  afterAll(() => {
    server.close()
  })

  describe('Placement Requests API', () => {
    it('should return empty array for empty scenario', async () => {
      const response = await fetch(
        'http://localhost:3000/api/pets/placement-requests?scenario=empty'
      )
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.data).toHaveLength(0)
    })

    it('should return 1 pet for single scenario', async () => {
      const response = await fetch(
        'http://localhost:3000/api/pets/placement-requests?scenario=single'
      )
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.data).toHaveLength(1)
      expect(data.data[0].name).toBe('Fluffy')
      expect(data.data[0].placement_requests[0].request_type).toBe('foster_free')
    })

    it('should return 2 pets for two scenario', async () => {
      const response = await fetch('http://localhost:3000/api/pets/placement-requests?scenario=two')
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.data).toHaveLength(2)
      expect(data.data[0].name).toBe('Fluffy')
      expect(data.data[1].name).toBe('Whiskers')
    })

    it('should return 4 pets for four scenario', async () => {
      const response = await fetch(
        'http://localhost:3000/api/pets/placement-requests?scenario=four'
      )
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.data).toHaveLength(4)

      const names = data.data.map((pet: any) => pet.name)
      expect(names).toEqual(['Fluffy', 'Whiskers', 'Luna', 'Mittens'])
    })

    it('should return 6 pets for fivePlus scenario', async () => {
      const response = await fetch(
        'http://localhost:3000/api/pets/placement-requests?scenario=fivePlus'
      )
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.data).toHaveLength(5)

      const names = data.data.map((pet: any) => pet.name)
      expect(names).toEqual(['Fluffy', 'Whiskers', 'Luna', 'Mittens', 'Oreo'])
    })

    it('should return mixed request types for mixedTypes scenario', async () => {
      const response = await fetch(
        'http://localhost:3000/api/pets/placement-requests?scenario=mixedTypes'
      )
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.data).toHaveLength(4)

      const requestTypes = data.data.map((pet: any) => pet.placement_requests[0].request_type)
      expect(requestTypes).toContain('foster_free')
      expect(requestTypes).toContain('permanent')
    })

    it('should use default scenario when no scenario parameter is provided', async () => {
      const response = await fetch('http://localhost:3000/api/pets/placement-requests')
      const data = await response.json()

      expect(response.ok).toBe(true)
      // Default scenario is 'fivePlus' which has 5 pets
      expect(data.data).toHaveLength(5)
    })

    it('should handle invalid scenario gracefully', async () => {
      const response = await fetch(
        'http://localhost:3000/api/pets/placement-requests?scenario=invalid'
      )
      const data = await response.json()

      expect(response.ok).toBe(true)
      // Should fall back to default scenario
      expect(data.data).toHaveLength(5)
    })
  })

  describe('Individual Pet API', () => {
    it('should return specific pet by ID', async () => {
      const response = await fetch('http://localhost:3000/api/pets/1')
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.data.id).toBe(1)
      expect(data.data.name).toBe('Fluffy')
      expect(data.data.placement_requests).toHaveLength(1)
    })

    it('should return 404 for non-existent pet', async () => {
      const response = await fetch('http://localhost:3000/api/pets/999')

      expect(response.status).toBe(404)
    })
  })

  describe('Placement Request Data Validation', () => {
    it('should have proper placement request structure in all scenarios', async () => {
      for (const scenarioName of Object.keys(testScenarios)) {
        const response = await fetch(
          `http://localhost:3000/api/pets/placement-requests?scenario=${scenarioName}`
        )
        const data = await response.json()

        expect(response.ok).toBe(true)

        data.data.forEach((pet: any) => {
          expect(pet.placement_request_active).toBe(true)
          expect(pet.placement_requests).toBeDefined()
          expect(pet.placement_requests.length).toBeGreaterThan(0)

          pet.placement_requests.forEach((request: any) => {
            expect(request.pet_id).toBe(pet.id)
            expect([
              'open',
              'fulfilled',
              'pending_transfer',
              'active',
              'finalized',
              'expired',
              'cancelled',
            ]).toContain(request.status)
            expect(request.request_type).toMatch(/^(foster_paid|foster_free|permanent|pet_sitting)$/)
          })
        })
      }
    })
  })
})
