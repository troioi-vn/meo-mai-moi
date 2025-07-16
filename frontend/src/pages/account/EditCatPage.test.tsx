import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { toast } from 'sonner'
import EditCatPage from '@/pages/account/EditCatPage'

// Mock the API
vi.mock('@/api/cats', () => ({
  getCat: vi.fn(),
  updateCat: vi.fn(),
}))

// Mock the toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock navigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const renderWithRouter = (catId = '1') => {
  return render(
    <MemoryRouter initialEntries={[`/account/cats/${catId}/edit`]}>
      <Routes>
        <Route path="/account/cats/:id/edit" element={<EditCatPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('EditCatPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads and displays cat data in the form', async () => {
    const { getCat } = await import('@/api/cats')
    const mockCat = {
      id: 1,
      name: 'Fluffy',
      breed: 'Persian',
      birthday: '2020-01-15',
      location: 'New York, NY',
      description: 'A very friendly and fluffy cat.',
      status: 'available' as const,
      user_id: 1,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    }
    vi.mocked(getCat).mockResolvedValue(mockCat)

    renderWithRouter('1')

    // Should show loading initially
    expect(screen.getByText(/loading/i)).toBeInTheDocument()

    // Wait for form to load with cat data
    await waitFor(() => {
      expect(screen.getByDisplayValue('Fluffy')).toBeInTheDocument()
    })

    expect(screen.getByDisplayValue('Persian')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2020-01-15')).toBeInTheDocument()
    expect(screen.getByDisplayValue('New York, NY')).toBeInTheDocument()
    expect(screen.getByDisplayValue('A very friendly and fluffy cat.')).toBeInTheDocument()
    // Check the select shows the correct value (using role to be more specific)
    expect(screen.getByRole('combobox')).toHaveTextContent('Available')
  })

  it('submits the form with updated data and redirects on success', async () => {
    const { getCat, updateCat } = await import('@/api/cats')
    const mockCat = {
      id: 1,
      name: 'Fluffy',
      breed: 'Persian',
      birthday: '2020-01-15',
      location: 'New York, NY',
      description: 'A very friendly and fluffy cat.',
      status: 'available' as const,
      user_id: 1,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    }

    vi.mocked(getCat).mockResolvedValue(mockCat)
    vi.mocked(updateCat).mockResolvedValue({
      ...mockCat,
      name: 'Updated Fluffy',
      description: 'An updated description.',
    })

    renderWithRouter('1')

    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByDisplayValue('Fluffy')).toBeInTheDocument()
    })

    // Update form fields
    fireEvent.change(screen.getByDisplayValue('Fluffy'), {
      target: { value: 'Updated Fluffy' },
    })
    fireEvent.change(screen.getByDisplayValue('A very friendly and fluffy cat.'), {
      target: { value: 'An updated description.' },
    })

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /update cat/i }))

    await waitFor(() => {
      expect(updateCat).toHaveBeenCalledWith('1', {
        name: 'Updated Fluffy',
        breed: 'Persian',
        birthday: '2020-01-15',
        location: 'New York, NY',
        description: 'An updated description.',
        status: 'available',
      })
    })

    expect(toast.success).toHaveBeenCalledWith('Cat profile updated successfully!')
    expect(mockNavigate).toHaveBeenCalledWith('/account/cats')
  })

  it('displays validation errors for empty required fields', async () => {
    const { getCat } = await import('@/api/cats')
    const mockCat = {
      id: 1,
      name: 'Fluffy',
      breed: 'Persian',
      birthday: '2020-01-15',
      location: 'New York, NY',
      description: 'A very friendly and fluffy cat.',
      status: 'available' as const,
      user_id: 1,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    }
    vi.mocked(getCat).mockResolvedValue(mockCat)

    renderWithRouter('1')

    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByDisplayValue('Fluffy')).toBeInTheDocument()
    })

    // Clear required fields using userEvent for better simulation
    const user = userEvent.setup()
    const nameInput = screen.getByDisplayValue('Fluffy')
    const breedInput = screen.getByDisplayValue('Persian')

    await user.clear(nameInput)
    await user.clear(breedInput)

    // Submit form
    const submitButton = screen.getByRole('button', { name: /update cat/i })
    await user.click(submitButton)

    // Check validation errors appear
    await waitFor(
      () => {
        expect(screen.getByText('Name is required')).toBeInTheDocument()
      },
      { timeout: 5000 }
    )

    await waitFor(
      () => {
        expect(screen.getByText('Breed is required')).toBeInTheDocument()
      },
      { timeout: 5000 }
    )
  })

  it('displays error message when API call fails', async () => {
    const { getCat, updateCat } = await import('@/api/cats')
    const mockCat = {
      id: 1,
      name: 'Fluffy',
      breed: 'Persian',
      birthday: '2020-01-15',
      location: 'New York, NY',
      description: 'A very friendly and fluffy cat.',
      status: 'available' as const,
      user_id: 1,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    }

    vi.mocked(getCat).mockResolvedValue(mockCat)
    vi.mocked(updateCat).mockRejectedValue(new Error('Update failed'))

    renderWithRouter('1')

    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByDisplayValue('Fluffy')).toBeInTheDocument()
    })

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /update cat/i }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to update cat profile. Please try again.')
    })
  })

  it('has a cancel button that navigates back to cats list', async () => {
    const { getCat } = await import('@/api/cats')
    const mockCat = {
      id: 1,
      name: 'Fluffy',
      breed: 'Persian',
      birthday: '2020-01-15',
      location: 'New York, NY',
      description: 'A very friendly and fluffy cat.',
      status: 'available' as const,
      user_id: 1,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    }
    vi.mocked(getCat).mockResolvedValue(mockCat)

    renderWithRouter('1')

    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByDisplayValue('Fluffy')).toBeInTheDocument()
    })

    // Click cancel button
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

    expect(mockNavigate).toHaveBeenCalledWith('/account/cats')
  })

  it('displays error when cat is not found', async () => {
    const { getCat } = await import('@/api/cats')
    vi.mocked(getCat).mockRejectedValue({
      response: { status: 404 },
    })

    renderWithRouter('999')

    await waitFor(() => {
      expect(screen.getByText('Cat not found')).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /back to cats/i })).toBeInTheDocument()
  })
})
