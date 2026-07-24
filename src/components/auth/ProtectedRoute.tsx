import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--color-bg)' }}>
        <div style={{ width: 40, height: 40, border: '4px solid var(--color-border)', borderTopColor: 'var(--color-green)', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} role="status" aria-label="Loading" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/signin" replace />;
  }

  // Check if onboarding is completed
  if (user && !user.onboarding_completed) {
    // If we're not already on the onboarding page, redirect
    if (window.location.pathname !== '/onboarding') {
      return <Navigate to="/onboarding" replace />;
    }
  } else if (user && user.onboarding_completed) {
    // If we are on onboarding but already completed it, redirect to dashboard
    if (window.location.pathname === '/onboarding') {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
}
