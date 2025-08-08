import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { CatDetails } from './CatDetails';
import { useAuth } from '@/hooks/use-auth';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { Cat } from '@/types/cat';
import { MemoryRouter } from 'react-router-dom';

// Mocks
vi.mock('@/hooks/use-auth');
vi.mock('react-router-dom', async () => {
  const original = await vi.importActual('react-router-dom');
  return {
    ...original,
    useNavigate: vi.fn(),
    useLocation: vi.fn(),
  };
});
vi.mock('sonner', () => ({
  toast: {
    info: vi.fn(),
  },
}));
vi.mock('@/components/PlacementResponseModal', () => ({
  PlacementResponseModal: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div>PlacementResponseModal</div> : null),
}));

const mockNavigate = vi.fn();
const mockUseLocation = {
  pathname: '/cats/1',
};

const baseCat: Cat = {
  id: 1,
  name: 'Whiskers',
  birthday: '2023-01-15T00:00:00.000000Z', // Adjusted for age calculation
  breed: 'Tabby',
  location: 'New York, NY',
  status: 'active',
  gender: 'male',
  description: 'A very friendly cat.',
  photo_url: 'https://example.com/cat.jpg',
  is_sterilized: true,
  created_at: '2024-01-01T12:00:00Z',
  updated_at: '2024-01-01T12:00:00Z',
  placement_requests: [],
  viewer_permissions: { can_edit: false, can_delete: false },
};

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
};

describe('CatDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
    (useLocation as jest.Mock).mockReturnValue(mockUseLocation);
    (useAuth as jest.Mock).mockReturnValue({ isAuthenticated: false }); // Default mock
  });

  it('renders cat details correctly', () => {
    renderWithRouter(<CatDetails cat={baseCat} onDeletePlacementRequest={vi.fn()} />);

    expect(screen.getByText('Whiskers')).toBeInTheDocument();
    expect(screen.getByText(/Tabby - 2 years old/)).toBeInTheDocument();
    expect(screen.getByText('New York, NY')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('A very friendly cat.')).toBeInTheDocument();
    expect(screen.getByAltText('Whiskers')).toHaveAttribute('src', 'https://example.com/cat.jpg');
  });

  describe('Placement Requests', () => {
    it('shows delete button for owner', async () => {
      const catWithOwner: Cat = {
        ...baseCat,
        viewer_permissions: { can_edit: true, can_delete: true },
        placement_requests: [
          {
            id: 101,
            cat_id: 1,
            request_type: 'foster_free',
            status: 'open',
            notes: 'Needs a temporary home.',
            is_active: true,
            expires_at: '2025-12-31T00:00:00.000000Z',
            created_at: '2025-01-01T12:00:00Z',
            updated_at: '2025-01-01T12:00:00Z',
          },
        ],
      };
      const mockDelete = vi.fn();
      renderWithRouter(<CatDetails cat={catWithOwner} onDeletePlacementRequest={mockDelete} />);

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      expect(deleteButton).toBeInTheDocument();

      await userEvent.click(deleteButton);

      expect(await screen.findByText('Are you absolutely sure?')).toBeInTheDocument();

      const continueButton = screen.getByRole('button', { name: /continue/i });
      await userEvent.click(continueButton);

      expect(mockDelete).toHaveBeenCalledWith(101);
    });

    it('shows respond button for non-owner', () => {
      (useAuth as jest.Mock).mockReturnValue({ isAuthenticated: true });
      const catForResponder: Cat = {
        ...baseCat,
        viewer_permissions: { can_edit: false, can_delete: false },
        placement_requests: [
          {
            id: 102,
            cat_id: 1,
            request_type: 'permanent',
            status: 'open',
            notes: 'Looking for a forever home.',
            is_active: true,
            expires_at: '2025-12-31T00:00:00.000000Z',
            created_at: '2025-01-01T12:00:00Z',
            updated_at: '2025-01-01T12:00:00Z',
          },
        ],
      };

      renderWithRouter(<CatDetails cat={catForResponder} onDeletePlacementRequest={vi.fn()} />);

      expect(screen.getByRole('button', { name: /respond/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    });

    it('opens modal on respond click when authenticated', async () => {
      (useAuth as jest.Mock).mockReturnValue({ isAuthenticated: true });
      const catForResponder: Cat = {
        ...baseCat,
        placement_requests: [{ id: 103, status: 'open', is_active: true, cat_id: 1, request_type: 'foster', notes: '', expires_at: '' }],
      };

      renderWithRouter(<CatDetails cat={catForResponder} onDeletePlacementRequest={vi.fn()} />);

      const respondButton = screen.getByRole('button', { name: /respond/i });
      await userEvent.click(respondButton);

      expect(await screen.findByText('PlacementResponseModal')).toBeInTheDocument();
    });

    it('redirects to login on respond click when not authenticated', async () => {
      (useAuth as jest.Mock).mockReturnValue({ isAuthenticated: false });
      const catForResponder: Cat = {
        ...baseCat,
        placement_requests: [{ id: 104, status: 'open', is_active: true, cat_id: 1, request_type: 'foster', notes: '', expires_at: '' }],
      };

      renderWithRouter(<CatDetails cat={catForResponder} onDeletePlacementRequest={vi.fn()} />);

      const respondButton = screen.getByRole('button', { name: /respond/i });
      await userEvent.click(respondButton);

      expect(toast.info).toHaveBeenCalledWith('Please log in to respond to this placement request.');
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login?redirect=%2Fcats%2F1');
      });
    });
  });
});
