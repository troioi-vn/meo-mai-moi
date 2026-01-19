import { http, HttpResponse } from 'msw'

import { petHandlers, mockPet } from './data/pets'
import { mockUser } from './data/user'
import { helperProfileHandlers } from './data/helper-profiles'
import type { AppNotification } from '@/types/notification'

const userHandlers = [
  // Check if email exists (custom endpoint, still on /api)
  http.post('http://localhost:3000/api/check-email', async ({ request }) => {
    const { email } = (await request.json()) as { email: string }
    // Mock: return true for existing test emails, false for others
    const existingEmails = [
      'admin@catarchy.space',
      'user1@catarchy.space',
      'test@example.com',
      'existing@example.com',
    ]
    const exists = existingEmails.includes(email)
    return HttpResponse.json({ data: { exists } })
  }),

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
  // Register endpoint (Fortify route - no /api prefix)
  http.post('http://localhost:3000/register', async ({ request }) => {
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

    // Simulate email verification flow
    const emailSent = body.email !== 'no-email@example.com' // Simulate email send failure
    return HttpResponse.json(
      {
        data: {
          user: {
            id: Date.now(),
            name: typeof body.name === 'string' ? body.name : '',
            email: typeof body.email === 'string' ? body.email : '',
            email_verified_at: null,
          },
          email_verified: false,
          email_sent: emailSent,
          requires_verification: true,
          message: emailSent
            ? 'We have sent you verification email, please check your inbox and click the link to verify your email address. If you did not receive the email, check your spam folder.'
            : 'We are unable to send verification email at the moment. But hopefully admins are working on it and you will receive it soon.',
        },
      },
      { status: 201 }
    )
  }),

  // Login endpoint (Fortify route - no /api prefix)
  http.post('http://localhost:3000/login', async ({ request }) => {
    const raw = await request.json()
    const body =
      raw && typeof raw === 'object' ? (raw as { email?: string; password?: string }) : {}
    if (body.email === 'fail@example.com') {
      return HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 })
    }

    // Simulate unverified user
    const emailVerified = body.email !== 'unverified@example.com'

    return HttpResponse.json(
      {
        data: {
          user: {
            id: 1,
            name: 'Test User',
            email: body.email ?? 'test@example.com',
            email_verified_at: emailVerified ? new Date().toISOString() : null,
          },
          two_factor: false,
        },
      },
      { status: 200 }
    )
  }),

  // Logout endpoint (Fortify route - no /api prefix)
  http.post('http://localhost:3000/logout', () => {
    return HttpResponse.json({
      message: 'Logged out successfully',
      redirect: '/login',
    })
  }),

  // Forgot password endpoint
  http.post('http://localhost:3000/api/forgot-password', async ({ request }) => {
    const raw = await request.json()
    const body = raw && typeof raw === 'object' ? (raw as { email?: string }) : {}
    if (!body.email) {
      return HttpResponse.json(
        { message: 'Validation Error', errors: { email: ['The email field is required.'] } },
        { status: 422 }
      )
    }
    if (body.email === 'unknown@example.com') {
      return HttpResponse.json(
        { message: "We couldn't find an account with that email address." },
        { status: 404 }
      )
    }
    return HttpResponse.json({ message: 'Password reset link sent to your email address.' })
  }),

  // Email verification endpoints
  http.get('http://localhost:3000/api/email/verify/:id/:hash', ({ params, request }) => {
    const url = new URL(request.url)
    const expires = url.searchParams.get('expires')
    const signature = url.searchParams.get('signature')

    if (!expires || !signature) {
      return HttpResponse.json({ message: 'Invalid verification link.' }, { status: 403 })
    }

    // Simulate expired link
    if (params.hash === 'expired-hash') {
      return HttpResponse.json(
        { message: 'Invalid or expired verification link.' },
        { status: 403 }
      )
    }

    return HttpResponse.json({
      data: {
        message: 'Email verified successfully.',
        verified: true,
      },
    })
  }),

  http.post('http://localhost:3000/api/email/verification-notification', () => {
    return HttpResponse.json({
      data: {
        message:
          'We have sent you verification email, please check your inbox and click the link to verify your email address. If you did not receive the email, check your spam folder.',
        email_sent: true,
      },
    })
  }),

  http.get('http://localhost:3000/api/email/verification-status', () => {
    return HttpResponse.json({
      data: {
        verified: false,
        email: 'test@example.com',
      },
    })
  }),

  // CSRF cookie endpoint
  http.get('http://localhost:3000/sanctum/csrf-cookie', () => {
    return new HttpResponse(null, { status: 204 })
  }),
]

const photoHandlers = [
  // Legacy cat photo handlers
  http.post('http://localhost:3000/api/cats/:catId/photos', () => {
    return HttpResponse.json(mockPet, { status: 200 })
  }),
  http.delete('http://localhost:3000/api/cats/:catId/photos', () => {
    return new HttpResponse(null, { status: 204 })
  }),
  // New pet photo handlers
  http.post('http://localhost:3000/api/pets/:petId/photos', () => {
    return HttpResponse.json({ data: mockPet }, { status: 200 })
  }),
  http.delete('http://localhost:3000/api/pets/:petId/photos/:photoId', () => {
    return new HttpResponse(null, { status: 204 })
  }),
]

// Mock categories data
const mockCategories = [
  {
    id: 1,
    name: 'Indoor',
    slug: 'indoor',
    pet_type_id: 1,
    description: 'Indoor pets',
    created_by: null,
    approved_at: '2023-01-01T00:00:00Z',
    usage_count: 10,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'Playful',
    slug: 'playful',
    pet_type_id: 1,
    description: 'Playful pets',
    created_by: null,
    approved_at: '2023-01-01T00:00:00Z',
    usage_count: 5,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  },
]

const categoryHandlers = [
  // Get categories for a pet type
  http.get('http://localhost:3000/api/categories', ({ request }) => {
    const url = new URL(request.url)
    const petTypeId = url.searchParams.get('pet_type_id')
    const search = url.searchParams.get('search')

    let filtered = mockCategories
    if (petTypeId) {
      filtered = filtered.filter((c) => c.pet_type_id === Number(petTypeId))
    }
    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter((c) => c.name.toLowerCase().includes(searchLower))
    }

    return HttpResponse.json({ data: filtered })
  }),

  // Create a new category
  http.post('http://localhost:3000/api/categories', async ({ request }) => {
    const body = (await request.json()) as {
      name: string
      pet_type_id: number
      description?: string
    }

    const newCategory = {
      id: mockCategories.length + 1,
      name: body.name,
      slug: body.name.toLowerCase().replace(/\s+/g, '-'),
      pet_type_id: body.pet_type_id,
      description: body.description ?? null,
      created_by: 1,
      approved_at: null,
      usage_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    return HttpResponse.json({ data: newCategory }, { status: 201 })
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
    return HttpResponse.json({ version: 'v0.5.0' })
  }),
]

const weightHistoryHandlers = [
  // New pet-based weights endpoints
  http.get('http://localhost:3000/api/pets/:petId/weights', () => {
    return HttpResponse.json({
      data: {
        data: [],
        links: { first: null, last: null, prev: null, next: null },
        meta: {
          current_page: 1,
          from: null,
          last_page: 1,
          path: '/api/pets/1/weights',
          per_page: 25,
          to: null,
          total: 0,
        },
      },
    })
  }),
  http.post('http://localhost:3000/api/pets/:petId/weights', async ({ request }) => {
    const body = (await request.json()) as { weight_kg?: number; record_date?: string }
    if (!body.weight_kg || !body.record_date) {
      return HttpResponse.json(
        {
          message: 'Validation Error',
          errors: { weight_kg: ['Required'], record_date: ['Required'] },
        },
        { status: 422 }
      )
    }
    return HttpResponse.json(
      {
        data: {
          id: Date.now(),
          pet_id: 1,
          weight_kg: body.weight_kg,
          record_date: body.record_date,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      },
      { status: 201 }
    )
  }),
  http.put(
    'http://localhost:3000/api/pets/:petId/weights/:weightId',
    async ({ request, params }) => {
      const body = (await request.json()) as Partial<{ weight_kg: number; record_date: string }>
      return HttpResponse.json({
        data: {
          id: Number(params.weightId),
          pet_id: Number(params.petId),
          weight_kg: body.weight_kg ?? 4.2,
          record_date: body.record_date ?? '2024-01-01',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      })
    }
  ),
  http.delete('http://localhost:3000/api/pets/:petId/weights/:weightId', () => {
    return HttpResponse.json({ data: true })
  }),

  // Legacy cat endpoint retained for backward compatibility tests
  http.post('http://localhost:3000/api/cats/:catId/weight-history', () => {
    return HttpResponse.json({}, { status: 201 })
  }),
]

const medicalNoteHandlers = [
  http.get('http://localhost:3000/api/pets/:petId/medical-notes', () => {
    return HttpResponse.json({
      data: {
        data: [],
        links: { first: null, last: null, prev: null, next: null },
        meta: {
          current_page: 1,
          from: null,
          last_page: 1,
          path: '/api/pets/1/medical-notes',
          per_page: 25,
          to: null,
          total: 0,
        },
      },
    })
  }),
  http.post('http://localhost:3000/api/pets/:petId/medical-notes', async ({ request, params }) => {
    const body = (await request.json()) as { note?: string; record_date?: string }
    if (!body.note || !body.record_date) {
      return HttpResponse.json(
        { message: 'Validation Error', errors: { note: ['Required'], record_date: ['Required'] } },
        { status: 422 }
      )
    }
    return HttpResponse.json(
      {
        data: {
          id: Date.now(),
          pet_id: Number(params.petId),
          note: body.note,
          record_date: body.record_date,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      },
      { status: 201 }
    )
  }),
  http.put(
    'http://localhost:3000/api/pets/:petId/medical-notes/:noteId',
    async ({ request, params }) => {
      const body = (await request.json()) as Partial<{ note: string; record_date: string }>
      return HttpResponse.json({
        data: {
          id: Number(params.noteId),
          pet_id: Number(params.petId),
          note: body.note ?? 'Note',
          record_date: body.record_date ?? '2024-01-01',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      })
    }
  ),
  http.delete('http://localhost:3000/api/pets/:petId/medical-notes/:noteId', () => {
    return HttpResponse.json({ data: true })
  }),
]

const vaccinationHandlers = [
  http.get('http://localhost:3000/api/pets/:petId/vaccinations', () => {
    return HttpResponse.json({
      data: {
        data: [],
        links: { first: null, last: null, prev: null, next: null },
        meta: {
          current_page: 1,
          from: null,
          last_page: 1,
          path: '/api/pets/1/vaccinations',
          per_page: 25,
          to: null,
          total: 0,
        },
      },
    })
  }),
  http.post('http://localhost:3000/api/pets/:petId/vaccinations', async ({ request, params }) => {
    const body = (await request.json()) as {
      vaccine_name?: string
      administered_at?: string
      due_at?: string | null
      notes?: string | null
    }
    if (!body.vaccine_name || !body.administered_at) {
      return HttpResponse.json(
        {
          message: 'Validation Error',
          errors: { vaccine_name: ['Required'], administered_at: ['Required'] },
        },
        { status: 422 }
      )
    }
    return HttpResponse.json(
      {
        data: {
          id: Date.now(),
          pet_id: Number(params.petId),
          vaccine_name: body.vaccine_name,
          administered_at: body.administered_at,
          due_at: body.due_at ?? null,
          notes: body.notes ?? null,
          reminder_sent_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      },
      { status: 201 }
    )
  }),
  http.put(
    'http://localhost:3000/api/pets/:petId/vaccinations/:recordId',
    async ({ request, params }) => {
      const body = (await request.json()) as Partial<{
        vaccine_name: string
        administered_at: string
        due_at?: string | null
        notes?: string | null
      }>
      return HttpResponse.json({
        data: {
          id: Number(params.recordId),
          pet_id: Number(params.petId),
          vaccine_name: body.vaccine_name ?? 'Rabies',
          administered_at: body.administered_at ?? '2024-01-01',
          due_at: body.due_at ?? null,
          notes: body.notes ?? null,
          reminder_sent_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      })
    }
  ),
  http.delete('http://localhost:3000/api/pets/:petId/vaccinations/:recordId', () => {
    return HttpResponse.json({ data: true })
  }),
]

const microchipHandlers = [
  http.get('http://localhost:3000/api/pets/:petId/microchips', () => {
    return HttpResponse.json({
      data: {
        data: [],
        links: { first: null, last: null, prev: null, next: null },
        meta: {
          current_page: 1,
          from: null,
          last_page: 1,
          path: '/api/pets/1/microchips',
          per_page: 25,
          to: null,
          total: 0,
        },
      },
    })
  }),
  http.post('http://localhost:3000/api/pets/:petId/microchips', async ({ request, params }) => {
    const body = (await request.json()) as {
      chip_number?: string
      issuer?: string | null
      implanted_at?: string | null
    }
    if (!body.chip_number) {
      return HttpResponse.json(
        { message: 'Validation Error', errors: { chip_number: ['Required'] } },
        { status: 422 }
      )
    }
    return HttpResponse.json(
      {
        data: {
          id: Date.now(),
          pet_id: Number(params.petId),
          chip_number: body.chip_number,
          issuer: body.issuer ?? null,
          implanted_at: body.implanted_at ?? null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      },
      { status: 201 }
    )
  }),
  http.put(
    'http://localhost:3000/api/pets/:petId/microchips/:microchipId',
    async ({ request, params }) => {
      const body = (await request.json()) as Partial<{
        chip_number: string
        issuer?: string | null
        implanted_at?: string | null
      }>
      return HttpResponse.json({
        data: {
          id: Number(params.microchipId),
          pet_id: Number(params.petId),
          chip_number: body.chip_number ?? '982000000000000',
          issuer: body.issuer ?? null,
          implanted_at: body.implanted_at ?? null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      })
    }
  ),
  http.delete('http://localhost:3000/api/pets/:petId/microchips/:microchipId', () => {
    return HttpResponse.json({ data: true })
  }),
]

const placementRequestHandlers = [
  http.post('http://localhost:3000/api/placement-requests', async ({ request }) => {
    const raw = await request.json()
    const body = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
    return HttpResponse.json({ data: { id: 1, ...body } }, { status: 201 })
  }),
]

const inviteSystemHandlers = [
  // Public settings endpoint
  http.get('http://localhost:3000/api/settings/public', () => {
    return HttpResponse.json({
      data: {
        invite_only_enabled: false,
      },
    })
  }),

  // Auth endpoints for invite system
  http.get('http://localhost:3000/api/user', () => {
    return HttpResponse.json({
      data: {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        email_verified_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    })
  }),

  // Waitlist endpoints
  http.post('http://localhost:3000/api/waitlist', async ({ request }) => {
    const raw = await request.json()
    const body = raw && typeof raw === 'object' ? (raw as { email?: string }) : {}

    if (!body.email) {
      return HttpResponse.json(
        {
          error: 'Invalid email format',
        },
        { status: 409 }
      )
    }

    if (body.email === 'existing@example.com') {
      return HttpResponse.json(
        {
          error: 'Email is already on waitlist',
        },
        { status: 409 }
      )
    }

    if (body.email === 'registered@example.com') {
      return HttpResponse.json(
        {
          error: 'Email is already registered',
        },
        { status: 409 }
      )
    }

    return HttpResponse.json(
      {
        data: {
          email: body.email,
          status: 'pending',
          created_at: new Date().toISOString(),
        },
      },
      { status: 201 }
    )
  }),

  // Invitation endpoints
  http.get('http://localhost:3000/api/invitations', () => {
    // In test environment, be more lenient with auth
    // Return mock invitations for testing
    return HttpResponse.json({
      data: [
        {
          id: 1,
          code: 'abc123',
          status: 'pending',
          expires_at: null,
          created_at: new Date().toISOString(),
          invitation_url: 'http://localhost:3000/register?invitation_code=abc123',
        },
        {
          id: 2,
          code: 'def456',
          status: 'accepted',
          expires_at: null,
          created_at: new Date().toISOString(),
          invitation_url: 'http://localhost:3000/register?invitation_code=def456',
        },
        {
          id: 3,
          code: 'ghi789',
          status: 'expired',
          expires_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          created_at: new Date().toISOString(),
          invitation_url: 'http://localhost:3000/register?invitation_code=ghi789',
        },
      ],
    })
  }),

  http.get('http://localhost:3000/api/invitations/stats', () => {
    // In test environment, be more lenient with auth
    return HttpResponse.json({
      data: {
        total: 3,
        pending: 1,
        accepted: 1,
        expired: 1,
        revoked: 0,
      },
    })
  }),

  http.post('http://localhost:3000/api/invitations', () => {
    // In test environment, be more lenient with auth
    return HttpResponse.json(
      {
        data: {
          id: Date.now(),
          code: 'mock-code-' + String(Date.now()),
          status: 'pending',
          expires_at: null,
          created_at: new Date().toISOString(),
          invitation_url: `http://localhost:3000/register?invitation_code=mock-code-${String(Date.now())}`,
        },
      },
      { status: 201 }
    )
  }),

  http.delete('http://localhost:3000/api/invitations/:id', () => {
    // In test environment, be more lenient with auth
    return HttpResponse.json({
      data: [],
    })
  }),

  http.post('http://localhost:3000/api/invitations/validate', async ({ request }) => {
    const raw = await request.json()
    const body = raw && typeof raw === 'object' ? (raw as { code?: string }) : {}

    if (body.code === 'valid-code-123') {
      return HttpResponse.json({
        data: {
          valid: true,
          inviter: {
            name: 'John Doe',
          },
          expires_at: null,
        },
      })
    }

    return HttpResponse.json(
      {
        error: 'Invalid or expired invitation code',
      },
      { status: 404 }
    )
  }),
]

export const handlers = [
  ...petHandlers,
  ...userHandlers,
  ...photoHandlers,
  ...categoryHandlers,
  ...messageHandlers,
  ...transferRequestHandlers,
  ...versionHandlers,
  ...weightHistoryHandlers,
  ...medicalNoteHandlers,
  ...vaccinationHandlers,
  ...microchipHandlers,
  ...placementRequestHandlers,
  ...helperProfileHandlers,
  ...inviteSystemHandlers,
  // notifications (simple in-memory mock)
  ...(() => {
    const mem: AppNotification[] = [
      {
        id: 'n1',
        level: 'info',
        title: 'Welcome to Meo!',
        body: 'Thanks for joining the community.',
        url: '/account',
        created_at: new Date(Date.now() - 60_000).toISOString(),
        read_at: null,
      },
      {
        id: 'n2',
        level: 'success',
        title: 'Profile updated',
        body: 'Your profile changes were saved.',
        url: null,
        created_at: new Date(Date.now() - 120_000).toISOString(),
        read_at: null,
      },
    ]
    return [
      http.get('http://localhost:3000/api/notifications/unified', ({ request }) => {
        const url = new URL(request.url)
        const limit = Number(url.searchParams.get('limit') ?? '20')
        const includeBell = (url.searchParams.get('include_bell_notifications') ?? '1') !== '0'

        const bell = includeBell ? mem.slice(0, Number.isFinite(limit) ? limit : 20) : []
        const unreadBell = mem.filter((n) => !n.read_at).length

        return HttpResponse.json({
          bell_notifications: bell,
          unread_bell_count: unreadBell,
          unread_message_count: 0,
        })
      }),
      http.post('http://localhost:3000/api/notifications/mark-all-read', async () => {
        const now = new Date().toISOString()
        // Use nullish assignment to only set read_at when missing
        mem.forEach((n) => {
          n.read_at ??= now
        })
        // small await to satisfy require-await rule in some linters
        await Promise.resolve()
        return new HttpResponse(null, { status: 204 })
      }),
      http.patch('http://localhost:3000/api/notifications/:id/read', ({ params }) => {
        const id = params.id as string
        const item = mem.find((n) => n.id === id)
        if (item && !item.read_at) item.read_at = new Date().toISOString()
        return new HttpResponse(null, { status: 204 })
      }),
    ]
  })(),
]
