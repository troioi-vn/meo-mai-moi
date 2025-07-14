import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import LoginForm from './LoginForm';

vi.mock('@/api/api', () => ({
  api: {
    get: vi.fn(() => Promise.resolve({ data: { user: null } })),
    post: vi.fn(),
  },
}));

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <MemoryRouter>
      <AuthProvider>
        {ui}
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('LoginForm', () => {
  it('renders the login form correctly', () => {
    renderWithProviders(<LoginForm />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('allows the user to fill out the form', () => {
    renderWithProviders(<LoginForm />);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect((emailInput as HTMLInputElement).value).toBe('test@example.com');
    expect((passwordInput as HTMLInputElement).value).toBe('password123');
  });

  it('shows an error message on failed login', async () => {
    renderWithProviders(<LoginForm />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'fail@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(/Failed to login/i)).toBeInTheDocument();
    });
  });
});
