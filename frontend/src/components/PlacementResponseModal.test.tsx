import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PlacementResponseModal } from './PlacementResponseModal'
import { server } from '@/mocks/server'
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
    catName: 'Fluffy',
    catId: 1,
    placementRequestId: 101,
  }

  it('loads helper profiles and keeps Submit disabled until selections are made', async () => {
    render(<PlacementResponseModal {...baseProps} />)

    // Two comboboxes should be present (profile and relationship type)
    const combos = await screen.findAllByRole('combobox')
    await waitFor(() => {
      expect(combos.length).toBeGreaterThanOrEqual(2)
      expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled()
    })
  })

  it('shows confirmation step after selecting profile and relationship type', async () => {
    render(<PlacementResponseModal {...baseProps} />)

    // Select a helper profile
    const [profileCombo, typeCombo] = await screen.findAllByRole('combobox')
    await user.click(profileCombo)
    await user.click(await screen.findByText(/testville, ts/i))

    // Select relationship type
    await user.click(typeCombo)
    await user.click(await screen.findByText(/fostering/i))

    await user.click(screen.getByRole('button', { name: /submit/i }))

    await waitFor(async () => {
      expect(await screen.findByText(/are you sure you want to submit/i)).toBeInTheDocument()
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

    render(<PlacementResponseModal {...baseProps} onClose={onClose} />)
    await waitFor(async () => {
      expect(await screen.findAllByRole('combobox')).toHaveLength(2)
    })

    // Select a helper profile
    const [profileCombo, typeCombo] = await screen.findAllByRole('combobox')
    await user.click(profileCombo)
    await user.click(await screen.findByText(/testville, ts/i))

    // Select relationship type
    await user.click(typeCombo)
    await user.click(await screen.findByText(/fostering/i))

    await user.click(screen.getByRole('button', { name: /submit/i }))

    // Confirm
    await user.click(await screen.findByRole('button', { name: /confirm submission/i }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled()
      expect(onClose).toHaveBeenCalled()
    })
  })
})
