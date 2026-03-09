import { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { logout as apiLogout, refreshAuthSession } from '@/shared/services/auth.service';
import { useAuthStore } from '@/shared/store/auth-store';

const DEFAULT_INACTIVITY_MS = 30 * 60 * 1000;
const DEFAULT_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const ACTIVITY_DEBOUNCE_MS = 1000;

export function useInactivitySession(options?: {
  inactivityMs?: number;
  refreshIntervalMs?: number;
}) {
  const inactivityMs = options?.inactivityMs ?? DEFAULT_INACTIVITY_MS;
  const refreshIntervalMs = options?.refreshIntervalMs ?? DEFAULT_REFRESH_INTERVAL_MS;
  const navigate = useNavigate();
  const storeLogout = useAuthStore((s) => s.logout);
  const setAuth = useAuthStore((s) => s.setAuth);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const lastRefreshRef = useRef<number>(Date.now());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLogout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    void apiLogout();
    storeLogout();
    navigate({ to: '/login' });
  }, [storeLogout, navigate]);

  const refreshSession = useCallback(async () => {
    try {
      const session = await refreshAuthSession();
      setAuth(session.user, session.token);
      lastRefreshRef.current = Date.now();
    } catch {
      handleLogout();
    }
  }, [setAuth, handleLogout]);

  const scheduleLogout = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      handleLogout();
    }, inactivityMs);
  }, [inactivityMs, handleLogout]);

  const onActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      const now = Date.now();
      if (now - lastRefreshRef.current >= refreshIntervalMs) {
        void refreshSession();
      }
      scheduleLogout();
    }, ACTIVITY_DEBOUNCE_MS);
  }, [refreshIntervalMs, refreshSession, scheduleLogout]);

  useEffect(() => {
    scheduleLogout();
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'] as const;
    events.forEach((ev) => window.addEventListener(ev, onActivity));
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, onActivity));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [onActivity, scheduleLogout]);
}
