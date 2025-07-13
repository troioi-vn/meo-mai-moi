import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { TestAuthProvider } from '@/contexts/TestAuthProvider';
import ProfilePage from '../pages/ProfilePage';

const renderWithProviders = (ui: React.ReactElement, { providerProps, ...renderOptions }: { providerProps?: any; [key: string]: any }) => {
  return render(
    <TestAuthProvider {...providerProps}>
      <MemoryRouter>{ui}</MemoryRouter>
    </TestAuthProvider>,
    renderOptions
  );
};

describe('ProfilePage', () => {
  it('renders the profile page correctly', () => {
    const user = { name: 'Test User', email: 'test@example.com' };
    const logout = vi.fn();
    renderWithProviders(<ProfilePage />, { providerProps: { mockValues: { user, logout } } });

    expect(screen.getByRole('heading', { name: /profile/i })).toBeInTheDocument();
    expect(screen.getByText(/name: test user/i)).toBeInTheDocument();
    expect(screen.getByText(/email: test@example.com/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
  });
});
