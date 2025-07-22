import { http, HttpResponse } from 'msw'
import { type Cat } from '@/types'

export const mockCat: Cat = {
  id: 1,
  name: 'Fluffy',
  breed: 'Persian',
  birthday: '2020-01-15',
  status: 'active',
  description: 'A very friendly and fluffy cat.',
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
}

export const anotherMockCat: Cat = {
  id: 2,
  name: 'Whiskers',
  breed: 'Siamese',
  birthday: '2019-05-20',
  status: 'active',
  description: 'A curious and playful cat.',
  location: 'Los Angeles, CA',
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
}

export const deceasedMockCat: Cat = {
  id: 3,
  name: 'Deceased Cat',
  breed: 'Unknown',
  birthday: '2010-01-01',
  status: 'deceased',
  description: 'A beloved cat who has passed away.',
  location: 'Rainbow Bridge',
  user_id: 3,
  user: {
    id: 3,
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

export const catHandlers = [
  // Returns a { data: [ ... ] } object
  http.get('http://localhost:3000/api/cats', () => {
    return HttpResponse.json({ data: [mockCat, anotherMockCat, deceasedMockCat] })
  }),
  // Returns a { data: [ ... ] } object for the authenticated user's cats
  http.get('http://localhost:3000/api/my-cats', () => {
    return HttpResponse.json({ data: [mockCat] })
  }),
  // Returns a { data: { ... } } object
  http.get('http://localhost:3000/api/cats/:id', ({ params }) => {
    const catId = Number(params.id)
    let cat: Cat | null = null
    if (catId === 1) {
      cat = mockCat
    } else if (catId === 2) {
      cat = anotherMockCat
    }

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
