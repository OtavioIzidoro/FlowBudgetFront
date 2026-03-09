import type { User } from '@/entities/user/types';
import { apiRequest } from '@/shared/services/api-client';

interface AuthResponse {
  user: User;
  token: string;
}

interface PasskeyRegisterOptionsResponse {
  rp: {
    name: string;
    id: string;
  };
  user: {
    id: string;
    name: string;
    displayName: string;
  };
  challenge: string;
  pubKeyCredParams: Array<{
    alg: number;
    type: PublicKeyCredentialType;
  }>;
  timeout: number;
  excludeCredentials: Array<{
    id: string;
    type: PublicKeyCredentialType;
    transports?: AuthenticatorTransport[];
  }>;
}

interface PasskeyLoginOptionsResponse {
  challenge: string;
  timeout: number;
  rpId: string;
  allowCredentials: Array<{
    id: string;
    type: PublicKeyCredentialType;
    transports?: AuthenticatorTransport[];
  }>;
  userVerification?: UserVerificationRequirement;
}

interface PasskeyRegisterVerifyResponse {
  id: string;
  credentialId: string;
  deviceName: string;
  createdAt: string;
}

function base64urlToArrayBuffer(value: string): ArrayBuffer {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/') + padding;
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return bytes.buffer;
}

function arrayBufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function serializeRegistrationCredential(credential: PublicKeyCredential) {
  const response = credential.response as AuthenticatorAttestationResponse;
  return {
    id: credential.id,
    rawId: arrayBufferToBase64url(credential.rawId),
    response: {
      clientDataJSON: arrayBufferToBase64url(response.clientDataJSON),
      attestationObject: arrayBufferToBase64url(response.attestationObject),
      transports: typeof response.getTransports === 'function' ? response.getTransports() : [],
      publicKeyAlgorithm: typeof response.getPublicKeyAlgorithm === 'function'
        ? response.getPublicKeyAlgorithm()
        : -7,
      publicKey:
        typeof response.getPublicKey === 'function' && response.getPublicKey()
          ? arrayBufferToBase64url(response.getPublicKey() as ArrayBuffer)
          : '',
    },
    clientExtensionResults: credential.getClientExtensionResults(),
    type: credential.type,
    authenticatorAttachment: credential.authenticatorAttachment,
  };
}

function serializeLoginCredential(credential: PublicKeyCredential) {
  const response = credential.response as AuthenticatorAssertionResponse;
  return {
    id: credential.id,
    rawId: arrayBufferToBase64url(credential.rawId),
    response: {
      clientDataJSON: arrayBufferToBase64url(response.clientDataJSON),
      authenticatorData: arrayBufferToBase64url(response.authenticatorData),
      signature: arrayBufferToBase64url(response.signature),
      userHandle: response.userHandle ? arrayBufferToBase64url(response.userHandle) : '',
    },
    clientExtensionResults: credential.getClientExtensionResults(),
    type: credential.type,
    authenticatorAttachment: credential.authenticatorAttachment,
  };
}

export function isPasskeySupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.PublicKeyCredential !== 'undefined' &&
    typeof navigator?.credentials?.create === 'function' &&
    typeof navigator?.credentials?.get === 'function'
  );
}

export async function registerPasskey(
  deviceName: string
): Promise<PasskeyRegisterVerifyResponse> {
  const options = await apiRequest<PasskeyRegisterOptionsResponse>(
    '/auth/passkeys/register/options',
    {
      method: 'POST',
    }
  );

  const credential = await navigator.credentials.create({
    publicKey: {
      rp: options.rp,
      user: {
        id: base64urlToArrayBuffer(options.user.id),
        name: options.user.name,
        displayName: options.user.displayName,
      },
      challenge: base64urlToArrayBuffer(options.challenge),
      pubKeyCredParams: options.pubKeyCredParams,
      timeout: options.timeout,
      excludeCredentials: options.excludeCredentials.map((item) => ({
        ...item,
        id: base64urlToArrayBuffer(item.id),
      })),
    },
  });

  if (!credential) {
    throw { code: 'CANCELLED', message: 'Cadastro de passkey cancelado.' };
  }

  return apiRequest<PasskeyRegisterVerifyResponse>('/auth/passkeys/register/verify', {
    method: 'POST',
    body: {
      deviceName,
      response: serializeRegistrationCredential(credential as PublicKeyCredential),
    },
  });
}

export async function loginWithPasskey(email: string): Promise<AuthResponse> {
  const options = await apiRequest<PasskeyLoginOptionsResponse>(
    '/auth/passkeys/login/options',
    {
      method: 'POST',
      body: { email },
    }
  );

  const credential = await navigator.credentials.get({
    publicKey: {
      challenge: base64urlToArrayBuffer(options.challenge),
      timeout: options.timeout,
      rpId: options.rpId,
      allowCredentials: options.allowCredentials.map((item) => ({
        ...item,
        id: base64urlToArrayBuffer(item.id),
      })),
      userVerification: options.userVerification,
    },
  });

  if (!credential) {
    throw { code: 'CANCELLED', message: 'Login com passkey cancelado.' };
  }

  return apiRequest<AuthResponse>('/auth/passkeys/login/verify', {
    method: 'POST',
    body: {
      email,
      response: serializeLoginCredential(credential as PublicKeyCredential),
    },
  });
}
