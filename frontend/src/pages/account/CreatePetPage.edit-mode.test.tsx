import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import CreatePetPage from './CreatePetPage'
import { AuthProvider } from '@/contexts/AuthContext'
import * as petsApi from '@/api/pets'
import type { Pet } from '@/types/pet'

vi.mock('@/api/pets')

const mockPet: Partial<Pet> = {
  id: 123,
  name: 'Fluffy',
  breed: 'Persian',
  birthday: '2020-01-01T00:00:00Z',
  location: 'Hanoi',
  description: 'A lovely cat',
  status: 'active' as const,
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
  // Cast to any to include photos array used by deriveImageUrl utility
  ...({ photos: [{ url: 'https://example.com/photo.jpg' }] } as any),
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
            <Route path="/pets/:id/edit" element={<CreatePetPage />} />
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

  it('shows current photo preview in edit mode', async () => {
    window.history.pushState({}, 'Edit Pet', '/pets/123/edit')
    renderEditPage()

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /edit pet/i })).toBeInTheDocument()
    )
    const img = await screen.findByTestId('current-photo-preview')
    expect(img).toHaveAttribute('src', 'https://example.com/photo.jpg')
  })

  it('has navigation button', async () => {
    window.history.pushState({}, 'Edit Pet', '/pets/123/edit')
    renderEditPage()
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /edit pet/i })).toBeInTheDocument()
    )

    expect(screen.getByRole('link', { name: /back to pet/i })).toBeInTheDocument()
  })

  it('redirects to pet profile after status update', async () => {
    window.history.pushState({}, 'Edit Pet', '/pets/123/edit')
    renderEditPage()
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /edit pet/i })).toBeInTheDocument()
    )

    // Fill status password and trigger update - pick the first of multiple password fields
    const passwordInputs = screen.getAllByPlaceholderText(/confirm with your password/i)
    const passwordInput = passwordInputs[0] as HTMLInputElement
    fireEvent.change(passwordInput, { target: { value: 'secret123' } })
    const updateBtn = screen.getByRole('button', { name: /update status/i })
    fireEvent.click(updateBtn)

    await waitFor(() => expect(screen.getByText('Pet Profile Page')).toBeInTheDocument())
  })
})
