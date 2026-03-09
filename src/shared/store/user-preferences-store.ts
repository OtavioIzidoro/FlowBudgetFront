import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { UserPreferences } from '@/entities/user/types';

interface UserPreferencesState extends UserPreferences {
  hasHydrated: boolean;
  setTheme: (theme: UserPreferences['theme']) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setPreferences: (prefs: Partial<UserPreferences>) => void;
  setHasHydrated: (value: boolean) => void;
}

const STORAGE_KEY = 'flowbudget-preferences';

const defaultPreferences: UserPreferences = {
  theme: 'system',
  notificationsEnabled: true,
};

function getInitialPreferences(): UserPreferences {
  if (typeof window === 'undefined') {
    return defaultPreferences;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultPreferences;
    }

    const parsed = JSON.parse(raw) as { state?: Partial<UserPreferences> };

    return {
      theme: parsed.state?.theme ?? defaultPreferences.theme,
      notificationsEnabled:
        parsed.state?.notificationsEnabled ?? defaultPreferences.notificationsEnabled,
    };
  } catch {
    return defaultPreferences;
  }
}

const initialPreferences = getInitialPreferences();

export const useUserPreferencesStore = create<UserPreferencesState>()(
  persist(
    (set) => ({
      ...initialPreferences,
      hasHydrated: false,
      setTheme: (theme) => set({ theme }),
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      setPreferences: (prefs) => set(prefs),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
        notificationsEnabled: state.notificationsEnabled,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
