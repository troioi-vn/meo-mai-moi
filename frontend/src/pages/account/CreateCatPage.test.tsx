import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi } from 'vitest';
import CreateCatPage from './CreateCatPage';
import MyCatsPage from './MyCatsPage';
import { createCat } from '@/api/cats';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/sonner';

vi.mock('@/api/cats');
vi.mock('@/contexts/AuthContext');

const mockUser = { id: 1, name: 'Test User', email: 'test@example.com' };

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <MemoryRouter initialEntries={['/account/cats/create']}>
      <AuthProvider>
        <Routes>
          <Route path="/account/cats/create" element={ui} />
          <Route path="/account/cats" element={<MyCatsPage />} />
        </Routes>
        <Toaster />
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('CreateCatPage', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      loadUser: vi.fn(),
      changePassword: vi.fn(),
      deleteAccount: vi.fn()
    });
  });

  it('renders the form fields', () => {
    renderWithProviders(<CreateCatPage />);
    expect(screen.getByRole('textbox', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Breed' })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Age' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Location' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Description' })).toBeInTheDocument();
  });

  it('submits the form and redirects on success', async () => {
    vi.mocked(createCat).mockResolvedValue({ id: 1, name: 'New Cat', breed: 'New Breed', age: 1, location: 'New Location', description: 'New Description', user_id: 1, status: 'available', created_at: '', updated_at: '' });
    renderWithProviders(<CreateCatPage />);

    fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), { target: { value: 'New Cat' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Breed' }), { target: { value: 'New Breed' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Age' }), { target: { value: '1' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Location' }), { target: { value: 'New Location' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Description' }), { target: { value: 'New Description' } });

    fireEvent.click(screen.getByRole('button', { name: 'Create Cat' }));

    await waitFor(() => {
      expect(createCat).toHaveBeenCalledWith({
        name: 'New Cat',
        breed: 'New Breed',
        age: 1,
        location: 'New Location',
        description: 'New Description',
      });
    });
  });

  it('displays an error message on failure', async () => {
    vi.mocked(createCat).mockRejectedValue(new Error('Failed to create'));
    renderWithProviders(<CreateCatPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Create Cat' }));

    await waitFor(() => {
      expect(screen.getByText('Failed to create cat.')).toBeInTheDocument();
    });
  });
});