import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, type Mock } from 'vitest';
import ProfilePage from './ProfilePage';
import { type User } from '@/types/auth';

// Mock user data
const mockUser: User = {
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
};

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

describe('ProfilePage', () => {
  it('should display user name and email when user is authenticated', () => {
    (useAuth as Mock).mockReturnValue({
      isAuthenticated: true,
      user: mockUser,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      changePassword: vi.fn(),
      deleteAccount: vi.fn(),
    });

    render(<ProfilePage />);

    // Check for user's name and email
    expect(screen.getByText(/Name:/i)).toBeInTheDocument();
    expect(screen.getByText(mockUser.name)).toBeInTheDocument();
    expect(screen.getByText(/Email:/i)).toBeInTheDocument();
    expect(screen.getByText(mockUser.email)).toBeInTheDocument();
  });

  it('should display loading message when user is not authenticated', () => {
    (useAuth as Mock).mockReturnValue({
      isAuthenticated: false,
      user: null,
      isLoading: true,
      login: vi.fn(),
      logout: vi.fn(),
      changePassword: vi.fn(),
      deleteAccount: vi.fn(),
    });

    render(<ProfilePage />);

    // Check for loading message
    expect(screen.getByText(/Loading.../i)).toBeInTheDocument();
  });
});