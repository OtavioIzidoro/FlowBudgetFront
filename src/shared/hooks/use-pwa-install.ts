import { useState, useEffect, useCallback } from 'react';

const PWA_INSTALL_DISMISSED_KEY = 'flowbudget-pwa-install-dismissed';
const DISMISS_HIDE_DAYS = 7;

function getDismissedAt(): number | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(PWA_INSTALL_DISMISSED_KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function setDismissedAt(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(PWA_INSTALL_DISMISSED_KEY, String(Date.now()));
}

export function isPwaStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    nav.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches
  );
}

export interface UsePwaInstallReturn {
  canInstall: boolean;
  isStandalone: boolean;
  install: () => Promise<void>;
  dismiss: () => void;
  isDismissed: boolean;
}

export function usePwaInstall(): UsePwaInstallReturn {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    const at = getDismissedAt();
    if (at == null) return false;
    const elapsed = (Date.now() - at) / (1000 * 60 * 60 * 24);
    return elapsed < DISMISS_HIDE_DAYS;
  });

  useEffect(() => {
    setIsStandalone(isPwaStandalone());
  }, []);

  useEffect(() => {
    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setCanInstall(false);
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    setDismissedAt();
    setIsDismissed(true);
  }, []);

  return {
    canInstall,
    isStandalone,
    install,
    dismiss,
    isDismissed,
  };
}

declare global {
  interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  }
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}
