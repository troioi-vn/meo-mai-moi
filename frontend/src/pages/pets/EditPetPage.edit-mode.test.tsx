import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import EditPetPage from './EditPetPage'
import { AuthProvider } from '@/contexts/AuthContext'
import * as petsApi from '@/api/pets'
import type { Pet } from '@/types/pet'

vi.mock('@/api/pets', () => ({
  getPet: vi.fn(),
  getPetTypes: vi.fn(),
  updatePetStatus: vi.fn(),
  deletePet: vi.fn(),
  updatePet: vi.fn(),
}))

const mockPet: Partial<Pet> = {
  id: 123,
  name: 'Fluffy',
  birthday: '2020-01-01T00:00:00Z',
  country: 'VN',
  city: 'Hanoi',
  description: 'A lovely cat',
  status: 'active' as const,
  photo_url: 'https://example.com/photo.jpg',
  pet_type: {
    id: 1,
    name: 'Cat',
    slug: 'cat',
    description: '',
    is_active: true,
    is_system: true,
    display_order: 1,
    placement_requests_allowed: true,
    created_at: '',
    updated_at: '',
  },
  viewer_permissions: { can_edit: true },
  user_id: 1,
}

const mockUser = { id: 1, name: 'Test User', email: 'test@example.com' }

function renderEditPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider initialUser={mockUser}>
          <Routes>
            <Route path="/pets/:id/edit" element={<EditPetPage />} />
            <Route path="/pets/:id" element={<div>Pet Profile Page</div>} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('CreatePetPage edit mode enhancements', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(petsApi.getPet).mockResolvedValue(mockPet as Pet)
    vi.mocked(petsApi.getPetTypes).mockResolvedValue([
      {
        id: 1,
        name: 'Cat',
        slug: 'cat',
        description: '',
        is_active: true,
        is_system: true,
        display_order: 1,
        placement_requests_allowed: true,
        created_at: '',
        updated_at: '',
      },
    ])
    vi.mocked(petsApi.updatePetStatus).mockImplementation(async (_id, status) => ({
      ...(mockPet as Pet),
      status: status as 'active' | 'lost' | 'deceased' | 'deleted',
    }))
  })

  it('shows pet photo with upload controls in edit mode', async () => {
    window.history.pushState({}, 'Edit Pet', '/pets/123/edit')
    renderEditPage()

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /edit pet/i })).toBeInTheDocument()
    )

    // Check that pet data is loaded into form fields
    expect(screen.getByDisplayValue('Fluffy')).toBeInTheDocument()

    // Check that upload controls are shown
    expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument()
  })

  it('has navigation button', async () => {
    window.history.pushState({}, 'Edit Pet', '/pets/123/edit')
    renderEditPage()
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /edit pet/i })).toBeInTheDocument()
    )

    // Breadcrumb navigation
    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /fluffy/i })).toBeInTheDocument()
  })

  it('redirects to pet profile after status update', async () => {
    const user = userEvent.setup()
    window.history.pushState({}, 'Edit Pet', '/pets/123/edit')
    renderEditPage()
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /edit pet/i })).toBeInTheDocument()
    )

    // Navigate to Status tab
    const statusTab = screen.getByRole('tab', { name: /status/i })
    await user.click(statusTab)

    // Wait for status controls to be visible (case-sensitive match)
    await waitFor(() => {
      expect(screen.getByText('Current status:')).toBeInTheDocument()
    })

    // Change the status in the dropdown
    const selectTrigger = screen.getByRole('combobox')
    await user.click(selectTrigger)
    const lostOption = screen.getByRole('option', { name: /lost/i })
    await user.click(lostOption)

    // Click update status button - this opens the confirmation dialog
    const updateBtn = screen.getByRole('button', { name: /update status/i })
    await user.click(updateBtn)

    // Wait for the confirmation dialog and click confirm
    await waitFor(() => {
      expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    })
    const confirmBtn = screen.getByRole('button', { name: /confirm/i })
    await user.click(confirmBtn)

    await waitFor(() => expect(screen.getByText('Pet Profile Page')).toBeInTheDocument())
  })
})
