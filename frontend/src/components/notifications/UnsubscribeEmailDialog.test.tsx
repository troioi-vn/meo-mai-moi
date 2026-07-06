import { describe, it, expect, vi, beforeEach } from 'vite-plus/test'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithRouter } from '@/testing'
import { UnsubscribeEmailDialog } from './UnsubscribeEmailDialog'
import { toast } from 'sonner'
import type { User } from '@/types/user'

const postMock = vi.hoisted(() => vi.fn())

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/api/axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/axios')>()
  return {
    ...actual,
    api: {
      ...actual.api,
      post: postMock,
    },
  }
})

const mockUser: User = {
  id: 42,
  name: 'Test User',
  email: 'test@example.com',
  email_verified_at: '2024-01-01T00:00:00Z',
  storage_used_bytes: 0,
  storage_limit_bytes: 50 * 1024 * 1024,
}

const token = 'a'.repeat(64)

function renderDialog(
  search: string,
  auth: { user: User | null; isAuthenticated: boolean } = {
    user: mockUser,
    isAuthenticated: true,
  }
) {
  return renderWithRouter(<UnsubscribeEmailDialog onSuccess={vi.fn()} />, {
    initialEntries: [`/settings/notifications${search}`],
    initialAuthState: {
      user: auth.user,
      isAuthenticated: auth.isAuthenticated,
      isLoading: false,
    },
  })
}

const mockPost = postMock

describe('UnsubscribeEmailDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPost.mockResolvedValue({ data: { success: true } })
  })

  it('opens when unsubscribe query params are present', async () => {
    renderDialog(
      `?unsubscribe=1&user=${mockUser.id}&type=pet_birthday&token=${token}&channel=email`
    )

    expect(await screen.findByText('Unsubscribe from all email notifications?')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Do you want to unsubscribe from all email notifications? You can manage your notifications on this page.'
      )
    ).toBeInTheDocument()
  })

  it('does not open without unsubscribe query flag', () => {
    renderDialog(`?user=${mockUser.id}&type=pet_birthday&token=${token}`)

    expect(screen.queryByText('Unsubscribe from all email notifications?')).not.toBeInTheDocument()
  })

  it('confirms unsubscribe via API and shows success toast', async () => {
    const user = userEvent.setup()
    const onSuccess = vi.fn()
    renderWithRouter(<UnsubscribeEmailDialog onSuccess={onSuccess} />, {
      initialEntries: [
        `/settings/notifications?unsubscribe=1&user=${mockUser.id}&type=pet_birthday&token=${token}`,
      ],
      initialAuthState: {
        user: mockUser,
        isAuthenticated: true,
        isLoading: false,
      },
    })

    await user.click(await screen.findByRole('button', { name: 'Unsubscribe from all' }))

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/unsubscribe', {
        user: mockUser.id,
        type: 'pet_birthday',
        token,
        channel: 'email',
        scope: 'all',
      })
    })

    expect(toast.success).toHaveBeenCalled()
    expect(onSuccess).toHaveBeenCalled()
  })
})
