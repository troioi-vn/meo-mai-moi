import { http, HttpResponse } from 'msw'
import { type Cat } from '@/types'

/**
 * Mock cat data for testing ActivePlacementRequestsSection component
 *
 * This file provides comprehensive mock data for testing different scenarios:
 *
 * Test Scenarios:
 * - empty: 0 cats (tests empty state)
 * - single: 1 cat (tests single item display)
 * - two: 2 cats (tests multiple items, no show more)
 * - four: 4 cats (tests maximum without show more button)
 * - fivePlus: 6 cats (tests show more button functionality)
 * - mixedTypes: 4 cats with different request types (fostering/adoption)
 *
 * Usage in tests:
 * 1. Use query parameter: /api/cats/placement-requests?scenario=empty
 * 2. Use setPlacementRequestScenario() function to change default
 * 3. Import individual mock cats for specific tests
 *
 * Requirements covered:
 * - 3.1: Active placement request eligibility
 * - 3.2: Consistent ordering (most recent first)
 * - 3.3: Inactive request removal
 * - 3.4: New request appearance
 * - 3.5: Placement request badges and respond button display
 */

// Mock cats with active placement requests for different test scenarios

// Cat 1: Foster request
export const mockCatWithFosterRequest: Cat = {
  id: 1,
  name: 'Fluffy',
  breed: 'Persian',
  birthday: '2020-01-15',
  status: 'active',
  description: 'A very friendly and fluffy cat looking for a temporary foster home.',
  location: 'New York, NY',
  photo_url: 'http://localhost:3000/storage/cats/profiles/fluffy.jpg',
  user_id: 1,
  user: {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
  },
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  viewer_permissions: {
    can_edit: true,
    can_view_contact: true,
  },
  placement_request_active: true,
  placement_requests: [
    {
      id: 1,
      cat_id: 1,
      request_type: 'fostering',
      start_date: '2025-08-01',
      end_date: '2025-09-01',
      notes: 'Looking for a loving foster home while owner travels.',
      created_at: '2025-07-20T00:00:00Z',
      updated_at: '2025-07-20T00:00:00Z',
      is_active: true,
      status: 'open',
      transfer_requests: [
        {
          id: 101,
          placement_request_id: 1,
          cat_id: 1,
          helper_profile_id: 1,
          initiator_user_id: 2,
          status: 'pending',
          requested_relationship_type: 'fostering',
          fostering_type: 'free',
          price: null,
          created_at: '2025-08-05T10:00:00Z',
          updated_at: '2025-08-05T10:00:00Z',
          helper_profile: {
            id: 1,
            city: 'Helper City',
            state: 'Helper State',
            address: '123 Helper St',
            zip_code: '12345',
            phone: '555-123-4567',
            about: 'A helpful person.',
            user: {
              id: 2,
              name: 'Helper One',
              email: 'helper@example.com',
            },
            photos: [],
            created_at: '2025-08-01T00:00:00Z',
            updated_at: '2025-08-01T00:00:00Z',
          },
        },
      ],
    },
  ],
}

// Cat 2: Adoption request
export const mockCatWithAdoptionRequest: Cat = {
  id: 2,
  name: 'Whiskers',
  breed: 'Siamese',
  birthday: '2019-05-20',
  status: 'active',
  description: 'A curious and playful cat looking for a forever home.',
  location: 'Los Angeles, CA',
  photo_url: 'http://localhost:3000/storage/cats/profiles/whiskers.jpg',
  user_id: 2,
  user: {
    id: 2,
    name: 'Another User',
    email: 'another@example.com',
  },
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  viewer_permissions: {
    can_edit: false,
    can_view_contact: false,
  },
  placement_request_active: true,
  placement_requests: [
    {
      id: 2,
      cat_id: 2,
      request_type: 'adoption',
      notes: 'Looking for a permanent loving home. Great with children.',
      created_at: '2025-07-15T00:00:00Z',
      updated_at: '2025-07-15T00:00:00Z',
      is_active: true,
      status: 'open',
      transfer_requests: [],
    },
  ],
}

// Cat 3: Foster request (paid)
export const mockCatWithPaidFosterRequest: Cat = {
  id: 3,
  name: 'Shadow',
  breed: 'Maine Coon',
  birthday: '2021-03-10',
  status: 'active',
  description: "A gentle giant who needs temporary care during owner's medical treatment.",
  location: 'Chicago, IL',
  photo_url: 'http://localhost:3000/storage/cats/profiles/shadow.jpg',
  user_id: 3,
  user: {
    id: 3,
    name: 'Cat Owner Three',
    email: 'owner3@example.com',
  },
  created_at: '2023-02-01T00:00:00Z',
  updated_at: '2023-02-01T00:00:00Z',
  viewer_permissions: {
    can_edit: false,
    can_view_contact: true,
  },
  placement_request_active: true,
  placement_requests: [
    {
      id: 3,
      cat_id: 3,
      request_type: 'fostering',
      start_date: '2025-09-01',
      end_date: '2025-12-01',
      notes: 'Paid fostering arrangement. All expenses covered plus compensation.',
      created_at: '2025-07-25T00:00:00Z',
      updated_at: '2025-07-25T00:00:00Z',
      is_active: true,
      status: 'open',
      transfer_requests: [],
    },
  ],
}

// Cat 4: Adoption request with urgent status
export const mockCatWithUrgentAdoptionRequest: Cat = {
  id: 4,
  name: 'Luna',
  breed: 'Tabby',
  birthday: '2018-11-05',
  status: 'active',
  description: "Sweet senior cat needs urgent rehoming due to owner's housing situation.",
  location: 'Austin, TX',
  photo_url: 'http://localhost:3000/storage/cats/profiles/luna.jpg',
  user_id: 4,
  user: {
    id: 4,
    name: 'Urgent Owner',
    email: 'urgent@example.com',
  },
  created_at: '2023-03-01T00:00:00Z',
  updated_at: '2023-03-01T00:00:00Z',
  viewer_permissions: {
    can_edit: false,
    can_view_contact: true,
  },
  placement_request_active: true,
  placement_requests: [
    {
      id: 4,
      cat_id: 4,
      request_type: 'adoption',
      notes: 'URGENT: Need to rehome by end of month. Very sweet and calm senior cat.',
      created_at: '2025-07-28T00:00:00Z',
      updated_at: '2025-07-28T00:00:00Z',
      is_active: true,
      status: 'urgent',
      transfer_requests: [],
    },
  ],
}

// Cat 5: Foster request (5th cat to test "show more" functionality)
export const mockCatWithFosterRequest5: Cat = {
  id: 5,
  name: 'Mittens',
  breed: 'Calico',
  birthday: '2022-01-20',
  status: 'active',
  description: 'Young playful cat needs temporary home while owner relocates.',
  location: 'Seattle, WA',
  photo_url: 'http://localhost:3000/storage/cats/profiles/mittens.jpg',
  user_id: 5,
  user: {
    id: 5,
    name: 'Owner Five',
    email: 'owner5@example.com',
  },
  created_at: '2023-04-01T00:00:00Z',
  updated_at: '2023-04-01T00:00:00Z',
  viewer_permissions: {
    can_edit: false,
    can_view_contact: false,
  },
  placement_request_active: true,
  placement_requests: [
    {
      id: 5,
      cat_id: 5,
      request_type: 'fostering',
      start_date: '2025-08-15',
      end_date: '2025-10-15',
      notes: 'Temporary fostering needed during cross-country move.',
      created_at: '2025-07-30T00:00:00Z',
      updated_at: '2025-07-30T00:00:00Z',
      is_active: true,
      status: 'open',
      transfer_requests: [],
    },
  ],
}

// Cat 6: Additional cat for 5+ scenario
export const mockCatWithAdoptionRequest6: Cat = {
  id: 6,
  name: 'Oreo',
  breed: 'Tuxedo',
  birthday: '2020-07-12',
  status: 'active',
  description: 'Friendly black and white cat looking for a new family.',
  location: 'Denver, CO',
  photo_url: 'http://localhost:3000/storage/cats/profiles/oreo.jpg',
  user_id: 6,
  user: {
    id: 6,
    name: 'Owner Six',
    email: 'owner6@example.com',
  },
  created_at: '2023-05-01T00:00:00Z',
  updated_at: '2023-05-01T00:00:00Z',
  viewer_permissions: {
    can_edit: false,
    can_view_contact: true,
  },
  placement_request_active: true,
  placement_requests: [
    {
      id: 6,
      cat_id: 6,
      request_type: 'adoption',
      notes: 'Looking for a family who will love this sweet boy.',
      created_at: '2025-08-01T00:00:00Z',
      updated_at: '2025-08-01T00:00:00Z',
      is_active: true,
      status: 'open',
      transfer_requests: [],
    },
  ],
}

// Legacy mock cat (kept for backward compatibility)
export const mockCat: Cat = mockCatWithFosterRequest

// Cat without active placement requests (for testing scenarios)
export const mockCatWithoutPlacementRequest: Cat = {
  id: 7,
  name: 'Smokey',
  breed: 'Russian Blue',
  birthday: '2019-05-20',
  status: 'active',
  description: 'A curious and playful cat with no current placement needs.',
  location: 'Los Angeles, CA',
  user_id: 7,
  user: {
    id: 7,
    name: 'Happy Owner',
    email: 'happy@example.com',
  },
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  viewer_permissions: {
    can_edit: false,
    can_view_contact: false,
  },
  placement_request_active: false,
  placement_requests: [],
}

// Legacy mock cat (kept for backward compatibility)
export const anotherMockCat: Cat = mockCatWithoutPlacementRequest

export const deceasedMockCat: Cat = {
  id: 8,
  name: 'Deceased Cat',
  breed: 'Unknown',
  birthday: '2010-01-01',
  status: 'deceased',
  description: 'A beloved cat who has passed away.',
  location: 'Rainbow Bridge',
  user_id: 8,
  user: {
    id: 8,
    name: 'Past Owner',
    email: 'past@example.com',
  },
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  viewer_permissions: {
    can_edit: false,
    can_view_contact: false,
  },
}

// Test scenario data arrays
export const catsWithActivePlacementRequests = [
  mockCatWithFosterRequest,
  mockCatWithAdoptionRequest,
  mockCatWithPaidFosterRequest,
  mockCatWithUrgentAdoptionRequest,
  mockCatWithFosterRequest5,
  mockCatWithAdoptionRequest6,
]

export const allMockCats = [
  ...catsWithActivePlacementRequests,
  mockCatWithoutPlacementRequest,
  deceasedMockCat,
]

// Test scenario configurations
export const testScenarios = {
  // 0 cats with active placement requests
  empty: [],
  // 1 cat with active placement request
  single: [mockCatWithFosterRequest],
  // 2 cats with active placement requests
  two: [mockCatWithFosterRequest, mockCatWithAdoptionRequest],
  // 4 cats with active placement requests (no show more button)
  four: [
    mockCatWithFosterRequest,
    mockCatWithAdoptionRequest,
    mockCatWithPaidFosterRequest,
    mockCatWithUrgentAdoptionRequest,
  ],
  // 5+ cats with active placement requests (show more button should appear)
  fivePlus: catsWithActivePlacementRequests,
  // Mixed request types for testing
  mixedTypes: [
    mockCatWithFosterRequest, // fostering
    mockCatWithAdoptionRequest, // adoption
    mockCatWithPaidFosterRequest, // fostering (paid)
    mockCatWithUrgentAdoptionRequest, // adoption (urgent)
  ],
}

// Current active scenario (can be changed for testing)
let currentPlacementRequestScenario: keyof typeof testScenarios = 'fivePlus'

// Helper function to set test scenario
export const setPlacementRequestScenario = (scenario: keyof typeof testScenarios) => {
  currentPlacementRequestScenario = scenario
}

export const catHandlers = [
  // Returns a { data: [ ... ] } object
  http.get('http://localhost:3000/api/cats', () => {
    return HttpResponse.json({ data: allMockCats })
  }),
  // Returns cats with active placement requests - supports different test scenarios
  http.get('http://localhost:3000/api/cats/placement-requests', ({ request }) => {
    const url = new URL(request.url)
    const scenarioParam = url.searchParams.get('scenario')
    const scenarioKey = (scenarioParam &&
      (scenarioParam in testScenarios ? scenarioParam : undefined)) as
      | keyof typeof testScenarios
      | undefined

    // Use scenario from query param if provided and valid, otherwise use current scenario
    const activeScenario: keyof typeof testScenarios =
      scenarioKey ?? currentPlacementRequestScenario
    const cats = testScenarios[activeScenario]

    return HttpResponse.json({ data: cats })
  }),
  // Returns a { data: [ ... ] } object for the authenticated user's cats
  http.get('http://localhost:3000/api/my-cats', () => {
    return HttpResponse.json({ data: [mockCat] })
  }),
  // Returns sectioned cats for the authenticated user
  http.get('http://localhost:3000/api/my-cats/sections', () => {
    return HttpResponse.json({
      data: {
        owned: [mockCat],
        fostering_active: [],
        fostering_past: [],
        transferred_away: [],
      },
    })
  }),
  // Returns a { data: { ... } } object
  http.get('http://localhost:3000/api/cats/:id', ({ params }) => {
    const catId = Number(params.id)
    const cat = allMockCats.find((c) => c.id === catId)

    if (cat) {
      return HttpResponse.json({ data: cat })
    }

    return new HttpResponse(null, {
      status: 404,
      statusText: 'Not Found',
    })
  }),
  // Returns a { data: { ... } } object
  http.post('http://localhost:3000/api/cats', async ({ request }) => {
    const newCatData = (await request.json()) as Partial<Cat>
    const newCat: Cat = { ...mockCat, id: Date.now(), ...newCatData }
    return HttpResponse.json({ data: newCat }, { status: 201 })
  }),
  // Returns a { data: { ... } } object
  http.put('http://localhost:3000/api/cats/:id', async ({ request, params }) => {
    const updatedCatData = (await request.json()) as Partial<Cat>
    const updatedCat: Cat = { ...mockCat, id: Number(params.id), ...updatedCatData }
    return HttpResponse.json({ data: updatedCat }, { status: 200 })
  }),
  // Returns a 204 No Content response
  http.delete('http://localhost:3000/api/cats/:id', () => {
    return new HttpResponse(null, { status: 204 })
  }),
]
