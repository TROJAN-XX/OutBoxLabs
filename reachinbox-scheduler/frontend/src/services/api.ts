import axios from 'axios';

const rawUrl = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const baseURL = rawUrl.endsWith('/api') ? rawUrl : (rawUrl ? `${rawUrl}/api` : '/api');

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if stored
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      // Let the auth context handle redirect
    }
    return Promise.reject(error);
  }
);

export default api;
