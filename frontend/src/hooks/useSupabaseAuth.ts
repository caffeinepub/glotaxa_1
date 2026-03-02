import { useAuth } from '../contexts/AuthContext';

export function useSupabaseAuth() {
  const { isAuthenticated, userId, accessToken, logout } = useAuth();
  return { isAuthenticated, userId, accessToken, logout };
}
