export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginRequest { email: string; password: string; }
export interface RegisterRequest {
  email: string; password: string; firstName: string; lastName: string;
}
export interface AuthResponse {
  user: User; accessToken: string; refreshToken: string;
}
