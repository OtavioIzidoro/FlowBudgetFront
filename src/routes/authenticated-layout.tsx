import { useNavigate, useLocation } from '@tanstack/react-router';
import { useEffect } from 'react';
import { AppLayout } from '@/app/app-layout';
import { useAuthStore } from '@/shared/store/auth-store';

export function IndexRedirect() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  useEffect(() => {
    if (isAuthenticated) {
      const next = user?.passwordChangeRequired ? '/change-password' : '/dashboard';
      navigate({ to: next as '/' });
    } else {
      navigate({ to: '/login' });
    }
  }, [isAuthenticated, user?.passwordChangeRequired, navigate]);
  return null;
}

export function AuthenticatedLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: '/login' });
    } else if (user?.passwordChangeRequired && location.pathname !== '/change-password') {
      navigate({ to: '/change-password' as '/' });
    }
  }, [isAuthenticated, user?.passwordChangeRequired, location.pathname, navigate]);
  if (!isAuthenticated) {
    return null;
  }
  return <AppLayout />;
}
