import { useEffect } from 'react';
import { refreshAuthSession } from '@/shared/services/auth.service';
import { useAuthStore } from '@/shared/store/auth-store';

export function AuthSessionBootstrap() {
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isSessionResolved = useAuthStore((state) => state.isSessionResolved);
  const setAuth = useAuthStore((state) => state.setAuth);
  const logout = useAuthStore((state) => state.logout);
  const setSessionResolved = useAuthStore((state) => state.setSessionResolved);

  useEffect(() => {
    if (!hasHydrated || isSessionResolved) {
      return;
    }

    if (isAuthenticated) {
      setSessionResolved(true);
      return;
    }

    let cancelled = false;

    void refreshAuthSession()
      .then((data) => {
        if (!cancelled) {
          setAuth(data.user, data.token);
        }
      })
      .catch(() => {
        if (!cancelled) {
          logout();
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSessionResolved(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    hasHydrated,
    isAuthenticated,
    isSessionResolved,
    logout,
    setAuth,
    setSessionResolved,
  ]);

  return null;
}
