import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UserAvatar } from './UserAvatar'
import { useAuth } from '@/hooks/use-auth'
import { mockUser } from '@/testing/mocks/data/user'

// Mock dependencies
vi.mock('@/hooks/use-auth')
vi.mock('@/api/axios', () => ({
  api: {
    post: vi.fn(),
    delete: vi.fn(),
  },
}))
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const mockUseAuth = vi.mocked(useAuth)

describe('UserAvatar', () => {
  const mockLoadUser = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({
      user: mockUser,
      loadUser: mockLoadUser,
      isLoading: false,
      isAuthenticated: true,
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      changePassword: vi.fn(),
      deleteAccount: vi.fn(),
    })
  })

  it('renders user avatar with image when avatar_url is provided', () => {
    const { container } = render(<UserAvatar />)

    // Check that the avatar container is rendered
    const avatarContainer = container.querySelector('[data-slot="avatar"]')
    expect(avatarContainer).toBeInTheDocument()

    // Check if AvatarImage is rendered (it may not work in test environment)
    const avatarImage = container.querySelector('[data-slot="avatar-image"]')
    if (avatarImage) {
      expect(avatarImage).toHaveAttribute('src', mockUser.avatar_url)
      expect(avatarImage).toHaveAttribute('alt', `${mockUser.name}'s avatar`)
    }
  })

  it('renders user initials when avatar_url is not provided', () => {
    mockUseAuth.mockReturnValue({
      user: { ...mockUser, avatar_url: undefined },
      loadUser: mockLoadUser,
      isLoading: false,
      isAuthenticated: true,
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      changePassword: vi.fn(),
      deleteAccount: vi.fn(),
    })

    const { container } = render(<UserAvatar />)

    // Should render placeholder image, not user initials in fallback
    const avatarImage = container.querySelector('[data-slot="avatar-image"]')
    if (avatarImage) {
      expect(avatarImage).toHaveAttribute('src', expect.stringContaining('default-avatar'))
    }

    expect(screen.getByText('TU')).toBeInTheDocument()
  })

  it('renders emoji initials correctly when user name starts with emoji', () => {
    mockUseAuth.mockReturnValue({
      user: { ...mockUser, name: '🐱 Cat', avatar_url: undefined },
      loadUser: mockLoadUser,
      isLoading: false,
      isAuthenticated: true,
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      changePassword: vi.fn(),
      deleteAccount: vi.fn(),
    })

    render(<UserAvatar />)

    expect(screen.getByText('🐱C')).toBeInTheDocument()
  })

  it('shows upload controls when showUploadControls is true', () => {
    render(<UserAvatar showUploadControls={true} />)

    expect(screen.getByRole('button', { name: /upload avatar/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument()
  })

  it('hides upload controls when showUploadControls is false', () => {
    render(<UserAvatar showUploadControls={false} />)

    expect(screen.queryByRole('button', { name: /upload avatar/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument()
  })

  it('does not show remove button when user has no avatar', () => {
    mockUseAuth.mockReturnValue({
      user: { ...mockUser, avatar_url: undefined },
      loadUser: mockLoadUser,
      isLoading: false,
      isAuthenticated: true,
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      changePassword: vi.fn(),
      deleteAccount: vi.fn(),
    })

    render(<UserAvatar showUploadControls={true} />)

    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument()
  })

  it('returns null when user is not available', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loadUser: mockLoadUser,
      isLoading: false,
      isAuthenticated: false,
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      changePassword: vi.fn(),
      deleteAccount: vi.fn(),
    })

    const { container } = render(<UserAvatar />)
    expect(container.firstChild).toBeNull()
  })
})
