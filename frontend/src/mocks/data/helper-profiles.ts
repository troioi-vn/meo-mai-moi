import { http, HttpResponse } from 'msw'

export const mockHelperProfile = {
  id: 1,
  user_id: 1,
  country: 'Test Country',
  address: '123 Test St',
  city: 'Testville',
  state: 'TS',
  phone_number: '123-456-7890',
  experience: 'Lots of experience',
  has_pets: true,
  has_children: false,
  can_foster: true,
  can_adopt: false,
  is_public: true,
  status: 'active',
  photos: [
    { id: 1, path: '/test-photo-1.jpg' },
    { id: 2, path: '/test-photo-2.jpg' }
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
