import { appLogger } from '@/shared/logger';

const STORAGE_KEY = 'flowbudget-biometric-credential';
const RP_ID = typeof window !== 'undefined' ? window.location.hostname || 'localhost' : 'localhost';
const DEMO_USER = {
  id: '1',
  name: 'Usuário Demo',
  displayName: 'FlowBudget Demo',
};

function base64urlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i] ?? 0);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(str: string): ArrayBuffer {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = base64.length % 4;
  if (padding) base64 += '='.repeat(4 - padding);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function randomChallenge(): Uint8Array {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return arr;
}

export function isBiometricSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.PublicKeyCredential !== 'undefined' &&
    typeof window.navigator?.credentials?.create === 'function' &&
    typeof window.navigator?.credentials?.get === 'function'
  );
}

export function hasBiometricCredential(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { credentialId: string; userId: string };
    return Boolean(parsed?.credentialId && parsed?.userId);
  } catch {
    return false;
  }
}

function getStoredCredential(): { credentialId: string; userId: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { credentialId: string; userId: string };
    if (!parsed?.credentialId || !parsed?.userId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function storeCredential(credentialId: string, userId: string): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ credentialId, userId }));
}

export interface BiometricUser {
  id: string;
  name: string;
  email: string;
}

export async function registerBiometric(): Promise<BiometricUser> {
  if (!isBiometricSupported()) {
    throw { code: 'NOT_SUPPORTED', message: 'Biometria não suportada neste dispositivo.' };
  }
  const challenge = randomChallenge();
  const createOptions: CredentialCreationOptions = {
    publicKey: {
      rp: { name: 'FlowBudget', id: RP_ID },
      user: {
        id: new TextEncoder().encode(DEMO_USER.id),
        name: 'demo@flowbudget.app',
        displayName: DEMO_USER.displayName,
      },
      challenge: challenge.buffer,
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
        requireResidentKey: false,
      },
      timeout: 120000,
    },
  };
  const credential = (await navigator.credentials.create(createOptions)) as PublicKeyCredential | null;
  if (!credential) {
    throw { code: 'CANCELLED', message: 'Registro de biometria cancelado.' };
  }
  const credentialId = base64urlEncode(credential.rawId);
  storeCredential(credentialId, DEMO_USER.id);
  appLogger.info('Biometria registrada', {
    domain: 'auth',
    event: 'biometric.registered',
    userId: DEMO_USER.id,
  });
  return {
    id: DEMO_USER.id,
    name: DEMO_USER.name,
    email: 'demo@flowbudget.app',
  };
}

export async function authenticateBiometric(): Promise<BiometricUser> {
  if (!isBiometricSupported()) {
    throw { code: 'NOT_SUPPORTED', message: 'Biometria não suportada neste dispositivo.' };
  }
  const stored = getStoredCredential();
  if (!stored) {
    return registerBiometric();
  }
  const challenge = randomChallenge();
  const getOptions: CredentialRequestOptions = {
    publicKey: {
      challenge: challenge.buffer,
      allowCredentials: [
        {
          id: base64urlDecode(stored.credentialId),
          type: 'public-key',
        },
      ],
      userVerification: 'required',
      timeout: 120000,
    },
  };
  const credential = (await navigator.credentials.get(getOptions)) as PublicKeyCredential | null;
  if (!credential) {
    throw { code: 'CANCELLED', message: 'Autenticação biométrica cancelada.' };
  }
  appLogger.info('Login por biometria realizado', {
    domain: 'auth',
    event: 'biometric.login.success',
    userId: stored.userId,
  });
  return {
    id: stored.userId,
    name: DEMO_USER.name,
    email: 'demo@flowbudget.app',
  };
}
