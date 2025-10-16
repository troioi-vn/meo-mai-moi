import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { MockedFunction } from 'vitest'
import CreatePetPage from './CreatePetPage'
import { getPet, updatePetStatus, deletePet } from '@/api/pets'
import { AuthProvider } from '@/contexts/AuthContext'

vi.mock('@/api/pets', async () => {
  const actual = await vi.importActual<typeof import('@/api/pets')>('@/api/pets')
  return {
    ...actual,
    getPet: vi.fn() as unknown as MockedFunction<(id: string) => Promise<any>>,
    updatePetStatus: vi.fn() as unknown as MockedFunction<
      (id: string, status: string, password: string) => Promise<any>
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
  const mockUpdatePetStatus = updatePetStatus as unknown as MockedFunction<
    (id: string, status: string, password: string) => Promise<any>
  >
  const mockDeletePet = deletePet as unknown as MockedFunction<
    (id: string, password: string) => Promise<void>
  >

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetPet.mockResolvedValue({ id: 1, status: 'active' })
  })

  it('shows current status and allows updating with password', async () => {
    mockUpdatePetStatus.mockResolvedValue({ id: 1, status: 'lost' })

    renderEditPage('1')

    // Wait for current status to load
    await waitFor(() => {
      expect(screen.getByText(/Current status:/i)).toBeInTheDocument()
    })

    // Open status select and choose Lost (find the button combobox after Pet Type)
    const comboButtons = screen
      .getAllByRole('combobox')
      .filter((el) => el.tagName.toLowerCase() === 'button')
    // First button combobox is pet type. Assume second is status.
    const statusCombo = comboButtons[1]
    fireEvent.click(statusCombo)
    const lost = await screen
      .findByRole('option', { name: 'Lost' })
      .catch(() => screen.findByText('Lost'))
    fireEvent.click(await lost)

    // Type password
    const pw = screen.getAllByPlaceholderText('Confirm with your password')[0] as HTMLInputElement
    fireEvent.change(pw, { target: { value: 'secret' } })

    // Click update
    const btn = screen.getByRole('button', { name: /Update status/i })
    fireEvent.click(btn)

    await waitFor(() => {
      expect(mockUpdatePetStatus).toHaveBeenCalledWith('1', 'lost', 'secret')
    })
  })

  it('requires password before updating status', async () => {
    renderEditPage('1')

    await waitFor(() => {
      expect(screen.getByText(/Current status:/i)).toBeInTheDocument()
    })

    // Select Deceased but do not enter password
    const comboButtons = screen
      .getAllByRole('combobox')
      .filter((el) => el.tagName.toLowerCase() === 'button')
    const statusCombo = comboButtons[1]
    fireEvent.click(statusCombo)
    const deceased = await screen
      .findByRole('option', { name: 'Deceased' })
      .catch(() => screen.findByText('Deceased'))
    fireEvent.click(await deceased)

    const btn = screen.getByRole('button', { name: /Update status/i })
    fireEvent.click(btn)

    // updatePetStatus should not be called
    await waitFor(() => {
      expect(mockUpdatePetStatus).not.toHaveBeenCalled()
    })
  })

  it('removes the pet when password is provided (after confirm)', async () => {
    mockDeletePet.mockResolvedValue(undefined)

    renderEditPage('1')

    await waitFor(() => {
      expect(screen.getByText(/Danger zone/i)).toBeInTheDocument()
    })

    const pwFields = screen.getAllByPlaceholderText('Confirm with your password')
    const delPw = pwFields[pwFields.length - 1]
    fireEvent.change(delPw, { target: { value: 'secret' } })

    const removeBtn = screen.getByRole('button', { name: /Remove pet/i })
    fireEvent.click(removeBtn)

    const confirmBtn = await screen.findByRole('button', { name: /Confirm remove/i })
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(mockDeletePet).toHaveBeenCalledWith('1', 'secret')
    })
  })

  it('does not remove the pet without password', async () => {
    renderEditPage('1')

    await waitFor(() => {
      expect(screen.getByText(/Danger zone/i)).toBeInTheDocument()
    })

    const removeBtn = screen.getByRole('button', { name: /Remove pet/i })
    fireEvent.click(removeBtn)

    await waitFor(() => {
      expect(mockDeletePet).not.toHaveBeenCalled()
    })
  })

  it('asks for confirmation before removing the pet', async () => {
    mockDeletePet.mockResolvedValue(undefined)

    renderEditPage('1')

    await waitFor(() => {
      expect(screen.getByText(/Danger zone/i)).toBeInTheDocument()
    })

    // Enter password first
    const pwFields = screen.getAllByPlaceholderText('Confirm with your password')
    const delPw = pwFields[pwFields.length - 1]
    fireEvent.change(delPw, { target: { value: 'secret' } })

    // Click Remove pet (opens dialog)
    const removeBtn = screen.getByRole('button', { name: /Remove pet/i })
    fireEvent.click(removeBtn)

    // Dialog appears with Confirm remove action
    const confirmBtn = await screen.findByRole('button', { name: /Confirm remove/i })
    expect(confirmBtn).toBeInTheDocument()

    // Confirm
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(mockDeletePet).toHaveBeenCalledWith('1', 'secret')
    })
  })

  it('canceling the confirmation dialog does not remove the pet', async () => {
    renderEditPage('1')

    await waitFor(() => {
      expect(screen.getByText(/Danger zone/i)).toBeInTheDocument()
    })

    // Provide password
    const pwFields = screen.getAllByPlaceholderText('Confirm with your password')
    const delPw = pwFields[pwFields.length - 1]
    fireEvent.change(delPw, { target: { value: 'secret' } })

    // Open dialog
    fireEvent.click(screen.getByRole('button', { name: /Remove pet/i }))

    // Click Cancel
    const cancelBtn = await screen.findByRole('button', { name: /Cancel/i })
    fireEvent.click(cancelBtn)

    // Ensure API not called
    await waitFor(() => {
      expect(mockDeletePet).not.toHaveBeenCalled()
    })
  })
})
