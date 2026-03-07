import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserPreferences } from '@/entities/user/types';

interface UserPreferencesState extends UserPreferences {
  setTheme: (theme: UserPreferences['theme']) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setPreferences: (prefs: Partial<UserPreferences>) => void;
}

export const useUserPreferencesStore = create<UserPreferencesState>()(
  persist(
    (set) => ({
      theme: 'system',
      notificationsEnabled: true,
      setTheme: (theme) => set({ theme }),
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      setPreferences: (prefs) => set(prefs),
    }),
    { name: 'flowbudget-preferences' }
  )
);
