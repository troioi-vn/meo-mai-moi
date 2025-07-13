import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { NotificationBell } from './NotificationBell';
import { api } from '@/api/api';
import { AuthProvider } from '@/contexts/AuthContext';

vi.mock('@/api/api');

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
    // @ts-ignore
    vi.spyOn(require('@/contexts/AuthContext'), 'useAuth').mockReturnValue({ user: mockUser });
  });

  it('fetches and displays the number of unread notifications', async () => {
    renderWithProviders(<NotificationBell />);
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });
});