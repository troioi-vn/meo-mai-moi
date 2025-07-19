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
  status: 'active',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  photo_url: 'https://example.com/cat.jpg',
  photo_id: 1,
  photo: {
    id: 1,
    cat_id: 1,
    filename: 'cat.jpg',
    path: 'cats/profiles/cat.jpg',
    size: 1024,
    mime_type: 'image/jpeg',
  },
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
  status: 'active',
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
  // Returns a { data: [ ... ] } object
  http.get('http://localhost:3000/api/cats', () => {
    return HttpResponse.json({ data: [mockCat, anotherMockCat] })
  }),
  // Returns an object directly
  http.get('http://localhost:3000/api/cats/:id', ({ params }) => {
    const catId = Number(params.id)
    let cat = null
    if (catId === 1) {
      cat = mockCat
    } else if (catId === 2) {
      cat = anotherMockCat
    }

    if (cat) {
      return HttpResponse.json(cat)
    }

    return new HttpResponse(null, {
      status: 404,
      statusText: 'Not Found',
    })
  }),
  // Returns an object directly
  http.post('http://localhost:3000/api/cats', async ({ request }) => {
    const data = await request.json()
    return HttpResponse.json({ ...mockCat, ...(data as object) }, { status: 201 })
  }),
  // Returns an object directly
  http.post('http://localhost:3000/api/cats/:id/photos', async ({ params }) => {
    if (Number(params.id) === 999) {
      return HttpResponse.json({ message: 'Failed to upload the photo. Please try again.' }, { status: 500 })
    }
    return HttpResponse.json({
        ...mockCat,
        id: Number(params.id),
        photo_url: 'https://example.com/new-cat-photo.jpg',
        photo: {
          id: 1,
          cat_id: Number(params.id),
          filename: 'new-cat-photo.jpg',
          path: 'cats/profiles/new-cat-photo.jpg',
          size: 1024,
          mime_type: 'image/jpeg',
        },
      }, { status: 200 })
  }),
  // Returns an object directly
  http.delete('http://localhost:3000/api/cats/:catId/photos/:photoId', async ({ params }) => {
    if (Number(params.catId) === 999) {
      return HttpResponse.json({ message: 'Failed to delete the photo. Please try again.' }, { status: 500 })
    }
    return new HttpResponse(null, { status: 204 })
  }),
]
