import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { PlacementRequestModal } from './PlacementRequestModal'
import { useCreatePlacementRequest } from '@/hooks/useCreatePlacementRequest'
import type { PlacementRequestPayload } from '@/hooks/useCreatePlacementRequest'
import { vi } from 'vitest'
import type { Mock } from 'vitest'
import userEvent from '@testing-library/user-event'
import type { UseMutationResult } from '@tanstack/react-query'
import type { PlacementRequest } from '@/types/pet'
import { AxiosError } from 'axios'
import { format } from 'date-fns'

// Mock the hook
vi.mock('@/hooks/useCreatePlacementRequest')

// Use a future date for testing to avoid past-date validation
const MOCK_CALENDAR_DATE = new Date()
MOCK_CALENDAR_DATE.setDate(MOCK_CALENDAR_DATE.getDate() + 7) // 7 days in the future

vi.mock('@/components/ui/calendar', () => ({
  Calendar: ({
    onSelect,
    disabled,
  }: {
    onSelect?: (date?: Date) => void
    disabled?: (date: Date) => boolean
  }) => (
    <button
      type="button"
      data-testid="mock-calendar-day"
      onClick={() => {
        onSelect?.(MOCK_CALENDAR_DATE)
      }}
      disabled={disabled?.(MOCK_CALENDAR_DATE)}
    >
      Select mock date
    </button>
  ),
}))

// Mock the PlacementTermsDialog to avoid needing QueryClient
vi.mock('./PlacementTermsDialog', () => ({
  PlacementTermsLink: ({ className }: { className?: string }) => (
    <span data-testid="placement-terms-link" className={className}>
      Placement Terms & Conditions
    </span>
  ),
}))

describe('PlacementRequestModal', () => {
  const mockMutate = vi.fn()
  const mockOnClose = vi.fn()

  beforeEach(() => {
    ;(
      useCreatePlacementRequest as unknown as Mock<
        () => Partial<UseMutationResult<PlacementRequest, AxiosError, PlacementRequestPayload>>
      >
    ).mockReturnValue({
      mutate: mockMutate as unknown as UseMutationResult<
        PlacementRequest,
        AxiosError,
        PlacementRequestPayload
      >['mutate'],
      isPending: false,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders correctly when open', () => {
    render(<PlacementRequestModal petId={1} isOpen={true} onClose={mockOnClose} />)
    expect(screen.getByText('Create Placement Request')).toBeInTheDocument()
    const submit = screen.getByRole('button', { name: /create request/i })
    expect(submit).toBeDisabled()
    // Check that both checkboxes are present
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes).toHaveLength(2)
    expect(screen.getByTestId('placement-terms-link')).toBeInTheDocument()
    // Check for renamed labels
    expect(screen.getByText('Pick-up Date')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<PlacementRequestModal petId={1} isOpen={false} onClose={mockOnClose} />)
    expect(screen.queryByText('Create Placement Request')).not.toBeInTheDocument()
  })

  it('calls onClose when the cancel button is clicked', async () => {
    const user = userEvent.setup()
    render(<PlacementRequestModal petId={1} isOpen={true} onClose={mockOnClose} />)
    expect(await screen.findByText('Create Placement Request')).toBeInTheDocument()
    const cancelButton = await screen.findByRole('button', { name: /cancel/i })
    await user.click(cancelButton)
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  it('submits the form with the correct data for a permanent request', async () => {
    const user = userEvent.setup()
    render(<PlacementRequestModal petId={1} isOpen={true} onClose={mockOnClose} />)
    expect(await screen.findByText('Create Placement Request')).toBeInTheDocument()

    // Open and select request type
    const requestTypeTrigger = screen.getByRole('combobox')
    await user.click(requestTypeTrigger)
    const permanentOption = await screen.findByRole('option', { name: 'Permanent' })
    await user.click(permanentOption)

    // Fill notes
    const notesInput = screen.getByLabelText('Notes')
    await user.type(notesInput, 'Test notes')

    // Select pick-up date
    const startDateButton = screen.getByText('Pick a date')
    await user.click(startDateButton)
    const mockDayButton = await screen.findByTestId('mock-calendar-day')
    fireEvent.click(mockDayButton)

    // Drop-off date should not be visible for permanent
    expect(screen.queryByText('Drop-off Date')).not.toBeInTheDocument()

    // Accept both checkboxes (public profile + terms)
    const checkboxes = screen.getAllByRole('checkbox')
    for (const checkbox of checkboxes) {
      await user.click(checkbox)
    }

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /create request/i })
    await user.click(submitButton)

    await waitFor(() => {
      // Assert payload basic shape
      expect(mockMutate).toHaveBeenCalled()
      expect(mockMutate.mock.calls.at(-1)?.[0]).toEqual(
        expect.objectContaining({
          pet_id: 1,
          request_type: 'permanent',
          notes: 'Test notes',
          start_date: format(MOCK_CALENDAR_DATE, 'yyyy-MM-dd'),
          end_date: undefined,
        })
      )
      // Check expires_at format matches yyyy-MM-dd
      expect(
        (mockMutate.mock.calls.at(-1)?.[0] as PlacementRequestPayload | undefined)?.expires_at
      ).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      // options has onSuccess on second argument
      const tuple = mockMutate.mock.calls.at(-1)
      expect(
        Array.isArray(tuple) &&
          typeof tuple[1] === 'object' &&
          tuple[1] !== null &&
          'onSuccess' in tuple[1]
      ).toBe(true)
    })
  })

  it('submits the form with the correct data for a foster request', async () => {
    const user = userEvent.setup()
    const today = new Date()
    const futureDate = new Date()
    futureDate.setDate(today.getDate() + 10)

    render(
      <PlacementRequestModal
        petId={1}
        isOpen={true}
        onClose={mockOnClose}
        initialValues={{
          request_type: 'foster_free',
          start_date: today,
          end_date: futureDate,
          notes: 'Test notes',
        }}
      />
    )

    expect(await screen.findByText('Create Placement Request')).toBeInTheDocument()

    // Drop-off date should be visible for foster requests
    expect(screen.getByText('Drop-off Date')).toBeInTheDocument()

    // Accept both checkboxes (public profile + terms)
    const checkboxes = screen.getAllByRole('checkbox')
    for (const checkbox of checkboxes) {
      await user.click(checkbox)
    }

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /create request/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalled()
      expect(mockMutate.mock.calls.at(-1)?.[0]).toEqual(
        expect.objectContaining({
          pet_id: 1,
          request_type: 'foster_free',
          start_date: format(today, 'yyyy-MM-dd'),
          end_date: format(futureDate, 'yyyy-MM-dd'),
          expires_at: format(today, 'yyyy-MM-dd'),
        })
      )
      const tuple2 = mockMutate.mock.calls.at(-1)
      expect(
        Array.isArray(tuple2) &&
          typeof tuple2[1] === 'object' &&
          tuple2[1] !== null &&
          'onSuccess' in tuple2[1]
      ).toBe(true)
    })
  })

  it('does not allow submission without accepting terms', async () => {
    const user = userEvent.setup()
    render(<PlacementRequestModal petId={1} isOpen={true} onClose={mockOnClose} />)

    // Open and select request type
    const requestTypeTrigger = screen.getByRole('combobox')
    await user.click(requestTypeTrigger)
    const permanentOption = await screen.findByRole('option', { name: 'Permanent' })
    await user.click(permanentOption)

    // Select pick-up date
    const startDateButton = screen.getByText('Pick a date')
    await user.click(startDateButton)
    const mockDayButton = await screen.findByTestId('mock-calendar-day')
    fireEvent.click(mockDayButton)

    // Do NOT accept any checkboxes - button should remain disabled
    const submitButton = screen.getByRole('button', { name: /create request/i })
    expect(submitButton).toBeDisabled()

    // Accept only one checkbox - should still be disabled
    const checkboxes = screen.getAllByRole('checkbox')
    await user.click(checkboxes[0])
    expect(submitButton).toBeDisabled()

    // Accept the second checkbox - now should be enabled
    await user.click(checkboxes[1])
    expect(submitButton).not.toBeDisabled()
  })

  it('shows Drop-off Date field for foster requests but not for permanent', async () => {
    const user = userEvent.setup()
    render(<PlacementRequestModal petId={1} isOpen={true} onClose={mockOnClose} />)

    // Initially no request type selected - Drop-off Date should not be visible
    // (requestType !== 'permanent' is true but we want to check the foster case)

    // Select foster request type
    const requestTypeTrigger = screen.getByRole('combobox')
    await user.click(requestTypeTrigger)
    const fosterOption = await screen.findByRole('option', { name: 'Foster (Free)' })
    await user.click(fosterOption)

    // Now Drop-off Date should be visible
    expect(screen.getByText('Drop-off Date')).toBeInTheDocument()

    // Switch to permanent - Drop-off Date should disappear
    await user.click(requestTypeTrigger)
    const permanentOption = await screen.findByRole('option', { name: 'Permanent' })
    await user.click(permanentOption)

    expect(screen.queryByText('Drop-off Date')).not.toBeInTheDocument()
  })

  it('shows public profile warning checkbox', () => {
    render(<PlacementRequestModal petId={1} isOpen={true} onClose={mockOnClose} />)

    expect(
      screen.getByText("I understand the pet's profile will become publicly visible.")
    ).toBeInTheDocument()
  })
})
