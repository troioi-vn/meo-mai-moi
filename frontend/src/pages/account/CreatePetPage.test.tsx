import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { MockedFunction } from 'vitest'
import CreatePetPage from './CreatePetPage'
import { createPet, getPetTypes } from '@/api/pets'
import type { PetType } from '@/types/pet'
import { AuthProvider } from '@/contexts/AuthContext'

// Mock the API functions
vi.mock('@/api/pets', () => ({
  createPet: vi.fn() as unknown as MockedFunction<(data: any) => Promise<any>>,
  getPetTypes: vi.fn() as unknown as MockedFunction<() => Promise<PetType[]>>,
}))

// Mock react-router-dom navigation
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const mockPetTypes: PetType[] = [
  {
    id: 1,
    name: 'Cat',
    slug: 'cat',
    description: 'Feline companions',
    is_active: true,
    is_system: true,
    display_order: 1,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    placement_requests_allowed: true,
    weight_tracking_allowed: true,
    microchips_allowed: true,
  },
  {
    id: 2,
    name: 'Dog',
    slug: 'dog',
    description: 'Canine companions',
    is_active: true,
    is_system: true,
    display_order: 2,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    placement_requests_allowed: true,
    weight_tracking_allowed: false,
    microchips_allowed: false,
  },
]

const mockUser = {
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
}

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider initialUser={mockUser}>{component}</AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('CreatePetPage', () => {
  const mockGetPetTypes = getPetTypes as unknown as MockedFunction<() => Promise<PetType[]>>
  const mockCreatePet = createPet as unknown as MockedFunction<(data: any) => Promise<any>>

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetPetTypes.mockResolvedValue(mockPetTypes)
  })

  it('renders form with base fields and precision selector (no date input until Full Date selected)', async () => {
    renderWithProviders(<CreatePetPage />)

    expect(screen.getByText('Add a New Pet')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Pet Type')).toBeInTheDocument()
    })

    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Breed')).toBeInTheDocument()
    expect(screen.getByLabelText('Birthday Precision')).toBeInTheDocument()
    // Date input not shown by default (unknown precision)
    expect(screen.queryByLabelText('Birthday')).not.toBeInTheDocument()
    // Switch to Full Date
    fireEvent.change(screen.getByLabelText('Birthday Precision'), { target: { value: 'day' } })
    await waitFor(() => {
      expect(screen.getByLabelText('Birthday')).toBeInTheDocument()
    })
    expect(screen.getByLabelText('Location')).toBeInTheDocument()
    expect(screen.getByLabelText('Description')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create Pet' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('loads and displays pet types in dropdown', async () => {
    renderWithProviders(<CreatePetPage />)

    // Wait for pet types to load and Cat to be selected by default
    await waitFor(() => {
      expect(screen.getAllByText('Cat')).toHaveLength(2) // One in display, one in hidden select
    })

    // Click to open dropdown
    // There are now two combobox roles (pet type + birthday precision); pick the pet type one (the button)
    const petTypeSelect = screen
      .getAllByRole('combobox')
      .find((el) => el.tagName.toLowerCase() === 'button')!
    fireEvent.click(petTypeSelect)

    await waitFor(() => {
      expect(screen.getAllByText('Cat').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Dog').length).toBeGreaterThan(0)
    })
  })

  it('shows loading state while pet types are loading', () => {
    mockGetPetTypes.mockImplementation(() => new Promise(() => {})) // Never resolves

    renderWithProviders(<CreatePetPage />)

    expect(screen.getByText('Loading pet types...')).toBeInTheDocument()
  })

  it('defaults to cat pet type when loaded', async () => {
    renderWithProviders(<CreatePetPage />)

    await waitFor(() => {
      // The form should have cat selected by default (this is handled in the hook)
      expect(mockGetPetTypes).toHaveBeenCalled()
      expect(screen.getAllByText('Cat')).toHaveLength(2) // One in display, one in hidden select
    })
  })

  it('validates required fields (excluding optional birthday)', async () => {
    renderWithProviders(<CreatePetPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Create Pet' })).toBeInTheDocument()
    })

    // Try to submit without filling fields
    const submitButton = screen.getByRole('button', { name: 'Create Pet' })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument()
      expect(screen.getByText('Breed is required')).toBeInTheDocument()
      // Birthday no longer universally required
      expect(screen.queryByText('Birthday is required')).not.toBeInTheDocument()
      expect(screen.getByText('Location is required')).toBeInTheDocument()
      expect(screen.getByText('Description is required')).toBeInTheDocument()
    })
  })

  it('submits form with valid data - full date precision', async () => {
    const mockPetData = {
      id: 1,
      name: 'Fluffy',
      breed: 'Persian',
      birthday: '2020-01-01',
      location: 'Hanoi',
      description: 'A lovely cat',
      pet_type_id: 1,
      user_id: 1,
      status: 'active',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
      pet_type: mockPetTypes[0],
      user: mockUser,
    }

    mockCreatePet.mockResolvedValue(mockPetData)

    renderWithProviders(<CreatePetPage />)

    await waitFor(() => {
      expect(screen.getByText('Pet Type')).toBeInTheDocument()
    })

    // Fill out the form
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Fluffy' } })
    fireEvent.change(screen.getByLabelText('Breed'), { target: { value: 'Persian' } })
    // Enable full date precision
    fireEvent.change(screen.getByLabelText('Birthday Precision'), { target: { value: 'day' } })
    await waitFor(() => expect(screen.getByLabelText('Birthday')).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText('Birthday'), { target: { value: '2020-01-01' } })
    fireEvent.change(screen.getByLabelText('Location'), { target: { value: 'Hanoi' } })
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'A lovely cat' } })

    // Pet type should already be selected as Cat by default
    // No need to change it since Cat is already selected

    // Submit form
    const submitButton = screen.getByRole('button', { name: 'Create Pet' })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockCreatePet).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Fluffy',
          breed: 'Persian',
          birthday: '2020-01-01',
          birthday_precision: 'day',
          location: 'Hanoi',
          description: 'A lovely cat',
          pet_type_id: 1,
        })
      )
    })
  })

  it('shows loading state during submission (month precision)', async () => {
    mockCreatePet.mockImplementation(() => new Promise(() => {})) // Never resolves

    renderWithProviders(<CreatePetPage />)

    await waitFor(() => {
      expect(screen.getByLabelText('Name')).toBeInTheDocument()
    })

    // Fill required fields
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Test Pet' } })
    fireEvent.change(screen.getByLabelText('Breed'), { target: { value: 'Test Breed' } })
    fireEvent.change(screen.getByLabelText('Birthday Precision'), { target: { value: 'month' } })
    // Provide year+month components
    fireEvent.change(screen.getByLabelText('Birth Year'), { target: { value: '2022' } })
    fireEvent.change(screen.getByLabelText('Birth Month'), { target: { value: '05' } })
    fireEvent.change(screen.getByLabelText('Location'), { target: { value: 'Test Location' } })
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Test Description' },
    })

    // Submit form
    const submitButton = screen.getByRole('button', { name: 'Create Pet' })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Creating...')).toBeInTheDocument()
    })

    // Check that the submit button is disabled during submission
    const buttons = screen.getAllByRole('button')
    const submitButtonAfter = buttons.find((button) => button.textContent === 'Creating...')
    expect(submitButtonAfter).toBeDisabled()
  })

  it('handles submission error (year precision)', async () => {
    mockCreatePet.mockRejectedValue(new Error('API Error'))

    renderWithProviders(<CreatePetPage />)

    await waitFor(() => {
      expect(screen.getByLabelText('Name')).toBeInTheDocument()
    })

    // Fill required fields
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Test Pet' } })
    fireEvent.change(screen.getByLabelText('Breed'), { target: { value: 'Test Breed' } })
    fireEvent.change(screen.getByLabelText('Birthday Precision'), { target: { value: 'year' } })
    fireEvent.change(screen.getByLabelText('Birth Year'), { target: { value: '2023' } })
    fireEvent.change(screen.getByLabelText('Location'), { target: { value: 'Test Location' } })
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: 'Test Description' },
    })

    const submitButton = screen.getByRole('button', { name: 'Create Pet' })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Failed to create pet.')).toBeInTheDocument()
    })
  })

  it('validates missing components for day precision without full date', async () => {
    renderWithProviders(<CreatePetPage />)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Create Pet' })).toBeInTheDocument()
    )
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Patchy' } })
    fireEvent.change(screen.getByLabelText('Breed'), { target: { value: 'Mixed' } })
    fireEvent.change(screen.getByLabelText('Location'), { target: { value: 'Someplace' } })
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Colorful' } })
    fireEvent.change(screen.getByLabelText('Birthday Precision'), { target: { value: 'day' } })
    // Do not supply date -> should produce error on submit
    fireEvent.click(screen.getByRole('button', { name: 'Create Pet' }))
    await waitFor(() => {
      expect(screen.getByText('Complete date required for day precision')).toBeInTheDocument()
    })
  })

  it('allows unknown precision without birthday fields', async () => {
    renderWithProviders(<CreatePetPage />)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Create Pet' })).toBeInTheDocument()
    )

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ghost' } })
    fireEvent.change(screen.getByLabelText('Breed'), { target: { value: 'Unknown' } })
    fireEvent.change(screen.getByLabelText('Location'), { target: { value: 'Nowhere' } })
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Mystery pet' } })

    const submitButton = screen.getByRole('button', { name: 'Create Pet' })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockCreatePet).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Ghost',
          birthday_precision: 'unknown',
        })
      )
    })
  })

  it('navigates to pets page on cancel', async () => {
    renderWithProviders(<CreatePetPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    })

    const cancelButton = screen.getByRole('button', { name: 'Cancel' })
    fireEvent.click(cancelButton)

    expect(mockNavigate).toHaveBeenCalledWith('/account/pets')
  })

  it('disables submit button when pet types are loading', () => {
    mockGetPetTypes.mockImplementation(() => new Promise(() => {})) // Never resolves

    renderWithProviders(<CreatePetPage />)

    const submitButton = screen.getByRole('button', { name: 'Create Pet' })
    expect(submitButton).toBeDisabled()
  })

  it('clears field errors when user starts typing', async () => {
    renderWithProviders(<CreatePetPage />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Create Pet' })).toBeInTheDocument()
    })

    // Try to submit to trigger validation errors
    const submitButton = screen.getByRole('button', { name: 'Create Pet' })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument()
    })

    // Start typing in name field
    const nameInput = screen.getByLabelText('Name')
    fireEvent.change(nameInput, { target: { value: 'T' } })

    await waitFor(() => {
      expect(screen.queryByText('Name is required')).not.toBeInTheDocument()
    })
  })

  it('handles pet type loading error gracefully', async () => {
    mockGetPetTypes.mockRejectedValue(new Error('Failed to load pet types'))

    renderWithProviders(<CreatePetPage />)

    // Should still render the form even if pet types fail to load
    expect(screen.getByText('Add a New Pet')).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
  })
})
