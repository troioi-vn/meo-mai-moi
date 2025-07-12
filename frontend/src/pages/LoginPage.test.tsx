import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { TestAuthProvider } from '@/contexts/TestAuthProvider';
import LoginPage from '../pages/LoginPage';

const renderWithProviders = (ui, { providerProps, ...renderOptions }) => {
  return render(
    <TestAuthProvider {...providerProps}>
      <MemoryRouter>{ui}</MemoryRouter>
    </TestAuthProvider>,
    renderOptions
  );
};

describe('LoginPage', () => {
  it('renders the login page correctly', () => {
    renderWithProviders(<LoginPage />, {});

    expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });
});
