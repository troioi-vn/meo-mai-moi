import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { PlacementTermsDialog, PlacementTermsLink } from './PlacementTermsDialog'
import * as legalApi from '@/api/generated/legal/legal'

// Mock the API
vi.mock('@/api/generated/legal/legal')

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

const renderWithQueryClient = (ui: React.ReactElement) => {
  const queryClient = createQueryClient()
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe('PlacementTermsDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state when open', async () => {
    vi.mocked(legalApi.getLegalPlacementTerms).mockImplementation(
      () => new Promise(() => {}) // Never resolves - stays in loading state
    )

    renderWithQueryClient(<PlacementTermsDialog open={true} onOpenChange={() => {}} />)

    expect(screen.getByText('Placement Terms & Conditions')).toBeInTheDocument()
    // Loading spinner should be visible (Loader2 icon)
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  it('renders terms content when loaded', async () => {
    vi.mocked(legalApi.getLegalPlacementTerms).mockResolvedValue({
      content: '# Placement Terms\n\n1. **First rule.**\n   Be nice to pets.',
      version: '2025-12-02',
    })

    renderWithQueryClient(<PlacementTermsDialog open={true} onOpenChange={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText('Placement Terms')).toBeInTheDocument()
    })
    expect(screen.getByText('First rule.')).toBeInTheDocument()
    expect(screen.getByText('Be nice to pets.')).toBeInTheDocument()
    expect(screen.getByText('(Version: 2025-12-02)')).toBeInTheDocument()
  })

  it('renders error state when API fails', async () => {
    vi.mocked(legalApi.getLegalPlacementTerms).mockRejectedValue(new Error('Network error'))

    renderWithQueryClient(<PlacementTermsDialog open={true} onOpenChange={() => {}} />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load terms. Please try again later.')).toBeInTheDocument()
    })
  })

  it('does not fetch when closed', () => {
    vi.mocked(legalApi.getLegalPlacementTerms).mockResolvedValue({
      content: '# Test',
      version: '2025-12-02',
    })

    renderWithQueryClient(<PlacementTermsDialog open={false} onOpenChange={() => {}} />)

    expect(legalApi.getLegalPlacementTerms).not.toHaveBeenCalled()
  })
})

describe('PlacementTermsLink', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the link button', () => {
    renderWithQueryClient(<PlacementTermsLink />)

    expect(screen.getByText('Placement Terms & Conditions')).toBeInTheDocument()
  })

  it('opens the dialog when clicked', async () => {
    const user = userEvent.setup()
    vi.mocked(legalApi.getLegalPlacementTerms).mockResolvedValue({
      content: '# Placement Terms\n\nTest content.',
      version: '2025-12-02',
    })

    renderWithQueryClient(<PlacementTermsLink />)

    const link = screen.getByText('Placement Terms & Conditions')
    await user.click(link)

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
    expect(
      screen.getByText('Please read these terms carefully before creating a placement request.')
    ).toBeInTheDocument()
  })
})
