import { render, screen, waitFor } from '@testing-library/react';
import { PlacementRequestModal } from './PlacementRequestModal';
import { useCreatePlacementRequest } from '@/hooks/useCreatePlacementRequest';
import type { PlacementRequestPayload } from '@/hooks/useCreatePlacementRequest';
import { vi } from 'vitest';
import type { Mock } from 'vitest';
import userEvent from '@testing-library/user-event';
import type { UseMutationResult } from '@tanstack/react-query';
import type { PlacementRequest } from '@/types/cat';
import { AxiosError } from 'axios';
import { format, addMonths } from 'date-fns';

// Mock the hook
vi.mock('@/hooks/useCreatePlacementRequest');

describe('PlacementRequestModal', () => {
  const mockMutate = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    (useCreatePlacementRequest as unknown as Mock<
      () => Partial<UseMutationResult<PlacementRequest, AxiosError, PlacementRequestPayload>>
    >).mockReturnValue({
      mutate: mockMutate as UseMutationResult<PlacementRequest, AxiosError, PlacementRequestPayload>['mutate'],
      isPending: false,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly when open', () => {
    render(<PlacementRequestModal catId={1} isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText('Create Placement Request')).toBeInTheDocument();
    const submit = screen.getByRole('button', { name: /create request/i });
    expect(submit.disabled).toBe(true);
  });

  it('does not render when closed', () => {
    render(<PlacementRequestModal catId={1} isOpen={false} onClose={mockOnClose} />);
    expect(screen.queryByText('Create Placement Request')).not.toBeInTheDocument();
  });

  it('calls onClose when the cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<PlacementRequestModal catId={1} isOpen={true} onClose={mockOnClose} />);
    expect(await screen.findByText('Create Placement Request')).toBeInTheDocument();
    const cancelButton = await screen.findByRole('button', { name: /cancel/i });
    await user.click(cancelButton);
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  it('submits the form with the correct data for a permanent request', async () => {
    const user = userEvent.setup();
    render(<PlacementRequestModal catId={1} isOpen={true} onClose={mockOnClose} />);
    expect(await screen.findByText('Create Placement Request')).toBeInTheDocument();

    // Open and select request type
    const requestTypeTrigger = screen.getByRole('combobox');
    await user.click(requestTypeTrigger);
    const permanentOption = await screen.findByRole('option', { name: 'Permanent' });
    await user.click(permanentOption);

    // Fill notes
    const notesInput = screen.getByLabelText('Notes');
    await user.type(notesInput, 'Test notes');

    // Select start date
    const startDateButton = screen.getByText('Pick a date');
    await user.click(startDateButton);
    const today = new Date();
    const todayDate = today.getDate().toString();
    const startDateCell = await screen.findByText(todayDate, { selector: 'button.rdp-day:not(.rdp-day_outside)' });
    await user.click(startDateCell);

    // End date should not be visible
    expect(screen.queryByLabelText('End Date')).not.toBeInTheDocument();

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /create request/i });
    await user.click(submitButton);

    await waitFor(() => {
      const expectedExpiresAt = format(addMonths(new Date(), 6), 'yyyy-MM-dd');
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          cat_id: 1,
          request_type: 'permanent',
          notes: 'Test notes',
          start_date: format(today, 'yyyy-MM-dd'),
          expires_at: expect.stringContaining(expectedExpiresAt.substring(0, 10)), // Looser check for date
          end_date: undefined,
        }),
        { onSuccess: expect.any(Function) }
      );
    });
  });

  it('submits the form with the correct data for a foster request', async () => {
    const user = userEvent.setup();
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + 10);

    render(
      <PlacementRequestModal
        catId={1}
        isOpen={true}
        onClose={mockOnClose}
        initialValues={{
          request_type: 'foster_free',
          start_date: today,
          end_date: futureDate,
          notes: 'Test notes',
        }}
      />
    );

    expect(await screen.findByText('Create Placement Request')).toBeInTheDocument();

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /create request/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          cat_id: 1,
          request_type: 'foster_free',
          start_date: format(today, 'yyyy-MM-dd'),
          end_date: format(futureDate, 'yyyy-MM-dd'),
          expires_at: format(today, 'yyyy-MM-dd'),
        }),
        { onSuccess: expect.any(Function) }
      );
    });
  });
});
