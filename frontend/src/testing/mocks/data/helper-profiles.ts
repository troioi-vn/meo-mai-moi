import { http, HttpResponse } from 'msw'

export const mockHelperProfile = {
  id: 1,
  user_id: 1,
  status: 'active',
  request_types: ['foster_free', 'permanent'],
  country: 'VN',
  state: 'TS',
  city: 'Testville',
  city_id: 1,
  cities: [
    {
      id: 1,
      name: 'Testville',
      slug: 'testville',
      country: 'VN',
      description: null,
      created_by: null,
      approved_at: null,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    },
  ],
  address: '123 Test St',
  phone_number: '123-456-7890',
  contact_info: 'Contact me via email',
  experience: '5 years of experience',
  has_pets: true,
  has_children: false,
  photos: [
    {
      id: 1,
      url: 'http://example.com/photo1.jpg',
      thumb_url: 'http://example.com/thumb1.jpg',
      is_primary: true,
    },
    {
      id: 2,
      url: 'http://example.com/photo2.jpg',
      thumb_url: 'http://example.com/thumb2.jpg',
      is_primary: false,
    },
  ],
  pet_types: [
    {
      id: 1,
      name: 'Cat',
      slug: 'cat',
      is_active: true,
      is_system: true,
      display_order: 1,
      placement_requests_allowed: true,
    },
  ],
}

export const helperProfileHandlers = [
  http.get('http://localhost:3000/api/helper-profiles', () => {
    return HttpResponse.json({ data: [mockHelperProfile] })
  }),
  http.get('http://localhost:3000/api/helper-profiles/:id', () => {
    return HttpResponse.json({ data: mockHelperProfile })
  }),
  http.post('http://localhost:3000/api/helper-profiles', async ({ request }) => {
    const raw = await request.json()
    const body = raw && typeof raw === 'object' ? raw : {}
    return HttpResponse.json({ data: { ...mockHelperProfile, ...body } }, { status: 201 })
  }),
  http.put('http://localhost:3000/api/helper-profiles/:id', async ({ request }) => {
    const raw = await request.json()
    const body = raw && typeof raw === 'object' ? raw : {}
    return HttpResponse.json({ data: { ...mockHelperProfile, ...body } })
  }),
  http.delete('http://localhost:3000/api/helper-profiles/:id', () => {
    return new HttpResponse(null, { status: 204 })
  }),
]
