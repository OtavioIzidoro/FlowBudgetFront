import { useToastStore } from '@/shared/store/toast-store';
import { CheckCircle2, XCircle, Info, Loader2, X } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

const typeConfig = {
  success: {
    icon: CheckCircle2,
    className: 'border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-300',
    iconClassName: 'text-green-600 dark:text-green-400',
  },
  error: {
    icon: XCircle,
    className: 'border-destructive/50 bg-destructive/10 text-destructive',
    iconClassName: 'text-destructive',
  },
  info: {
    icon: Info,
    className: 'border-primary/50 bg-primary/10 text-foreground',
    iconClassName: 'text-primary',
  },
  loading: {
    icon: Loader2,
    className: 'border-muted-foreground/30 bg-muted text-foreground',
    iconClassName: 'text-muted-foreground',
  },
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const remove = useToastStore((s) => s.remove);

  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex max-w-[420px] flex-col gap-2"
      aria-live="polite"
      role="region"
      aria-label="Notificações"
    >
      {toasts.map((toast) => {
        const config = typeConfig[toast.type];
        const Icon = config.icon;
        return (
          <div
            key={toast.id}
            className={cn(
              'flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg transition-all data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-right-full',
              config.className
            )}
          >
            <Icon
              className={cn(
                'h-5 w-5 shrink-0',
                config.iconClassName,
                toast.type === 'loading' && 'animate-spin'
              )}
            />
            <p className="flex-1 text-sm font-medium">{toast.message}</p>
            <button
              type="button"
              onClick={() => remove(toast.id)}
              className="shrink-0 rounded p-1 opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
