import { useState, useEffect } from 'react';
import { isPwaStandalone } from '@/shared/hooks/use-pwa-install';
import { APP_NAME } from '@/shared/config/constants';
import { Button } from '@/shared/ui/button';

const SPLASH_STORAGE_KEY = 'flowbudget-pwa-splash-shown';
const SPLASH_MIN_MS = 1200;

interface PwaSplashScreenProps {
  children: React.ReactNode;
}

export function PwaSplashScreen({ children }: PwaSplashScreenProps) {
  const [showSplash, setShowSplash] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const standalone = isPwaStandalone();
    const alreadyShown = sessionStorage.getItem(SPLASH_STORAGE_KEY) === '1';

    if (!standalone) {
      setShowSplash(false);
      return;
    }

    if (alreadyShown) {
      setShowSplash(false);
      return;
    }

    setShowSplash(true);
    const t = setTimeout(() => {
      sessionStorage.setItem(SPLASH_STORAGE_KEY, '1');
      setShowSplash(false);
    }, SPLASH_MIN_MS);

    return () => clearTimeout(t);
  }, []);

  const handleEnter = () => {
    sessionStorage.setItem(SPLASH_STORAGE_KEY, '1');
    setShowSplash(false);
  };

  if (showSplash === null) {
    return <>{children}</>;
  }

  if (!showSplash) {
    return <>{children}</>;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-background px-6"
      role="img"
      aria-label={`${APP_NAME} - Controle financeiro inteligente`}
    >
      <div className="flex flex-col items-center gap-4">
        <img
          src="/assets/logo.png"
          alt=""
          className="h-24 w-24 object-contain drop-shadow-sm"
        />
        <h1 className="text-2xl font-bold text-foreground">{APP_NAME}</h1>
        <p className="text-center text-sm text-muted-foreground">
          Controle financeiro inteligente
        </p>
      </div>
      <Button
        size="lg"
        onClick={handleEnter}
        className="min-w-[200px]"
      >
        Entrar
      </Button>
    </div>
  );
}
