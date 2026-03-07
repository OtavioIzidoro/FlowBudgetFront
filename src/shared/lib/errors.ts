import { z } from 'zod';

export function normalizeZodError(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.errors) {
    const path = issue.path.join('.');
    if (!result[path]) {
      result[path] = issue.message;
    }
  }
  return result;
}

export interface ServiceError {
  code: string;
  message: string;
  details?: unknown;
}

export function isServiceError(value: unknown): value is ServiceError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'message' in value &&
    typeof (value as ServiceError).code === 'string' &&
    typeof (value as ServiceError).message === 'string'
  );
}

export function toServiceError(error: unknown): ServiceError {
  if (isServiceError(error)) {
    return error;
  }
  if (error instanceof Error) {
    return { code: 'UNKNOWN', message: error.message };
  }
  return { code: 'UNKNOWN', message: String(error) };
}
