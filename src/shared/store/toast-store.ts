import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'loading';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  createdAt: number;
}

interface ToastState {
  toasts: ToastItem[];
  add: (message: string, type?: ToastType, duration?: number) => string;
  remove: (id: string) => void;
  success: (message: string, duration?: number) => string;
  error: (message: string, duration?: number) => string;
  info: (message: string, duration?: number) => string;
  loading: (message: string) => string;
}

const autoRemoveTimer: Record<string, ReturnType<typeof setTimeout>> = {};

export const useToastStore = create<ToastState>()((set, get) => ({
  toasts: [],

  add: (message, type = 'info', duration = 4000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const item: ToastItem = {
      id,
      message,
      type,
      duration: type === 'loading' ? undefined : duration,
      createdAt: Date.now(),
    };
    set((state) => ({ toasts: [...state.toasts, item] }));

    if (type !== 'loading' && duration > 0) {
      autoRemoveTimer[id] = setTimeout(() => {
        get().remove(id);
        delete autoRemoveTimer[id];
      }, duration);
    }
    return id;
  },

  remove: (id) => {
    if (autoRemoveTimer[id]) {
      clearTimeout(autoRemoveTimer[id]);
      delete autoRemoveTimer[id];
    }
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

  success: (message, duration = 4000) => get().add(message, 'success', duration),
  error: (message, duration = 5000) => get().add(message, 'error', duration),
  info: (message, duration = 4000) => get().add(message, 'info', duration),
  loading: (message) => get().add(message, 'loading'),
}));
