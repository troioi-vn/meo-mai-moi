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

// Mock CitySelect to simplify testing
vi.mock('@/components/location/CitySelect', () => ({
  CitySelect: ({ onChange, error }: any) => (
    <div data-testid="mock-city-select">
      <label htmlFor="city-mock">City</label>
      <button
        id="city-mock"
        type="button"
        onClick={() => onChange({ id: 1, name: 'Hanoi', country: 'VN' })}
      >
        Select Hanoi
      </button>
      {error && <span>{error}</span>}
    </div>
  ),
}))

// Mock BirthdayDatePicker to simplify testing
vi.mock('@/components/ui/BirthdayDatePicker', () => ({
  BirthdayDatePicker: ({ value, onChange, id }: any) => (
    <input
      id={id}
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Birthday"
    />
  ),
}))

// Mock CountrySelect to simplify testing
vi.mock('@/components/ui/CountrySelect', () => ({
  CountrySelect: ({ value, onValueChange }: any) => (
    <select aria-label="Country" value={value} onChange={(e) => onValueChange?.(e.target.value)}>
      <option value="VN">Vietnam</option>
      <option value="US">United States</option>
    </select>
  ),
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
    expect(screen.getByLabelText('Birthday Precision')).toBeInTheDocument()
    // Date input not shown by default (unknown precision)
    expect(screen.queryByLabelText('Birthday')).not.toBeInTheDocument()
    // Switch to Full Date
    fireEvent.change(screen.getByLabelText('Birthday Precision'), { target: { value: 'day' } })
    await waitFor(() => {
      expect(screen.getByLabelText('Birthday')).toBeInTheDocument()
    })
    // Location fields: Country is always shown (required)
    expect(screen.getByText(/Country/)).toBeInTheDocument()
    // City is now shown in create mode as it is part of location
    expect(screen.getByLabelText('City')).toBeInTheDocument()
    // Description and Address are still hidden in create mode (showOptionalFields=false)
    expect(screen.queryByLabelText('Description')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Address')).not.toBeInTheDocument()
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
      // City is no longer required
      expect(screen.queryByText('City is required')).not.toBeInTheDocument()
      // Birthday no longer universally required
      expect(screen.queryByText('Birthday is required')).not.toBeInTheDocument()
      // Country defaults to 'VN' so it won't show validation error
      expect(screen.queryByText('Country is required')).not.toBeInTheDocument()
    })
  })

  it('submits form with valid data - full date precision', async () => {
    const mockPetData = {
      id: 1,
      name: 'Fluffy',
      birthday: '2020-01-01',
      country: 'VN',
      description: '',
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

    // Wait for pet types to load and Cat to be selected by default
    await waitFor(() => {
      expect(screen.getAllByText('Cat')).toHaveLength(2) // One in display, one in hidden select
    })

    // Fill out the form
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Fluffy' } })
    // Enable full date precision
    fireEvent.change(screen.getByLabelText('Birthday Precision'), { target: { value: 'day' } })
    await waitFor(() => expect(screen.getByLabelText('Birthday')).toBeInTheDocument())
    fireEvent.change(screen.getByLabelText('Birthday'), { target: { value: '2020-01-01' } })
    // Country defaults to VN
    // Select city (using our mock)
    fireEvent.click(screen.getByText('Select Hanoi'))

    // Submit form
    const submitButton = screen.getByRole('button', { name: 'Create Pet' })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockCreatePet).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Fluffy',
          birthday: '2020-01-01',
          birthday_precision: 'day',
          country: 'VN',
          city_id: 1,
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
    fireEvent.click(screen.getByText('Select Hanoi'))
    fireEvent.change(screen.getByLabelText('Birthday Precision'), { target: { value: 'month' } })
    // Provide year+month components
    fireEvent.change(screen.getByLabelText('Birth Year'), { target: { value: '2022' } })
    fireEvent.change(screen.getByLabelText('Birth Month'), { target: { value: '05' } })
    // Country defaults to VN, Description not available in create mode

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
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Error Pet' } })
    fireEvent.click(screen.getByText('Select Hanoi'))
    fireEvent.change(screen.getByLabelText('Birthday Precision'), { target: { value: 'year' } })
    // Provide year component
    fireEvent.change(screen.getByLabelText('Birth Year'), { target: { value: '2020' } })
    // Country defaults to VN, Description not available in create mode

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
    // Country defaults to VN, Description not available in create mode
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
    fireEvent.click(screen.getByText('Select Hanoi'))
    // Country defaults to VN, Description not available in create mode

    const submitButton = screen.getByRole('button', { name: 'Create Pet' })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockCreatePet).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Ghost',
          birthday_precision: 'unknown',
          city_id: 1,
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

    expect(mockNavigate).toHaveBeenCalledWith('/')
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
