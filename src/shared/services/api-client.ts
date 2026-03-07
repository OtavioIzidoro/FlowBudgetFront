import { API_BASE_URL } from '@/shared/config/api';

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
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
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
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });
  return handleResponse<T>(res);
}
