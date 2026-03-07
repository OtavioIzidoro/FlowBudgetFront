import { create } from 'zustand';
import type { Notification } from '@/entities/notification/types';

interface NotificationState {
  items: Notification[];
  unreadCount: number;
  setNotifications: (items: Notification[]) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

export const useNotificationStore = create<NotificationState>()((set) => ({
  items: [],
  unreadCount: 0,
  setNotifications: (items) =>
    set({ items, unreadCount: items.filter((n) => !n.read).length }),
  markAsRead: (id) =>
    set((state) => {
      const items = state.items.map((n) => (n.id === id ? { ...n, read: true } : n));
      return { items, unreadCount: items.filter((n) => !n.read).length };
    }),
  markAllAsRead: () =>
    set((state) => ({
      items: state.items.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),
}));
