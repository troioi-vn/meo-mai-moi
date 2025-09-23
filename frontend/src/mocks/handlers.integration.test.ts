import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { setupServer } from 'msw/node'
import { catHandlers, testScenarios } from './data/cats'

const server = setupServer(...catHandlers)

describe('MSW Cat Handlers Integration', () => {
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
        'http://localhost:3000/api/cats/placement-requests?scenario=empty'
      )
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.data).toHaveLength(0)
    })

    it('should return 1 cat for single scenario', async () => {
      const response = await fetch(
        'http://localhost:3000/api/cats/placement-requests?scenario=single'
      )
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.data).toHaveLength(1)
      expect(data.data[0].name).toBe('Fluffy')
      expect(data.data[0].placement_requests[0].request_type).toBe('fostering')
    })

    it('should return 2 cats for two scenario', async () => {
      const response = await fetch('http://localhost:3000/api/cats/placement-requests?scenario=two')
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.data).toHaveLength(2)
      expect(data.data[0].name).toBe('Fluffy')
      expect(data.data[1].name).toBe('Whiskers')
    })

    it('should return 4 cats for four scenario', async () => {
      const response = await fetch(
        'http://localhost:3000/api/cats/placement-requests?scenario=four'
      )
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.data).toHaveLength(4)

      const names = data.data.map((cat: any) => cat.name)
      expect(names).toEqual(['Fluffy', 'Whiskers', 'Shadow', 'Luna'])
    })

    it('should return 6 cats for fivePlus scenario', async () => {
      const response = await fetch(
        'http://localhost:3000/api/cats/placement-requests?scenario=fivePlus'
      )
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.data).toHaveLength(6)

      const names = data.data.map((cat: any) => cat.name)
      expect(names).toEqual(['Fluffy', 'Whiskers', 'Shadow', 'Luna', 'Mittens', 'Oreo'])
    })

    it('should return mixed request types for mixedTypes scenario', async () => {
      const response = await fetch(
        'http://localhost:3000/api/cats/placement-requests?scenario=mixedTypes'
      )
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.data).toHaveLength(4)

      const requestTypes = data.data.map((cat: any) => cat.placement_requests[0].request_type)
      expect(requestTypes).toContain('fostering')
      expect(requestTypes).toContain('adoption')
    })

    it('should use default scenario when no scenario parameter is provided', async () => {
      const response = await fetch('http://localhost:3000/api/cats/placement-requests')
      const data = await response.json()

      expect(response.ok).toBe(true)
      // Default scenario is 'fivePlus' which has 6 cats
      expect(data.data).toHaveLength(6)
    })

    it('should handle invalid scenario gracefully', async () => {
      const response = await fetch(
        'http://localhost:3000/api/cats/placement-requests?scenario=invalid'
      )
      const data = await response.json()

      expect(response.ok).toBe(true)
      // Should fall back to default scenario
      expect(data.data).toHaveLength(6)
    })
  })

  describe('Individual Cat API', () => {
    it('should return specific cat by ID', async () => {
      const response = await fetch('http://localhost:3000/api/cats/1')
      const data = await response.json()

      expect(response.ok).toBe(true)
      expect(data.data.id).toBe(1)
      expect(data.data.name).toBe('Fluffy')
      expect(data.data.placement_requests).toHaveLength(1)
    })

    it('should return 404 for non-existent cat', async () => {
      const response = await fetch('http://localhost:3000/api/cats/999')

      expect(response.status).toBe(404)
    })
  })

  describe('Placement Request Data Validation', () => {
    it('should have proper placement request structure in all scenarios', async () => {
      for (const scenarioName of Object.keys(testScenarios)) {
        const response = await fetch(
          `http://localhost:3000/api/cats/placement-requests?scenario=${scenarioName}`
        )
        const data = await response.json()

        expect(response.ok).toBe(true)

        data.data.forEach((cat: any) => {
          expect(cat.placement_request_active).toBe(true)
          expect(cat.placement_requests).toBeDefined()
          expect(cat.placement_requests.length).toBeGreaterThan(0)

          cat.placement_requests.forEach((request: any) => {
            expect(request.cat_id).toBe(cat.id)
            expect(request.is_active).toBe(true)
            expect(request.request_type).toMatch(/^(fostering|adoption)$/)
            expect(request.status).toBeDefined()
          })
        })
      }
    })
  })
})
