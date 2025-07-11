import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, type Mock } from 'vitest';
import * as authService from '@/services/authService';
import { MemoryRouter } from 'react-router-dom';

// Mock the authService
vi.mock('@/services/authService', () => ({
  login: vi.fn(),
}));

// Mock the useAuth hook
vi.mock('@/hooks/useAuth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/useAuth')>();
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

// Then import the component that uses the hook
import LoginForm from './LoginForm';
import { useAuth } from '@/hooks/useAuth'; // Import the mocked useAuth

describe('LoginForm', () => {
  it('renders the login form correctly', () => {
    (useAuth as Mock).mockReturnValue({
      login: vi.fn(),
      isAuthenticated: false,
      user: null,
      isLoading: false,
      changePassword: vi.fn(),
      deleteAccount: vi.fn(),
    });

    render(
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('allows the user to fill out the form', () => {
    (useAuth as Mock).mockReturnValue({
      login: vi.fn(),
      isAuthenticated: false,
      user: null,
      isLoading: false,
      changePassword: vi.fn(),
      deleteAccount: vi.fn(),
    });

    render(
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>
    );

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect(emailInput.value).toBe('test@example.com');
    expect(passwordInput.value).toBe('password123');
  });

  it('shows an error message on failed login', async () => {
    (authService.login as Mock).mockRejectedValue(new Error('Invalid credentials'));

    (useAuth as Mock).mockReturnValue({
      login: vi.fn(),
      isAuthenticated: false,
      user: null,
      isLoading: false,
      changePassword: vi.fn(),
      deleteAccount: vi.fn(),
    });

    render(
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /login/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/failed to login/i)).toBeInTheDocument();
    });
  });
});
