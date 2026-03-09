import { useCallback, useEffect, useRef, useState } from 'react';
import { useToastStore } from '@/shared/store/toast-store';

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Não foi possível verificar atualizações.';
}

export function useAppUpdates() {
  const [isCheckingForUpdates, setIsCheckingForUpdates] = useState(false);
  const [downloadedVersion, setDownloadedVersion] = useState<string | null>(null);
  const electronAPI = window.electronAPI;
  const manualCheckRef = useRef(false);

  useEffect(() => {
    if (!electronAPI) {
      return;
    }

    const unsubscribeAvailable = electronAPI.onUpdateAvailable((version) => {
      setIsCheckingForUpdates(false);
      manualCheckRef.current = false;
      useToastStore
        .getState()
        .info(`Nova versão ${version} encontrada. O download foi iniciado automaticamente.`, 6000);
    });

    const unsubscribeNotAvailable = electronAPI.onUpdateNotAvailable(() => {
      const triggeredManually = manualCheckRef.current;
      setIsCheckingForUpdates(false);
      manualCheckRef.current = false;

      if (triggeredManually) {
        useToastStore.getState().info('Você já está usando a versão mais recente.');
      }
    });

    const unsubscribeDownloaded = electronAPI.onUpdateDownloaded((version) => {
      setIsCheckingForUpdates(false);
      manualCheckRef.current = false;
      setDownloadedVersion(version);
      useToastStore
        .getState()
        .success(`A versão ${version} está pronta para instalar.`, 7000);
    });

    const unsubscribeError = electronAPI.onUpdateError((message) => {
      setIsCheckingForUpdates(false);
      manualCheckRef.current = false;
      useToastStore
        .getState()
        .error(`Falha ao verificar atualização: ${message}`, 7000);
    });

    return () => {
      unsubscribeAvailable();
      unsubscribeNotAvailable();
      unsubscribeDownloaded();
      unsubscribeError();
    };
  }, [electronAPI]);

  const checkForUpdates = useCallback(async () => {
    if (!electronAPI) {
      useToastStore
        .getState()
        .info('A verificação manual de atualização só está disponível no aplicativo desktop.');
      return;
    }

    if (downloadedVersion) {
      await electronAPI.quitAndInstall();
      return;
    }

    if (isCheckingForUpdates) {
      return;
    }

    manualCheckRef.current = true;
    setIsCheckingForUpdates(true);

    try {
      const result = await electronAPI.checkForUpdates();

      if (!result.started) {
        setIsCheckingForUpdates(false);
        manualCheckRef.current = false;
        useToastStore.getState().info('Já existe uma verificação de atualização em andamento.');
      }
    } catch (error) {
      setIsCheckingForUpdates(false);
      manualCheckRef.current = false;
      useToastStore.getState().error(toErrorMessage(error), 7000);
    }
  }, [downloadedVersion, electronAPI, isCheckingForUpdates]);

  return {
    canCheckForUpdates: Boolean(electronAPI),
    checkForUpdates,
    isCheckingForUpdates,
    isUpdateReady: Boolean(downloadedVersion),
  };
}
