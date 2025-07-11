import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, type Mock } from 'vitest';
import RegisterForm from './RegisterForm';
import * as authService from '@/services/authService';
import { MemoryRouter } from 'react-router-dom';

// Mock the authService
vi.mock('@/services/authService', () => ({
  register: vi.fn(),
}));

// Mock the useAuth hook
vi.mock('@/hooks/useAuth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/useAuth')>();
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

// Import the mocked useAuth after mocking
import { useAuth } from '@/hooks/useAuth';

describe('RegisterForm', () => {
  it('renders the registration form correctly', () => {
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
        <RegisterForm />
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
  });

  it('shows an error message on failed registration', async () => {
    (authService.register as Mock).mockRejectedValue(new Error('Registration failed'));

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
        <RegisterForm />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/name/i) as HTMLInputElement, { target: { value: 'Test User' } });
    fireEvent.change(screen.getByLabelText(/email/i) as HTMLInputElement, { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByLabelText(/^Password$/i) as HTMLInputElement, { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText(/confirm password/i) as HTMLInputElement, { target: { value: 'password123' } });
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /register/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/Registration failed/i)).toBeInTheDocument();
    });
  });
});