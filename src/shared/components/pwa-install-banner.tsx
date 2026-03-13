import { Smartphone, X } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { usePwaInstall } from '@/shared/hooks/use-pwa-install';
import { APP_NAME } from '@/shared/config/constants';
import { cn } from '@/shared/lib/utils';

function isMobileUserAgent(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function PwaInstallBanner() {
  const { canInstall, isStandalone, install, dismiss, isDismissed } = usePwaInstall();

  const isMobile = isMobileUserAgent();
  const ios = isIos();
  const showNativeInstall = canInstall && !isStandalone && !isDismissed;
  const showIosTip = isMobile && ios && !isStandalone && !isDismissed;

  const show = showNativeInstall || showIosTip;
  if (!show) return null;

  return (
    <div
      role="region"
      aria-label="Instalar aplicativo"
      className={cn(
        'flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-foreground',
        'mx-4 mt-3 sm:mx-6 sm:mt-4'
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
          <Smartphone className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {showIosTip
              ? 'Usar como app'
              : 'Instalar no celular'}
          </p>
          <p className="text-xs text-muted-foreground">
            {showIosTip
              ? 'Toque em Compartilhar e depois em "Adicionar à Tela Inicial" para abrir o FlowBudget como app.'
              : `Adicione ${APP_NAME} à tela inicial para acesso rápido.`}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {showNativeInstall && (
          <Button
            size="sm"
            onClick={() => void install()}
            className="whitespace-nowrap"
          >
            Instalar
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={dismiss}
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
