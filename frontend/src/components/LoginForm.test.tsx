import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import LoginForm from './LoginForm';
import { BrowserRouter } from 'react-router-dom';

// Mock useNavigate from react-router-dom
const mockedUsedNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => mockedUsedNavigate,
  };
});

describe('LoginForm', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    // Reset localStorage
    localStorage.clear();
  });

  it('should allow the user to log in successfully', async () => {
    // Mock a successful fetch response
    vi.spyOn(window, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'mock_access_token' }),
    } as Response);

    render(
      <BrowserRouter>
        <LoginForm />
      </BrowserRouter>
    );

    // Find the input fields and button
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const loginButton = screen.getByRole('button', { name: /login/i });

    // Simulate user typing
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    // Simulate form submission
    fireEvent.click(loginButton);

    // Wait for the fetch call and navigation to complete
    await waitFor(() => {
      // Assert that fetch was called with correct data
      expect(window.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/login',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
        })
      );

      // Assert that access token is stored in localStorage
      expect(localStorage.getItem('access_token')).toBe('mock_access_token');

      // Assert that navigation occurred
      expect(mockedUsedNavigate).toHaveBeenCalledWith('/account');
    });
  });

  it('should display an error message on failed login', async () => {
    // Mock a failed fetch response
    vi.spyOn(window, 'fetch').mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Invalid credentials' }),
    } as Response);

    render(
      <BrowserRouter>
        <LoginForm />
      </BrowserRouter>
    );

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const loginButton = screen.getByRole('button', { name: /login/i });

    fireEvent.change(emailInput, { target: { value: 'wrong@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    fireEvent.click(loginButton);

    await waitFor(() => {
      // Assert that an error message is displayed
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      // Assert that navigation did not occur
      expect(mockedUsedNavigate).not.toHaveBeenCalled();
      // Assert that localStorage is empty
      expect(localStorage.getItem('access_token')).toBeNull();
    });
  });
});
