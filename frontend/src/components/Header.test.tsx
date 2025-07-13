import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { TestAuthProvider } from '@/contexts/TestAuthProvider';
import { Header } from './Header';

vi.mock('./UserMenu', () => ({
  UserMenu: () => <div>UserMenu</div>,
}));

const renderWithProviders = (ui: React.ReactElement, { providerProps, ...renderOptions }: { providerProps?: any; [key: string]: any }) => {
  return render(
    <TestAuthProvider {...providerProps}>
      <MemoryRouter>{ui}</MemoryRouter>
    </TestAuthProvider>,
    renderOptions
  );
};

describe('Header', () => {
  it('shows login and register buttons for unauthenticated users', () => {
    renderWithProviders(<Header />, { providerProps: { mockValues: { user: null } } });
    expect(screen.getByRole('link', { name: /login/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /register/i })).toBeInTheDocument();
  });

  it('shows the user menu for authenticated users', () => {
    const user = { name: 'Test User', email: 'test@example.com' };
    renderWithProviders(<Header />, { providerProps: { mockValues: { user } } });
    expect(screen.getByText('UserMenu')).toBeInTheDocument();
  });
});
