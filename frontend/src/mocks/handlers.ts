import { http, HttpResponse } from 'msw'
import { catHandlers, mockCat } from './data/cats'
import { mockUser } from './data/user'

const userHandlers = [
  // Register endpoint - returns a { data: { ... } } object
  http.post('http://localhost:3000/api/register', async ({ request }) => {
    const raw = await request.json()
    const body = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
    if (body.email === 'fail@example.com') {
      return HttpResponse.json(
        { message: 'Email already taken.', errors: { email: ['Email already taken.'] } },
        { status: 422 }
      )
    }
    if (!body.name || !body.email || !body.password || !body.password_confirmation) {
      return HttpResponse.json(
        { message: 'Validation Error', errors: { general: ['All fields are required.'] } },
        { status: 422 }
      )
    }
    if (body.password !== body.password_confirmation) {
      return HttpResponse.json(
        {
          message: 'Passwords do not match.',
          errors: { password_confirmation: ['Passwords do not match.'] },
        },
        { status: 422 }
      )
    }
    return HttpResponse.json(
      {
        data: {
          message: 'User registered successfully',
          access_token: 'mock-token-registered',
          token_type: 'Bearer',
        },
      },
      { status: 201 }
    )
  }),

  // Login endpoint - returns a { data: { ... } } object
  http.post('http://localhost:3000/api/login', async ({ request }) => {
    const raw = await request.json()
    const body =
      raw && typeof raw === 'object' ? (raw as { email?: string; password?: string }) : {}
    if (body.email === 'fail@example.com') {
      return HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 })
    }
    return HttpResponse.json(
      {
        data: {
          message: 'Logged in successfully',
          access_token: 'mock-token-logged-in',
          token_type: 'Bearer',
        },
      },
      { status: 200 }
    )
  }),

  // Cat removal (delete) - returns no content
  http.delete('http://localhost:3000/api/cats/:id', async ({ params, request }) => {
    let password = undefined
    try {
      const body = await request.json()
      if (body && typeof body === 'object' && 'password' in body) {
        password = (body as Record<string, unknown>).password as string
      }
    } catch {
      /* do nothing */
    }

    if (params.id === String(mockCat.id)) {
      if (password === 'wrongpassword') {
        return HttpResponse.json(
          {
            message: 'Invalid password',
            errors: { password: ['The provided password does not match our records.'] },
          },
          { status: 422 }
        )
      }
      return new HttpResponse(null, { status: 204 })
    }
    return new HttpResponse(null, { status: 404 })
  }),

  // Cat status update (mark as deceased) - returns a { data: { ... } } object
  http.put('http://localhost:3000/api/cats/:id/status', async ({ params, request }) => {
    let status = undefined
    let password = undefined
    try {
      const body = await request.json()
      if (body && typeof body === 'object') {
        status = (body as Record<string, unknown>).status as string
        password = (body as Record<string, unknown>).password as string
      }
    } catch {
      /* do nothing */
    }
    if (params.id === String(mockCat.id) && status === 'deceased' && password) {
      return HttpResponse.json({
        data: {
          ...mockCat,
          status: 'deceased',
        },
      })
    }
    return new HttpResponse(null, { status: 404 })
  }),

  // Get current user - returns a { data: { ... } } object
  http.get('http://localhost:3000/api/user', () => {
    return HttpResponse.json({ data: mockUser })
  }),

  // Update password - returns a success message
  http.put('http://localhost:3000/api/users/me/password', async ({ request }) => {
    const raw = await request.json()
    const body =
      raw && typeof raw === 'object'
        ? (raw as {
            current_password?: string
            new_password?: string
            new_password_confirmation?: string
          })
        : {}
    if (!body.current_password) {
      return HttpResponse.json(
        {
          message: 'Current password is required.',
          errors: { current_password: ['Current password is required.'] },
        },
        { status: 422 }
      )
    }
    if (!body.new_password || body.new_password.length < 8) {
      return HttpResponse.json(
        {
          message: 'New password must be at least 8 characters.',
          errors: { new_password: ['New password must be at least 8 characters.'] },
        },
        { status: 422 }
      )
    }
    if (!body.new_password_confirmation) {
      return HttpResponse.json(
        {
          message: 'Confirm new password is required.',
          errors: { new_password_confirmation: ['Confirm new password is required.'] },
        },
        { status: 422 }
      )
    }
    if (body.new_password !== body.new_password_confirmation) {
      return HttpResponse.json(
        {
          message: 'New password and confirmation do not match.',
          errors: { new_password_confirmation: ['New password and confirmation do not match.'] },
        },
        { status: 422 }
      )
    }
    return HttpResponse.json({ message: 'Password changed successfully' }, { status: 200 })
  }),

  // CSRF cookie endpoint
  http.get('http://localhost:3000/sanctum/csrf-cookie', () => {
    return new HttpResponse(null, { status: 204 })
  }),
]

const notificationHandlers = [
  http.get('http://localhost:3000/api/notifications', () => {
    return HttpResponse.json({
      data: {
        notifications: [
          {
            id: '1',
            type: 'App\\Notifications\\NewFollower',
            notifiable_type: 'App\\Models\\User',
            notifiable_id: 1,
            data: { message: 'You have a new follower' },
            read_at: null,
            created_at: new Date().toISOString(),
          },
        ],
        unread_count: 1,
      },
    })
  }),

  http.post('http://localhost:3000/api/notifications/mark-as-read', () => {
    return new HttpResponse(null, { status: 204 })
  }),
]

export const handlers = [...catHandlers, ...userHandlers, ...notificationHandlers]
