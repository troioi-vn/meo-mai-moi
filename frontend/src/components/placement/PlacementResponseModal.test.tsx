import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PlacementResponseModal } from './PlacementResponseModal'
import { server } from '@/testing/mocks/server'
import { http, HttpResponse } from 'msw'
import { toast } from 'sonner'

vi.mock('sonner')

describe('PlacementResponseModal', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const baseProps = {
    isOpen: true,
    onClose: vi.fn(),
    petName: 'Fluffy',
    petId: 1,
    placementRequestId: 101,
    requestType: 'foster_free',
    petCity: 'Testville',
    petCountry: 'VN',
  }

  it('loads helper profiles and auto-selects when only one profile exists', async () => {
    render(
      <MemoryRouter>
        <PlacementResponseModal {...baseProps} />
      </MemoryRouter>
    )

    // Wait for profile to be loaded and auto-selected (only one profile in mock data)
    await waitFor(() => {
      // There should be at least 1 combobox (helper profile, and possibly fostering type)
      const combos = screen.getAllByRole('combobox')
      expect(combos.length).toBeGreaterThanOrEqual(1)
    })

    // Submit button should be enabled since profile is auto-selected and request type matches
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /submit/i })).toBeEnabled()
    })
  })

  it('shows confirmation step after selecting profile', async () => {
    render(
      <MemoryRouter>
        <PlacementResponseModal {...baseProps} />
      </MemoryRouter>
    )

    // Wait for profile to be loaded
    await waitFor(() => {
      const combos = screen.getAllByRole('combobox')
      expect(combos.length).toBeGreaterThanOrEqual(1)
    })

    await user.click(screen.getByRole('button', { name: /submit/i }))

    await waitFor(async () => {
      expect(await screen.findByText(/please review your response details/i)).toBeInTheDocument()
    })
  })

  it('submits the response and closes modal on success', async () => {
    const onClose = vi.fn()

    // Ensure POST succeeds
    server.use(
      http.post('http://localhost:3000/api/transfer-requests', () => {
        return HttpResponse.json({ id: 999 }, { status: 201 })
      })
    )

    render(
      <MemoryRouter>
        <PlacementResponseModal {...baseProps} onClose={onClose} />
      </MemoryRouter>
    )

    // Wait for profile to be loaded
    await waitFor(() => {
      const combos = screen.getAllByRole('combobox')
      expect(combos.length).toBeGreaterThanOrEqual(1)
    })

    await user.click(screen.getByRole('button', { name: /submit/i }))

    // Confirm
    await user.click(await screen.findByRole('button', { name: /confirm submission/i }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled()
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('shows warning when request type does not match helper profile allowed types', async () => {
    // Use a request type that's not in the mock helper profile's allowed types
    render(
      <MemoryRouter>
        <PlacementResponseModal {...baseProps} requestType="foster_payed" />
      </MemoryRouter>
    )

    // Wait for profile to be loaded
    await waitFor(() => {
      const combos = screen.getAllByRole('combobox')
      expect(combos.length).toBeGreaterThanOrEqual(1)
    })

    // Should show warning about request type mismatch
    await waitFor(() => {
      expect(screen.getByText(/this helper profile is not allowed to handle/i)).toBeInTheDocument()
    })

    // Submit button should be disabled
    expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled()
  })

  it('shows warning when city does not match', async () => {
    render(
      <MemoryRouter>
        <PlacementResponseModal {...baseProps} petCity="Other City" />
      </MemoryRouter>
    )

    // Wait for profile to be loaded
    await waitFor(() => {
      const combos = screen.getAllByRole('combobox')
      expect(combos.length).toBeGreaterThanOrEqual(1)
    })

    // Should show city warning
    await waitFor(() => {
      expect(screen.getByText(/outside of your city/i)).toBeInTheDocument()
    })

    // Submit button should still be enabled (city warning doesn't block)
    expect(screen.getByRole('button', { name: /submit/i })).toBeEnabled()
  })

  it('shows serious warning when country does not match', async () => {
    render(
      <MemoryRouter>
        <PlacementResponseModal {...baseProps} petCountry="US" />
      </MemoryRouter>
    )

    // Wait for profile to be loaded
    await waitFor(() => {
      const combos = screen.getAllByRole('combobox')
      expect(combos.length).toBeGreaterThanOrEqual(1)
    })

    // Should show country warning
    await waitFor(() => {
      expect(screen.getByText(/outside of your country/i)).toBeInTheDocument()
    })

    // Submit button should still be enabled (country warning doesn't block)
    expect(screen.getByRole('button', { name: /submit/i })).toBeEnabled()
  })
})
