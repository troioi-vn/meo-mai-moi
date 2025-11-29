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
const MOCK_CALENDAR_DATE = new Date('2025-01-15T00:00:00.000Z')

vi.mock('@/components/ui/calendar', () => ({
  Calendar: ({ onSelect }: { onSelect?: (date?: Date) => void }) => (
    <button
      type="button"
      data-testid="mock-calendar-day"
      onClick={() => {
        onSelect?.(MOCK_CALENDAR_DATE)
      }}
    >
      Select mock date
    </button>
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

    // Select start date
    const startDateButton = screen.getByText('Pick a date')
    await user.click(startDateButton)
    const today = MOCK_CALENDAR_DATE
    const mockDayButton = await screen.findByTestId('mock-calendar-day')
    fireEvent.click(mockDayButton)

    // End date should not be visible
    expect(screen.queryByLabelText('End Date')).not.toBeInTheDocument()

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
          start_date: format(today, 'yyyy-MM-dd'),
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
})
