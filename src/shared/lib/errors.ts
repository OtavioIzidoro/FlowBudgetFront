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

const TRANSACTION_ERROR_MESSAGES: Record<string, string> = {
  INVALID_INSTALLMENTS: 'Número de parcelas inválido. Use entre 1 e 360.',
  VALUE_TOO_LOW_FOR_INSTALLMENTS:
    'O valor total deve ser pelo menos igual ao número de parcelas (cada parcela ≥ R$ 0,01).',
};

export function toServiceError(error: unknown): ServiceError {
  if (isServiceError(error)) {
    const mappedMessage = TRANSACTION_ERROR_MESSAGES[error.code];
    if (mappedMessage) {
      return { ...error, message: mappedMessage };
    }
    return error;
  }
  if (error instanceof Error) {
    return { code: 'UNKNOWN', message: error.message };
  }
  return { code: 'UNKNOWN', message: String(error) };
}
