import { http, HttpResponse } from 'msw'
import { type Pet, type PetType } from '@/types/pet'

// Mock pet types
export const mockCatType: PetType = {
  id: 1,
  name: 'Cat',
  slug: 'cat',
  description: 'Feline companions',
  is_active: true,
  is_system: true,
  display_order: 1,
  placement_requests_allowed: true,
  weight_tracking_allowed: true,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
}

export const mockDogType: PetType = {
  id: 2,
  name: 'Dog',
  slug: 'dog',
  description: 'Canine companions',
  is_active: true,
  is_system: true,
  display_order: 2,
  placement_requests_allowed: false,
  weight_tracking_allowed: false,
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
}

export const mockPetTypes = [mockCatType, mockDogType]

// Mock pets with active placement requests for different test scenarios

// Pet 1: Cat with foster request
export const mockCatWithFosterRequest: Pet = {
  id: 1,
  name: 'Fluffy',
  breed: 'Persian',
  birthday: '2020-01-15',
  status: 'active',
  description: 'A very friendly and fluffy cat looking for a temporary foster home.',
  location: 'New York, NY',
  photo_url: 'http://localhost:3000/storage/pets/profiles/fluffy.jpg',
  user_id: 1,
  pet_type_id: 1,
  pet_type: mockCatType,
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
      pet_id: 1,
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
          pet_id: 1,
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

// Pet 2: Cat with adoption request
export const mockCatWithAdoptionRequest: Pet = {
  id: 2,
  name: 'Whiskers',
  breed: 'Siamese',
  birthday: '2019-05-20',
  status: 'active',
  description: 'A curious and playful cat looking for a forever home.',
  location: 'Los Angeles, CA',
  photo_url: 'http://localhost:3000/storage/pets/profiles/whiskers.jpg',
  user_id: 2,
  pet_type_id: 1,
  pet_type: mockCatType,
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
      pet_id: 2,
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

// Pet 3: Dog with photo only (no placement requests - dogs don't support placement)
export const mockDogWithPhotos: Pet = {
  id: 3,
  name: 'Buddy',
  breed: 'Golden Retriever',
  birthday: '2021-03-10',
  status: 'active',
  description: 'A friendly and energetic dog who loves to play fetch.',
  location: 'Chicago, IL',
  photo_url: 'http://localhost:3000/storage/pets/profiles/buddy.jpg',
  user_id: 3,
  pet_type_id: 2,
  pet_type: mockDogType,
  user: {
    id: 3,
    name: 'Dog Owner',
    email: 'dogowner@example.com',
  },
  created_at: '2023-02-01T00:00:00Z',
  updated_at: '2023-02-01T00:00:00Z',
  viewer_permissions: {
    can_edit: false,
    can_view_contact: true,
  },
  placement_request_active: false,
  placement_requests: [], // Dogs don't support placement requests
}

// Pet 4: Cat with urgent adoption request
export const mockCatWithUrgentAdoptionRequest: Pet = {
  id: 4,
  name: 'Luna',
  breed: 'Tabby',
  birthday: '2018-11-05',
  status: 'active',
  description: "Sweet senior cat needs urgent rehoming due to owner's housing situation.",
  location: 'Austin, TX',
  photo_url: 'http://localhost:3000/storage/pets/profiles/luna.jpg',
  user_id: 4,
  pet_type_id: 1,
  pet_type: mockCatType,
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
      pet_id: 4,
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

// Pet 5: Cat with foster request (5th pet to test "show more" functionality)
export const mockCatWithFosterRequest5: Pet = {
  id: 5,
  name: 'Mittens',
  breed: 'Calico',
  birthday: '2022-01-20',
  status: 'active',
  description: 'Young playful cat needs temporary home while owner relocates.',
  location: 'Seattle, WA',
  photo_url: 'http://localhost:3000/storage/pets/profiles/mittens.jpg',
  user_id: 5,
  pet_type_id: 1,
  pet_type: mockCatType,
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
      pet_id: 5,
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

// Pet 6: Cat with adoption request (6th pet)
export const mockCatWithAdoptionRequest6: Pet = {
  id: 6,
  name: 'Oreo',
  breed: 'Tuxedo',
  birthday: '2020-07-12',
  status: 'active',
  description: 'Friendly black and white cat looking for a new family.',
  location: 'Denver, CO',
  photo_url: 'http://localhost:3000/storage/pets/profiles/oreo.jpg',
  user_id: 6,
  pet_type_id: 1,
  pet_type: mockCatType,
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
      pet_id: 6,
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

// Legacy mock pet (kept for backward compatibility)
export const mockPet: Pet = mockCatWithFosterRequest

// Pet without active placement requests (for testing scenarios)
export const mockPetWithoutPlacementRequest: Pet = {
  id: 7,
  name: 'Smokey',
  breed: 'Russian Blue',
  birthday: '2019-05-20',
  status: 'active',
  description: 'A curious and playful cat with no current placement needs.',
  location: 'Los Angeles, CA',
  user_id: 7,
  pet_type_id: 1,
  pet_type: mockCatType,
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

export const deceasedMockPet: Pet = {
  id: 8,
  name: 'Deceased Pet',
  breed: 'Unknown',
  birthday: '2010-01-01',
  status: 'deceased',
  description: 'A beloved pet who has passed away.',
  location: 'Rainbow Bridge',
  user_id: 8,
  pet_type_id: 1,
  pet_type: mockCatType,
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

// Test scenario data arrays - only cats have placement requests (dogs don't support them)
export const petsWithActivePlacementRequests = [
  mockCatWithFosterRequest,
  mockCatWithAdoptionRequest,
  mockCatWithUrgentAdoptionRequest,
  mockCatWithFosterRequest5,
  mockCatWithAdoptionRequest6,
]

export const allMockPets = [
  ...petsWithActivePlacementRequests,
  mockDogWithPhotos,
  mockPetWithoutPlacementRequest,
  deceasedMockPet,
]

// Test scenario configurations
export const testScenarios = {
  // 0 pets with active placement requests
  empty: [],
  // 1 pet with active placement request
  single: [mockCatWithFosterRequest],
  // 2 pets with active placement requests
  two: [mockCatWithFosterRequest, mockCatWithAdoptionRequest],
  // 4 pets with active placement requests (no show more button)
  four: [
    mockCatWithFosterRequest,
    mockCatWithAdoptionRequest,
    mockCatWithUrgentAdoptionRequest,
    mockCatWithFosterRequest5,
  ],
  // 5+ pets with active placement requests (show more button should appear)
  fivePlus: petsWithActivePlacementRequests,
  // Mixed request types for testing
  mixedTypes: [
    mockCatWithFosterRequest, // fostering
    mockCatWithAdoptionRequest, // adoption
    mockCatWithUrgentAdoptionRequest, // adoption (urgent)
    mockCatWithFosterRequest5, // fostering
  ],
}

// Current active scenario (can be changed for testing)
let currentPlacementRequestScenario: keyof typeof testScenarios = 'fivePlus'

// Helper function to set test scenario
export const setPlacementRequestScenario = (scenario: keyof typeof testScenarios) => {
  currentPlacementRequestScenario = scenario
}

export const petHandlers = [
  // Pet Types
  http.get('http://localhost:3000/api/pet-types', () => {
    return HttpResponse.json({ data: mockPetTypes })
  }),

  // Returns a { data: [ ... ] } object
  http.get('http://localhost:3000/api/pets', () => {
    return HttpResponse.json({ data: allMockPets })
  }),

  // Returns pets with active placement requests - supports different test scenarios
  http.get('http://localhost:3000/api/pets/placement-requests', ({ request }) => {
    const url = new URL(request.url)
    const scenarioParam = url.searchParams.get('scenario')
    const scenarioKey = (scenarioParam &&
      (scenarioParam in testScenarios ? scenarioParam : undefined)) as
      | keyof typeof testScenarios
      | undefined

    // Use scenario from query param if provided and valid, otherwise use current scenario
    const activeScenario: keyof typeof testScenarios =
      scenarioKey ?? currentPlacementRequestScenario
    const pets = testScenarios[activeScenario]

    return HttpResponse.json({ data: pets })
  }),

  // Returns a { data: [ ... ] } object for the authenticated user's pets
  http.get('http://localhost:3000/api/my-pets', () => {
    return HttpResponse.json({ data: [mockPet, mockDogWithPhotos] })
  }),

  // Returns sectioned pets for the authenticated user
  http.get('http://localhost:3000/api/my-pets/sections', () => {
    return HttpResponse.json({
      data: {
        owned: [mockPet, mockDogWithPhotos],
        fostering_active: [],
        fostering_past: [],
        transferred_away: [],
      },
    })
  }),

  // Returns a { data: { ... } } object
  http.get('http://localhost:3000/api/pets/:id', ({ params }) => {
    const petId = Number(params.id)
    const pet = allMockPets.find((p) => p.id === petId)

    if (pet) {
      return HttpResponse.json({ data: pet })
    }

    return new HttpResponse(null, {
      status: 404,
      statusText: 'Not Found',
    })
  }),

  // Returns a { data: { ... } } object
  http.post('http://localhost:3000/api/pets', async ({ request }) => {
    const newPetData = (await request.json()) as Partial<Pet>
    const petType = mockPetTypes.find((t) => t.id === newPetData.pet_type_id) || mockCatType
    const newPet: Pet = {
      ...mockPet,
      id: Date.now(),
      pet_type: petType,
      ...newPetData,
    }
    return HttpResponse.json({ data: newPet }, { status: 201 })
  }),

  // Returns a { data: { ... } } object
  http.put('http://localhost:3000/api/pets/:id', async ({ request, params }) => {
    const updatedPetData = (await request.json()) as Partial<Pet>
    const updatedPet: Pet = { ...mockPet, id: Number(params.id), ...updatedPetData }
    return HttpResponse.json({ data: updatedPet }, { status: 200 })
  }),

  // Returns a 204 No Content response
  http.delete('http://localhost:3000/api/pets/:id', () => {
    return new HttpResponse(null, { status: 204 })
  }),

  // Pet photo handlers
  http.post('http://localhost:3000/api/pets/:petId/photos', () => {
    return HttpResponse.json({ data: mockPet }, { status: 200 })
  }),

  http.delete('http://localhost:3000/api/pets/:petId/photos/:photoId', () => {
    return new HttpResponse(null, { status: 204 })
  }),
]

// Legacy exports for backward compatibility
export const mockCat = mockCatWithFosterRequest
export const anotherMockCat = mockPetWithoutPlacementRequest
export const deceasedMockCat = deceasedMockPet
export const catsWithActivePlacementRequests = petsWithActivePlacementRequests
export const allMockCats = allMockPets
export const catHandlers = petHandlers
