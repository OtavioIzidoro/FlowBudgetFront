import { useNavigate, useLocation } from '@tanstack/react-router';
import { useEffect } from 'react';
import { AppLayout } from '@/app/app-layout';
import { useAuthStore } from '@/shared/store/auth-store';

export function IndexRedirect() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const isSessionResolved = useAuthStore((s) => s.isSessionResolved);

  useEffect(() => {
    if (!hasHydrated || !isSessionResolved) return;
    if (isAuthenticated) {
      const next = user?.passwordChangeRequired ? '/change-password' : '/dashboard';
      navigate({ to: next as '/' });
    } else {
      navigate({ to: '/login' });
    }
  }, [hasHydrated, isAuthenticated, isSessionResolved, user?.passwordChangeRequired, navigate]);

  if (!hasHydrated || !isSessionResolved) {
    return null;
  }

  return null;
}

export function AuthenticatedLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const isSessionResolved = useAuthStore((s) => s.isSessionResolved);

  useEffect(() => {
    if (!hasHydrated || !isSessionResolved) return;
    if (!isAuthenticated) {
      navigate({ to: '/login' });
    } else if (user?.passwordChangeRequired && location.pathname !== '/change-password') {
      navigate({ to: '/change-password' as '/' });
    }
  }, [hasHydrated, isAuthenticated, isSessionResolved, user?.passwordChangeRequired, location.pathname, navigate]);

  if (!hasHydrated || !isSessionResolved || !isAuthenticated) {
    return null;
  }

  return <AppLayout />;
}
