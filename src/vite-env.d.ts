/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly PROD: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface ElectronNotificationPayload {
  title: string;
  body?: string;
}

interface Window {
  electronAPI?: {
    platform: string;
    onUpdateAvailable: (callback: (version: string) => void) => void;
    onUpdateDownloaded: (callback: (version: string) => void) => void;
    onUpdateError: (callback: (message: string) => void) => void;
    quitAndInstall: () => Promise<void>;
    showNotification: (payload: ElectronNotificationPayload) => Promise<boolean>;
  };
}
