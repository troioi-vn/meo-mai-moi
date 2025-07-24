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
      mutate: mockMutate,
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

  it('calls onClose when the cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<PlacementRequestModal catId={1} isOpen={true} onClose={mockOnClose} />);
    await user.click(screen.getByText('Cancel'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('submits the form with the correct data', async () => {
    const user = userEvent.setup();
    render(<PlacementRequestModal catId={1} isOpen={true} onClose={mockOnClose} />);

    // Fill out the form
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: 'Permanent' }));

    await user.type(screen.getByLabelText('Notes'), 'Test notes');
    await user.type(screen.getByLabelText('Expires At'), '2025-12-31T23:59');

    // Submit the form
    await user.click(screen.getByText('Create Request'));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        {
          cat_id: 1,
          request_type: 'permanent',
          notes: 'Test notes',
          expires_at: '2025-12-31T23:59',
        },
        { onSuccess: expect.any(Function) }
      );
    });
  });
});
