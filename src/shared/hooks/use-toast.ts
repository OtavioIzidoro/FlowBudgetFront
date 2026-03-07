import { useCallback } from 'react';
import { useToastStore } from '@/shared/store/toast-store';

export function useToast() {
  const add = useToastStore((s) => s.add);
  const remove = useToastStore((s) => s.remove);
  const success = useToastStore((s) => s.success);
  const error = useToastStore((s) => s.error);
  const info = useToastStore((s) => s.info);
  const loading = useToastStore((s) => s.loading);

  const toast = useCallback(
    (message: string, type?: 'success' | 'error' | 'info', duration?: number) => {
      return add(message, type, duration);
    },
    [add]
  );

  return {
    toast,
    success,
    error,
    info,
    loading,
    dismiss: remove,
  };
}
