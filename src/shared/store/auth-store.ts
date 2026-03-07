import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/entities/user/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User | null, token: string | null) => void;
  setUser: (user: User | null) => void;
  updateUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) =>
        set({
          user,
          token,
          isAuthenticated: !!user && !!token,
        }),
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      updateUser: (user) => set({ user }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    { name: 'flowbudget-auth' }
  )
);
