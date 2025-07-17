import { http, HttpResponse } from 'msw'
import { type Cat } from '@/types'

export const mockCat: Cat = {
  id: 1,
  name: 'Fluffy',
  breed: 'Persian',
  birthday: '2020-01-15',
  location: 'New York, NY',
  description: 'A very friendly and fluffy cat.',
  user_id: 1,
  status: 'available',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  photo_url: 'https://example.com/cat.jpg',
  user: {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
  },
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
  location: 'Los Angeles, CA',
  description: 'A curious and playful cat.',
  user_id: 2, // Different user
  status: 'adopted',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  photo_url: 'http://example.com/whiskers.jpg',
  user: {
    id: 2,
    name: 'Another User',
    email: 'another@example.com',
  },
  viewer_permissions: {
    can_edit: false,
    can_view_contact: false,
  },
}

export const catHandlers = [
  http.get('http://localhost:3000/api/cats', () => {
    // Collections are wrapped in 'data'
    return HttpResponse.json({
      data: [mockCat, anotherMockCat],
    })
  }),
  http.get('http://localhost:3000/api/cats/:id', ({ params }) => {
    const catId = Number(params.id)
    let cat = null
    if (catId === 1) {
      cat = mockCat
    } else if (catId === 2) {
      cat = anotherMockCat
    }

    if (cat) {
      // Single resources are also wrapped in 'data' by this API
      return HttpResponse.json({ data: cat })
    }

    return new HttpResponse(null, {
      status: 404,
      statusText: 'Not Found',
    })
  }),
  http.post('http://localhost:3000/api/cats', async ({ request }) => {
    const data = await request.json()
    return HttpResponse.json({ data }, { status: 201 })
  }),
  // --- Relative path handlers for Cat photo upload and delete ---
  http.post('/api/cats/:id/photo', async ({ params, request }) => {
    const formData = await request.formData()
    const file = formData.get('photo') as File | null
    if (file && file.name === 'fail.jpg') {
      return new HttpResponse('Failed to upload', { status: 500 })
    }
    return HttpResponse.json({
      cat: {
        ...mockCat,
        id: Number(params.id),
        photo_url: 'https://example.com/cat.jpg',
      },
    }, { status: 200 })
  }),
  http.post('/api/cats/:id/photos', async ({ params, request }) => {
    const formData = await request.formData()
    const file = formData.get('photo') as File | null
    if (file && file.name === 'fail.jpg') {
      return new HttpResponse('Failed to upload', { status: 500 })
    }
    return HttpResponse.json({
      cat: {
        ...mockCat,
        id: Number(params.id),
        photo_url: 'https://example.com/cat.jpg',
      },
    }, { status: 200 })
  }),
  http.delete('/api/cats/:id/photo', async ({ params, request }) => {
    if (String(params.id) === '999') {
      return new HttpResponse('Failed to delete', { status: 500 })
    }
    return HttpResponse.json({
      cat: {
        ...mockCat,
        id: Number(params.id),
        photo_url: undefined,
      },
    }, { status: 200 })
  }),
]
