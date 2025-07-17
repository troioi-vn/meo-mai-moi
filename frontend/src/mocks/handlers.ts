import { http, HttpResponse } from 'msw'
import { catHandlers, mockCat } from './data/cats'
import { mockUser } from './data/user'

const userHandlers = [
  // Register endpoint (absolute and relative)
  http.post('http://localhost:3000/api/register', async ({ request }) => {
    const raw = await request.json()
    const body = (raw && typeof raw === 'object') ? raw as Record<string, any> : {};
    // Simulate duplicate email error
    if (body.email === 'fail@example.com') {
      return HttpResponse.json({ message: 'Email already taken.', errors: { email: ['Email already taken.'] } }, { status: 422 })
    }
    // Simulate validation error
    if (!body.name || !body.email || !body.password || !body.password_confirmation) {
      return HttpResponse.json({ message: 'Validation Error', errors: { general: ['All fields are required.'] } }, { status: 422 })
    }
    // Simulate password mismatch
    if (body.password !== body.password_confirmation) {
      return HttpResponse.json({ message: 'Passwords do not match.', errors: { password_confirmation: ['Passwords do not match.'] } }, { status: 422 })
    }
    // Simulate success
    return HttpResponse.json({ message: 'Registration successful.' }, { status: 201 })
  }),
  http.post('/api/register', async ({ request }) => {
    const raw = await request.json()
    const body = (raw && typeof raw === 'object') ? raw as Record<string, any> : {};
    // Simulate duplicate email error
    if (body.email === 'fail@example.com') {
      return HttpResponse.json({ message: 'Email already taken.', errors: { email: ['Email already taken.'] } }, { status: 422 })
    }
    // Simulate validation error
    if (!body.name || !body.email || !body.password || !body.password_confirmation) {
      return HttpResponse.json({ message: 'Validation Error', errors: { general: ['All fields are required.'] } }, { status: 422 })
    }
    // Simulate password mismatch
    if (body.password !== body.password_confirmation) {
      return HttpResponse.json({ message: 'Passwords do not match.', errors: { password_confirmation: ['Passwords do not match.'] } }, { status: 422 })
    }
    // Simulate success
    return HttpResponse.json({ message: 'Registration successful.' }, { status: 201 })
  }),
  // Login endpoint (absolute and relative)
  http.post('http://localhost:3000/api/login', async ({ request }) => {
    const raw = await request.json()
    const body = (raw && typeof raw === 'object') ? raw as Record<string, any> : {};
    if (body.email === 'fail@example.com') {
      return HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 })
    }
    return HttpResponse.json({
      id: 1,
      name: 'Test User',
      email: body.email,
      avatar_url: 'https://example.com/avatar.jpg',
    }, { status: 200 })
  }),
  http.post('/api/login', async ({ request }) => {
    const raw = await request.json()
    const body = (raw && typeof raw === 'object') ? raw as Record<string, any> : {};
    if (body.email === 'fail@example.com') {
      return HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 })
    }
    return HttpResponse.json({
      id: 1,
      name: 'Test User',
      email: body.email,
      avatar_url: 'https://example.com/avatar.jpg',
    }, { status: 200 })
  }),
  // Cat removal (delete)
  http.delete('http://localhost:3000/api/cats/:id', async ({ params, request }) => {
    let password = undefined
    try {
      // Try standard way first
      const body = await request.json()
      if (body && typeof body === 'object' && 'password' in body) {
        password = body.password
      }
    } catch {
      // Fallback for axios DELETE
      try {
        const reqAny = request as any
        if (reqAny && reqAny._bodyInit) {
          const body = JSON.parse(reqAny._bodyInit)
          password = body.password
        }
      } catch {}
    }
    if (params.id === String(mockCat.id)) {
      if (password === 'wrongpassword') {
        return HttpResponse.json({
          message: 'Invalid password',
          errors: { password: ['The provided password does not match our records.'] },
        }, { status: 422 })
      }
      return HttpResponse.json({ message: 'Cat profile has been permanently deleted' }, { status: 200 })
    }
    return new HttpResponse(null, { status: 404 })
  }),
  http.delete('/api/cats/:id', async ({ params, request }) => {
    let password = undefined
    try {
      // Try standard way first
      const body = await request.json()
      if (body && typeof body === 'object' && 'password' in body) {
        password = body.password
      }
    } catch {
      // Fallback for axios DELETE
      try {
        const reqAny = request as any
        if (reqAny && reqAny._bodyInit) {
          const body = JSON.parse(reqAny._bodyInit)
          password = body.password
        }
      } catch {}
    }
    if (params.id === String(mockCat.id)) {
      if (password === 'wrongpassword') {
        return HttpResponse.json({
          message: 'Invalid password',
          errors: { password: ['The provided password does not match our records.'] },
        }, { status: 422 })
      }
      return HttpResponse.json({ message: 'Cat profile has been permanently deleted' }, { status: 200 })
    }
    return new HttpResponse(null, { status: 404 })
  }),
  // Cat status update (mark as deceased)
  http.put('http://localhost:3000/api/cats/:id/status', async ({ params, request }) => {
    let status = undefined
    let password = undefined
    try {
      const body = await request.json()
      if (body && typeof body === 'object') {
        status = (body as any).status
        password = (body as any).password
      }
    } catch {}
    if (params.id === String(mockCat.id) && status === 'dead' && password) {
      return HttpResponse.json({
        ...mockCat,
        status: 'dead',
      })
    }
    return new HttpResponse(null, { status: 404 })
  }),
  http.put('/api/cats/:id/status', async ({ params, request }) => {
    let status = undefined
    let password = undefined
    try {
      const body = await request.json()
      if (body && typeof body === 'object') {
        status = (body as any).status
        password = (body as any).password
      }
    } catch {}
    if (params.id === String(mockCat.id) && status === 'dead' && password) {
      return HttpResponse.json({
        ...mockCat,
        status: 'dead',
      })
    }
    return new HttpResponse(null, { status: 404 })
  }),
  http.get('http://localhost:3000/api/user', () => {
    return HttpResponse.json(mockUser)
  }),
  http.put('http://localhost:3000/users/me/password', async ({ request }) => {
    const raw = await request.json()
    const body = (raw && typeof raw === 'object') ? raw as Record<string, any> : {};
    // Simulate validation
    if (!body.current_password) {
      return HttpResponse.json({
        message: 'Current password is required.',
        errors: { current_password: ['Current password is required.'] },
      }, { status: 422 })
    }
    if (!body.new_password || body.new_password.length < 8) {
      return HttpResponse.json({
        message: 'New password must be at least 8 characters.',
        errors: { new_password: ['New password must be at least 8 characters.'] },
      }, { status: 422 })
    }
    if (!body.new_password_confirmation) {
      return HttpResponse.json({
        message: 'Confirm new password is required.',
        errors: { new_password_confirmation: ['Confirm new password is required.'] },
      }, { status: 422 })
    }
    if (body.new_password !== body.new_password_confirmation) {
      return HttpResponse.json({
        message: 'New password and confirmation do not match.',
        errors: { new_password_confirmation: ['New password and confirmation do not match.'] },
      }, { status: 422 })
    }
    return HttpResponse.json({ message: 'Password changed successfully' }, { status: 200 })
  }),
  // CSRF cookie endpoint
  http.get('http://localhost:3000/sanctum/csrf-cookie', () => {
    return new HttpResponse(null, { status: 204 })
  }),
  http.get('/sanctum/csrf-cookie', () => {
    return new HttpResponse(null, { status: 204 })
  }),
]

const notificationHandlers = [
  http.get('http://localhost:3000/api/notifications', () => {
    return HttpResponse.json({
      data: [
        {
          id: '1',
          type: 'App\\Notifications\\NewFollower',
          notifiable_type: 'App\\Models\\User',
          notifiable_id: 1,
          data: { message: 'You have a new follower' },
          read_at: null,
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          type: 'App\\Notifications\\NewMessage',
          notifiable_type: 'App\\Models\\User',
          notifiable_id: 1,
          data: { message: 'You have a new message' },
          read_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
      ],
    })
  }),
  http.post('http://localhost:3000/api/notifications/mark-as-read', () => {
    return new HttpResponse(null, { status: 204 })
  }),
]

export const handlers = [...catHandlers, ...userHandlers, ...notificationHandlers]
