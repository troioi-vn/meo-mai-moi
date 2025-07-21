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
    return HttpResponse.json({ data: [mockCat, anotherMockCat] })
  }),
  // Returns a { data: { ... } } object
  http.get('http://localhost:3000/api/cats/:id', ({ params }) => {
    const catId = Number(params.id)
    let cat = null
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
    const newCatData = await request.json()
    const newCat = { ...mockCat, id: Date.now(), ...(newCatData as object) }
    return HttpResponse.json({ data: newCat }, { status: 201 })
  }),
  // Returns a { data: { ... } } object
  http.post('http://localhost:3000/api/cats/:id/photos', ({ params }) => {
    // Do not call request.json(); just respond for FormData/file upload
    if (Number(params.id) === 999) {
      return HttpResponse.json(
        { message: 'Failed to upload the photo. Please try again.' },
        { status: 500 }
      )
    }
    const updatedCat = {
      ...mockCat,
      id: Number(params.id),
      photo_url: 'new_photo_url',
    }
    return HttpResponse.json({ data: updatedCat }, { status: 200 })
  }),
  // Relative path mock for upload (for MSW compatibility)
  http.post('/api/cats/:id/photos', ({ params }) => {
    // Do not call request.json(); just respond for FormData/file upload
    if (Number(params.id) === 999) {
      return HttpResponse.json(
        { message: 'Failed to upload the photo. Please try again.' },
        { status: 500 }
      )
    }
    const updatedCat = {
      ...mockCat,
      id: Number(params.id),
      photo_url: 'new_photo_url',
    }
    return HttpResponse.json({ data: updatedCat }, { status: 200 })
  }),
  // Returns no content
  http.delete('http://localhost:3000/api/cats/:catId/photos/:photoId', ({ params }) => {
    if (Number(params.catId) === 999) {
      // Error responses do not have the 'data' wrapper
      return HttpResponse.json(
        { message: 'Failed to delete the photo. Please try again.' },
        { status: 500 }
      )
    }
    return new HttpResponse(null, { status: 204 })
  }),
]
