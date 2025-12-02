import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { MockedFunction } from 'vitest'
import CreatePetPage from './CreatePetPage'
import { getPet, getPetTypes, updatePetStatus, deletePet } from '@/api/pets'
import { AuthProvider } from '@/contexts/AuthContext'

vi.mock('@/api/pets', async () => {
  const actual = await vi.importActual<typeof import('@/api/pets')>('@/api/pets')
  return {
    ...actual,
    getPet: vi.fn() as unknown as MockedFunction<(id: string) => Promise<any>>,
    getPetTypes: vi.fn() as unknown as MockedFunction<() => Promise<any[]>>,
    updatePetStatus: vi.fn() as unknown as MockedFunction<
      (id: string, status: string) => Promise<any>
    >,
    deletePet: vi.fn() as unknown as MockedFunction<
      (id: string, password: string) => Promise<void>
    >,
  }
})

// Mock sonner toast to avoid side effects
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Helper to render in edit mode with URL param
const renderEditPage = (petId = '1', initialUser = { id: 1, name: 'User', email: 'u@e.com' }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider initialUser={initialUser}>
          <Routes>
            <Route path="/pets/:id/edit" element={<CreatePetPage />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>,
    {
      wrapper: ({ children }) => {
        // Navigate to edit route
        window.history.pushState({}, 'Edit', `/pets/${petId}/edit`)
        return <>{children}</>
      },
    }
  )
}

describe('CreatePetPage edit controls', () => {
  const mockGetPet = getPet as unknown as MockedFunction<(id: string) => Promise<any>>
  const mockGetPetTypes = getPetTypes as unknown as MockedFunction<() => Promise<any[]>>
  const mockUpdatePetStatus = updatePetStatus as unknown as MockedFunction<
    (id: string, status: string) => Promise<any>
  >
  const mockDeletePet = deletePet as unknown as MockedFunction<
    (id: string, password: string) => Promise<void>
  >

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetPet.mockResolvedValue({
      id: 1,
      name: 'Fluffy',
      breed: 'Persian',
      country: 'VN',
      city: 'Hanoi',
      description: 'A cat',
      status: 'active',
      pet_type: { id: 1, name: 'Cat', slug: 'cat' },
    })
    mockGetPetTypes.mockResolvedValue([
      {
        id: 1,
        name: 'Cat',
        slug: 'cat',
        is_active: true,
        is_system: true,
        display_order: 1,
        placement_requests_allowed: true,
      },
    ])
  })

  it('shows current status and allows updating with confirmation dialog', async () => {
    const user = userEvent.setup()
    mockUpdatePetStatus.mockResolvedValue({ id: 1, status: 'lost' })

    renderEditPage('1')

    // Wait for page to load then navigate to Status tab
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /edit pet/i })).toBeInTheDocument()
    })

    const statusTab = screen.getByRole('tab', { name: /status/i })
    await user.click(statusTab)

    // Wait for current status to load
    await waitFor(() => {
      expect(screen.getByText('Current status:')).toBeInTheDocument()
    })

    // Open status select and choose Lost
    const statusCombo = screen.getByRole('combobox')
    await user.click(statusCombo)
    const lost = await screen.findByRole('option', { name: 'Lost' })
    await user.click(lost)

    // Click update - opens confirmation dialog
    const btn = screen.getByRole('button', { name: /Update status/i })
    await user.click(btn)

    // Confirm in dialog
    const confirmBtn = await screen.findByRole('button', { name: /confirm/i })
    await user.click(confirmBtn)

    await waitFor(() => {
      expect(mockUpdatePetStatus).toHaveBeenCalledWith('1', 'lost')
    })
  })

  it('does not update status if dialog is cancelled', async () => {
    const user = userEvent.setup()
    renderEditPage('1')

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /edit pet/i })).toBeInTheDocument()
    })

    const statusTab = screen.getByRole('tab', { name: /status/i })
    await user.click(statusTab)

    await waitFor(() => {
      expect(screen.getByText('Current status:')).toBeInTheDocument()
    })

    // Select Deceased
    const statusCombo = screen.getByRole('combobox')
    await user.click(statusCombo)
    const deceased = await screen.findByRole('option', { name: 'Deceased' })
    await user.click(deceased)

    // Click update - opens dialog
    const btn = screen.getByRole('button', { name: /Update status/i })
    await user.click(btn)

    // Cancel the dialog
    const cancelBtn = await screen.findByRole('button', { name: /cancel/i })
    await user.click(cancelBtn)

    // updatePetStatus should not be called
    await waitFor(() => {
      expect(mockUpdatePetStatus).not.toHaveBeenCalled()
    })
  })

  it('removes the pet when password is provided in modal', async () => {
    const user = userEvent.setup()
    mockDeletePet.mockResolvedValue(undefined)

    renderEditPage('1')

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /edit pet/i })).toBeInTheDocument()
    })

    const statusTab = screen.getByRole('tab', { name: /status/i })
    await user.click(statusTab)

    await waitFor(() => {
      expect(screen.getByText(/Danger zone/i)).toBeInTheDocument()
    })

    // Click Remove pet - opens dialog with password field inside
    const removeBtn = screen.getByRole('button', { name: /Remove pet/i })
    await user.click(removeBtn)

    // Enter password in the modal
    const pwField = await screen.findByPlaceholderText('Enter your password')
    await user.type(pwField, 'secret')

    // Click confirm
    const confirmBtn = screen.getByRole('button', { name: /Confirm remove/i })
    await user.click(confirmBtn)

    await waitFor(() => {
      expect(mockDeletePet).toHaveBeenCalledWith('1', 'secret')
    })
  })

  it('does not remove the pet without password in modal', async () => {
    const user = userEvent.setup()
    renderEditPage('1')

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /edit pet/i })).toBeInTheDocument()
    })

    const statusTab = screen.getByRole('tab', { name: /status/i })
    await user.click(statusTab)

    await waitFor(() => {
      expect(screen.getByText(/Danger zone/i)).toBeInTheDocument()
    })

    // Click Remove pet - opens dialog
    const removeBtn = screen.getByRole('button', { name: /Remove pet/i })
    await user.click(removeBtn)

    // Try to confirm without entering password
    const confirmBtn = await screen.findByRole('button', { name: /Confirm remove/i })
    // Confirm button should be disabled without password
    expect(confirmBtn).toBeDisabled()

    // API should not be called
    expect(mockDeletePet).not.toHaveBeenCalled()
  })

  it('asks for confirmation before removing the pet', async () => {
    const user = userEvent.setup()
    mockDeletePet.mockResolvedValue(undefined)

    renderEditPage('1')

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /edit pet/i })).toBeInTheDocument()
    })

    const statusTab = screen.getByRole('tab', { name: /status/i })
    await user.click(statusTab)

    await waitFor(() => {
      expect(screen.getByText(/Danger zone/i)).toBeInTheDocument()
    })

    // Click Remove pet - opens dialog
    const removeBtn = screen.getByRole('button', { name: /Remove pet/i })
    await user.click(removeBtn)

    // Dialog should appear with password field and confirm button
    expect(await screen.findByPlaceholderText('Enter your password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Confirm remove/i })).toBeInTheDocument()
  })

  it('canceling the confirmation dialog does not remove the pet', async () => {
    const user = userEvent.setup()
    renderEditPage('1')

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /edit pet/i })).toBeInTheDocument()
    })

    const statusTab = screen.getByRole('tab', { name: /status/i })
    await user.click(statusTab)

    await waitFor(() => {
      expect(screen.getByText(/Danger zone/i)).toBeInTheDocument()
    })

    // Open dialog
    const removeBtn = screen.getByRole('button', { name: /Remove pet/i })
    await user.click(removeBtn)

    // Enter password
    const pwField = await screen.findByPlaceholderText('Enter your password')
    await user.type(pwField, 'secret')

    // Click Cancel instead
    const cancelBtn = screen.getByRole('button', { name: /Cancel/i })
    await user.click(cancelBtn)

    // Ensure API not called
    expect(mockDeletePet).not.toHaveBeenCalled()
  })
})
