import api from './api';
import { User } from '../types/auth';

interface AuthResponse {
  user: User;
  token: string;
}

export async function loginWithGoogle(credential: string): Promise<AuthResponse> {
  const { data } = await api.post('/auth/google', { credential });
  return data.data;
}

export async function getCurrentUser(): Promise<User> {
  const { data } = await api.get('/auth/me');
  return data.data;
}

export async function logoutUser(): Promise<void> {
  await api.post('/auth/logout');
}
