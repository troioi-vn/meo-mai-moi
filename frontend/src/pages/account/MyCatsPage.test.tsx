import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import MyCatsPage from './MyCatsPage';
import { getMyCats } from '@/api/cats';
import { useAuth } from '@/contexts/AuthContext';

vi.mock('@/api/cats');
vi.mock('@/contexts/AuthContext');

const mockUser = { id: 1, name: 'Test User', email: 'test@example.com' };

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
};

describe('MyCatsPage', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      isLoading: false,
      loadUser: vi.fn(),
      changePassword: vi.fn(),
      deleteAccount: vi.fn(),
    });
  });

  it('renders the page title', async () => {
    vi.mocked(getMyCats).mockResolvedValue([]);
    renderWithRouter(<MyCatsPage />);
    await waitFor(() => {
      expect(screen.getByText('My Cats')).toBeInTheDocument();
    });
  });

  it("fetches and displays the user's cats", async () => {
    vi.mocked(getMyCats).mockResolvedValue([
      {
        id: 1,
        name: 'Cat 1',
        breed: 'Breed 1',
        age: 2,
        location: 'Location 1',
        description: 'Description 1',
        user_id: 1,
        status: 'available',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        imageUrl: 'http://example.com/cat1.jpg',
      },
      {
        id: 2,
        name: 'Cat 2',
        breed: 'Breed 2',
        age: 3,
        location: 'Location 2',
        description: 'Description 2',
        user_id: 1,
        status: 'fostered',
        created_at: '2023-01-02T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z',
        imageUrl: 'http://example.com/cat2.jpg',
      },
    ]);
    renderWithRouter(<MyCatsPage />);
    await waitFor(() => {
      expect(screen.getByText('Cat 1')).toBeInTheDocument();
      expect(screen.getByText('Cat 2')).toBeInTheDocument();
    });
  });

  it('displays a loading message initially', async () => {
    vi.mocked(getMyCats).mockResolvedValue([]);
    renderWithRouter(<MyCatsPage />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
  });

  it('displays an error message if fetching cats fails', async () => {
    vi.mocked(getMyCats).mockRejectedValue(new Error('Failed to fetch'));
    renderWithRouter(<MyCatsPage />);
    await waitFor(() => {
      expect(screen.getByText('Failed to fetch cats.')).toBeInTheDocument();
    });
  });

  it('has a link to the create cat page', async () => {
    vi.mocked(getMyCats).mockResolvedValue([]);
    renderWithRouter(<MyCatsPage />);
    await waitFor(() => {
      const link = screen.getByRole('link', { name: 'Add Cat' });
      expect(link).toHaveAttribute('href', '/account/cats/create');
    });
  });
});