import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { TestAuthProvider } from '@/contexts/TestAuthProvider';
import LoginForm from './LoginForm';

const renderWithProviders = (ui, { providerProps, ...renderOptions }) => {
  return render(
    <TestAuthProvider {...providerProps}>
      <MemoryRouter>{ui}</MemoryRouter>
    </TestAuthProvider>,
    renderOptions
  );
};

describe('LoginForm', () => {
  it('renders the login form correctly', () => {
    renderWithProviders(<LoginForm />, {});
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('allows the user to fill out the form', () => {
    renderWithProviders(<LoginForm />, {});
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect(emailInput.value).toBe('test@example.com');
    expect(passwordInput.value).toBe('password123');
  });

  it('shows an error message on failed login', async () => {
    const login = vi.fn(() => Promise.reject(new Error('Invalid credentials')));
    renderWithProviders(<LoginForm />, { providerProps: { mockValues: { login } } });

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith({ email: 'test@example.com', password: 'password123' });
      expect(screen.getByText(/failed to login/i)).toBeInTheDocument();
    });
  });
});
