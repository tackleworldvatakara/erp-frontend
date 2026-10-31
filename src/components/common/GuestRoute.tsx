import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

/**
 * GuestRoute — wraps public-only routes (e.g. /login, /setup).
 * Redirects authenticated users straight to /dashboard.
 */
export default function GuestRoute(): React.ReactElement {
  const user = useAuthStore((s) => s.user);
  return user ? <Navigate to="/dashboard" replace /> : <Outlet />;
}

