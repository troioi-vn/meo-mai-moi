import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import RegisterForm from './RegisterForm';
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

describe('RegisterForm', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    // Reset localStorage
    localStorage.clear();
  });

  it('should allow the user to register successfully', async () => {
    // Mock a successful fetch response
    vi.spyOn(window, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'mock_register_token' }),
    } as Response);

    render(
      <BrowserRouter>
        <RegisterForm />
      </BrowserRouter>
    );

    // Find the input fields and button
    const nameInput = screen.getByLabelText(/name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const registerButton = screen.getByRole('button', { name: /register/i });

    // Simulate user typing
    fireEvent.change(nameInput, { target: { value: 'Test User' } });
    fireEvent.change(emailInput, { target: { value: 'register@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });

    // Simulate form submission
    fireEvent.click(registerButton);

    // Wait for the fetch call and navigation to complete
    await waitFor(() => {
      // Assert that fetch was called with correct data
      expect(window.fetch).toHaveBeenCalledWith(
        'http://localhost:8080/api/register',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Test User',
            email: 'register@example.com',
            password: 'password123',
            password_confirmation: 'password123',
          }),
        })
      );

      // Assert that access token is stored in localStorage
      expect(localStorage.getItem('access_token')).toBe('mock_register_token');

      // Assert that navigation occurred
      expect(mockedUsedNavigate).toHaveBeenCalledWith('/account');
    });
  });

  it('should display an error message on failed registration', async () => {
    // Mock a failed fetch response
    vi.spyOn(window, 'fetch').mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Email already taken' }),
    } as Response);

    render(
      <BrowserRouter>
        <RegisterForm />
      </BrowserRouter>
    );

    const nameInput = screen.getByLabelText(/name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText('Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm Password');
    const registerButton = screen.getByRole('button', { name: /register/i });

    fireEvent.change(nameInput, { target: { value: 'Test User' } });
    fireEvent.change(emailInput, { target: { value: 'existing@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
    fireEvent.click(registerButton);

    await waitFor(() => {
      // Assert that an error message is displayed
      expect(screen.getByText(/email already taken/i)).toBeInTheDocument();
      // Assert that navigation did not occur
      expect(mockedUsedNavigate).not.toHaveBeenCalled();
      // Assert that localStorage is empty
      expect(localStorage.getItem('access_token')).toBeNull();
    });
  });
});
