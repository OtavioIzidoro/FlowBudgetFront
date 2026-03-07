import type { User } from '@/entities/user/types';
import { apiRequest } from '@/shared/services/api-client';
import { appLogger } from '@/shared/logger';

export interface LoginCredentials {
  email: string;
  password: string;
  remember?: boolean;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const data = await apiRequest<{ user: User; token: string }>('/auth/login', {
    method: 'POST',
    body: {
      email: credentials.email,
      password: credentials.password,
      remember: credentials.remember,
    },
  });
  appLogger.info('Login realizado com sucesso', {
    domain: 'auth',
    event: 'login.success',
  });
  return data;
}

export async function logout(): Promise<void> {
  try {
    await apiRequest<{ success: boolean }>('/auth/logout', { method: 'POST' });
  } catch {
    //
  }
  appLogger.info('Logout realizado', { domain: 'auth', event: 'logout' });
}

export async function getCurrentUser(): Promise<User | null> {
  const data = await apiRequest<User | null>('/auth/me');
  return data;
}

export interface RegisterUserInput {
  name: string;
  email: string;
}

export async function registerUser(input: RegisterUserInput): Promise<{ user: User }> {
  const data = await apiRequest<{ user: User; token?: string }>('/auth/register', {
    method: 'POST',
    body: { name: input.name, email: input.email },
  });
  appLogger.info('Usuário criado pelo super admin', {
    domain: 'auth',
    event: 'user.created',
    userId: data.user?.id,
  });
  return { user: data.user };
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export async function changePassword(input: ChangePasswordInput): Promise<User> {
  const data = await apiRequest<User>('/auth/change-password', {
    method: 'PATCH',
    body: {
      currentPassword: input.currentPassword,
      newPassword: input.newPassword,
    },
  });
  appLogger.info('Senha alterada', {
    domain: 'auth',
    event: 'auth.password_changed',
  });
  return data;
}

export async function loginWithBiometric(): Promise<AuthResponse> {
  const { authenticateBiometric } = await import(
    '@/shared/services/biometric-auth.service'
  );
  await authenticateBiometric();
  try {
    const data = await apiRequest<{ user: User; token: string }>(
      '/auth/biometric',
      { method: 'POST', body: {} }
    );
    appLogger.info('Login por biometria realizado com sucesso', {
      domain: 'auth',
      event: 'login.biometric.success',
    });
    return data;
  } catch {
    throw {
      code: 'NOT_SUPPORTED',
      message:
        'Login por biometria ainda não disponível. Use e-mail e senha.',
    };
  }
}
