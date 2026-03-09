import { API_BASE_URL } from '@/shared/config/api';
import { useAuthStore } from '@/shared/store/auth-store';

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

function getToken(): string | null {
  try {
    const stored = localStorage.getItem('flowbudget-auth');
    if (!stored) return null;
    const parsed = JSON.parse(stored) as { state?: { token?: string } };
    return parsed?.state?.token ?? null;
  } catch {
    return null;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let json: Record<string, unknown> | null = null;
  if (text) {
    try {
      json = JSON.parse(text) as Record<string, unknown>;
    } catch {
      //
    }
  }
  if (!res.ok) {
    const err: ApiError = {
      code: (json?.code as string) ?? 'HTTP_ERROR',
      message: (json?.message as string) ?? `Erro ${res.status}: ${res.statusText}`,
      details: json?.details,
    };
    throw err;
  }
  if (json && 'data' in json) {
    return json.data as T;
  }
  return json as unknown as T;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  params?: Record<string, string | number | undefined>;
  skipAuthRefresh?: boolean;
}

let refreshPromise: Promise<string | null> | null = null;

function shouldAttemptRefresh(path: string): boolean {
  const normalizedPath = path.startsWith('http')
    ? new URL(path).pathname
    : path;

  return ![
    '/auth/login',
    '/auth/register',
    '/auth/passkeys/login/options',
    '/auth/passkeys/login/verify',
    '/auth/refresh',
    '/auth/logout',
  ].includes(normalizedPath);
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      const data = await handleResponse<{ user: unknown; token: string }>(response);

      if (!data?.token) {
        useAuthStore.getState().logout();
        return null;
      }

      useAuthStore.getState().setAuth(data.user as never, data.token);
      return data.token;
    } catch {
      useAuthStore.getState().logout();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function executeRequest(
  path: string,
  options: RequestOptions,
  tokenOverride?: string | null
): Promise<Response> {
  const { method = 'GET', body, params } = options;
  const url = new URL(path.startsWith('http') ? path : `${API_BASE_URL}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = tokenOverride ?? getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(url.toString(), {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await executeRequest(path, options);

  if (
    response.status === 401 &&
    !options.skipAuthRefresh &&
    shouldAttemptRefresh(path)
  ) {
    const refreshedToken = await refreshAccessToken();

    if (refreshedToken) {
      const retryResponse = await executeRequest(path, {
        ...options,
        skipAuthRefresh: true,
      }, refreshedToken);
      return handleResponse<T>(retryResponse);
    }
  }

  return handleResponse<T>(response);
}
