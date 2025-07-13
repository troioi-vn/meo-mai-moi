import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import MyCatsPage from './MyCatsPage';
import { getMyCats } from '@/api/cats';
import { AuthProvider } from '@/contexts/AuthContext';

vi.mock('@/api/cats');

const mockUser = { id: 1, name: 'Test User', email: 'test@example.com' };

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <MemoryRouter>
      <AuthProvider>
        {ui}
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('MyCatsPage', () => {
  beforeEach(() => {
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
      },
    ]);
    // @ts-ignore
    vi.spyOn(require('@/contexts/AuthContext'), 'useAuth').mockReturnValue({ user: mockUser });
  });

  it('renders the page title', async () => {
    renderWithProviders(<MyCatsPage />);
    expect(screen.getByText('My Cats')).toBeInTheDocument();
  });

  it('fetches and displays the user\'s cats', async () => {
    renderWithProviders(<MyCatsPage />);
    await waitFor(() => {
      expect(screen.getByText('Cat 1')).toBeInTheDocument();
      expect(screen.getByText('Cat 2')).toBeInTheDocument();
    });
  });

  it('displays a loading message initially', () => {
    renderWithProviders(<MyCatsPage />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays an error message if fetching cats fails', async () => {
    vi.mocked(getMyCats).mockRejectedValue(new Error('Failed to fetch'));
    renderWithProviders(<MyCatsPage />);
    await waitFor(() => {
      expect(screen.getByText('Failed to fetch cats.')).toBeInTheDocument();
    });
  });

  it('has a link to the create cat page', () => {
    renderWithProviders(<MyCatsPage />);
    expect(screen.getByText('Add Cat')).toHaveAttribute('href', '/account/cats/create');
  });
});