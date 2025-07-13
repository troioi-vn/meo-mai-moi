import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi } from 'vitest';
import CreateCatPage from './CreateCatPage';
import MyCatsPage from './MyCatsPage';
import { createCat } from '@/api/cats';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/sonner';

vi.mock('@/api/cats');

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
    // @ts-ignore
    vi.spyOn(require('@/contexts/AuthContext'), 'useAuth').mockReturnValue({ user: mockUser });
  });

  it('renders the form fields', () => {
    renderWithProviders(<CreateCatPage />);
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Breed')).toBeInTheDocument();
    expect(screen.getByLabelText('Age')).toBeInTheDocument();
    expect(screen.getByLabelText('Location')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
  });

  it('submits the form and redirects on success', async () => {
    vi.mocked(createCat).mockResolvedValue({ id: 1, name: 'New Cat', breed: 'New Breed', age: 1, location: 'New Location', description: 'New Description', user_id: 1, status: 'available', created_at: '', updated_at: '' });
    renderWithProviders(<CreateCatPage />);

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'New Cat' } });
    fireEvent.change(screen.getByLabelText('Breed'), { target: { value: 'New Breed' } });
    fireEvent.change(screen.getByLabelText('Age'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Location'), { target: { value: 'New Location' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'New Description' } });

    fireEvent.click(screen.getByText('Create Cat'));

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

    fireEvent.click(screen.getByText('Create Cat'));

    await waitFor(() => {
      expect(screen.getByText('Failed to create cat.')).toBeInTheDocument();
    });
  });
});