import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useInviteSystem } from './use-invite-system'
import { server } from '@/mocks/server'
import { HttpResponse, http } from 'msw'

// Mock useSearchParams with proper methods
const mockSearchParams = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
  clear: vi.fn(),
  has: vi.fn(),
  toString: vi.fn(() => ''),
  entries: vi.fn(() => []),
  keys: vi.fn(() => []),
  values: vi.fn(() => []),
}
const mockSetSearchParams = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...(actual as object),
    useSearchParams: () => [mockSearchParams, mockSetSearchParams],
  }
})

describe('useInviteSystem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSearchParams.clear()
    mockSearchParams.get.mockReturnValue(null) // Default: no invitation code
  })

  it('returns open-registration mode when invite-only is disabled', async () => {
    server.use(
      http.get('http://localhost:3000/api/settings/public', () => {
        return HttpResponse.json({
          data: {
            invite_only_enabled: false
          }
        })
      })
    )

    const { result } = renderHook(() => useInviteSystem())

    await waitFor(() => {
      expect(result.current.mode).toBe('open-registration')
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })

  it('returns invite-only-no-code mode when invite-only is enabled without invitation code', async () => {
    server.use(
      http.get('http://localhost:3000/api/settings/public', () => {
        return HttpResponse.json({
          data: {
            invite_only_enabled: true
          }
        })
      })
    )

    const { result } = renderHook(() => useInviteSystem())

    await waitFor(() => {
      expect(result.current.mode).toBe('invite-only-no-code')
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })

  it('returns invite-only-with-code mode when invite-only is enabled with valid invitation code', async () => {
    mockSearchParams.get.mockImplementation((key) => 
      key === 'invitation_code' ? 'valid-code-123' : null
    )

    server.use(
      http.get('http://localhost:3000/api/settings/public', () => {
        return HttpResponse.json({
          data: {
            invite_only_enabled: true
          }
        })
      }),
      http.post('http://localhost:3000/api/invitations/validate', () => {
        return HttpResponse.json({
          data: {
            valid: true,
            inviter: {
              name: 'John Doe'
            },
            expires_at: null
          }
        })
      })
    )

    const { result } = renderHook(() => useInviteSystem())

    await waitFor(() => {
      expect(result.current.mode).toBe('invite-only-with-code')
      expect(result.current.invitationCode).toBe('valid-code-123')
      expect(result.current.invitationValidation?.inviter.name).toBe('John Doe')
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })

  it('returns invite-only-no-code mode when invitation code is invalid', async () => {
    mockSearchParams.get.mockImplementation((key) => 
      key === 'invitation_code' ? 'invalid-code' : null
    )

    server.use(
      http.get('http://localhost:3000/api/settings/public', () => {
        return HttpResponse.json({
          data: {
            invite_only_enabled: true
          }
        })
      }),
      http.post('http://localhost:3000/api/invitations/validate', () => {
        return HttpResponse.json({
          error: 'Invalid or expired invitation code'
        }, { status: 404 })
      })
    )

    const { result } = renderHook(() => useInviteSystem())

    await waitFor(() => {
      expect(result.current.mode).toBe('invite-only-no-code')
      expect(result.current.invitationCode).toBe('invalid-code') // Code is preserved
      expect(result.current.invitationValidation).toBeNull()
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe('Invalid or expired invitation code. You can join the waitlist instead.')
    })
  })

  it('allows invitation code in open registration mode', async () => {
    mockSearchParams.get.mockImplementation((key) => 
      key === 'invitation_code' ? 'valid-code-123' : null
    )

    server.use(
      http.get('http://localhost:3000/api/settings/public', () => {
        return HttpResponse.json({
          data: {
            invite_only_enabled: false
          }
        })
      }),
      http.post('http://localhost:3000/api/invitations/validate', () => {
        return HttpResponse.json({
          data: {
            valid: true,
            inviter: {
              name: 'Jane Doe'
            },
            expires_at: null
          }
        })
      })
    )

    const { result } = renderHook(() => useInviteSystem())

    await waitFor(() => {
      expect(result.current.mode).toBe('open-registration')
      expect(result.current.invitationCode).toBe('valid-code-123')
      expect(result.current.invitationValidation).toBeNull() // Not validated in open mode
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })

  it('handles settings fetch error', async () => {
    server.use(
      http.get('http://localhost:3000/api/settings/public', () => {
        return HttpResponse.json({
          error: 'Server error'
        }, { status: 500 })
      })
    )

    const { result } = renderHook(() => useInviteSystem())

    await waitFor(() => {
      expect(result.current.mode).toBe('open-registration') // Keeps initial state on error
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe('Failed to load registration settings. Please try again.')
    })
  })

  it('handles invitation validation error gracefully', async () => {
    mockSearchParams.get.mockImplementation((key) => 
      key === 'invitation_code' ? 'error-code' : null
    )

    server.use(
      http.get('http://localhost:3000/api/settings/public', () => {
        return HttpResponse.json({
          data: {
            invite_only_enabled: true
          }
        })
      }),
      http.post('http://localhost:3000/api/invitations/validate', () => {
        return HttpResponse.json({
          error: 'Server error'
        }, { status: 500 })
      })
    )

    const { result } = renderHook(() => useInviteSystem())

    await waitFor(() => {
      expect(result.current.mode).toBe('invite-only-no-code')
      expect(result.current.invitationCode).toBe('error-code') // Code is still set
      expect(result.current.invitationValidation).toBeNull()
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe('Invalid or expired invitation code. You can join the waitlist instead.')
    })
  })

  it('shows loading state initially', () => {
    server.use(
      http.get('http://localhost:3000/api/settings/public', async () => {
        await new Promise(resolve => setTimeout(resolve, 100))
        return HttpResponse.json({
          data: {
            invite_only_enabled: false
          }
        })
      })
    )

    const { result } = renderHook(() => useInviteSystem())

    expect(result.current.isLoading).toBe(true)
    expect(result.current.mode).toBe('open-registration') // Initial state
    expect(result.current.error).toBeNull()
  })

  it('clears error when clearError is called', async () => {
    server.use(
      http.get('http://localhost:3000/api/settings/public', () => {
        return HttpResponse.json({
          error: 'Server error'
        }, { status: 500 })
      })
    )

    const { result } = renderHook(() => useInviteSystem())

    await waitFor(() => {
      expect(result.current.error).toBe('Failed to load registration settings. Please try again.')
    })

    act(() => {
      result.current.clearError()
    })

    expect(result.current.error).toBeNull()
  })

  // Note: URL cleanup functionality not implemented yet
  // it('removes invitation code from URL when validation fails', async () => {
  //   // This would be a nice enhancement for the future
  // })
})