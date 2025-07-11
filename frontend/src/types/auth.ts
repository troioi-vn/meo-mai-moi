export interface User {
  id: number;
  name: string;
  email: string;
}

export interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (userData: User, token: string) => void;
  logout: () => void;
  isLoading: boolean;
  changePassword: (current_password: string, new_password: string, new_password_confirmation: string) => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
}
