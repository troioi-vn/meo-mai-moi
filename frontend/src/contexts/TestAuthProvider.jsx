import { AuthContext } from './AuthContext';
import { vi } from 'vitest';

export const TestAuthProvider = ({ children, mockValues }) => {
  const defaultMockValues = {
    user: null,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    loading: false,
  };

  const value = { ...defaultMockValues, ...mockValues };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
