import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { NotificationBell } from './NotificationBell';
import { api } from '@/api/axios';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

vi.mock('@/api/axios');
vi.mock('@/contexts/AuthContext');

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

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockResolvedValue({
      data: [
        { id: 1, message: 'Notification 1', is_read: false },
        { id: 2, message: 'Notification 2', is_read: false },
      ],
    });
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

  it('fetches and displays the number of unread notifications', async () => {
    renderWithProviders(<NotificationBell />);
    
    const badge = await screen.findByTestId('notification-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('2');
  });
});