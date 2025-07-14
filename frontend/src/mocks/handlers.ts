import { http, HttpResponse } from 'msw'

export const handlers = [
  // Intercept "GET /user" requests
  http.get('/api/user', () => {
    // ...and respond with a "text/plain" response
    // with a "Hello world!" text body.
    return HttpResponse.json({
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
    })
  }),
  http.get('/api/cats', () => {
    return HttpResponse.json([
      {
        id: 1,
        name: 'Cat 1',
        breed: 'Breed 1',
        age: 2,
        location: 'Location 1',
        description: 'Description 1',
        user_id: 1,
        status: 'available',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        imageUrl: 'http://example.com/cat1.jpg',
      },
    ])
  }),
  http.post('/api/cats', () => {
    return HttpResponse.json({
      id: 2,
      name: 'New Cat',
      breed: 'New Breed',
      age: 1,
      location: 'New Location',
      description: 'New Description',
      user_id: 1,
      status: 'available',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    })
  }),
  http.get('/api/notifications', () => {
    return HttpResponse.json([
      { id: 1, message: 'Notification 1', is_read: false },
      { id: 2, message: 'Notification 2', is_read: false },
    ])
  }),
  http.post('/api/notifications/mark-as-read', () => {
    return new HttpResponse(null, { status: 204 })
  }),
  http.post('/api/login', async ({ request }) => {
    const info = (await request.json()) as { email?: string }
    if (info.email === 'fail@example.com') {
      return HttpResponse.json({ message: 'Invalid credentials' }, { status: 422 })
    }
    return HttpResponse.json({ status: 'ok' })
  }),

  http.post('/api/register', async ({ request }) => {
    const info = (await request.json()) as { email?: string }
    if (info.email === 'fail@example.com') {
      return HttpResponse.json({ message: 'Registration failed' }, { status: 500 })
    }
    return HttpResponse.json({ status: 'ok' }, { status: 201 })
  }),
  http.post('/api/logout', () => {
    return new HttpResponse(null, { status: 204 })
  }),
  http.get('/sanctum/csrf-cookie', () => {
    return new HttpResponse(null, { status: 204 })
  }),
]
