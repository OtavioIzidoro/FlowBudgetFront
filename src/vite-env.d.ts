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

interface RememberedLoginPayload {
  email: string;
  password: string;
}

interface ElectronUpdateCheckResult {
  started: boolean;
}

interface Window {
  electronAPI?: {
    platform: string;
    onUpdateAvailable: (callback: (version: string) => void) => () => void;
    onUpdateNotAvailable: (callback: (version?: string) => void) => () => void;
    onUpdateDownloaded: (callback: (version: string) => void) => () => void;
    onUpdateError: (callback: (message: string) => void) => () => void;
    checkForUpdates: () => Promise<ElectronUpdateCheckResult>;
    quitAndInstall: () => Promise<void>;
    showNotification: (payload: ElectronNotificationPayload) => Promise<boolean>;
    getRememberedLogin: () => Promise<RememberedLoginPayload | null>;
    saveRememberedLogin: (payload: RememberedLoginPayload) => Promise<boolean>;
    clearRememberedLogin: () => Promise<boolean>;
  };
}
