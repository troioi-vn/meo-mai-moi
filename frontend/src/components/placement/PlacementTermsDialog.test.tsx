import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render, testQueryClient } from '@/testing'
import { vi, describe, it, expect, beforeEach } from 'vite-plus/test'
import { PlacementTermsDialog, PlacementTermsLink } from './PlacementTermsDialog'
import * as legalApi from '@/api/generated/legal/legal'

// Mock the API
vi.mock('@/api/generated/legal/legal')

describe('PlacementTermsDialog', () => {
  beforeEach(() => {
    testQueryClient.clear()
    vi.clearAllMocks()
  })

  it('renders loading state when open', async () => {
    vi.mocked(legalApi.getLegalPlacementTerms).mockImplementation(
      () => new Promise(() => {}) // Never resolves - stays in loading state
    )

    render(<PlacementTermsDialog open={true} onOpenChange={() => {}} />)

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

    render(<PlacementTermsDialog open={true} onOpenChange={() => {}} />)

    expect(await screen.findByRole('heading', { name: 'Placement Terms' })).toBeInTheDocument()
    expect(screen.getByText('First rule.')).toBeInTheDocument()
    expect(screen.getByText('Be nice to pets.')).toBeInTheDocument()
    expect(screen.getByText('(Version: 2025-12-02)')).toBeInTheDocument()
  })

  it('renders error state when API fails', async () => {
    vi.mocked(legalApi.getLegalPlacementTerms).mockRejectedValue(new Error('Network error'))

    render(<PlacementTermsDialog open={true} onOpenChange={() => {}} />)

    expect(
      await screen.findByText('Failed to load terms. Please try again later.')
    ).toBeInTheDocument()
    expect(screen.getByText('Placement Terms & Conditions')).toBeInTheDocument()
  })

  it('does not fetch when closed', () => {
    vi.mocked(legalApi.getLegalPlacementTerms).mockResolvedValue({
      content: '# Test',
      version: '2025-12-02',
    })

    render(<PlacementTermsDialog open={false} onOpenChange={() => {}} />)

    expect(legalApi.getLegalPlacementTerms).not.toHaveBeenCalled()
  })
})

describe('PlacementTermsLink', () => {
  beforeEach(() => {
    testQueryClient.clear()
    vi.clearAllMocks()
  })

  it('renders the link button', () => {
    render(<PlacementTermsLink />)

    expect(screen.getByText('Placement Terms & Conditions')).toBeInTheDocument()
  })

  it('opens the dialog when clicked', async () => {
    const user = userEvent.setup()
    vi.mocked(legalApi.getLegalPlacementTerms).mockResolvedValue({
      content: '# Placement Terms\n\nTest content.',
      version: '2025-12-02',
    })

    render(<PlacementTermsLink />)

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
