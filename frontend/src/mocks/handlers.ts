import { http, HttpResponse } from 'msw'
import { catHandlers, mockCat } from './data/cats'
import { mockUser } from './data/user'

const userHandlers = [
  // Get authenticated user's profile
  http.get('http://localhost:3000/api/users/me', () => {
    return HttpResponse.json({ data: mockUser })
  }),

  // Update authenticated user's profile
  http.put('http://localhost:3000/api/users/me', async ({ request }) => {
    const raw = await request.json()
    const body = raw && typeof raw === 'object' ? raw : {}
    return HttpResponse.json({ data: { ...mockUser, ...body } })
  }),

  // Delete authenticated user's account
  http.delete('http://localhost:3000/api/users/me', () => {
    return HttpResponse.json({ message: 'Account deleted successfully.' })
  }),

  // Update authenticated user's password
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
    return HttpResponse.json({ message: 'Password updated successfully.' }, { status: 200 })
  }),

  // Upload or update authenticated user's avatar
  http.post('http://localhost:3000/api/users/me/avatar', () => {
    return HttpResponse.json({
      message: 'Avatar uploaded successfully.',
      avatar_url: 'http://localhost:8000/storage/users/avatars/user_1_1678886400.png',
    })
  }),

  // Delete authenticated user's avatar
  http.delete('http://localhost:3000/api/users/me/avatar', () => {
    return HttpResponse.json({ message: 'Avatar deleted successfully.' })
  }),
  // Register endpoint
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
        message: 'User registered successfully',
        access_token: 'mock-token-registered',
        token_type: 'Bearer',
      },
      { status: 201 }
    )
  }),

  // Login endpoint
  http.post('http://localhost:3000/api/login', async ({ request }) => {
    const raw = await request.json()
    const body =
      raw && typeof raw === 'object' ? (raw as { email?: string; password?: string }) : {}
    if (body.email === 'fail@example.com') {
      return HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 })
    }
    return HttpResponse.json(
      {
        message: 'Logged in successfully',
        access_token: 'mock-token-logged-in',
        token_type: 'Bearer',
      },
      { status: 200 }
    )
  }),

  // Logout endpoint
  http.post('http://localhost:3000/api/logout', () => {
    return HttpResponse.json({ message: 'Logged out successfully' })
  }),

  // CSRF cookie endpoint
  http.get('http://localhost:3000/sanctum/csrf-cookie', () => {
    return new HttpResponse(null, { status: 204 })
  }),
]

const photoHandlers = [
  http.post('http://localhost:3000/api/cats/:catId/photos', () => {
    return HttpResponse.json(mockCat, { status: 200 })
  }),
  http.delete('http://localhost:3000/api/cats/:catId/photos', () => {
    return new HttpResponse(null, { status: 204 })
  }),
]

const messageHandlers = [
  http.get('http://localhost:3000/api/messages', () => {
    return HttpResponse.json([])
  }),
  http.post('http://localhost:3000/api/messages', () => {
    return HttpResponse.json({}, { status: 201 })
  }),
  http.get('http://localhost:3000/api/messages/:id', () => {
    return HttpResponse.json({})
  }),
  http.delete('http://localhost:3000/api/messages/:id', () => {
    return new HttpResponse(null, { status: 204 })
  }),
  http.put('http://localhost:3000/api/messages/:id/read', () => {
    return HttpResponse.json({})
  }),
]

const transferRequestHandlers = [
  http.post('http://localhost:3000/api/transfer-requests', () => {
    return HttpResponse.json({}, { status: 201 })
  }),
  http.post('http://localhost:3000/api/transfer-requests/:id/accept', () => {
    return HttpResponse.json({})
  }),
  http.post('http://localhost:3000/api/transfer-requests/:id/reject', () => {
    return HttpResponse.json({})
  }),
]

const versionHandlers = [
  http.get('http://localhost:3000/api/version', () => {
    return HttpResponse.json({ version: 'v0.0.1' })
  }),
]

const weightHistoryHandlers = [
  http.post('http://localhost:3000/api/cats/:catId/weight-history', () => {
    return HttpResponse.json({}, { status: 201 })
  }),
]

export const handlers = [
  ...catHandlers,
  ...userHandlers,
  ...photoHandlers,
  ...messageHandlers,
  ...transferRequestHandlers,
  ...versionHandlers,
  ...weightHistoryHandlers,
]
