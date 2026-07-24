import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminCheck } from '../../hooks/useAdminCheck';

interface AdminRouteProps {
  children: ReactNode;
}

/**
 * AdminRoute
 *
 * Three-branch guard for all /admin/* routes:
 *   1. isLoading        → full-screen spinner (never a blank screen)
 *   2. isUnauthenticated → redirect to /auth/signin
 *   3. !isPlatformAdmin  → redirect to /403
 *   4. isPlatformAdmin   → render children
 *
 * Does NOT wrap children in ProtectedRoute — that guard redirects to
 * /onboarding, which is not appropriate for an admin panel user who may
 * have a different onboarding state.
 *
 * The is_platform_admin flag is never read from localStorage or any
 * client-supplied value. It is fetched fresh from /api/admin/auth/me on
 * every mount.
 */
export function AdminRoute({ children }: AdminRouteProps) {
  const { isPlatformAdmin, isLoading, isUnauthenticated } = useAdminCheck();

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'var(--color-bg)',
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            border: '4px solid var(--color-border)',
            borderTopColor: 'var(--color-green)',
            borderRadius: '50%',
            animation: 'spin 0.6s linear infinite',
          }}
          role="status"
          aria-label="Checking admin access…"
        />
      </div>
    );
  }

  if (isUnauthenticated) {
    return <Navigate to="/auth/signin" replace />;
  }

  if (!isPlatformAdmin) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
}
