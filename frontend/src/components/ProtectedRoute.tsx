import { ReactNode } from 'react';
import { useSupabaseAuth } from '../hooks/useSupabaseAuth';

interface ProtectedRouteProps {
  children: ReactNode;
  onRedirectToLogin: () => void;
}

export function ProtectedRoute({ children, onRedirectToLogin }: ProtectedRouteProps) {
  const { isAuthenticated } = useSupabaseAuth();

  if (!isAuthenticated) {
    // Trigger redirect on next render cycle
    setTimeout(onRedirectToLogin, 0);
    return null;
  }

  return <>{children}</>;
}
