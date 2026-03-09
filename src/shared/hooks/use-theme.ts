import { useEffect, useLayoutEffect } from 'react';
import { useUserPreferencesStore } from '@/shared/store/user-preferences-store';
import type { UserPreferences } from '@/entities/user/types';

function getResolvedTheme(preference: UserPreferences['theme']): 'light' | 'dark' {
  if (preference === 'system') {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }
  return preference;
}

export function useTheme() {
  const theme = useUserPreferencesStore((s) => s.theme);
  const hasHydrated = useUserPreferencesStore((s) => s.hasHydrated);

  const setTheme = (value: UserPreferences['theme']) => {
    useUserPreferencesStore.getState().setTheme(value);
  };

  const applyTheme = (value: UserPreferences['theme']) => {
    const resolved = getResolvedTheme(value);
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(resolved);
      document.documentElement.style.colorScheme = resolved;
    }
  };

  useLayoutEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (!hasHydrated) return;
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [hasHydrated, theme]);

  return { theme, setTheme, applyTheme };
}
