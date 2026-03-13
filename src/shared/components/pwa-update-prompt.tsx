import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/shared/ui/button';
import { RefreshCw } from 'lucide-react';

export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefreshState, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegistered(registration) {
      if (registration) {
        setInterval(() => registration.update(), 60 * 60 * 1000);
      }
    },
    onNeedRefresh: () => setNeedRefresh(true),
  });

  if (!needRefreshState) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-4 left-4 right-4 z-[110] flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 shadow-lg sm:left-auto sm:right-4 sm:max-w-[420px]"
    >
      <p className="text-sm font-medium text-foreground">
        Nova versão disponível
      </p>
      <Button
        size="sm"
        onClick={() => {
          void updateServiceWorker(true);
        }}
      >
        <RefreshCw className="mr-2 h-4 w-4" />
        Atualizar
      </Button>
    </div>
  );
}
