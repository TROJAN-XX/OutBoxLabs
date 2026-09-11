export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  createdAt?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  authenticated: boolean;
}
