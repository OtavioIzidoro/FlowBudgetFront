import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { User } from '@/entities/user/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  isSessionResolved: boolean;
  setAuth: (user: User | null, token: string | null) => void;
  setUser: (user: User | null) => void;
  updateUser: (user: User) => void;
  logout: () => void;
  setHasHydrated: (value: boolean) => void;
  setSessionResolved: (value: boolean) => void;
}

const STORAGE_KEY = 'flowbudget-auth';

interface PersistedAuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

const defaultAuthState: PersistedAuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
};

function getInitialAuthState(): PersistedAuthState {
  if (typeof window === 'undefined') {
    return defaultAuthState;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultAuthState;
    }

    const parsed = JSON.parse(raw) as { state?: Partial<PersistedAuthState> };
    const token = parsed.state?.token ?? null;
    const user = parsed.state?.user ?? null;

    return {
      user,
      token,
      isAuthenticated: !!user && !!token,
    };
  } catch {
    return defaultAuthState;
  }
}

const initialAuthState = getInitialAuthState();

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      ...initialAuthState,
      hasHydrated: false,
      isSessionResolved: false,
      setAuth: (user, token) =>
        set({
          user,
          token,
          isAuthenticated: !!user && !!token,
          isSessionResolved: true,
        }),
      setUser: (user) =>
        set((state) => ({
          user,
          isAuthenticated: !!user && !!state.token,
          isSessionResolved: true,
        })),
      updateUser: (user) => set({ user }),
      logout: () =>
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isSessionResolved: true,
        }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
      setSessionResolved: (isSessionResolved) => set({ isSessionResolved }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
