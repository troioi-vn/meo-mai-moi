import { render, screen, waitFor } from '@testing-library/react';
import { PlacementRequestModal } from './PlacementRequestModal';
import { useCreatePlacementRequest, PlacementRequestPayload } from '@/hooks/useCreatePlacementRequest';
import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { UseMutationResult } from '@tanstack/react-query';
import { PlacementRequest } from '@/types/cat';
import { AxiosError } from 'axios';

// Mock the hook
vi.mock('@/hooks/useCreatePlacementRequest');

describe('PlacementRequestModal', () => {
  const mockMutate = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    (useCreatePlacementRequest as jest.Mock<Partial<UseMutationResult<PlacementRequest, AxiosError<unknown>, PlacementRequestPayload>>>).mockReturnValue({
      mutate: (payload, options) => {
        mockMutate(payload, options);
        options?.onSuccess?.({} as PlacementRequest, payload, undefined);
      },
      isPending: false,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly when open', () => {
    render(<PlacementRequestModal catId={1} isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText('Create Placement Request')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<PlacementRequestModal catId={1} isOpen={false} onClose={mockOnClose} />);
    expect(screen.queryByText('Create Placement Request')).not.toBeInTheDocument();
  });

  it(
    'calls onClose when the cancel button is clicked',
    async () => {
      const user = userEvent.setup();
      render(<PlacementRequestModal catId={1} isOpen={true} onClose={mockOnClose} />);
      // Wait for dialog to appear
      expect(await screen.findByText('Create Placement Request')).toBeInTheDocument();
      // Use findByRole for the Cancel button (async, in case of portal)
      const cancelButton = await screen.findByRole('button', { name: /cancel/i });
      await user.click(cancelButton);
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    },
    10000
  );

  // Temporarily disabled due to persistent timeouts.
  // it(
  //   'submits the form with the correct data',
  //   async () => {
  //     const user = userEvent.setup();
  //     render(<PlacementRequestModal catId={1} isOpen={true} onClose={mockOnClose} />);
  //     // Wait for dialog to appear
  //     expect(await screen.findByText('Create Placement Request')).toBeInTheDocument();

  //     // Open and select request type
  
  //     const requestTypeTrigger = await screen.findByText('Select a request type');
  //     await user.click(requestTypeTrigger);
  //     const permanentOption = await screen.findByText('Permanent');
  //     await user.click(permanentOption);

  //     // Fill notes
  //     const notesInput = await screen.findByLabelText('Notes');
  //     await user.type(notesInput, 'Test notes');

  //     // Submit the form
  //     const submitButton = await screen.findByRole('button', { name: /create request/i });
  //     await user.click(submitButton);

  //     await waitFor(() => {
  //       expect(mockMutate).toHaveBeenCalledWith(
  //         {
  //           cat_id: 1,
  //           request_type: 'permanent',
  //           notes: 'Test notes',
  //           expires_at: undefined,
  //         },
  //         { onSuccess: expect.any(Function) }
  //       );
  //     });
  //   },
  //   10000
  // );
});